import moment from "moment-timezone";
import { Message, MessageEmbed } from "discord.js";
import discordClient from "../discord-client";
import { initEventRsvp } from "../utilities";
import db from "../db";

export const command = "event <title> <date> [description]";

export const description = "Plan an event and allow server members to register for it.";

export const builder = yargs => yargs
  .option("title", {
    required: true,
    description: "The title of the event you would like to create.",
    type: "string"
  })
  .option("date", {
    required: true,
    description: "The date and time for the event. (Ex: \"1/1/2021 12:00 PM\")",
    type: "string"
  })
  .option("time-zone", {
    alias: ["tz"],
    description: "The time zone for this event.",
    default: "America/Denver"
  })
  .option("description", {
    alias: ["desc"],
    description: "An optional description of event details.",
    type: "string"
  })
  .option("notify", {
    default: "@everyone",
    description: "What role to notify about this event.",
    type: "string"
  })
  .option("image", {
    alias: ["img"],
    type: "string"
  });

const yesEmoji = "773708749051396136";
const maybeEmoji = "773708770823635014";

export async function handler ({ discord, title, date, description, notify, image, timeZone }) {
  const { events } = db;

  const message = discord.message as Message;

  const parsedDate = moment.tz(date, "M/D/YYYY h:mm a", true, timeZone);
  if (!parsedDate.isValid()) {
    await message.reply("Invalid date. Please ensure the date adheres to the \"M/D/YYYY h:mm a\" format. Example: \"1/1/2021 7:00 PM\"");
    return;
  }
  const roleName = `${title} (${parsedDate.format("M/D ha z")})`;

  const eventRole = await message.guild!.roles.create({
    data: {
      name: roleName,
      color: "#00ff00",
    },
    reason: "Created automatically by Chevbot for use with an event entry.",
  })!;

  const embed = new MessageEmbed()
    .setTitle(title)
    .setColor("#00ff00")
    .setDescription(`
      **When:**
      ${parsedDate.format("dddd, MMM Do YYYY")} at ${parsedDate.format("h:mm a z")}

      **Description:**
      ${description || "No description."}

      **<:yes:${yesEmoji}> - "I plan on attending."**
      **<:maybe:${maybeEmoji}> - "I'm interested but not sure if I'll be there."**

      *Either option will give you the <@&${eventRole.id}> role so you get event updates.
    `)
    .attachFiles(["./images/chevtek.png", "./images/calendar-icon.png"])
    .setThumbnail("attachment://calendar-icon.png")
    .setFooter("Powered by Chevtek", "attachment://chevtek.png");

  if (image) embed.setImage(image);

  await message.channel.send(notify);
  const eventMessage = await message.channel.send(embed);

  await eventMessage.react(yesEmoji);
  await eventMessage.react(maybeEmoji);

  const { resource: event } = await events!.items.upsert({
    title,
    date,
    description,
    notify,
    messageId: eventMessage.id,
    channelId: eventMessage.channel.id,
    guildId: message.guild!.id,
    roleId: eventRole.id,
    _partitionKey: "/_partitionKey"
  });

  await message.delete();

  await initEventRsvp(event);
}