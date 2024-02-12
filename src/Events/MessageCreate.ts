import { RecipleModuleLoadData } from "reciple";
import { BaseModule } from "../BaseModule.js";
import Utility from "../Utils/Utility.js";
import {
  AnyThreadChannel,
  BaseMessageOptions,
  CategoryChannel,
  EmbedBuilder,
  GuildBasedChannel,
  Message,
  MessageType,
  ThreadChannel,
} from "discord.js";
import axios from "axios";
import lodash from "lodash";

export class MessageCreate extends BaseModule {
  public async onStart(): Promise<boolean> {
    return true;
  }

  public async onLoad({ client }: RecipleModuleLoadData): Promise<void> {
    client.on("messageCreate", async (message) => {
      if (!message.inGuild || message.author.bot || !message.channel.isThread())
        return;

      const forumChannelId = message.channel?.parentId;

      const setupData = await Utility.prisma.sAiChat.findFirst({
        where: {
          guildId: message.guild?.id,
          forumId: forumChannelId || "",
        },
      });

      if (setupData) {
        const embed = new EmbedBuilder()
          .setDescription(
            Utility.createWarningMessage("Generating response...")
          )
          .setFooter({
            iconURL: `${Utility.client.user.displayAvatarURL()}`,
            text: `${Utility.client.user.username}`,
          })
          .setColor(Utility.embedColor)
          .setAuthor({
            name: message.author.displayName,
            iconURL: message.author.avatarURL() || "",
          })
          .setTimestamp();

        const response = await message.reply({
          embeds: [embed],
        });

        await this.CreateApiResponse(
          response,
          message.content,
          embed,
          message.channel.id
        );
      }
    });
  }

  public async CreateApiResponse(
    message: Message,
    input: string,
    embed: EmbedBuilder,
    chatId: string
  ) {
    const url = `https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/0e349b44-440a-44e1-93e9-abe8dcb27158`;
    const headers = {
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY || ""}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const payload = {
      messages: [
        {
          content: `Your name is ${Utility.client.user.displayName} discord bot and you exist to entertain or help people. you're not allowed to send NSFW stuffs and lasty you don't use too much emoji. You need to talk only in Russian lang. You're was created by WhiteSlash.`,
          role: "system",
        },
        ...(await this.fetchPreviousResponses(chatId, {
          limit: 5,
        })),
        {
          content: input,
          role: "user",
        },
      ],
      stream: false,
      max_tokens: 1024,
    };

    let response = await axios.post(url, payload, {
      headers,
    });

    while (response.status === 202) {
      let requestId = response.headers["nvcf-reqid"];
      let fetchUrl =
        "https://api.nvcf.nvidia.com/v2/nvcf/pexec/status/" + requestId;
      response = await axios.get(fetchUrl, { headers: headers });
    }

    if (response.status !== 200) {
      throw new Error(
        `invocation failed with status ${response.status} ${response.data}`
      );
    }

    embed.setDescription(response.data.choices[0].message.content);

    await message.edit({
      embeds: [embed],
    });
  }

  public async fetchPreviousResponses(
    channelId: string,
    options: { before?: Message; userId?: string; limit?: number } = {}
  ) {
    const { before, userId, limit } = options;

    const channel = Utility.client.channels.cache.get(channelId);
    if (!channel || !channel.isThread()) {
      return [];
    }

    try {
      const messages = await channel.messages.fetch({
        limit,
        before: before?.id,
      });
      if (!messages?.size) return [];

      const responses = messages
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
        .map((m) => {
          if (m.author.id === Utility.client.user.id) {
            const assistant = m.embeds[0]?.description;
            return { content: assistant?.trim(), role: "assistant" };
          } else {
            return { content: m.content, role: "user" };
          }
        })
        .filter((response) => response !== null);

      return responses;
    } catch (error) {
      console.error("Error fetching messages:", error);
      return [];
    }
  }
}

export default new MessageCreate();
