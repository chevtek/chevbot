import { Message } from "discord.js";
import db from "../db";

export const command = "debug <action> [args..]";

export const description = false;

export async function handler ({ discord, action, args }) {
  const message = discord.message as Message;
  switch (action) {
    // case "emit-join-event":
    //   let member = message.member;
    //   if (args && args.length) {
    //     const mentionId = args[0].match(/^<@!?(\d+)>$/)[1];
    //     member = message.member!.guild.members.cache.get(mentionId)!;
    //   }
    //   await message.client.emit("guildMemberAdd", member);
    //   break;
    case "throw":
      throw new Error(args[0]);
    // case "add-partition-keys":
    //   try {
    //     const { sloganMembers } = db;
    //     const query = await sloganMembers!.items.readAll();
    //     const idsToDelete: string[] = [];
    //     while (query.hasMoreResults()) {
    //       let { resources: docs } = await query.fetchAll();
    //       console.log(`Found ${docs.length} documents.`);
    //       await Promise.all(docs.map(async doc => {
    //         idsToDelete.push(doc!.id!);
    //         doc._partitionKey = "/_partitionKey";
    //         await sloganMembers!.items.upsert(doc);
    //       }));
    //       console.log("Batch complete.")
    //     }
    //     console.log("No more query results.");
    //     console.log("Removing old documents.");
    //     await Promise.all(idsToDelete.map(id => sloganMembers!.item(id).delete()));
    //     console.log("Old docs removed.");
    //   } catch (err) { 
    //     console.log(err.message);
    //   }
    //   break;
  }
}
