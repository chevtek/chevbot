export const command = "ping";

export const description = "Test if the bot is listening.";

export async function handler ({ message }) {
  message.reply("pong!");
}
