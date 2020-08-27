export const command = "echo <message..>";

export const description = "Ask the bot to repeat a message you type.";

export const builder = yargs => yargs
  .option("channel", { 
    alias: "c",
    description: "Override which channel the message is sent to."
  })
  .positional("message", {
    description: "stuff and things"
  });

export async function handler ({ discord, message, channel: channelName }) {
  let discordChannel = discord.message.channel;
  if (channelName) {
    if (discordChannel.type === "dm") {
      discord.message.reply("You can only use the `--channel` option from a server.");
      return;
    }
    discordChannel = discord.message.member.guild.channels.cache.find(ch => ch.name === channelName.toLowerCase());
  }
  discordChannel.send(message.join(" "));
}
