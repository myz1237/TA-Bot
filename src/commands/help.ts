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

		const raiseSlashCommandName = CommandNameEnum.Question;
		const raiseSlashCommandId = fetchCommandId(raiseSlashCommandName, guild);

		const raiseContextCommandName = ContextMenuNameEnum.RaiseQuestion;

		const hypeCommandName = ContextMenuNameEnum.HypeMessage;

		const collectCommandName = CommandNameEnum.Collect;
		const collectCommandId = fetchCommandId(collectCommandName, guild);

		const description = `
        **${initCommandName}**
        > </${initCommandName} read:${initCommandId}> Read current bot configuration.
        > </${initCommandName} ta:${initCommandId}> Set TA role.
        > </${initCommandName} admin:${initCommandId}> Set Admin role.
        > </${initCommandName} question:${initCommandId}> Set question channel for TA tracking and statistics.
		**${collectCommandName}**
        > </${collectCommandName} question by_week:${collectCommandId}> Collect weekly data.
        > </${collectCommandName} question by_month:${collectCommandId}> Collect monthly data.
		> </${collectCommandName} hype:${collectCommandId}> Collect hype counts.
		</${raiseSlashCommandName}:${raiseSlashCommandId}>
        > \`/${raiseSlashCommandName} question\` Raise your question based on your input
        </${answerCommandName}:${answerCommandId}>
        > \`/${answerCommandName} query\` Get an answer of a query, only visible to yourself.
        > \`/${answerCommandName} query target\` Get an answer of a query and mention a user.
        **${raiseContextCommandName}** -- Message Context Command*
        > Raise your question in a text channel and wait for reply from TAs.
		 **${hypeCommandName}** -- Message Context Command*
        > Hype your message and inform teams.
        `;

		return interaction.reply({
			embeds: [
				new EmbedBuilder().setTitle('Command Instruction').setDescription(description).setFooter({text: '* Right click on a message => Clikc \'App\' => Choose Commands'})
			],
			ephemeral: true
		});
	}
});
