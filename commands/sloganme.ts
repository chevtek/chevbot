import { Message } from "discord.js";
import db from "../db";

export const command = "sloganme";

export const description = "Sign me up for Mirima's mystery slogan!";

export const builder = {
  "add": {
    type: "string"
  },
  "remove": {
    type: "string",
    hidden: true
  },
  "list": {
    type: "boolean",
    default: false,
    hidden: true
  }
};

export async function handler({ discord, add, remove, list }) {
  const message = discord.message as Message;
  const { sloganMembers, sloganTemplates } = db;
  if (add) {
    const newTemplate = add as string;
    if (newTemplate.length > 32) {
      message.reply(`Slogans cannot be more than 32 characters long. Yours was ${newTemplate.length} characters long.`);
      return;
    }
    if (!newTemplate.includes("{{name}}")) {
      message.reply("Slogan template must include at least one instance of `{{name}}`.");
      return;
    }
    const { resources: [existingTemplate] } = await sloganTemplates!.items.query({
      query: "SELECT * FROM c where c.template = @newTemplate",
      parameters: [{ name: "@newTemplate",  value: newTemplate }]    
    }, { partitionKey: "/_partitionKey" }).fetchAll();
    if (existingTemplate) {
      message.reply("That slogan already exists.");
      return;
    }
    sloganTemplates!.items.create({
      template: newTemplate,
      _partitionKey: "/_partitionKey"
    });
    message.reply("Slogan added!");
    return;
  }
  if (list) {
    const { resources: templates } = await sloganTemplates!.items.readAll({ partitionKey: "/_partitionKey" }).fetchAll();
    message.reply(templates.map(doc => `${doc.id}: ${doc.template}`).join("\n"), { split: true });
    return;
  }
  if (remove) {
    await sloganTemplates!.item(remove, "/_partitionKey").delete();
    message.reply("Slogan deleted.");
    return;
  }
  const { resource: member } = await sloganMembers!.item(message.author.id, "/_partitionKey").read();
  if (member) {
    await sloganMembers!.item(message.author.id, "/_partitionKey").delete();
    message.reply("You have been unsubscribed from sloganme!");
    return;
  }
  await sloganMembers!.items.create({
    id: message.author.id,
    guildId: message.guild!.id,
    _partitionKey: "/_partitionKey"
  });
  message.reply("You are now subscribed to sloganme! Every hour a D20 is rolled. If it rolls a 20 then all subscribers will see their name changed. If you'd like to contribute additional slogans, simply run `/sloganme --add \"The Power of {{name}}!\"`, making sure to include at least one instance of `{{name}}` in the slogan.");
}