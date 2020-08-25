export const command = "echo [--channel] <message..>";

export const description = "Ask the bot to repeat a message you type.";

export async function handler ({ discord, message, channel: channelName }) {
  let discordChannel = discord.message.channel;
  if (channelName) {
    discordChannel = discord.message.member.guild.channels.cache.find(ch => ch.name === channelName.toLowerCase());
  }
  discordChannel.send(message.join(" "));
}
