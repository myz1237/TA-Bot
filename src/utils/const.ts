/* eslint-disable no-unused-vars */
import { ButtonCollectorCustomId } from '../types/Button';
import { CacheType, GuildInform } from '../types/Cache';

type NumericalProperty = 'AWAIT_TIMEOUT' | 'AUTOCOMPLETE_OPTION_LENGTH';
type ErroProperty = 'COMMON' | 'GRAPHQL' | 'INTERACTION' | 'BUTTON' | 'AUTO' | 'MODAL' | 'MENU';
type LinkProperty = 'THREAD';

type Numerical = Readonly<Record<NumericalProperty, number>>;
type InternalError = Readonly<Record<ErroProperty, string>>;
type Link = Readonly<Record<LinkProperty, string>>;

export const NUMBER: Numerical = {
	AWAIT_TIMEOUT: 15 * 1000,
	AUTOCOMPLETE_OPTION_LENGTH: 25
};

export const LINK: Link = {
	THREAD: 'https://discord.com/channels/%(guildId)s/%(threadId)s'
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
	Guild: 'Guild'
};

export const defaultGuildSetting: GuildInform = {
	adminRole: '',
	questionChannelId: '',
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
	Start = 'Start Timestamp',
	End = 'End Timestamp'
}
