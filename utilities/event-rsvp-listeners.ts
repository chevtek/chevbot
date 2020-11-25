import { TextChannel } from "discord.js";
import db from "../db";
import discordClient from "../discord-client";

const yesEmoji = "773708749051396136";
const maybeEmoji = "773708770823635014";

export default async function (event?) {
  if (event) {
    setupListeners(event);
    return;
  }
  const eventEntries = await db.Event.find();
  await Promise.all(eventEntries.map(setupListeners));

  async function setupListeners(event) {

    const guild = discordClient.guilds.cache.get(event.guildId) || await discordClient.guilds.fetch(event.guildId)!;
    const channel = guild.channels.cache.get(event.channelId)! as TextChannel;
    const eventMessage = channel.messages.cache.get(event.messageId) || await channel.messages.fetch(event.messageId);
    const eventRole = (guild.roles.cache.get(event.roleId) || await guild.roles.fetch(event.roleId))!;

    const eventHandler = async packet => {
      try {
        if (!["MESSAGE_REACTION_ADD", "MESSAGE_REACTION_REMOVE", "MESSAGE_DELETE"].includes(packet.t)) return;

        const actions = {
          "MESSAGE_REACTION_ADD": async () => {
            const { guild_id: guildId, user_id: userId, emoji, message_id: messageId } = packet.d;
            const guild = discordClient.guilds.cache.get(guildId) || await discordClient.guilds.fetch(guildId);
            const member = guild.members.cache.get(userId) || await guild.members.fetch(userId);
            if ( messageId !== eventMessage.id || userId === discordClient.user!.id) return;
            if (![yesEmoji, maybeEmoji].includes(emoji.id)) {
              await eventMessage.reactions.cache.get(emoji.id || emoji.name)!.remove();
              return;
            }
            await eventMessage.reactions.cache
              .filter(r => r.emoji.id !== emoji.id && r.emoji.name !== emoji.name)
              .map(async r => r.users.remove(userId));
            await member.roles.add(eventRole);
          },
          "MESSAGE_REACTION_REMOVE": async () => {
            const { guild_id: guildId, user_id: userId, emoji, message_id: messageId } = packet.d;
            const guild = discordClient.guilds.cache.get(guildId) || await discordClient.guilds.fetch(guildId);
            const member = guild.members.cache.get(userId) || await guild.members.fetch(userId);
            if (![yesEmoji, maybeEmoji].includes(emoji.id)
              || messageId !== eventMessage.id
              || userId === discordClient.user!.id) return;
            if (eventMessage.reactions.cache.reduce((hasUser, r) => {
              if (hasUser) return true;
              if (r.emoji.id === emoji.id || r.emoji.name === emoji.name) return false;
              return r.users.cache.some(u => u.id === userId);
            }, false)) return;
            await member!.roles.remove(eventRole);
          },
          "MESSAGE_DELETE": async () => {
            const { id: messageId } = packet.d;
            if (messageId !== eventMessage.id) return;
            discordClient.removeListener("raw", eventHandler);
            await eventRole.delete();
            await db.Event.findByIdAndDelete(event.id);
          }
        };

        await actions[packet.t]();
      } catch (err) {
        console.log(err);
      }
    };
    discordClient.on("raw", eventHandler);
  }
}
