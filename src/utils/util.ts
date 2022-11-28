import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import utc from 'dayjs/plugin/utc';
import {
	APIEmbedField,
	AuditLogEvent,
	EmbedBuilder,
	Guild,
	GuildTextBasedChannel,
	PermissionFlagsBits,
} from 'discord.js';
import { sprintf } from 'sprintf-js';

import { GuildInform } from '../types/Cache';
import { CommandNameEnum } from '../types/Command';
import { ContextMenuNameEnum } from '../types/ContextMenu';
import { monthDuration, weekDuration } from '../types/Utils';
import { ERROR_REPLY, FieldsName, NUMBER } from './const';
import { TimeOutError } from './error';
export interface awaitWrapType<T> {
	result: T | null;
	error: any | null;
}

export async function awaitWrap<T>(promise: Promise<T>): Promise<awaitWrapType<T>> {
	return promise
		.then((data) => {
			return {
				result: data,
				error: null
			};
		})
		.catch((error) => {
			return {
				result: null,
				error: error?.message
			};
		});
}

export async function awaitWrapWithTimeout<T>(
	promise: Promise<T>,
	ms = NUMBER.AWAIT_TIMEOUT
): Promise<awaitWrapType<T>> {
	const timeout = new Promise<never>((_, reject) => {
		setTimeout(() => {
			reject(new TimeOutError());
		}, ms);
	});

	return Promise.race([promise, timeout])
		.then((data) => {
			return {
				result: data,
				error: null
			};
		})
		.catch((error) => {
			return {
				result: null,
				error: error
			};
		});
}

export function getErrorReply(errorInform: {
	commandName: string;
	subCommandName?: string;
	errorMessage: string;
}) {
	const { commandName, subCommandName, errorMessage } = errorInform;

	if (subCommandName) {
		return sprintf(ERROR_REPLY.GRAPHQL, {
			action: `${commandName} ${subCommandName}`,
			errorMessage: `\`${errorMessage}\``
		});
	} else {
		return sprintf(ERROR_REPLY.GRAPHQL, {
			action: `${commandName}`,
			errorMessage: `\`${errorMessage}\``
		});
	}
}

export async function fetchGuildDefaultAdminRoleFromAuditLog(
	guild: Guild
): Promise<false | string> {
	const { result, error } = await awaitWrap(
		guild.fetchAuditLogs({
			type: AuditLogEvent.BotAdd
		})
	);

	if (error) return false;
	if (result.entries.size === 0) return false;
	const filteredAuditLog = result.entries.filter(
		(entry) => entry.target.id === guild.members.me.id
	);

	if (filteredAuditLog.size === 0) return false;
	const { executor: botInviterUser, target: bot } = filteredAuditLog.first();

	if (!botInviterUser || !bot) return false;
	let botInviterMember = guild.members.cache.get(botInviterUser.id);

	if (!botInviterMember) {
		const { result: member } = await awaitWrap(guild.members.fetch(botInviterUser.id));

		if (member) botInviterMember = member;
		else return false;
	}
	const { id: highestRoleId } = botInviterMember.roles.highest;

	return highestRoleId;
}

export function checkTextChannelThreadPermission(channel: GuildTextBasedChannel, userId: string) {
	if (!channel.permissionsFor(userId, true).has([PermissionFlagsBits.ViewChannel])) {
		return 'Missing **VIEW CHANNEL** access.';
	}
	if (!channel.permissionsFor(userId, true).has([PermissionFlagsBits.SendMessages])) {
		return 'Missing **SEND MESSAGES** access.';
	}

	if (!channel.permissionsFor(userId, true).has([PermissionFlagsBits.CreatePublicThreads])) {
		return 'Missing **CREATE PUBLIC THREADS** access.';
	}

	if (!channel.permissionsFor(userId, true).has([PermissionFlagsBits.SendMessagesInThreads])) {
		return 'Missing **SEND MESSAGES IN THREADS** access.';
	}

	if (!channel.permissionsFor(userId, true).has([PermissionFlagsBits.ManageThreads])) {
		return 'Missing **MANAGE THREADS** access.';
	}
	return false;
}

export function checkTextChannelCommonPermission(channel: GuildTextBasedChannel, userId: string) {
	if (!channel.permissionsFor(userId, true).has([PermissionFlagsBits.ViewChannel])) {
		return 'Missing **VIEW CHANNEL** access.';
	}
	if (!channel.permissionsFor(userId, true).has([PermissionFlagsBits.SendMessages])) {
		return 'Missing **SEND MESSAGES** access.';
	}
	return false;
}

export function readGuildSetting(guildInform: GuildInform) {
	const { adminRole, taRole, questionChannelId, hypeChannelId } = guildInform;

	return new EmbedBuilder().setTitle('Guild Setting Dashboard').setFields([
		{
			name: 'Admin Role',
			value: adminRole ? `> <@&${adminRole}>` : '> -',
			inline: true
		},
		{
			name: 'TA Role',
			value: taRole ? `> <@&${taRole}>` : '> -',
			inline: true
		},
		{
			name: 'Question Channel',
			value: questionChannelId ? `> <#${questionChannelId}>` : '> -',
			inline: false
		},
		{
			name: 'Hype Channel',
			value: hypeChannelId ? `> <#${hypeChannelId}>` : '> -',
			inline: false
		}
	]);
}

export function fetchCommandId(commandName: CommandNameEnum | ContextMenuNameEnum, guild: Guild) {
	if (process.env.MODE === 'dev') {
		return guild.commands.cache.filter((cmd) => cmd.name === commandName).first().id;
	} else {
		return guild.client.application.commands.cache
			.filter((cmd) => cmd.name === commandName)
			.first().id;
	}
}

export function fetchClaimedMemberId(fields: APIEmbedField[]) {
	return fields.filter(({ name }) => name === FieldsName.ClaimedBy)[0].value.slice(2, -1);
}

export function getStartAndEndOfWeekUTCInSec(year: number, week: number): weekDuration {
	dayjs.extend(isoWeek);
	dayjs.extend(utc);
	const thisWeek = dayjs().utc().set('year', year).startOf('year').add(week, 'week');

	return {
		start: Math.floor(thisWeek.startOf('isoWeek').valueOf() / 1000),
		end: Math.floor(thisWeek.endOf('isoWeek').valueOf() / 1000)
	};
}

export function getStartAndEndOfMonthUTCInSec(year: number, month: number): monthDuration {
	dayjs.extend(isoWeek);
	dayjs.extend(utc);
	const thisWeek = dayjs()
		.utc()
		.set('year', year)
		.startOf('year')
		.add(month - 1, 'month');

	return {
		start: Math.floor(thisWeek.startOf('month').valueOf() / 1000),
		end: Math.floor(thisWeek.endOf('month').valueOf() / 1000)
	};
}
