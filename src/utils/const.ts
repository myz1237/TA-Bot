/* eslint-disable no-unused-vars */
import { Guild } from '@prisma/client';

import { ButtonCollectorCustomId } from '../types/Button';
import { CacheType, GuildInform } from '../types/Cache';

type NumericalProperty =
	| 'AWAIT_TIMEOUT'
	| 'AUTOCOMPLETE_OPTION_LENGTH'
	| 'RECORD_PER_EMBED_MSG'
	| 'EMBED_PER_MSG'
	| 'PRESENCE_UPDATE_INTERVAL';
type ErroProperty = 'COMMON' | 'GRAPHQL' | 'INTERACTION' | 'BUTTON' | 'AUTO' | 'MODAL' | 'MENU';
type LinkProperty = 'THREAD' | 'IMAGE_WAITING' | 'IMAGE_CLAIMED' | 'IMAGE_SOLVED' | 'MESSAGE';
type ContentProperty = 'DATA_ROW' | 'WEEK_ROW' | 'MONTH_ROW' | 'HYPE_ROW' | 'PRESENCE';

type Numerical = Readonly<Record<NumericalProperty, number>>;
type InternalError = Readonly<Record<ErroProperty, string>>;
type Link = Readonly<Record<LinkProperty, string>>;
type Content = Readonly<Record<ContentProperty, string>>;

export const NUMBER: Numerical = {
	AWAIT_TIMEOUT: 15 * 1000,
	AUTOCOMPLETE_OPTION_LENGTH: 25,
	RECORD_PER_EMBED_MSG: 2,
	EMBED_PER_MSG: 10,
	PRESENCE_UPDATE_INTERVAL: 1 * 60 * 1000
};

export const LINK: Link = {
	MESSAGE: 'https://discord.com/channels/%(guildId)s/%(channelId)s/%(messageId)s',
	THREAD: 'https://discord.com/channels/%(guildId)s/%(threadId)s',
	IMAGE_WAITING:
		'https://cdn.discordapp.com/attachments/1006879175266816092/1045881608328183899/2022-11-26_09.50.11.png',
	IMAGE_CLAIMED:
		'https://cdn.discordapp.com/attachments/1006879175266816092/1045878335005265980/image.png',
	IMAGE_SOLVED:
		'https://cdn.discordapp.com/attachments/1006879175266816092/1045908111967399947/2022-11-26_11.44.42.png'
};

export const CONTENT: Content = {
	DATA_ROW:
		'> <@%(userId)s>  `%(totalHours)s`mins  `%(answerCount)d`answers  `%(avgHours)s`Avg Resonse mins\n',
	WEEK_ROW: '**WEEK** `%(week)s`, %(year)s: UTC <t:%(start)s:d> -- UTC <t:%(end)s:d>\n',
	MONTH_ROW: '**MONTH** `%(month)s`, %(year)s: UTC <t:%(start)s:d> -- UTC <t:%(end)s:d>\n',
	HYPE_ROW: '> <@%(userId)s> has hyped `%(hypeCount)s` messages\n',
	PRESENCE: '✅  %(solvedCounter)s|❓  %(raisedCounter)s | 🤖  Buidl'
};

export const ERROR_REPLY: InternalError = {
	GRAPHQL: 'Error occured when running `%(action)s`: %(errorMessage)s',
	COMMON: 'Unknown Error, please report this to the admin',
	INTERACTION:
		'User: %(userName)s Guild: %(guildName)s Error: %(errorName)s occurs when executing %(commandName)s command. Msg: %(errorMsg)s Stack: %(errorStack)s.',
	BUTTON: 'User: %(userName)s Guild: %(guildName)s Error: %(errorName)s occurs when interacting %(customId)s button. Msg: %(errorMsg)s Stack: %(errorStack)s.',
	AUTO: 'User: %(userName)s Guild: %(guildName)s Error: %(errorName)s occurs when interacting %(commandName)s auto. Msg: %(errorMsg)s Stack: %(errorStack)s.',
	MODAL: 'User: %(userName)s Guild: %(guildName)s Error: %(errorName)s occurs when interacting %(customId)s modal. Msg: %(errorMsg)s Stack: %(errorStack)s.',
	MENU: 'User: %(userName)s Guild: %(guildName)s Error: %(errorName)s occurs when executing %(menuName)s menu. Msg: %(errorMsg)s Stack: %(errorStack)s.'
};

export const ButtonCollectorCustomIdRecord: Readonly<Record<ButtonCollectorCustomId, string>> = {
	'': ''
};

export const CACHE_KEYS: Readonly<Record<keyof CacheType, keyof CacheType>> = {
	Guild: 'Guild',
	Questions: 'Questions'
};

export const defaultGuildSetting: GuildInform = {
	adminRole: '',
	questionChannelId: '',
	hypeChannelId: '',
	taRole: ''
};

export enum QuestionStatus {
	Wait = 'WAITING',
	Claimed = 'CLAIMED',
	Solved = 'SOLVED'
}

export enum FieldsName {
	Status = 'Status',
	RaisedBy = 'Raised By',
	ClaimedBy = 'Claimed By',
	Start = 'Start',
	Claim = 'Claimed',
	End = 'Resolved'
}

export enum ChannelSubCommandName {
	QuestionChannel = 'question',
	HypeChannel = 'hype'
}

export const ChannelSubCommandNameToDbProperty: Readonly<
	Record<ChannelSubCommandName, keyof Guild>
> = {
	question: 'questionChannelId',
	hype: 'hypeChannelId'
};
