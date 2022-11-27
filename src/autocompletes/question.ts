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
		const filter: Array<ApplicationCommandOptionChoiceData> = Object.keys(questionsInform)
			.filter((threadId) =>
				questionsInform[threadId].summary.toLowerCase().includes(inputValue.toLowerCase())
			)
			.map((threadId) => ({
				name: questionsInform[threadId].summary,
				value: threadId
			}))
			.slice(0, NUMBER.AUTOCOMPLETE_OPTION_LENGTH);

		if (filter.length === 0) return interaction.respond([]);
		else return interaction.respond(filter);
	}
});
