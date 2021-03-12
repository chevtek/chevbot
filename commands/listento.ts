import { Message } from "discord.js";

export const command = ["listento <title..>", "lt"];

export const description = false;

export async function handler ({ discord, title }) {
  const message = discord.message as Message;
  title = title.join(" ");

  const textChannel = message.guild!.channels.cache.get("778316339315474442");
  const voiceChannel = message.guild!.channels.cache.get("778316393774579732");

  await textChannel!.setName(title.replace(/(&|\/)/g, (match, char) => {
    switch (char) {
      case "&":
        return "and";
      case "/":
        return "-"
    }
  }).replace());
  await voiceChannel!.setName(`${title} 🎧`);
  
  await message.reply(`Listen channels have been updated to "${title}" successfully.`);
} 