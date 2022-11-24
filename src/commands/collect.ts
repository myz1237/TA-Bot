/* eslint-disable no-param-reassign */
import { Prisma } from '@prisma/client';
import { ApplicationCommandOptionType, ApplicationCommandType, EmbedBuilder } from 'discord.js';
import { sprintf } from 'sprintf-js';

import { prisma } from '../prisma/prisma';
import { Command } from '../structures/Command';
import { CommandNameEnum } from '../types/Command';
import { MonthlyTaData, WeeklyTaData } from '../types/Utils';
import { CONTENT } from '../utils/const';
import { getStartAndEndOfMonthUTCInSec, getStartAndEndOfWeekUTCInSec } from '../utils/util';

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
		let embedDescription = 'No Data';
		let data: Array<WeeklyTaData | MonthlyTaData>;
		let durationProperty: 'week' | 'month';

		await interaction.deferReply({ ephemeral: true });

		if (subCommandName === 'by_week') {
			data = await prisma.$queryRaw<Array<WeeklyTaData>>(
				Prisma.sql`
                    SELECT taId, T.week, sum(T.diff)sumInSec, count(T.week)count, (sum(T.diff)/count(T.week))avgInSec
                    FROM (
                        SELECT DATE_FORMAT(solvedTimestamp, '%Y%u')week, taId, (solvedTimestamp-createTimestamp)diff
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
                    SELECT taId, T.month, sum(T.diff)sumInSec, count(T.month)count, (sum(T.diff)/count(T.month))avgInSec
                    FROM (
                        SELECT DATE_FORMAT(solvedTimestamp, '%Y%m')month, taId, (solvedTimestamp-createTimestamp)diff
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
			let index = '';

			embedDescription = data.reduce((pre, cur) => {
				const { taId, sumInSec, avgInSec, count } = cur;
				const counInNumber = Number(count);
				const sumInHours = Math.floor(Number(sumInSec) / 3600).toFixed(1);
				const avgInHours = Math.floor(Number(avgInSec) / 3600).toFixed(1);
				const row = sprintf(CONTENT.DATA_ROW, {
					userId: taId,
					totalHours: sumInHours,
					answerCount: counInNumber,
					avgHours: avgInHours
				});

				if (cur[durationProperty] !== index) {
					index = cur[durationProperty];
					const yearInNumber = Number(index.slice(0, 4));
					const weekOrMonthInNumber = Number(index.slice(4, 6));

					if (durationProperty === 'week') {
						const { start, end } = getStartAndEndOfWeekUTCInSec(
							yearInNumber,
							weekOrMonthInNumber
						);

						pre += sprintf(CONTENT.WEEK_ROW, {
							week: weekOrMonthInNumber,
							start: start,
							end: end
						});
					} else {
						const { start, end } = getStartAndEndOfMonthUTCInSec(
							yearInNumber,
							weekOrMonthInNumber
						);

						pre += sprintf(CONTENT.MONTH_ROW, {
							month: weekOrMonthInNumber,
							start: start,
							end: end
						});
					}
					pre += row;
				} else {
					pre += row;
				}
				return pre;
			}, '');
		}

		return interaction.followUp({
			embeds: [
				new EmbedBuilder()
					.setTitle('TA Dashboard')
					.setDescription(embedDescription)
					.setTimestamp()
			]
		});
	}
});
