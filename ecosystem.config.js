require('dotenv').config();

const PORT = process.env.PORT || 5000;

module.exports = {
	apps: [
		{
			name: `bliss-server-${PORT}`,
			script: "dist/src/server.js",
			env: {
				NODE_ENV: "production",
				PORT: PORT
			},
			restart_delay: 5000,
			autorestart: true,
			watch: false,
			max_restarts: 10,
			out_file: "./logs/out.log",
			error_file: "./logs/error.log",
			log_date_format: "YYYY-MM-DD HH:mm Z"
		}
	]
};


