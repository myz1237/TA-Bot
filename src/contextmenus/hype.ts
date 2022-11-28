import {
	ActionRowBuilder,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	TextChannel
} from 'discord.js';
import { sprintf } from 'sprintf-js';

import { prisma } from '../prisma/prisma';
import { myCache } from '../structures/Cache';
import { MessageContextMenu } from '../structures/ContextMenu';
import { CommandNameEnum } from '../types/Command';
import { ContextMenuNameEnum } from '../types/ContextMenu';
import { LINK } from '../utils/const';
import { checkTextChannelCommonPermission, fetchCommandId } from '../utils/util';

export default new MessageContextMenu({
	name: ContextMenuNameEnum.HypeMessage,
	type: ApplicationCommandType.Message,
	execute: async ({ interaction }) => {
		const { targetMessage, member, guildId, guild, channelId } = interaction;
		const initCommandId = fetchCommandId(CommandNameEnum.Init, guild);
		const guildInform = myCache.myGet('Guild')[guildId];

		if (!guildInform?.taRole) {
			return interaction.reply({
				content: `Please set up TA role with the </${CommandNameEnum.Init} ta:${initCommandId}>`,
				ephemeral: true
			});
		} else {
			if (!member.roles.cache.has(guildInform.taRole)) {
				return interaction.reply({
					content: 'Sorry, only TAs are allowed to use this command.',
					ephemeral: true
				});
			}
		}

		if (!guildInform?.hypeChannelId) {
			return interaction.reply({
				content: `Please set up a Hype Channel with the </${CommandNameEnum.Init} hype:${initCommandId}>`,
				ephemeral: true
			});
		}

		if (targetMessage.author.id !== member.id) {
			return interaction.reply({
				content: 'Sorry, you can only hype your own message.',
				ephemeral: true
			});
		}

		const hypeChannel = guild.channels.cache.get(guildInform.hypeChannelId) as TextChannel;

		if (!hypeChannel) {
			return interaction.reply({
				content: 'Sorry, hypechannel is unfetchable.',
				ephemeral: true
			});
		}

		const permissionChecking = checkTextChannelCommonPermission(
			hypeChannel,
			guild.members.me.id
		);

		if (permissionChecking) {
			return interaction.reply({
				content: permissionChecking,
				ephemeral: true
			});
		}

		await interaction.deferReply({ ephemeral: true });
		const searchResult = await prisma.hype.findUnique({
			where: {
				id: targetMessage.id
			}
		});

		if (searchResult) {
			return interaction.followUp({
				content: 'Sorry, you have hypes this message.'
			});
		}

		await prisma.hype.create({
			data: {
				id: targetMessage.id,
				discordId: guildId,
				taId: member.id,
				taName: member.displayName
			}
		});
		const hypeCount = await prisma.hype.count({
			where: {
				discordId: guildId,
				taId: member.id
			}
		});

		await hypeChannel.send({
			embeds: [
				new EmbedBuilder()
					.setTitle(`Hype Message -- From @${member.displayName}`)
					.setDescription(`Current hype message count: \`${hypeCount}\``)
			],
			components: [
				new ActionRowBuilder<ButtonBuilder>().addComponents([
					new ButtonBuilder()
						.setLabel('Jump to the hype message')
						.setEmoji('🔗')
						.setStyle(ButtonStyle.Link)
						.setURL(
							sprintf(LINK.MESSAGE, {
								guildId: guildId,
								channelId: channelId,
								messageId: targetMessage.id
							})
						)
				])
			]
		});

		return interaction.followUp({
			content: 'Thanks for your contribution. You have added hype successfully.'
		});
	}
});
