import { Question } from '@prisma/client';

export interface CacheType {
	Guild: GuildSettings;
	Questions: QuestionCache;
}

export interface GuildInform {
	taRole: string;
	adminRole: string;
	questionChannelId: string;
}

type GuildId = string;
type ThreadId = string;

export type GuildSettings = Record<GuildId, GuildInform>;
export type QuestionInform = Pick<Question, 'summary'>;
export type QuestionCache = Record<GuildId, Record<ThreadId, QuestionInform>>;
