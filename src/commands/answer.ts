import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle
} from 'discord.js';
import { sprintf } from 'sprintf-js';

import { myCache } from '../structures/Cache';
import { Command } from '../structures/Command';
import { CommandNameEnum } from '../types/Command';
import { LINK } from '../utils/const';

export default new Command({
	name: CommandNameEnum.Answer,
	description: 'Query solved questions',
	type: ApplicationCommandType.ChatInput,
	options: [
		{
			name: 'query',
			description: 'Choose a question from the list',
			type: ApplicationCommandOptionType.String,
			autocomplete: true,
			required: true
		},
		{
			name: 'target',
			description: 'The person you want to mention to show the answer in the public.',
			type: ApplicationCommandOptionType.User
		}
	],
	execute: ({ interaction, args }) => {
		const { guildId } = interaction;
		const targetUser = args.getUser('target');
		const queryThreadId = args.getString('query');

		if (!myCache.myGet('Questions')?.[guildId]?.[queryThreadId]) {
			return interaction.reply({
				content: 'Sorry, I cannot find this query.',
				ephemeral: true
			});
		}
		const threadLink = sprintf(LINK.THREAD, {
			guildId: guildId,
			threadId: queryThreadId
		});
		const button = new ActionRowBuilder<ButtonBuilder>().addComponents([
			new ButtonBuilder()
				.setLabel('Jump into the discussion')
				.setStyle(ButtonStyle.Link)
				.setURL(threadLink)
				.setEmoji('🔗')
		]);

		if (targetUser) {
			return interaction.reply({
				content: `<@${targetUser.id}>, check the discussion here!`,
				components: [button]
			});
		} else {
			return interaction.reply({
				content: 'Check the discussion here!',
				components: [button],
				ephemeral: true
			});
		}
	}
});
