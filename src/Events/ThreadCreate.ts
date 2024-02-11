import { RecipleModuleLoadData } from "reciple";
import { BaseModule } from "../BaseModule.js";
import Utility from "../Utils/Utility.js";

export class ThreadCreate extends BaseModule {
  public async onStart(): Promise<boolean> {
    return true;
  }

  public async onLoad({ client }: RecipleModuleLoadData): Promise<void> {
    client.on("threadCreate", async (thread) => {
      const setupData = await Utility.prisma.sAiChat.findFirst({
        where: {
          guildId: thread.guild.id,
          forumId: thread.parentId || "",
        },
      });

      if (setupData) {
        await Utility.prisma.chats.create({
          data: {
            guildId: thread.guild.id,
            chatId: thread.id,
          },
        });
      }
    });
  }
}

export default new ThreadCreate();
