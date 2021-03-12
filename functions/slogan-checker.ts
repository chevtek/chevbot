import db from "../db";
import discordClient from "../discord-client";

export default async function () {
  const { SloganmeMember, SloganmeTemplate } = db;
  const members = await SloganmeMember.find();
  let templates = await SloganmeTemplate.find({ used: false }); 
  shuffle(templates);
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
      const renderTemplate = () => randomTemplate.template
        .replace(/{{name}}/g, username.toLowerCase())
        .replace(/{{NAME}}/g, username.toUpperCase())
        .replace(/{{Name}}/g, username.split(" ").map(word => `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`).join(" "));
      const randomTemplate = templates.pop();
      let renderedTemplate = renderTemplate();
      const formatTemplate = async () => {
        if (renderedTemplate.length <= 32) return;
        while (username.length > 3) {
          const word = await db.Word.findOne({ text: username.toLowerCase() });
          if (word) {
            renderedTemplate = renderTemplate();
            if (renderedTemplate.length <= 32) return;
          }
          username = username.slice(0, username.length - 1);
        }
        const word = await db.Word.findOne({ text: username.toLowerCase() });
        if (renderedTemplate.length <= 32 && word) return;
        username = member!.user.username;
        if (username.indexOf(" ") !== -1) {
          username = username.substr(0, username.indexOf(" "));
          renderedTemplate = renderTemplate();
          if (renderedTemplate.length <= 32) return renderedTemplate;
        }
        const suffixMatch = username.match(/\d+$/);
        if (suffixMatch !== null) {
          username = username.slice(0, suffixMatch.index);
          renderedTemplate = renderTemplate();
          if (renderedTemplate.length <= 32) return;
        }
        while (renderedTemplate.length > 32) {
          username = username.slice(0, username.length - 1);
          renderedTemplate = renderTemplate();
        }
      };
      await formatTemplate();
      await member?.setNickname(renderedTemplate);
      randomTemplate.used = true;
      await randomTemplate.save();
    } catch (err) {
      console.log(`Error while changing a nickname for member ID ${memberDoc.id} of guild ${memberDoc.guildId}: ${err.stack || err.message || err.toString()}`);
    }
  }
  console.log("Member names have been changed :)");
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}