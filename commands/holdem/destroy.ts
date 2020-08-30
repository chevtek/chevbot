import { Message } from "discord.js";
import tables from "../../poker-tables";

export const command = ["destroy", "finish", "end"];

export const description = "Destroy the current table for this channel.";

export async function handler ({ discord }) {
  const message = discord.message as Message;
  if (message.channel.type === "dm") {
    message.reply("This command can only be run from a channel on a server.");
    return;
  }
  const table = tables[message.channel.id];
  if (!table) {
    message.reply("There is no active Hold'em table in this channel.");
    return;
  }
  try {
    message.reply("Are you sure? Type `CONFIRM` to destroy the table.");
    await message.channel.awaitMessages(
      response => {
        if (response.author.id !== message.author.id) return false;
        return response.content === "CONFIRM";
      },
      { max: 1, time: 20000, errors: ["time"] }
    );
  } catch (err) {
    message.reply("No confirmation received. The table was not destroyed.");
    return;
  }
}