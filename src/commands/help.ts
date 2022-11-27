import { ApplicationCommandType, EmbedBuilder } from 'discord.js';

import { Command } from '../structures/Command';
import { CommandNameEnum } from '../types/Command';
import { ContextMenuNameEnum } from '../types/ContextMenu';
import { fetchCommandId } from '../utils/util';

export default new Command({
	name: CommandNameEnum.Help,
	type: ApplicationCommandType.ChatInput,
	description: 'Output a list of all commands',
	execute: ({ interaction }) => {
		const { guild } = interaction;
		const initCommandName = CommandNameEnum.Init;
		const initCommandId = fetchCommandId(initCommandName, guild);

		const answerCommandName = CommandNameEnum.Answer;
		const answerCommandId = fetchCommandId(answerCommandName, guild);

		const raiseCommandName = ContextMenuNameEnum.RaiseQuestion;

		const collectCommandName = CommandNameEnum.Collect;
		const collectCommandId = fetchCommandId(collectCommandName, guild);

		const description = `
        **${initCommandName}**
        > </${initCommandName} read:${initCommandId}> Read current bot configuration.
        > </${initCommandName} ta:${initCommandId}> Set TA role.
        > </${initCommandName} admin:${initCommandId}> Set Admin role.
        > </${initCommandName} question:${initCommandId}> Set question channel for TA tracking and statistics.
        </${answerCommandName}:${answerCommandId}>
        > \`/${answerCommandName} query\` Get an answer of a query, only visible to yourself.
        > \`/${answerCommandName} query target\` Get an answer of a query and mention a user.
        **${raiseCommandName}**
        > Raise your question in a text channel and wait for reply from TAs.
         **${collectCommandName}**
        > </${collectCommandName} by_week:${collectCommandId}> Collect weekly data.
        > </${collectCommandName} by_month:${collectCommandId}> Collect monthly data.
        `;

		return interaction.reply({
			embeds: [
				new EmbedBuilder().setTitle('Command Instruction').setDescription(description)
			],
			ephemeral: true
		});
	}
});
