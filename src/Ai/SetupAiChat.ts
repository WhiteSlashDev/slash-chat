import { RecipleModuleStartData, SlashCommandBuilder } from "reciple";
import { BaseModule } from "../BaseModule.js";
import { ChannelType } from "discord.js";
import Utility from "../Utils/Utility.js";

export class SetupAiChat extends BaseModule {
  public async onStart(): Promise<boolean> {
    this.commands = [
      new SlashCommandBuilder()
        .setName("setup-ai")
        .setDescription("Setup ai threads.")
        .addChannelOption((option) =>
          option
            .setName("forum")
            .setDescription("Select an forum channel")
            .addChannelTypes(ChannelType.GuildForum)
            .setRequired(true)
        )
        .setExecute(async ({ interaction }) => {
          const forum = interaction.options.getChannel("forum");

          const setupData = await Utility.prisma.sAiChat.findFirst({
            where: {
              guildId: interaction.guild?.id,
            },
          });

          if (!setupData) {
            await Utility.prisma.sAiChat.create({
              data: {
                guildId: interaction.guild?.id || "",
                forumId: forum?.id || "",
              },
            });

            await interaction.reply({
              content: Utility.createSuccessMessage(
                "Ai chat succesfully setuped!"
              ),
              ephemeral: true,
            });
            return;
          }

          await Utility.prisma.sAiChat.update({
            where: {
              guildId: interaction.guild?.id,
            },
            data: {
              forumId: forum?.id,
            },
          });

          await interaction.reply({
            content: Utility.createSuccessMessage(
              `Forum channel succesfully updated to \`${forum}\`.`
            ),
          });
        }),
    ];
    return true;
  }
}

export default new SetupAiChat();
