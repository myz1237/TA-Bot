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

import { prisma } from '../prisma/prisma';
import { Button } from '../structures/Button';
import { myCache } from '../structures/Cache';
import { CommandNameEnum } from '../types/Command';
import { FieldsName, LINK, QuestionStatus } from '../utils/const';
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
		const memberName = member.displayName;
		const { taRole } = myCache.myGet('Guild')[guildId];

		if (!taRole) {
			const initCommandId = fetchCommandId(CommandNameEnum.Init, guild);

			return interaction.reply({
				content: `Please set up TA role with the </${CommandNameEnum.Init} ta:${initCommandId}>`,
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
						.setPlaceholder('No more than 100 characters for display')
						.setLabel('PLEASE INPUT THE QUESTION SUMMARY')
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
					case FieldsName.Claim:
						embed.fields[index].value = `<t:${current}:D>`;
						break;
				}
			});
			embed.thumbnail = {
				url: LINK.IMAGE_CLAIMED
			};
			buttons.components[0].label = `Claimed By ${memberName}`;
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
			await prisma.question.update({
				where: {
					id: questionThreadId
				},
				data: {
					claimedTimestamp: new Date(),
					taId: member.id,
					taName: memberName
				}
			});
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
						embed.fields[index].value = `<t:${current}:D>`;
						break;
				}
			});
			embed.thumbnail = {
				url: LINK.IMAGE_SOLVED
			};
			buttons.components[1].disabled = true;
			buttons.components[1].label = `Solved by ${memberName}`;
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

			const result = await prisma.question.update({
				where: {
					id: questionThreadId
				},
				data: {
					solvedTimestamp: new Date(),
					solved: true
				},
				select: {
					summary: true
				}
			});

			if (result.summary) {
				myCache.mySet('Questions', {
					...myCache.myGet('Questions'),
					[guildId]: {
						...myCache.myGet('Questions')[guildId],
						[questionThreadId]: {
							summary: result.summary
						}
					}
				});
				return interaction.followUp({
					content:
						'Thanks for your contribution. Have a nice day!'
				});
			} else {
				return interaction.followUp({
					content:
						'Thanks for your contribution. Please add a summary through the button `Question Summary` to help us build a Q&A database. Have a nice day!'
				});
			}
		}
	}
});
