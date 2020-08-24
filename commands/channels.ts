import { TextChannel, MessageEmbed } from "discord.js";
import discordClient from "../discord-client";

export const description = "List all channels and their descriptions.";

export function handler({ message }) {

  const channels = discordClient.channels.cache
    .filter(info => info.type === "text")
    .map(channel => channel as TextChannel)
    .sort((a: any, b: any) => (a.name > b.name) ? 1 : -1);

  message.channel.send(new MessageEmbed({
    title: `${message.channel.guild.name} Channels`,
    thumbnail: {
      url: message.channel.guild.iconURL()
    },
    color: 0x00ff00,
    fields: channels.map(({ name, topic }) => ({
      name,
      value: topic && topic.length ? topic : "No description."
    }))
  }));

}
