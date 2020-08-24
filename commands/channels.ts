import { TextChannel, MessageEmbed } from "discord.js";
import discordClient from "../discord-client";

export const description = "List all channels and their descriptions.";

export function handler({ discord }) {

  const { channel } = discord.message;

  const channels = discordClient.channels.cache
    .filter(info => info.type === "text")
    .map(channel => channel as TextChannel)
    .sort((a: any, b: any) => (a.name > b.name) ? 1 : -1);

  channel.send(new MessageEmbed({
    title: `${channel.guild.name} Channels`,
    thumbnail: {
      url: channel.guild.iconURL()
    },
    color: 0x00ff00,
    fields: channels.map(({ name, topic }) => ({
      name,
      value: topic && topic.length ? topic : "No description."
    }))
  }));

}
