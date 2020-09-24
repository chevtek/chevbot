import { Message } from "discord.js";

export const command = ["listento <title..>", "lt"];

export const description = "Modifies the listen text and voice channel names.";

export async function handler ({ discord, title }) {
  const message = discord.message as Message;
  title = title.join(" ");

  const textChannel = message.guild!.channels.cache.get("752945543092895865");
  const voiceChannel = message.guild!.channels.cache.get("709780789218508821");

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