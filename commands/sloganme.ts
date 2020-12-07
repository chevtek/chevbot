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
  "add-word": {
    type: "string"
  },
  "del-word": {
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
  },
  "reset-used": {
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

export async function handler({ discord, add, remove, list, count, trigger, addWord, delWord, resetUsed }) {
  const message = discord.message as Message;
  const { SloganmeMember, SloganmeTemplate, Word } = db;
  if (add) {
    const newTemplate = (add as string).trim();
    if (newTemplate.length > 32) {
      await message.reply(`Slogans cannot be more than 32 characters long. Yours was ${newTemplate.length} characters long.`);
      return;
    }
    if (!newTemplate.includes("{{name}}")) {
      await message.reply("Slogan template must include at least one instance of `{{name}}`.");
      return;
    }
    const existingTemplates = await SloganmeTemplate.where({ template: newTemplate }).countDocuments();
    if (existingTemplates > 0) {
      await message.reply("That slogan already exists.");
      return;
    }
    const newSloganmeTemplate = new SloganmeTemplate({
      template: newTemplate,
      used: false
    });
    await newSloganmeTemplate.save();
    await message.reply("Slogan added!");
    return;
  }
  if (addWord) {
    let word = await Word.findOne({ text: addWord.toLowerCase() });
    if (word) {
      await message.reply(`The word "${addWord}" already exists in the dictionary.`);
      return;
    }
    word = new Word({ text: addWord.toLowerCase() });
    await word.save();
    await message.reply(`The word "${addWord}" was successfully added to the dictionary.`);
    return;
  }
  if (delWord) {
    const result = await Word.findOneAndDelete({ text: delWord.toLowerCase() });
    if (!result) {
      await message.reply(`The word "${delWord}" does not exist in the dictionary.`);
      return;
    }
    await message.reply(`The word "${delWord}" was has been removed from the dictionary.`);
    return;
  }
  if (count) {
    const existingTemplates = await SloganmeTemplate.find();
    const unusedTemplates = existingTemplates.filter(template => !template.used).length;
    await message.reply(`There are ${unusedTemplates} unused templates out of ${existingTemplates.length} total.`);
    return;
  }
  if (list) {
    const templates = await SloganmeTemplate.find();
    await message.reply(templates.map(doc => `${doc._id} | ${doc.template} | used: ${doc.used}`).join("\n"), { split: true });
    return;
  }
  if (remove) {
    await SloganmeTemplate.findByIdAndDelete(remove);
    await message.reply("Slogan deleted.");
    return;
  }
  if (resetUsed) {
    await SloganmeTemplate.updateMany({}, { $set: { used: false } });
    await message.reply("All slogan templates have been marked unused.");
    return;
  }
  if (trigger) {
    await sloganChecker();
    await message.reply("Slogan checker ran successfully!");
    return;
  }
  const existingMembers = await SloganmeMember.where({ userId: message.author.id, guildId: message.guild!.id }).countDocuments();
  if (existingMembers > 0) {
    await SloganmeMember.deleteOne({ userId: message.author.id, guildId: message.guild!.id });
    await message.reply("You have been unsubscribed from sloganme!");
    return;
  }
  const newMember = new SloganmeMember({
    userId: message.author.id,
    guildId: message.guild!.id
  });
  await newMember.save();
  await message.reply("You are now subscribed to sloganme! Every morning your nickname will change to a random slogan! If you'd like to contribute additional slogan templates, simply run `/sloganme --add \"The Power of {{name}}!\"`, making sure to include at least one instance of `{{name}}` in the slogan.");
}