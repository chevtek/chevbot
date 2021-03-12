import { GuildMember, Snowflake } from "discord.js";
import config from "../config";

const {
  AWESOME_EMOJI_ID,
  JOURNAL_CATEGORY_ID
} = config;

export default async function (member: GuildMember): Promise<Snowflake> {
  const guild = member.guild;
  const everyoneRole = guild.roles.cache.find(r => r.name === '@everyone')!;

  const channel = await guild.channels.create(`${member.displayName}s-journal`, {
    parent: JOURNAL_CATEGORY_ID,
    permissionOverwrites: [
      {
        id: everyoneRole.id,
        deny: ["SEND_MESSAGES"]
      },
      {
        id: member.id,
        allow: ["SEND_MESSAGES", "MANAGE_CHANNELS", "MANAGE_MESSAGES", "MANAGE_WEBHOOKS", "MANAGE_ROLES"]
      }
    ]
  });

  await channel.send(`Welcome, <@${member.id}>! This is your own personal journal channel. Only you can post here <:awesome:${AWESOME_EMOJI_ID}>`);
  return channel.id;
}