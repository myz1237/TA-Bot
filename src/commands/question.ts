import {
	ActionRowBuilder,
	ApplicationCommandOptionType,
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
import { Command } from '../structures/Command';
import { CommandNameEnum } from '../types/Command';
import { FieldsName, LINK, QuestionStatus } from '../utils/const';
import {
	checkTextChannelCommonPermission,
	checkTextChannelThreadPermission,
	fetchCommandId
} from '../utils/util';

export default new Command({
	name: CommandNameEnum.Question,
	description: 'Raise a question and create a thread in current channel',
	options: [
		{
			name: 'question',
			description: 'Your question',
			type: ApplicationCommandOptionType.String,
			required: true
		}
	],
	type: ApplicationCommandType.ChatInput,
	execute: async ({ interaction, args }) => {
		const questionContent = args.getString('question');
		const { guildId, guild, channel: currentChannel } = interaction;
		const { displayName: memberName, id: memberId } = interaction.member;
		const botId = guild.members.me.id;

		if (currentChannel.type !== ChannelType.GuildText) {
			return interaction.reply({
				content: 'Sorry, this command is only used in the Text Channel.',
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
					CommandNameEnum.Init,
					guild
				)}> to set up a question channel first. If you don't undestand, please call the admin.`,
				ephemeral: true
			});
		}

		const questionChannel = guild.channels.cache.get(questionChannelId) as TextChannel;

		if (!questionChannel) {
			return interaction.reply({
				content: `Sorry, <#${questionChannelId}> is unfetchable.`,
				ephemeral: true
			});
		}

		const permissionChecking = checkTextChannelCommonPermission(questionChannel, botId);

		if (permissionChecking) {
			return interaction.reply({
				content: `Sorry, I cannot raise this question for you, because Question Channel ${permissionChecking} Please report it to the admin.`,
				ephemeral: true
			});
		}

		await interaction.deferReply({ ephemeral: true });
		const threadName = `${QuestionStatus.Wait} -- Question from ${memberName}`;
		const questionThread = await currentChannel.threads.create({
			name: threadName,
			autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays
		});
		const questionThreadId = questionThread.id;

		await questionThread.send({
			content: `Question from <@${memberId}>:\n${questionContent}`
		});

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
							value: `<t:${Math.floor(new Date().getTime() / 1000)}:D>`,
							inline: true
						},
						{
							name: FieldsName.Claim,
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
