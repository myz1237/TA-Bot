/* eslint-disable no-param-reassign */
import { Prisma } from '@prisma/client';
import { ApplicationCommandOptionType, ApplicationCommandType, EmbedBuilder } from 'discord.js';
import { sprintf } from 'sprintf-js';

import { prisma } from '../prisma/prisma';
import { myCache } from '../structures/Cache';
import { Command } from '../structures/Command';
import { CommandNameEnum } from '../types/Command';
import { MonthlyTaData, WeeklyTaData } from '../types/Utils';
import { CONTENT, defaultGuildSetting, NUMBER } from '../utils/const';
import {
	fetchGuildDefaultAdminRoleFromAuditLog,
	getStartAndEndOfMonthUTCInSec,
	getStartAndEndOfWeekUTCInSec
} from '../utils/util';

export default new Command({
	name: CommandNameEnum.Collect,
	type: ApplicationCommandType.ChatInput,
	description: "Collect TAs' statistics",
	options: [
		{
			name: 'by_week',
			type: ApplicationCommandOptionType.Subcommand,
			description: 'Output weekly data'
		},
		{
			name: 'by_month',
			type: ApplicationCommandOptionType.Subcommand,
			description: 'Output monthly data'
		}
	],
	execute: async ({ interaction, args }) => {
		const subCommandName = args.getSubcommand();
		const { guildId, guild, member } = interaction;
		const cache = myCache.myGet('Guild')[guildId];
		let guildInform = defaultGuildSetting;

		if (!cache) {
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
			await prisma.guild.create({
				data: {
					id: guildId,
					...guildInform
				}
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

		let data: Array<WeeklyTaData | MonthlyTaData>;
		let durationProperty: 'week' | 'month';

		await interaction.deferReply({ ephemeral: true });

		if (subCommandName === 'by_week') {
			data = await prisma.$queryRaw<Array<WeeklyTaData>>(
				Prisma.sql`
                    SELECT taId, T.week, sum(T.answerDiff)sumInSec, count(T.week)count, (sum(T.responseDiff)/count(T.week))avgResponseInSec
                    FROM (
                        SELECT DATE_FORMAT(solvedTimestamp, '%Y%u')week, taId, (solvedTimestamp-claimedTimestamp)answerDiff, (claimedTimestamp-createTimestamp)responseDiff
                        FROM Question
                        WHERE solved = true 
                    ) as T
                    GROUP BY T.week, taId
                    ORDER BY T.week
                `
			);
			durationProperty = 'week';
		}

		if (subCommandName === 'by_month') {
			data = await prisma.$queryRaw<Array<MonthlyTaData>>(
				Prisma.sql`
                    SELECT taId, T.month, sum(T.answerDiff)sumInSec, count(T.month)count, (sum(T.responseDiff)/count(T.month))avgResponseInSec
                    FROM (
                        SELECT DATE_FORMAT(solvedTimestamp, '%Y%m')month, taId, (solvedTimestamp-claimedTimestamp)answerDiff, (claimedTimestamp-createTimestamp)responseDiff
                        FROM Question
                        WHERE solved = true 
                    ) as T
                    GROUP BY T.month, taId
                    ORDER BY T.month
                `
			);
			durationProperty = 'month';
		}

		if (data.length !== 0) {
			type embedRows = {
				timeRow: string;
				recordRow: string;
			};

			let latestTime = '';
			let latestTimeIndex = 0;
			const content = data.reduce((pre, cur) => {
				const { taId, sumInSec, avgResponseInSec, count } = cur;
				const counInNumber = Number(count);
				const sumInMins = (Number(sumInSec) / 60).toFixed(1);
				const avgResponseInMins = (Number(avgResponseInSec) / 60).toFixed(1);
				const recordRow = sprintf(CONTENT.DATA_ROW, {
					userId: taId,
					totalHours: sumInMins,
					answerCount: counInNumber,
					avgHours: avgResponseInMins
				});

				if (cur[durationProperty] !== latestTime) {
					latestTime = cur[durationProperty];
					latestTimeIndex = pre.length;
					const yearInNumber = Number(latestTime.slice(0, 4));
					const weekOrMonthInNumber = Number(latestTime.slice(4, 6));
					let timeRow: string;

					if (durationProperty === 'week') {
						const { start, end } = getStartAndEndOfWeekUTCInSec(
							yearInNumber,
							weekOrMonthInNumber
						);

						timeRow = sprintf(CONTENT.WEEK_ROW, {
							week: weekOrMonthInNumber,
							start: start,
							end: end
						});
					} else {
						const { start, end } = getStartAndEndOfMonthUTCInSec(
							yearInNumber,
							weekOrMonthInNumber
						);

						timeRow = sprintf(CONTENT.MONTH_ROW, {
							month: weekOrMonthInNumber,
							start: start,
							end: end
						});
					}
					pre.push({
						timeRow: timeRow,
						recordRow: recordRow
					});
				} else {
					pre[latestTimeIndex].recordRow += recordRow;
				}
				return pre;
			}, [] as Array<embedRows>);

			const groupedContent = content.reduce((pre, _, index) => {
				if (index % NUMBER.RECORD_PER_EMBED_MSG === 0) {
					pre.push(
						content
							.slice(index, index + NUMBER.RECORD_PER_EMBED_MSG)
							.reduce((preStr, cur) => {
								preStr += cur.timeRow + cur.recordRow;
								return preStr;
							}, '')
					);
				}
				return pre;
			}, [] as Array<string>);

			const embedArrays = groupedContent.reduce((pre, _, index) => {
				if (index % NUMBER.EMBED_PER_MSG === 0) {
					pre.push([
						...groupedContent
							.slice(index, index + NUMBER.EMBED_PER_MSG)
							.map((embedDescribe) =>
								new EmbedBuilder()
									.setTitle('TA Dashboard')
									.setDescription(embedDescribe)
									.setFooter({ text: `Page ${(index + 1).toString()}` })
							)
					]);
				}
				return pre;
			}, [] as Array<Array<EmbedBuilder>>);

			for (const embedArray of embedArrays) {
				await interaction.followUp({
					embeds: [...embedArray]
				});
			}
			return;
		} else {
			return interaction.followUp({
				embeds: [
					new EmbedBuilder()
						.setTitle('TA Dashboard')
						.setDescription('No Data')
						.setTimestamp()
				]
			});
		}
	}
});
