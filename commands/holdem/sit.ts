import { Message } from "discord.js";
import { ChannelTable } from "../../models/holdem";

export const command = ["sit [buy-in]", "join"];

export const description = "Join the current game.";

export const builder = yargs => yargs
  .positional("buy-in", {
    description: "The amount of money to bring to the table. Default is the minimum buy-in for the table.",
    type: "number"
  });

export async function handler ({ discord, buyIn }) {
  const message = discord.message as Message;
  if (message.channel.type === "dm") {
    message.reply("This command can only be run from a channel or server.");
    return;
  }
  const table = await ChannelTable.findByChannelId(message.channel.id);
  if (!table) {
    message.reply("There is no active Hold'em game in this channel.");
    return;
  }
  try {
    table.sitDown(message.author.id, buyIn || table.buyIn);
    await Promise.all([table.saveToDb(), table.render()]);
  } catch (err) {
    message.reply(err.message);
  }
}