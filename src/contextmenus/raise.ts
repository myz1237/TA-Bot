import {
	ActionRowBuilder,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	ChannelType,
	EmbedBuilder,
	TextChannel,
	ThreadAutoArchiveDuration
} from 'discord.js';
import { sprintf } from 'sprintf-js';

import { prisma } from '../prisma/prisma';
import { myCache } from '../structures/Cache';
import { MessageContextMenu } from '../structures/ContextMenu';
import { CommandNameEnum } from '../types/Command';
import { ContextMenuNameEnum } from '../types/ContextMenu';
import { FieldsName, LINK, QuestionStatus } from '../utils/const';
import {
	awaitWrap,
	checkTextChannelCommonPermission,
	checkTextChannelThreadPermission,
	fetchCommandId
} from '../utils/util';

export default new MessageContextMenu({
	name: ContextMenuNameEnum.RaiseQuestion,
	type: ApplicationCommandType.Message,
	execute: async ({ interaction }) => {
		const { guildId, guild, targetMessage, channel: currentChannel } = interaction;

		// All pre-checking
		if (currentChannel.type !== ChannelType.GuildText) {
			return interaction.reply({
				content: 'Sorry, this command is only used in the Text Channel.',
				ephemeral: true
			});
		}

		const { author } = targetMessage;

		if (targetMessage.hasThread) {
			return interaction.reply({
				content: 'Sorry, you cannot recreate a thread based on this message.',
				ephemeral: true
			});
		}

		const { displayName: memberName, id: memberId } = targetMessage.member;
		const botId = guild.members.me.id;

		if (author.bot) {
			return interaction.reply({
				content: 'Sorry, you cannot raise a question from a bot message.',
				ephemeral: true
			});
		}

		const currentChannelPermissionChecking = checkTextChannelThreadPermission(
			currentChannel,
			botId
		);

		if (currentChannelPermissionChecking) {
			return interaction.reply({
				content: `Sorry, I cannot raise this question for you, becasue ${currentChannelPermissionChecking} Please report it to the admin.`,
				ephemeral: true
			});
		}

		const guildInform = myCache.myGet('Guild')[guildId];
		const questionChannelId = guildInform?.questionChannelId;

		if (!guildInform || !questionChannelId) {
			return interaction.reply({
				content: `Please use </${CommandNameEnum.Init} question:${fetchCommandId(
					ContextMenuNameEnum.RaiseQuestion,
					guild
				)}> to set up a question channel first. If you don't undestand, please call the admin.`,
				ephemeral: true
			});
		}

		let questionChannel = guild.channels.cache.get(questionChannelId) as TextChannel;

		if (!questionChannel) {
			const { result, error } = await awaitWrap(guild.channels.fetch(questionChannelId));

			if (error) {
				return interaction.reply({
					content: `Sorry, <#${questionChannelId}> is unfetchable.`,
					ephemeral: true
				});
			} else {
				questionChannel = result as TextChannel;
			}
		}

		const permissionChecking = checkTextChannelCommonPermission(questionChannel, botId);

		if (permissionChecking) {
			return interaction.reply({
				content: `Sorry, I cannot raise this question for you, because Question Channel ${permissionChecking} Please report it to the admin.`,
				ephemeral: true
			});
		}

		// Create thread based on the message
		await interaction.deferReply({ ephemeral: true });
		const threadName = `${QuestionStatus.Wait} -- Question from ${memberName}`;
		const questionThread = await currentChannel.threads.create({
			name: threadName,
			startMessage: targetMessage,
			autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays
		});
		const questionThreadId = questionThread.id;

		// Forward Message to the question channel
		const threadLink = sprintf(LINK.THREAD, {
			guildId: guildId,
			threadId: questionThreadId
		});

		await questionChannel.send({
			embeds: [
				new EmbedBuilder()
					.setTitle(`Question from @${memberName}`)
					.addFields([
						{
							name: FieldsName.Status,
							value: QuestionStatus.Wait,
							inline: true
						},
						{
							name: FieldsName.RaisedBy,
							value: `<@${memberId}>`,
							inline: true
						},
						{
							name: FieldsName.ClaimedBy,
							value: '`Unavailable`',
							inline: true
						},
						{
							name: FieldsName.Start,
							value: '`Unavailable`',
							inline: true
						},
						{
							name: FieldsName.End,
							value: '`Unavailable`',
							inline: true
						}
					])
					.setFooter({ text: `Question ID: ${questionThreadId}` })
			],
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents([
					new ButtonBuilder()
						.setLabel('Help Needed!')
						.setStyle(ButtonStyle.Link)
						.setURL(threadLink)
						.setEmoji('🔗'),
					new ButtonBuilder()
						.setCustomId('summary')
						.setLabel('Question Summary')
						.setStyle(ButtonStyle.Secondary)
						.setEmoji('📢')
				]),
				new ActionRowBuilder<ButtonBuilder>().addComponents([
					new ButtonBuilder()
						.setCustomId('claimed')
						.setLabel('Claim')
						.setStyle(ButtonStyle.Primary)
						.setDisabled(false)
						.setEmoji('🛄'),
					new ButtonBuilder()
						.setCustomId('solved')
						.setLabel('Solved')
						.setStyle(ButtonStyle.Success)
						.setDisabled(true)
						.setEmoji('✅')
				])
			]
		});

		await prisma.question.create({
			data: {
				id: questionThreadId,
                discordId: guildId,
                raisedBy: memberId,
                taId: '',
                taName: '',
                summary: ''
			}
		});

		return interaction.followUp({
			content: `Thanks for your question. Please be patient, our TAs are on the way. Keep eyes on the <#${questionThreadId}>.`,
			ephemeral: true
		});
	}
});
