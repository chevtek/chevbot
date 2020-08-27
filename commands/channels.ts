import { TextChannel, MessageEmbed } from "discord.js";
import discordClient from "../discord-client";

export const description = "List all channels and their descriptions.";

export async function handler({ discord }) {

  const { message } = discord;
  const { channel } = message;

  if (channel.type === "dm") {
    message.reply("This command can only be run from a server.");
    return;
  }

  const channels = discordClient.channels.cache
    .filter(info => info.type === "text")
    .map(channel => channel as TextChannel)
    .sort((a: any, b: any) => (a.name > b.name) ? 1 : -1);

  await message.author.send(new MessageEmbed({
    title: `${channel.guild.name} Channels`,
    thumbnail: {
      url: channel.guild.iconURL()
    },
    color: 0x00ff00,
    fields: channels.map(({ name, topic }) => ({
      name,
      value: topic && topic.length ? topic : "No description."
    })),
    footer: {
      text: `If you would like to join a private channel, please message an admin for ${channel.guild.name}.`
    }
  }));

  channel.send(`<@${message.author.id}> I have sent you a private message with a list of all the channels on this server <:awesome:708028362488021092>`);

}
