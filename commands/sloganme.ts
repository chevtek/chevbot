import { Message } from "discord.js";
import db from "../db";
import sloganChecker from "../utilities/slogan-checker";

export const command = "sloganme";

export const description = "Sign me up for Mirima's mystery slogan!";

export const builder = {
  "add": {
    type: "string",
    description: "Add a new slogan template to the database."
  },
  "count": {
    type: "boolean",
    description: "Show how many slogan templates are in the database."
  },
  "remove": {
    type: "string",
    hidden: true
  },
  "list": {
    type: "boolean",
    default: false,
    hidden: true
  },
  "trigger": {
    type: "boolean",
    default: false,
    hidden: true
  }
};

export async function handler({ discord, add, remove, list, count, trigger }) {
  const message = discord.message as Message;
  const { sloganMembers, sloganTemplates } = db;
  if (add) {
    const newTemplate = add as string;
    if (newTemplate.length > 32) {
      await message.reply(`Slogans cannot be more than 32 characters long. Yours was ${newTemplate.length} characters long.`);
      return;
    }
    if (!newTemplate.includes("{{name}}")) {
      await message.reply("Slogan template must include at least one instance of `{{name}}`.");
      return;
    }
    const { resources: [existingTemplate] } = await sloganTemplates!.items.query({
      query: "SELECT * FROM c WHERE c.template = @newTemplate",
      parameters: [{ name: "@newTemplate",  value: newTemplate }]    
    }, { partitionKey: "/_partitionKey" }).fetchAll();
    if (existingTemplate) {
      await message.reply("That slogan already exists.");
      return;
    }
    sloganTemplates!.items.create({
      template: newTemplate,
      _partitionKey: "/_partitionKey"
    });
    await message.reply("Slogan added!");
    return;
  }
  if (count) {
    const { resources: count } = await sloganTemplates!.items.query({
      query: "SELECT VALUE COUNT(1) FROM c"
    }, {
      partitionKey: "/_partitionKey"
    }).fetchAll();
    await message.reply(`There are ${count} slogan templates in the database.`);
    return;
  }
  if (list) {
    const { resources: templates } = await sloganTemplates!.items.readAll({ partitionKey: "/_partitionKey" }).fetchAll();
    await message.reply(templates.map(doc => `${doc.id}: ${doc.template}`).join("\n"), { split: true });
    return;
  }
  if (remove) {
    await sloganTemplates!.item(remove, "/_partitionKey").delete();
    await message.reply("Slogan deleted.");
    return;
  }
  if (trigger) {
    await sloganChecker();
    await message.reply("Slogan checker ran successfully!");
    return;
  }
  const { resource: member } = await sloganMembers!.item(message.author.id, "/_partitionKey").read();
  if (member && member.guildId === message.guild!.id) {
    await sloganMembers!.item(message.author.id, "/_partitionKey").delete();
    await message.reply("You have been unsubscribed from sloganme!");
    return;
  }
  await sloganMembers!.items.create({
    id: message.author.id,
    guildId: message.guild!.id,
    _partitionKey: "/_partitionKey"
  });
  await message.reply("You are now subscribed to sloganme! Every morning your nickname will change to a random slogan! If you'd like to contribute additional slogan templates, simply run `/sloganme --add \"The Power of {{name}}!\"`, making sure to include at least one instance of `{{name}}` in the slogan.");
}