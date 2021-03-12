import { Message } from "discord.js"
import { addJournalChannel } from "../functions";
import config from "../config";

const { ALERIS_GUILD_ID } = config;

export const command = "create-journal <user>";

export const description = false;

export async function handler ({ discord, user }) {
  const message = discord.message as Message;
  if (message.channel.type === "dm" || message.guild!.id !== ALERIS_GUILD_ID) {
    return message.reply("This command can only be run from the Aleris and Friends server.");
  }
  if (!user) {
    return message.reply("Invalid user supplied.");
  }
  const memberId = user.match(/^<@!?(\d+)>$/)?.[1];
  if (!memberId) {
    return message.reply("Invalid user supplied.");
  }
  const member = message.guild!.members.cache.get(memberId)!;
  const channelId = await addJournalChannel(member);
  return message.reply(`Successfully created journal channel: <#${channelId}>`);
}