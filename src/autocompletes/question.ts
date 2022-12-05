import { ApplicationCommandOptionChoiceData } from 'discord.js';

import { Auto } from '../structures/AutoComplete';
import { myCache } from '../structures/Cache';
import { CommandNameEnum } from '../types/Command';
import { NUMBER } from '../utils/const';

export default new Auto({
	correspondingCommandName: CommandNameEnum.Answer,
	execute: ({ interaction }) => {
		const { value: inputValue } = interaction.options.getFocused(true);
		const { guildId } = interaction;
		const questionsInform = myCache.myGet('Questions')?.[guildId] ?? {};

		if (Object.keys(questionsInform).length === 0) return interaction.respond([]);
		const filter: Array<ApplicationCommandOptionChoiceData> = Object.values(questionsInform)
			.filter(
				(thread) =>
					// eslint-disable-next-line @typescript-eslint/prefer-optional-chain
					thread.summary &&
					thread.summary.toLowerCase().includes(inputValue.toLowerCase())
			)
			.map((thread) => ({
				name: thread.summary,
				value: thread.id
			}))
			.slice(0, NUMBER.AUTOCOMPLETE_OPTION_LENGTH);

		if (filter.length === 0) return interaction.respond([]);
		else return interaction.respond(filter);
	}
});
