import db from "../db";
import discordClient from "../discord-client";

export default async function () {
  const { SloganmeMember, SloganmeTemplate } = db;
  const members = await SloganmeMember.find();
  let templates = await SloganmeTemplate.find({ used: false }); 
  console.log(`${templates.length} unused templates found.`);
  if (templates.length < members.length) {
    console.log(`There are ${members.length} sloganme members but only ${templates.length} unused templates. Resetting template usage...`);
    await SloganmeTemplate.updateMany({}, { $set: { used: false } });
    console.log("All templates have been marked unused.");
    templates = await SloganmeTemplate.find({ used: false });
  }
  for (const memberDoc of members) {
    try {
      const guild = discordClient.guilds.cache.get(memberDoc.guildId) || await discordClient.guilds.fetch(memberDoc.guildId);
      const member = guild!.members.cache.get(memberDoc.userId) || await guild!.members.fetch(memberDoc.userId);
      let username = member!.user.username;
      const randomIndex = Math.floor(Math.random() * templates.length);
      const randomTemplate = templates[randomIndex];
      let renderedTemplate = randomTemplate.template.replace(/{{name}}/g, username);
      const formatTemplate = async () => {
        if (renderedTemplate.length <= 32) return;
        while (username.length > 3) {
          const word = await db.Word.findOne({ text: username.toLowerCase() });
          if (word) {
            renderedTemplate = randomTemplate.template.replace(/{{name}}/g, username);
            if (renderedTemplate.length <= 32) return;
          }
          username = username.slice(0, username.length - 1);
        }
        const word = await db.Word.findOne({ text: username.toLowerCase() });
        if (renderedTemplate.length <= 32 && word) return;
        username = member!.user.username;
        if (username.indexOf(" ") !== -1) {
          username = username.substr(0, username.indexOf(" "));
          renderedTemplate = randomTemplate.template.replace(/{{name}}/g, username);
          if (renderedTemplate.length <= 32) return renderedTemplate;
        }
        const suffixMatch = username.match(/\d+$/);
        if (suffixMatch !== null) {
          username = username.slice(0, suffixMatch.index);
          renderedTemplate = randomTemplate.template.replace(/{{name}}/g, username);
          if (renderedTemplate.length <= 32) return;
        }
        while (renderedTemplate.length > 32) {
          username = username.slice(0, username.length - 1);
          renderedTemplate = randomTemplate.template.replace(/{{name}}/g, username);
        }
      };
      await formatTemplate();
      await member?.setNickname(renderedTemplate);
      randomTemplate.used = true;
      await randomTemplate.save();
      templates.splice(randomIndex, 1);
    } catch (err) {
      console.log(`Error while changing a nickname for member ID ${memberDoc.id} of guild ${memberDoc.guildId}: ${err.stack || err.message || err.toString()}`);
    }
  }
  console.log("Member names have been changed :)");
}