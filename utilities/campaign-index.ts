import { TextChannel } from "discord.js";
import db from "../db";
import config from "../config";
import discordClient from "../discord-client";

const {
  CHEVCAST_GUILD_ID,
  CAMPAIGN_INDEX_CHANNEL_ID
} = config;

export default async function () {
  discordClient.on("message", message => {
    if (message.channel.id !== CAMPAIGN_INDEX_CHANNEL_ID) return;
    if (message.author.id === discordClient.user?.id) return;
    message.reply("campaign-index message received");
  });
}
