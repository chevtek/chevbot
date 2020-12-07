import axios from "axios";
import discordClient from "../discord-client";
import { MessageEmbed } from "discord.js";
import TurndownService from "turndown";

const turndownService = new TurndownService();
turndownService.addRule('italics', {
  filter: ['em', 'i'],
  replacement: function (content) {
    return '*' + content + '*'
  }
});
const turndown = turndownService.turndown.bind(turndownService);

export default async function () {
  const {data:{data:{
    Events: events,
    Births: births,
    Deaths: deaths
  }}} = await axios.get("https://history.muffinlabs.com/date");
  const event = events[Math.floor(Math.random() * events.length)];
  const birth = births[Math.floor(Math.random() * births.length)];
  const death = deaths[Math.floor(Math.random() * deaths.length)];
  const embed = new MessageEmbed()
    .setTitle(`On this day in history!`)
    .setThumbnail(discordClient.user!.avatarURL({ format: "png" })!)
    .setDescription(`**Event**\n${turndown(event.html)}\n\n**Birth**\n${turndown(birth.html)}\n\n**Death**\n${turndown(death.html)}`)
    .setColor("#00ff00")
    .setFooter("Powered by MuffinLabs.com", "https://github.com/muffinista.png");
  const channels = discordClient.guilds.cache.map(guild => guild.systemChannel);
  await Promise.all(channels.map(channel => channel?.send(embed)));
}