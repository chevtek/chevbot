enum ConfigProperties { 
  ALERIS_GUILD_ID,
  AWESOME_EMOJI_ID,
  CHEVCAST_GUILD_ID,
  CAMPAIGN_INDEX_CHANNEL_ID,
  COMMAND_PREFIX,
  DISCORD_BOT_TOKEN,
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  JOURNAL_CATEGORY_ID,
  MAYBE_EMOJI_ID,
  MONGODB_CONNECTION_STRING,
  PORT,
  YES_EMOJI_ID
};

export default Object.keys(ConfigProperties).reduce((config, key) => {
  if (!isNaN(parseInt(key))) return config;
  if (!process.env[key]) throw new Error(`Environment variable ${key} is not defined but is required for Chevbot to run.`);
  config[key] = process.env[key];
  return config;
}, {} as {[key in keyof typeof ConfigProperties]: string});