import { RecipleModuleLoadData } from "reciple";
import { BaseModule } from "../BaseModule.js";
import Utility from "../Utils/Utility.js";
import { EmbedBuilder, Message } from "discord.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env?.GEMINI_API_KEY || "");

export class threadAi extends BaseModule {
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

        await this.CreateApiResponse(
          message,
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
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const chat = model.startChat({
      history: [
        ...(await this.fetchPreviousResponses(chatId, {
          limit: 20,
          before: message,
        })),
      ],
      generationConfig: {
        maxOutputTokens: 2048,
      },
    });

    const result = await chat.sendMessage(input);
    const response = result.response;
    const text = response.text();

    embed.setDescription(text);

    await message.reply({
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
          const role =
            m.author.id === Utility.client.user.id ? "model" : "user";
          const text =
            m.author.id === Utility.client.user.id
              ? m.embeds[0]?.description || ""
              : m.content;
          return { role: role, parts: text.trim() };
        });

      return responses;
    } catch (error) {
      console.error("Error fetching messages:", error);
      return [];
    }
  }
}

export default new threadAi();
