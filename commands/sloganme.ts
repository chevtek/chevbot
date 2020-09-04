import { Message } from "discord.js";
import db from "../db";

export const command = "sloganme";

export const description = "Sign me up for Mirima's mystery slogan!";

export const builder = {
  "add-slogan": {
    type: "string",
    hidden: true
  },
  "remove-slogan": {
    type: "string",
    hidden: true
  },
  "list-slogans": {
    type: "boolean",
    default: false,
    hidden: true
  }
};

export async function handler({ discord, add, remove, list }) {
  const message = discord.message as Message;
  const { sloganMembers, sloganTemplates } = db;
  if (add) {
    if (add.length > 32) {
      message.reply("Slogans cannot be more than 32 characters long.");
      return;
    }
    sloganTemplates!.items.create({
      template: add
    });
    message.reply("Slogan added!");
    return;
  }
  if (list) {
    const { resources: templates } = await sloganTemplates!.items.readAll().fetchAll();
    message.reply(templates.map(doc => `${doc.id}: ${doc.template}`).join("\n"), { split: true });
    return;
  }
  if (remove) {
    await sloganTemplates!.item(remove).delete();
    message.reply("Slogan deleted.");
    return;
  }
  const { resource: member } = await sloganMembers!.item(message.author.id).read();
  if (member) {
    await sloganMembers!.item(message.author.id).delete();
    message.reply("You have been unsubscribed from sloganme!");
    return;
  }
  await sloganMembers!.items.create({
    id: message.author.id,
    guildId: message.guild!.id
  });
  message.reply("You are now subscribed to sloganme!");
}