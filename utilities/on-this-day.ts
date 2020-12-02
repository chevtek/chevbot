import axios from "axios";
import discordClient from "../discord-client";
import { MessageEmbed } from "discord.js";

export default async function () {
  const {data:{data:{
    Events: events,
    Births: births,
    Deaths: deaths
  }}} = await axios.get("https://history.muffinlabs.com/date");
  const event = events[Math.floor(Math.random() * events.length)];
  const birth = births[Math.floor(Math.random() * births.length)];
  const death = deaths[Math.floor(Math.random() * deaths.length)];
  const formatTags = html => html
    .replace(/<a href="([^"]+)"[^>]+>([^<]+)<\/a>/g, (match, href, text) => `[${text}](${href})`)
    .replace(/<i>([^<]+)<\/i>/g, (match, text) => `_${text}_`)
    .replace(/<b>([^<]+)<\/b>/g, (match, text) => `**${text}**`);
  [event, birth, death].forEach(item => item.markdown = formatTags(item.html));
  const embed = new MessageEmbed()
    .setTitle(`On this day in history!`)
    .setThumbnail(discordClient.user!.avatarURL({ format: "png" })!)
    .setDescription(`**Event**\n${event.markdown}\n\n**Birth**\n${birth.markdown}\n\n**Death**\n${death.markdown}`)
    .setColor("#00ff00")
    .setFooter("Powered by MuffinLabs.com", "https://github.com/muffinista.png");
  const channels = discordClient.guilds.cache.map(guild => guild.systemChannel);
  await Promise.all(channels.map(channel => channel?.send(embed)));
}