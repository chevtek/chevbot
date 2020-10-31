import { MessageEmbed, Message } from "discord.js";
export const command = "avatar [user]";

export const description = "Display a user's avatar in the channel.";

export async function handler ({ discord, user }) {
  const { message } = discord;
  if (message.channel.type === "dm") {
    message.reply("This command can only be run from a server.");
  }
  let member = message.member;
  if (user) {
    const memberId = user.match(/^<@!?(\d+)>$/)?.[1];
    if (!memberId) return message.reply("Invalid user supplied.");
    member = message.guild.members.cache.get(memberId);
  }
  message.channel.send(new MessageEmbed({
    color: "#00ff00",
    title: `${member.displayName}'s Avatar`,
    image: {
      url: member.user.displayAvatarURL({ format: 'png', dynamic: true, size: 2048 })
    }
  }));
}
