import { AutocompleteInteraction } from 'discord.js';
import { MyClient } from '../structures/Client';
import { CommandNameEnum } from './Command';

interface AutoRunOptions {
	client: MyClient;
	interaction: AutocompleteInteraction;
}

type RunFunction = (options: AutoRunOptions) => any;
export interface AutoType {
	correspondingCommandName: CommandNameEnum;
	execute: RunFunction;
}
