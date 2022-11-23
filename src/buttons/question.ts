import {
	ActionRow,
	ActionRowBuilder,
	ButtonComponent,
	ModalBuilder,
	TextChannel,
	TextInputBuilder,
	TextInputStyle,
	ThreadChannel
} from 'discord.js';

import { Button } from '../structures/Button';
import { myCache } from '../structures/Cache';
import { FieldsName, QuestionStatus } from '../utils/const';
import {
	awaitWrap,
	checkTextChannelThreadPermission,
	fetchClaimedMemberId,
	fetchCommandId
} from '../utils/util';

export default new Button({
	customIds: ['claimed', 'solved', 'summary'],
	execute: async ({ interaction }) => {
		const { message, customId, guild, guildId, member } = interaction;
		const { taRole } = myCache.myGet('Guild')[guildId];

		if (!taRole) {
			const initCommandId = fetchCommandId('init', guild);

			return interaction.reply({
				content: `Please set up TA role with the </init ta: ${initCommandId}>`,
				ephemeral: true
			});
		} else {
			if (!member.roles.cache.has(taRole)) {
				return interaction.reply({
					content: 'Sorry, only TAs are allowed to click these buttons.',
					ephemeral: true
				});
			}
		}

		const embed = message.embeds[0].toJSON();
		const claimedMemberId = fetchClaimedMemberId(embed.fields);
		const questionThreadId = embed.footer.text.match(/\d+/g)[0];
		const component = message.components[1] as ActionRow<ButtonComponent>;
		const buttons = component.toJSON();

		if (customId === 'summary') {
			if (!buttons.components[0].disabled && buttons.components[1].disabled) {
				return interaction.reply({
					content: 'Sorry, the question is unclaimed. Please claim it first.',
					ephemeral: true
				});
			}

			const claimedMemberName =
				guild.members.cache.get(claimedMemberId)?.displayName ?? 'Unknown Member';

			if (member.id !== claimedMemberId) {
				return interaction.reply({
					content: `Sorry, the question has been claimed by \`${claimedMemberName}\`. Try to find another unclaimed question.`,
					ephemeral: true
				});
			}

			const summaryModal = new ModalBuilder()
				.setCustomId('summary')
				.setTitle('Submit the question summary');

			summaryModal.addComponents(
				new ActionRowBuilder<TextInputBuilder>().addComponents(
					new TextInputBuilder()
						.setCustomId('summary_input')
						.setRequired(true)
						.setPlaceholder('No moare than 100 characters for display')
						.setLabel('PLEASE INPUT the QUESTION SUMMARY')
						.setStyle(TextInputStyle.Paragraph)
						.setMaxLength(100)
				)
			);
			return interaction.showModal(summaryModal);
		}

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
			const claimedMemberName =
				guild.members.cache.get(claimedMemberId)?.displayName ?? 'Unknown Member';

			if (member.id !== claimedMemberId) {
				return interaction.reply({
					content: `Sorry, the question has been claimed by \`${claimedMemberName}\`. Try to find another unclaimed question.`,
					ephemeral: true
				});
			}

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
