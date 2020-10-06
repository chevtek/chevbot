import db from "../db";
import discordClient from "../discord-client";
import moment from "moment-timezone"; 

const { sloganMembers, sloganTemplates } = db;

export default async function () {
  const now = moment().tz("America/Denver");
  if (now.minute() !== 0) return;
  console.log("Running slogan checker...");
  const roll = Math.floor(Math.random() * 12);
  console.log(`Rolled a ${roll}.`);
  if (roll === 0) {
    console.log("Triggered!");
    const { resources: members } = await sloganMembers!.items.readAll({ partitionKey: "/_partitionKey" }).fetchAll();
    const { resources: templates } = await sloganTemplates!.items.readAll({ partitionKey: "/_partitionKey"}).fetchAll();
    console.log(`${templates.length} templates found.`);
    let unusedTemplates = templates.filter(template => !template.used);
    console.log(`${unusedTemplates.length} templates have not been used yet.`);
    if (unusedTemplates.length < members.length) {
      console.log(`There are ${members.length} sloganme members but only ${unusedTemplates.length} unused templates. Resetting template usage...`);
      await sloganTemplates!.items.bulk(templates.map(template => {
        template.used = false;
        return {
          operationType: "Upsert",
          resourceBody: template
        };
      }));
      console.log("All templates have been marked unused.");
      unusedTemplates = templates.filter(template => !template.used);
    }
    await Promise.all(members.map(async memberDoc => {
      const guild = discordClient.guilds.cache.get(memberDoc.guildId);
      const member = guild!.members.cache.get(memberDoc.id!);
      let username = member!.user.username;
      const randomTemplate = unusedTemplates[Math.floor(Math.random() * unusedTemplates.length)];
      let renderedTemplate = randomTemplate.template.replace(/{{name}}/g, username);
      while (renderedTemplate.length > 32) {
        username = username.slice(0, username.length - 1);
        renderedTemplate = randomTemplate.template.replace(/{{name}}/g, username);
      }
      await member?.setNickname(renderedTemplate);
      randomTemplate.used = true;
      await sloganTemplates!.items.upsert(randomTemplate);
    }));
    console.log("Member names have been changed :)");
  }
}