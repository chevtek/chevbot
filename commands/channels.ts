import { TextChannel } from "discord.js";

export const description = "List all channels and their descriptions";

export function exec(argv, context) {

  const { discord, message } = context;

  const channels = discord.channels.cache
    .filter(info => info.type === "text")
    .map(channel => channel as TextChannel)
    .sort((a: any, b: any) => (a.name > b.name) ? 1 : -1);

  const lines: string[] = [];
  for (const channel of channels) {
    const {name, topic} = channel;
    lines.push(`> **${name}:** ${topic && topic.length ? topic : "No description."}`);
  }

  message.channel.send(lines.join('\n'));

}
