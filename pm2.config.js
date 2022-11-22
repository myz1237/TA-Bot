const projectName = 'ta-bot';

module.exports = {
	apps: [
		{
			name: projectName,
			autorestart: true,
			exec_mode: 'fork',
			watch: true,
			script: './dist/index.js',
			error_file: `~/.pm2/logs/${projectName}-error.log`,
			out_file: `~/.pm2/logs/${projectName}-out.log`,
			ignore_watch: ['node_modules', 'src'],
		}
	]
};
