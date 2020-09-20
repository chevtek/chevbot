import axios from "axios";
import discordClient from "../discord-client";
import moment from "moment-timezone";
import { MessageEmbed } from "discord.js";

export default async function () {
  setInterval(async () => {
    try {
      const now = moment().tz("America/Denver");
      if (now.hour() === 5) {
        const {data:{data:{
          Events: events,
          Births: births,
          Deaths: deaths
        }}} = await axios.get("https://history.muffinlabs.com/date");
        const event = events[Math.floor(Math.random() * events.length)];
        const birth = births[Math.floor(Math.random() * births.length)];
        const death = deaths[Math.floor(Math.random() * deaths.length)];
        event.markdown = event.html.replace(/<a href="([^"]+)"[^>]+>([^<]+)<\/a>/g, (match, href, text) => `[${text}](${href})`);
        birth.markdown = birth.html.replace(/<a href="([^"]+)"[^>]+>([^<]+)<\/a>/g, (match, href, text) => `[${text}](${href})`);
        death.markdown = death.html.replace(/<a href="([^"]+)"[^>]+>([^<]+)<\/a>/g, (match, href, text) => `[${text}](${href})`);
        const embed = new MessageEmbed()
          .setTitle(`On this day in history!`)
          .setThumbnail(discordClient.user!.avatarURL({ format: "png" })!)
          .setDescription(`**Event**\n${event.markdown}\n\n**Birth**\n${birth.markdown}\n\n**Death**\n${death.markdown}`)
          .setColor("#00ff00")
          .setFooter("Powered by MuffinLabs.com", "https://github.com/muffinista.png");
        const channels = discordClient.guilds.cache.map(guild => guild.systemChannel);
        await Promise.all(channels.map(channel => channel?.send(embed)));
      }
    } catch (err) {
      console.log("ON_THIS_DAY", err);
    }
  }, 1 * (60 * 60 * 1000));
}