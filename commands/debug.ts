import { Message } from "discord.js";

export const command = "debug <action> [args..]";

export const description = false;

export async function handler ({ discord, action, args }) {
  try { 
    const message = discord.message as Message;

    // Do stuff

    message.reply("Done!");
  } catch (err) {
    console.log(err);
  }
}
