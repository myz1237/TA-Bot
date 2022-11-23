import { ActionRow, ButtonComponent, TextChannel, ThreadChannel } from 'discord.js';

import { Button } from '../structures/Button';
import { FieldsName, QuestionStatus } from '../utils/const';
import { awaitWrap, checkTextChannelThreadPermission } from '../utils/util';

export default new Button({
	customIds: ['claimed', 'solved'],
	execute: async ({ interaction }) => {
		const { message, customId, guild } = interaction;
		const embed = message.embeds[0].toJSON();
		const questionThreadId = embed.footer.text.match(/\d+/g)[0];
		const component = message.components[1] as ActionRow<ButtonComponent>;
		const buttons = component.toJSON();

		let questionThread = guild.channels.cache.get(questionThreadId) as ThreadChannel;

		if (!questionThread) {
			const { result } = await awaitWrap(guild.channels.fetch(questionThreadId));

			if (result) questionThread = result as ThreadChannel;
		}

		if (questionThread) {
			const parent = questionThread.parent as TextChannel;

			if (parent) {
				if (checkTextChannelThreadPermission(parent, guild.members.me.id)) {
					questionThread = null;
				}
			}
		}

		// todo error handling if disable is invalid
		if (customId === 'claimed') {
			await interaction.deferUpdate();
			const current = Math.floor(new Date().getTime() / 1000);

			embed.fields.forEach(({ name }, index) => {
				switch (name) {
					case FieldsName.Status:
						embed.fields[index].value = QuestionStatus.Claimed;
						break;
					case FieldsName.ClaimedBy:
						embed.fields[index].value = `<@${interaction.user.id}>`;
						break;
					case FieldsName.Start:
						embed.fields[index].value = `<t:${current}>`;
						break;
				}
			});
			buttons.components[0].label = `Claimed By ${interaction.member.displayName}`;
			buttons.components[0].disabled = true;
			buttons.components[1].disabled = false;

			await message.edit({
				embeds: [embed],
				components: [message.components[0], buttons]
			});

			if (questionThread) {
				if (questionThread.name.includes(QuestionStatus.Wait)) {
					await questionThread.setName(
						questionThread.name.replace(QuestionStatus.Wait, QuestionStatus.Claimed)
					);
				}
			}
			return;
		}

		if (customId === 'solved') {
			await interaction.deferReply({ ephemeral: true });
			const current = Math.floor(new Date().getTime() / 1000);

			embed.fields.forEach(({ name }, index) => {
				switch (name) {
					case FieldsName.Status:
						embed.fields[index].value = QuestionStatus.Solved;
						break;
					case FieldsName.End:
						embed.fields[index].value = `<t:${current}>`;
						break;
				}
			});
			buttons.components[1].disabled = true;
			buttons.components[1].label = `Solved by ${interaction.member.displayName}`;
			await message.edit({
				embeds: [embed],
				components: [message.components[0], buttons]
			});

			if (questionThread) {
				if (questionThread.name.includes(QuestionStatus.Claimed)) {
					await questionThread.setName(
						questionThread.name.replace(QuestionStatus.Claimed, QuestionStatus.Solved)
					);
				}
			}

            // todo check if the summary was set
			return interaction.followUp({
				content:
					'Are you willing to add a summary to help us index the question and reuse it later? Please click the above button `Question Summary`.'
			});
		}
	}
});
