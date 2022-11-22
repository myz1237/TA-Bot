import {
	ActionRowBuilder,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	TextChannel,
	ThreadAutoArchiveDuration,
} from 'discord.js';

import { myCache } from '../structures/Cache';
import { MessageContextMenu } from '../structures/ContextMenu';
import { QuestionStatus } from '../utils/const';
import {
	awaitWrap,
	checkTextChannelPermission,
	fetchCommandId,
	messageHandler
} from '../utils/util';

export default new MessageContextMenu({
	name: 'Raise question',
	type: ApplicationCommandType.Message,
	execute: async ({ interaction }) => {
		const { guildId, guild, targetMessage } = interaction;
		const { content, attachments, author } = targetMessage;
		const { displayName: memberName, id: memberId } = targetMessage.member;

		if (author.bot) {
			return interaction.reply({
				content: 'Sorry, you cannot raise a question from a bot message.',
				ephemeral: true
			});
		}
		if (!content && attachments.size === 0) {
			return interaction.reply({
				content: 'Sorry, I cannot find any plain text or attachement here.',
				ephemeral: true
			});
		}
		const guildInform = myCache.myGet('Guild')[guildId];
		const targetChannelId = guildInform?.questionChannelId;

		if (!guildInform || !targetChannelId) {
			return interaction.reply({
				content: `Please use </init question:${fetchCommandId(
					'Raise question',
					guild
				)}> to set up a question channel first. If you don't undestand, please call the admin.`,
				ephemeral: true
			});
		}

		let targetChannel = guild.channels.cache.get(targetChannelId) as TextChannel;

		if (!targetChannel) {
			const { result, error } = await awaitWrap(guild.channels.fetch(targetChannelId));

			if (error) {
				return interaction.reply({
					content: `Sorry, <#${targetChannelId}> is unfetchable.`,
					ephemeral: true
				});
			} else {
				targetChannel = result as TextChannel;
			}
		}

		const permissionChecking = checkTextChannelPermission(targetChannel, guild.members.me.id);

		if (permissionChecking) {
			return interaction.reply({
				content: permissionChecking,
				ephemeral: true
			});
		}
		await interaction.deferReply({ ephemeral: true });
		const threadName = `${QuestionStatus.Wait} -- Question from ${memberName}`;

		const thread = await targetChannel.threads.create({
			name: threadName,
			autoArchiveDuration: ThreadAutoArchiveDuration.ThreeDays
		});

		// todo handle length > 2000
		// todo limited number of attachments
		const threadContent = `Questions from <@${memberId}>: \n${messageHandler(targetMessage)}`;
		const current = Math.floor(new Date().getTime() / 1000);
		const threadEmbedDescription = `**Who Raised**: <@${memberId}>\n**Status**: ${QuestionStatus.Wait}\n**Start**: <t:${current}:f>(<t:${current}:R>)\n**End**: \`Unavailable\``;

		await thread.send({
			embeds: [
				new EmbedBuilder()
					.setTitle('Question Dashboard')
					.setDescription(threadEmbedDescription)
			],
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents([
					new ButtonBuilder()
						.setCustomId('claim')
						.setLabel('Claim')
						.setStyle(ButtonStyle.Primary)
						.setEmoji('🛄'),
					new ButtonBuilder()
						.setCustomId('solved')
						.setLabel('Solved')
						.setStyle(ButtonStyle.Success)
						.setEmoji('✅')
				]),
				new ActionRowBuilder<ButtonBuilder>().addComponents([
					new ButtonBuilder()
						.setCustomId('summary')
						.setLabel('Question Summary')
						.setStyle(ButtonStyle.Secondary)
						.setEmoji('📢')
				])
			]
		});
		await thread.send({
			content: threadContent,
			files: [...attachments.values()]
		});

		return interaction.followUp({
			content: `Thanks for your question. Please be patient, our TAs are on the way. Keep eyes on the <#${thread.id}>.`,
			ephemeral: true
		});
	}
});
