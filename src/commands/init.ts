import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	ChannelType,
	TextChannel
} from 'discord.js';

import { prisma } from '../prisma/prisma';
import { myCache } from '../structures/Cache';
import { Command } from '../structures/Command';
import { CommandNameEnum } from '../types/Command';
import { defaultGuildSetting } from '../utils/const';
import {
	checkTextChannelCommonPermission,
	fetchGuildDefaultAdminRoleFromAuditLog,
	readGuildSetting
} from '../utils/util';

export default new Command({
	name: CommandNameEnum.Init,
	type: ApplicationCommandType.ChatInput,
	description: 'TA Bot Init Worflow',
	options: [
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'ta',
			description:
				'Init the TA role, members only with this role can claim and complete a question.',
			options: [
				{
					name: 'role',
					description: 'Choose a role from the list',
					type: ApplicationCommandOptionType.Role,
					required: true
				}
			]
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'admin',
			description: 'Init the Admin role, members only with this role can set the bot.',
			options: [
				{
					name: 'role',
					description: 'Choose a role from the list',
					type: ApplicationCommandOptionType.Role,
					required: true
				}
			]
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'question',
			description: 'Init the Question channels, where TAs can solve issues with our users.',
			options: [
				{
					name: 'channel',
					description: 'Choose a channel from the list',
					type: ApplicationCommandOptionType.Channel,
					required: true,
					channelTypes: [ChannelType.GuildText]
				}
			]
		},
		{
			type: ApplicationCommandOptionType.Subcommand,
			name: 'read',
			description: 'Output current configurations'
		}
	],
	execute: async ({ interaction, args }) => {
		const subCommandName = args.getSubcommand();
		const { guildId, guild, member } = interaction;
		const cache = myCache.myGet('Guild')[guildId];
		let guildInform = defaultGuildSetting;

		if (!guildInform) {
			const defaultAdminRoleId = await fetchGuildDefaultAdminRoleFromAuditLog(guild);

			if (defaultAdminRoleId) {
				guildInform = {
					...guildInform,
					adminRole: defaultAdminRoleId
				};
			}
			myCache.mySet('Guild', {
				...myCache.myGet('Guild'),
				[guildId]: guildInform
			});
		} else {
			guildInform = {
				...guildInform,
				...cache
			};
		}
		if (!member.roles.cache.has(guildInform.adminRole)) {
			return interaction.reply({
				content: 'Sorry, only admin team is allowed to run this command.',
				ephemeral: true
			});
		}

		if (subCommandName === 'read') {
			return interaction.reply({
				embeds: [readGuildSetting(guildInform)],
				ephemeral: true
			});
		}

		const { adminRole, taRole, questionChannelId } = guildInform;

		if (subCommandName === 'admin') {
			const role = args.getRole('role');

			if (adminRole === role.id) {
				return interaction.reply({
					content: `\`${role.name}\` has been set as admin role.`,
					ephemeral: true
				});
			}

			await interaction.deferReply({ ephemeral: true });
			guildInform.adminRole = role.id;
			await prisma.guild.upsert({
				where: {
					id: guildId
				},
				update: {
					adminRole: role.id
				},
				create: {
					id: guildId,
					...guildInform
				}
			});
			myCache.mySet('Guild', {
				...myCache.myGet('Guild'),
				[guildId]: guildInform
			});
			return interaction.followUp({
				content: `\`${role.name}\` has been set as admin role.`,
				ephemeral: true
			});
		}

		if (subCommandName === 'ta') {
			const role = args.getRole('role');

			if (taRole === role.id) {
				return interaction.reply({
					content: `\`${role.name}\` has been set as TA role.`,
					ephemeral: true
				});
			}

			await interaction.deferReply({ ephemeral: true });
			guildInform.taRole = role.id;
			await prisma.guild.upsert({
				where: {
					id: guildId
				},
				update: {
					taRole: role.id
				},
				create: {
					id: guildId,
					...guildInform
				}
			});
			myCache.mySet('Guild', {
				...myCache.myGet('Guild'),
				[guildId]: guildInform
			});
			return interaction.followUp({
				content: `\`${role.name}\` has been set as TA role.`,
				ephemeral: true
			});
		}

		if (subCommandName === 'question') {
			const targetChannel = args.getChannel('channel') as TextChannel;
			const targetChannelId = targetChannel.id;
			const permissionChecking = checkTextChannelCommonPermission(
				targetChannel,
				guild.members.me.id
			);

			if (permissionChecking) {
				return interaction.reply({
					content: permissionChecking,
					ephemeral: true
				});
			}
			if (questionChannelId === targetChannelId) {
				return interaction.reply({
					content: `<#${targetChannelId}> has been set as question channel.`,
					ephemeral: true
				});
			}

			await interaction.deferReply({ ephemeral: true });
			guildInform.questionChannelId = targetChannelId;
			await prisma.guild.upsert({
				where: {
					id: guildId
				},
				update: {
					questionChannelId: targetChannelId
				},
				create: {
					id: guildId,
					...guildInform
				}
			});
			myCache.mySet('Guild', {
				...myCache.myGet('Guild'),
				[guildId]: guildInform
			});
			return interaction.followUp({
				content: `<#${targetChannelId}> has been set as question channel.`,
				ephemeral: true
			});
		}
	}
});
