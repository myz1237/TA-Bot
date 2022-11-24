/* eslint-disable no-unused-vars */
import { CommandNameEnum } from './types/Command';

declare global {
	namespace NodeJS {
		interface ProcessEnv {
			TOKEN: string;
			GUILDID: string;
			MODE: 'dev' | 'prod';
			DATABASE_URL: string;
		}
	}
}

export {};
