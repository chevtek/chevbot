import { Message } from "discord.js";
import { tables, gameLoop } from "../../utilities/holdem";

export const command = ["deal", "d", "start", "begin"];

export const description = "Deal the cards!";

export async function handler ({ discord }) {
  const message = discord.message as Message;
  // if (message.channel.type === "dm") {
  //   message.reply("You can't run this from a DM right now. Work in progress. Please run it from the channel where the table was created.");
  //   return;
  // }
  let table = tables[message.channel.id];
  if (!table) {
    for (const channelId in tables) {
      for (const player of tables[channelId].players) {
        if (player.id === message.author.id) {
          table = tables[channelId];
        }
      }
    }
    if (!table) {
      if (message.channel.type === "dm") {
        message.reply("You do not have an active Hold'em table.");
      } else {
        message.reply("There is no active Hold'em game in this channel.");
      }
      return;
    }
  }
  if (![table.creatorId, table.dealer?.id].includes(message.author.id)){
    message.reply("Only the current dealer or table creator can deal the cards.")
    return;
  }

  try {
    table.dealCards();
    (async () => {
      for (let index = 0; index < table.players.length * 2; index++) {
        await table.playRandomSound("./sounds/holdem/deal");
      }
    })();
    // if (!table.debug) {
    //   // Whisper each player their cards.
    //   message.channel.send("Dealing cards!");
    //   for (let index = 0; index < table.players.length; index++) {
    //     const player = table.players[index];
    //     player.showCards = true;
    //     const discordUser = discordClient.users.cache.get(player.id);
    //     await table.render(message);
    //     // tableEmbed
    //     //   .setTitle("Here's your cards!")
    //     //   .setDescription(`This message is related to your Hold'em table in the **#${message.channel.name}** channel in **${message.guild!.name}**.`);
    //     await discordUser!.send(tableEmbed);
    //     player.showCards = false;
    //   }
    // }
    gameLoop(table);
  } catch (err) {
    await message.reply(err.message);
  }
}
