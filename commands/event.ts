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
    default: discordClient.user!.avatarURL({ format: "png" }),
    type: "string"
  });

const yesEmoji = "749412605218652381";

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

      **RSVP by reacting to this post with <:yes:${yesEmoji}>**
    `)
    .setImage(image)
    .attachFiles(["./images/chevtek.png"])
    .setFooter("Powered by Chevtek", "attachment://chevtek.png");

  await message.channel.send(notify);
  const eventMessage = await message.channel.send(embed);

  await eventMessage.react(yesEmoji);

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