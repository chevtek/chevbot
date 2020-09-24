import db from "../db";
import discordClient from "../discord-client";

export default async function () {
  const { sloganMembers, sloganTemplates } = db;
  setInterval(async () => {
    try {
      console.log("Running slogan checker...");
      const roll = Math.floor(Math.random() * 15);
      console.log(`Rolled a ${roll}.`);
      if (roll === 0) {
        console.log("Triggered!");
        const { resources: members } = await sloganMembers!.items.readAll({ partitionKey: "/_partitionKey" }).fetchAll();
        const { resources: templates } = await sloganTemplates!.items.readAll({ partitionKey: "/_partitionKey"}).fetchAll();
        await Promise.all(members.map(async memberDoc => {
          const guild = discordClient.guilds.cache.get(memberDoc.guildId);
          const member = guild!.members.cache.get(memberDoc.id!);
          let username = member!.user.username;
          const randomTemplate = templates[Math.floor(Math.random() * templates.length)].template;
          let renderedTemplate = randomTemplate.replace(/{{name}}/g, username);
          while (renderedTemplate.length > 32) {
            username = username.slice(0, username.length - 1);
            renderedTemplate = randomTemplate.replace(/{{name}}/g, username);
          }
          await member?.setNickname(renderedTemplate);
        }));
      }
    } catch (err) {
      console.log("SLOGAN_CHECKER:", err);
    }
  }, 1 * (60 * 60 * 1000));
}