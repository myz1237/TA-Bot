import { prisma } from '../prisma/prisma';
import { myCache } from '../structures/Cache';
import { Modal } from '../structures/Modal';

export default new Modal({
	customId: 'summary',
	execute: async ({ interaction }) => {
		const summary = interaction.fields.getTextInputValue('summary_input').trim();
		const { message, guildId } = interaction;
		const threadId = message.embeds[0].footer.text.match(/\d+/g)[0];

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
		}

		return interaction.reply({
			content: `You have successfully submitted this summary, thanks for your contribution.`,
			ephemeral: true
		});
	}
});
