import { RecipleModuleLoadData } from "reciple";
import { BaseModule } from "../BaseModule.js";
import Utility from "../Utils/Utility.js";

export class ThreadDelete extends BaseModule {
  public async onStart(): Promise<boolean> {
    return true;
  }

  public async onLoad({ client }: RecipleModuleLoadData): Promise<void> {
    client.on("threadDelete", (thread) => {
      Utility.prisma.chats.deleteMany({
        where: {
          chatId: thread.id,
        },
      });
    });
  }
}

export default new ThreadDelete();
