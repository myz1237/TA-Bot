import { Guild } from 'discord.js';

import { prisma } from '../prisma/prisma';
import { myCache } from '../structures/Cache';
import { Event } from '../structures/Event';
import { defaultGuildSetting } from '../utils/const';
import { logger } from '../utils/logger';
import { fetchGuildDefaultAdminRoleFromAuditLog } from '../utils/util';

export default new Event('guildCreate', async (newGuild: Guild) => {
	if (newGuild.available) {
		const guilId = newGuild.id;
		const guildInform = myCache.myGet('Guild')?.[guilId];

		if (!guildInform) {
			const defaultAdminRoleId = await fetchGuildDefaultAdminRoleFromAuditLog(newGuild);
			const defaultGuildInform = defaultGuildSetting;

			if (defaultAdminRoleId) {
				defaultGuildInform.adminRole = defaultAdminRoleId;
			}

			await prisma.guild.create({
				data: {
					id: guilId,
					...defaultGuildInform
				}
			});
			myCache.mySet('Guild', {
				...myCache.myGet('Guild'),
				[guilId]: defaultGuildInform
			});
			myCache.mySet('Questions', {
				...myCache.myGet('Questions'),
				[guilId]: {}
			});
		}
	} else {
		logger.error(`${newGuild.name} is unavailable.`);
	}
});
