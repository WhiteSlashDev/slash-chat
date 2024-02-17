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
      if (!message.inGuild || message.author.bot) return;

      if (message.mentions.has(client.user)) {
        this.CreateApiResponse(message);
      }
    });
  }

  public async CreateApiResponse(message: Message) {
    const model = genAI.getGenerativeModel({
      model: "gemini-pro",
      generationConfig: {
        maxOutputTokens: 512,
      },
    });

    const messageWithMention = message.content;
    const firstSpaceIndex = messageWithMention.indexOf(" ");

    if (messageWithMention.startsWith("@SlashChat")) {
      const prompt = messageWithMention.substring(firstSpaceIndex + 1);
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      await message.reply({
        content: text,
      });
    } else {
      const result = await model.generateContent(messageWithMention);
      const response = result.response;
      const text = response.text();

      await message.reply({
        content: text,
      });
    }
  }
}

export default new threadAi();
