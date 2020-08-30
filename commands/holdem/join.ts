import { Message } from "discord.js";
import tables from "../../poker-tables";
import { Player } from "../../models/poker";

export const command = ["join [buy-in]", "j", "sit", "sit-down"];

export const description = "Join the current game.";

export const builder = yargs => yargs.positional("buy-in", {
  description: "The amount of money to bring to the table. Default is the minimum buy-in for the table.",
  type: "number"
});

export async function handler ({ discord, buyIn }) {
  const message = discord.message as Message;
  if (message.channel.type === "dm") {
    message.reply("This command can only be run from a channel or server.");
    return;
  }
  const table = tables[message.channel.id];
  if (!table) {
    message.reply("There is no active Hold'em game in this channel.");
    return;
  }
  try {
    const player = Player.fromDiscordMessage(message);
    table.sitDown(player, buyIn || table.buyIn);
    message.channel.send(await table.render());
  } catch (err) {
    message.reply(err.message);
  }
}