export interface CacheType {
	Guild: GuildSettings;
}

export interface GuildInform {
	taRole: string;
	adminRole: string;
	questionChannelId: string;
}

type GuildId = string;

export type GuildSettings = Record<GuildId, GuildInform>;
