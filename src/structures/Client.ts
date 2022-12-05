import { Prisma } from '@prisma/client';
import AsciiTable from 'ascii-table';
import {
	ActivityType,
	ChatInputApplicationCommandData,
	Client,
	ClientEvents,
	Collection,
	GatewayIntentBits,
	MessageApplicationCommandData,
	PresenceUpdateStatus,
	UserApplicationCommandData
} from 'discord.js';
import glob from 'glob';
import { sprintf } from 'sprintf-js';
import { promisify } from 'util';

import { prisma } from '../prisma/prisma';
import { AutoType } from '../types/Auto';
import { ButtonType } from '../types/Button';
import { GuildSettings, QuestionCache } from '../types/Cache';
import { CommandType } from '../types/Command';
import { RegisterCommandsOptions } from '../types/CommandRegister';
import { MessageContextMenuType, UserContextMenuType } from '../types/ContextMenu';
import { ModalType } from '../types/Modal';
import { CONTENT, defaultGuildSetting, NUMBER } from '../utils/const';
import { logger } from '../utils/logger';
import { awaitWrap, fetchGuildDefaultAdminRoleFromAuditLog } from '../utils/util';
import { myCache } from './Cache';
import { Event } from './Event';

const globPromise = promisify(glob);

export class MyClient extends Client {
	public commands: Collection<
		string,
		CommandType | MessageContextMenuType | UserContextMenuType
	> = new Collection();
	public buttons: Collection<string, ButtonType> = new Collection();
	public modals: Collection<string, ModalType> = new Collection();
	public autos: Collection<string, AutoType> = new Collection();

	private table: any;

	public constructor() {
		super({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
				GatewayIntentBits.GuildMembers,
				GatewayIntentBits.GuildPresences
			]
		});

		this.table = new AsciiTable('Cache Loading ...');
		this.table.setHeading('Data', 'Status');
	}

	public start() {
		try {
			this._loadFiles();
			this.login(process.env.TOKEN);
		} catch (error) {
			logger.error(error?.message);
		}
	}

	private async _registerCommands({ guildId, commands }: RegisterCommandsOptions) {
		if (guildId) {
			// Register the commands in this guild
			this.guilds.cache.get(guildId)?.commands.set(commands);
			logger.info('Commands are set locally.');
		} else {
			// Register the commands in this application, covering all guilds
			// this.application.commands?.set([]);
			this.application.commands?.set(commands);
			logger.info('Commands are set globally.');
		}
	}

	private async _importFiles(filePath: string) {
		return (await import(filePath))?.default;
	}

	private async _loadFiles() {
		// Load Commands
		const slashCommands: Array<
			| ChatInputApplicationCommandData
			| MessageApplicationCommandData
			| UserApplicationCommandData
		> = [];
		const commandFiles = await globPromise(`${__dirname}/../commands/*{.ts,.js}`);

		commandFiles.forEach(async (filePath) => {
			const command: CommandType = await this._importFiles(filePath);

			if (!command.name) return;
			this.commands.set(command.name, command);
			slashCommands.push(command);
		});

		const buttonFiles = await globPromise(`${__dirname}/../buttons/*{.ts,.js}`);

		buttonFiles.forEach(async (filePath) => {
			const button: ButtonType = await this._importFiles(filePath);

			button.customIds.forEach((customId) => {
				this.buttons.set(customId, button);
			});
		});

		const modalFiles = await globPromise(`${__dirname}/../modals/*{.ts,.js}`);

		modalFiles.forEach(async (filePath) => {
			const modal: ModalType = await this._importFiles(filePath);

			this.modals.set(modal.customId, modal);
		});

		const autoFiles = await globPromise(`${__dirname}/../autocompletes/*{.ts,.js}`);

		autoFiles.forEach(async (filePath) => {
			const auto: AutoType = await this._importFiles(filePath);

			this.autos.set(auto.correspondingCommandName, auto);
		});

		const menuFiles = await globPromise(`${__dirname}/../contextmenus/*{.ts,.js}`);

		menuFiles.forEach(async (filePath) => {
			const menu: MessageContextMenuType | UserContextMenuType = await this._importFiles(
				filePath
			);

			this.commands.set(menu.name, menu);
			slashCommands.push(menu);
		});

		this.once('ready', async () => {
			logger.info('Bot is online');
			await this.guilds.fetch();
			await this._loadCache();
			setInterval(this._presenseUpdate, NUMBER.PRESENCE_UPDATE_INTERVAL, this);
			if (process.env.MODE === 'dev') {
				await this._registerCommands({
					guildId: process.env.GUILDID,
					commands: slashCommands
				});
			} else {
				this._registerCommands({
					commands: slashCommands
				});
			}
		});

		// Load Events
		const eventFiles = await globPromise(`${__dirname}/../events/*{.ts,.js}`);

		eventFiles.forEach(async (filePath) => {
			const event: Event<keyof ClientEvents> = await this._importFiles(filePath);

			this.on(event.eventName, event.run);
		});
	}

	private async _loadCache() {
		await prisma.$connect();

		const guildsInDB = await prisma.guild.findMany();
		const guildSettings: GuildSettings = guildsInDB.reduce((pre, cur) => {
			const { id } = cur;

			delete cur.id;
			pre[id] = cur;
			return pre;
		}, {});

		const questionsInDB = await prisma.question.findMany({
			where: {
				solved: true
			}
		});
		const questions: QuestionCache = questionsInDB.reduce((pre, cur) => {
			const { id, discordId } = cur;

			if (discordId in pre) {
				pre[discordId][id] = {
					summary: cur.summary,
					id: cur.id
				};
			} else {
				pre[discordId] = {
					[id]: {
						summary: cur.summary,
						id: cur.id
					}
				};
			}
			return pre;
		}, {});

		const newGuildData: Array<Prisma.GuildCreateManyInput> = [];

		for (const [guildId, guild] of this.guilds.cache) {
			const guildInform = guildSettings[guildId];
			const questionInform = questions[guildId];

			if (!guildInform) {
				const defaultGuildInform = defaultGuildSetting;
				const defaultAdminRoleId = await fetchGuildDefaultAdminRoleFromAuditLog(guild);

				if (defaultAdminRoleId) {
					defaultGuildInform.adminRole = defaultAdminRoleId;
				}
				newGuildData.push({
					id: guildId,
					...defaultGuildInform
				});
				guildSettings[guildId] = defaultGuildInform;
			}

			if (!questionInform) {
				questions[guildId] = {};
			}
		}
		if (newGuildData.length !== 0) {
			try {
				await prisma.guild.createMany({
					data: newGuildData,
					skipDuplicates: true
				});
			} catch (error) {
				this.table.addRow('Guilds', `❌ Error: ${error?.message}`);
				logger.info(`\n${this.table.toString()}`);
				process.exit(1);
			}
		}

		myCache.mySet('Guild', guildSettings);
		myCache.mySet('Questions', questions);
		this.table.addRow('Guilds', `✅ Fetched and cached`);
		this.table.addRow('Questions', `✅ Fetched and cached`);

		logger.info(`\n${this.table.toString()}`);
	}

	private async _presenseUpdate(client: MyClient) {
		const { result: solvedCounter, error: solvedError } = await awaitWrap(
			prisma.question.count({
				where: {
					solved: true
				}
			})
		);
		const { result: raisedCounter, error: raisedError } = await awaitWrap(
			prisma.question.count()
		);

		if (solvedError || raisedError) return;
		client.user.setPresence({
			status: PresenceUpdateStatus.Online,
			activities: [
				{
					name: sprintf(CONTENT.PRESENCE, {
						solvedCounter,
						raisedCounter
					}),
					type: ActivityType.Watching
				}
			]
		});
	}
}
