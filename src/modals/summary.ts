import { Modal } from '../structures/Modal';

export default new Modal({
	customId: 'summary',
	execute: async ({ interaction }) => {
		const summary = interaction.fields.getTextInputValue('summary_input').trim();

		return interaction.reply({
			content: `Your input is received: ${summary}`,
			ephemeral: true
		});
	}
});
