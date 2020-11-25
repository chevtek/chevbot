enum ConfigProperties { 
  COMMAND_PREFIX,
  DISCORD_BOT_TOKEN,
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  MONGODB_CONNECTION_STRING,
  PORT
};

export default Object.keys(ConfigProperties).reduce((config, key) => {
  if (!isNaN(parseInt(key))) return config;
  if (!process.env[key]) throw new Error(`Environment variable ${key} is not defined but is required for Chevbot to run.`);
  config[key] = process.env[key];
  return config;
}, {} as {[key in keyof typeof ConfigProperties]: string});