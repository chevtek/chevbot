export const command = "echo <message..>";

export const description = false;

export function handler ({ discord, message }) {
  discord.message.channel.send(message.join(" "));
}
