import { Message } from "discord.js";
import { tables, gameLoop } from "../../utilities/holdem";

export const command = ["refresh", "resume", "r"];

export const description = "Resume the Hold'em game in this channel if it was paused.";

export async function handler ({ discord }) {
  const message = discord.message as Message;
  const table = tables[message.channel.id];
  if (message.channel.type === "dm") {
    message.reply("This command can only be run from a channel on a server.");
    return;
  }
  if (!table) {
    message.reply("There is no active Hold'em game in this channel.");
    return;
  }
  await table.render();
  if (table.currentRound) {
    gameLoop(table);
  }
}