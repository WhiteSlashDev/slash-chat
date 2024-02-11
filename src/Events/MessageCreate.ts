import { RecipleModuleLoadData } from "reciple";
import { BaseModule } from "../BaseModule.js";
import Utility from "../Utils/Utility.js";
import { BaseMessageOptions, EmbedBuilder, Message } from "discord.js";
import axios from "axios";
import { ChatHistory } from "@prisma/client";
import { IncomingMessage } from "http";

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
    await this.addChatHistory(chatId, "user", input);

    const url = `https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions/0e349b44-440a-44e1-93e9-abe8dcb27158`;
    const headers = {
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY || ""}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    const payload = {
      messages: [
        {
          content: `Your name is ${Utility.client.user.displayName} discord bot and you exist to entertain or help people. you're not allowed to send NSFW stuffs and lasty you don't use too much emoji. You need to talk only in Russian lang.`,
          role: "system",
        },
        ...(await this.GetAllChatHistory(chatId)),
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

    await this.addChatHistory(
      chatId,
      "assistant",
      response.data.choices[0].message.content
    );

    embed.setDescription(response.data.choices[0].message.content);

    await message.edit({
      embeds: [embed],
    });
  }

  public async addChatHistory(chatId: string, role: string, parts: string) {
    await Utility.prisma.chatHistory.create({
      data: {
        chat: { connect: { chatId } },
        role,
        parts,
      },
    });
  }

  public async GetAllChatHistory(chatId: string) {
    const histories: ChatHistory[] = await Utility.prisma.chatHistory.findMany({
      where: {
        chat: {
          chatId: chatId,
        },
      },
    });

    return histories.map(({ parts, role }) => ({
      content: parts,
      role,
    }));
  }
}

export default new MessageCreate();
