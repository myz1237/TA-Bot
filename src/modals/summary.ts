import { prisma } from '../prisma/prisma';
import { myCache } from '../structures/Cache';
import { Modal } from '../structures/Modal';
import { CommandNameEnum } from '../types/Command';
import { fetchCommandId } from '../utils/util';

export default new Modal({
	customId: 'summary',
	execute: async ({ interaction }) => {
		const summary = interaction.fields.getTextInputValue('summary_input').trim();
		const { message, guildId, guild } = interaction;
		const threadId = message.embeds[0].footer.text.match(/\d+/g)[0];
		const answerCommandId = fetchCommandId(CommandNameEnum.Answer, guild);

		await interaction.deferReply({ ephemeral: true });

		const result = await prisma.question.update({
			where: {
				id: threadId
			},
			data: {
				summary: summary
			},
			select: {
				solved: true
			}
		});

		if (result.solved) {
			myCache.mySet('Questions', {
				...myCache.myGet('Questions'),
				[guildId]: {
					...myCache.myGet('Questions')[guildId],
					[threadId]: {
						summary: summary
					}
				}
			});

			return interaction.followUp({
				content: `You have successfully submitted this summary. Now you can find your summary in </${CommandNameEnum.Answer}:${answerCommandId}> command`
			});
		} else {
			return interaction.followUp({
				content: `You have successfully submitted this summary. You can find your summary in </${CommandNameEnum.Answer}:${answerCommandId}> command after you solve this question.`
			});
		}
	}
});
