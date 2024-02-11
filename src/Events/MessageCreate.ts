import { RecipleModuleLoadData } from "reciple";
import { BaseModule } from "../BaseModule.js";
import Utility from "../Utils/Utility.js";
import { EmbedBuilder, Message } from "discord.js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ChatHistory } from "@prisma/client";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const chatHistories = await this.GetAllChatHistory(chatId);

    const chat = model.startChat({
      history: [
        { role: "system", parts: "You're a good Russian friend." },
        ...chatHistories.map(({ role, parts }) => ({ role, parts })),
      ],
      generationConfig: { maxOutputTokens: 2048 },
    });

    const response = (await chat.sendMessage(input)).response;

    await this.addChatHistory(chatId, "user", input);
    await this.addChatHistory(chatId, "model", response.toString());

    embed.setDescription(`${response}`);
    await message.edit({ embeds: [embed] });
  }

  private async addChatHistory(chatId: string, role: string, parts: string) {
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

    return histories;
  }
}

export default new MessageCreate();
