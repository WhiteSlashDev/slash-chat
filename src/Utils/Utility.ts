import {
  RecipleClient,
  RecipleModuleLoadData,
  RecipleModuleStartData,
} from "reciple";
import { BaseModule } from "../BaseModule.js";
import { PrismaClient } from "@prisma/client";
import { setTimeout } from "timers/promises";
import { ColorResolvable, Guild, Message, inlineCode } from "discord.js";

export class Utility extends BaseModule {
  public prisma: PrismaClient = new PrismaClient();
  public client!: RecipleClient<true>;
  public embedColor: ColorResolvable = "Blurple";

  public async onStart({ client }: RecipleModuleStartData): Promise<boolean> {
    this.client = client as RecipleClient<true>;
    return true;
  }

  public async onLoad(data: RecipleModuleLoadData): Promise<string | void> {
    this.client.rest.on("rateLimited", async (info) =>
      this.client.logger?.warn(`Ratelimited!`, info)
    );
  }

  public async getPrefix(data?: {
    message?: Message;
    guild?: Guild | null;
  }): Promise<string> {
    if (!this.client.config.commands?.messageCommand?.prefix) return "!";

    return typeof this.client.config.commands?.messageCommand?.prefix ===
      "function"
      ? this.client.config.commands?.messageCommand?.prefix({
          client: this.client,
          ...data,
        })
      : this.client.config.commands?.messageCommand?.prefix;
  }

  public createErrorMessage(message: string): string {
    return this.createLabel(message, "❌");
  }

  public createSuccessMessage(message: string): string {
    return this.createLabel(message, "✅");
  }

  public createWarningMessage(message: string): string {
    return this.createLabel(message, "⚠️");
  }

  public createLabel(message: string, emoji: string): string {
    return `${inlineCode(emoji)} ${message}`;
  }

  public async autoDeleteResponseMessage(message: Message): Promise<void> {
    if (
      message.author.id !== this.client.user?.id ||
      !message.content.startsWith(this.createErrorMessage(""))
    )
      return;

    const reference = message.reference?.messageId
      ? await message.channel.messages.fetch(message.reference.messageId)
      : null;

    await setTimeout(5000);
    await message.delete().catch(() => null);

    if (reference?.author.id !== message.author.id)
      await reference?.delete().catch(() => null);
  }
}

export default new Utility();
