import db from "../db";
import discordClient from "../discord-client";
import moment from "moment";

export default async function () {
  const { sloganMembers, sloganTemplates } = db;
  setInterval(async () => {
    try {
      console.log("Running slogan checker...");
      const currentDate = moment();
      if (currentDate.hour() === 3) {
        const { resources: members } = await sloganMembers!.items.readAll().fetchAll();
        const { resources: templates } = await sloganTemplates!.items.readAll().fetchAll();
        members.forEach(memberDoc => {
          const guild = discordClient.guilds.cache.get(memberDoc.guildId);
          const member = guild!.members.cache.get(memberDoc.id!);
          const username = member!.user.username;
          const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
          const renderedTemplate = randomTemplate.replace(/{{name}}/g, username);
          member!.setNickname(renderedTemplate);
        });
      }
      console.log("...done.");
    } catch (err) {
      console.log("SLOGAN_CHECKER:", err);
    }
  }, 0.9999 * (60 * 60 * 1000));
}