import db from "../db";
import discordClient from "../discord-client";
import { OperationInput } from "@azure/cosmos";

export default async function () {
  const { sloganMembers, sloganTemplates } = db;
  const { resources: members } = await sloganMembers!.items.readAll({ partitionKey: "/_partitionKey" }).fetchAll();
  const { resources: templates } = await sloganTemplates!.items.readAll({ partitionKey: "/_partitionKey"}).fetchAll();
  console.log(`${templates.length} templates found.`);
  let unusedTemplates = templates.filter(template => !template.used);
  console.log(`${unusedTemplates.length} templates have not been used yet.`);
  if (unusedTemplates.length < members.length) {
    console.log(`There are ${members.length} sloganme members but only ${unusedTemplates.length} unused templates. Resetting template usage...`);
    const operations = templates.map(template => {
      template.used = false;
      return {
        operationType: "Upsert",
        partitionKey: "/_partitionKey",
        resourceBody: template
      } as OperationInput;
    });
    const batches: OperationInput[][] = [];
    let currentBatch: OperationInput[] = [];
    operations.forEach(operation => {
      if (currentBatch.length === 5) {
        batches.push(currentBatch);
        currentBatch = [];
      }
      currentBatch.push(operation);
    });
    batches.push(currentBatch);
    for (const batch of batches) {
      console.log(await sloganTemplates!.items.bulk(batch));
    }
    console.log("All templates have been marked unused.");
    unusedTemplates = templates.filter(template => !template.used);
  }
  for (const memberDoc of members) {
    try {
      const guild = discordClient.guilds.cache.get(memberDoc.guildId) || await discordClient.guilds.fetch(memberDoc.guildId);
      const member = guild!.members.cache.get(memberDoc.id!) || await guild!.members.fetch(memberDoc.id!);
      let username = member!.user.username;
      const randomIndex = Math.floor(Math.random() * unusedTemplates.length);
      const randomTemplate = unusedTemplates[randomIndex];
      let renderedTemplate = randomTemplate.template.replace(/{{name}}/g, username);
      if (renderedTemplate.length > 32 && username.indexOf(" ") !== -1) {
        username = username.substr(0, username.indexOf(" "));
        renderedTemplate = randomTemplate.template.replace(/{{name}}/g, username);
      }
      while (renderedTemplate.length > 32) {
        username = username.slice(0, username.length - 1);
        renderedTemplate = randomTemplate.template.replace(/{{name}}/g, username);
      }
      await member?.setNickname(renderedTemplate);
      randomTemplate.used = true;
      await sloganTemplates!.items.upsert(randomTemplate);
      unusedTemplates.splice(randomIndex, 1);
    } catch (err) {
      console.log(`Error while changing a nickname for member ID ${memberDoc.id} of guild ${memberDoc.guildId}: ${err.stack || err.message || err.toString()}`);
    }
  }
  console.log("Member names have been changed :)");
}