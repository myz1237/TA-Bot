import { ButtonInteraction, GuildMember, Message } from 'discord.js';

import { MyClient } from '../structures/Client';

export interface ExtendedButtonInteraction extends ButtonInteraction {
	member: GuildMember;
	message: Message;
}

interface ButtonRunOptions {
	client: MyClient;
	interaction: ExtendedButtonInteraction;
}

type RunFunction = (options: ButtonRunOptions) => any;
type ButtonCustomId = '';
export type ButtonCollectorCustomId = '';
export interface ButtonType {
	customIds: Array<ButtonCustomId>;
	execute: RunFunction;
}
