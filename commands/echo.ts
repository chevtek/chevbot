export const command = "echo [--channel] <message..>";

export const description = false;

export async function handler ({ discord, message, channel: channelName }) {
  let discordChannel = discord.message.channel;
  if (channelName) {
    discordChannel = discord.message.member.guild.channels.cache.find(ch => ch.name === channelName.toLowerCase());
  }
  discordChannel.send(message.join(" "));
}
