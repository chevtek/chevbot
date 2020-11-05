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
  const { events } = db;
  const { resources: eventEntries } = await events!.items.readAll().fetchAll()!;
  await Promise.all(eventEntries.map(setupListeners));

  async function setupListeners(event) {

    const guild = discordClient.guilds.cache.get(event.guildId) || await discordClient.guilds.fetch(event.guildId)!;
    const channel = guild.channels.cache.get(event.channelId)! as TextChannel;
    const eventMessage = channel.messages.cache.get(event.messageId) || await channel.messages.fetch(event.messageId);
    const eventRole = (guild.roles.cache.get(event.roleId) || await guild.roles.fetch(event.roleId))!;

    const eventHandler = async packet => {
      try {
        if (!["MESSAGE_REACTION_ADD", "MESSAGE_REACTION_REMOVE", "MESSAGE_DELETE"].includes(packet.t)) return;

        const {
          t: type,
          d: {
            user_id: userId,
            message_id: messageId,
            // channel_id: channelId,
            guild_id: guildId,
            emoji
          }
        } = packet;

        const guild = discordClient.guilds.cache.get(guildId) || await discordClient.guilds.fetch(guildId);
        const member = guild.members.cache.get(userId) || await guild.members.fetch(userId);
        switch (type) {
          case "MESSAGE_REACTION_ADD":
            if ( messageId !== eventMessage.id || userId === discordClient.user!.id) return;
            if (![yesEmoji, maybeEmoji].includes(emoji.id)) {
              await eventMessage.reactions.cache.get(emoji.id || emoji.name)!.remove();
              return;
            }
            await eventMessage.reactions.cache
              .filter(r => r.emoji.id !== emoji.id && r.emoji.name !== emoji.name)
              .map(async r => r.users.remove(userId));
            await member.roles.add(eventRole);
            return;
          case "MESSAGE_REACTION_REMOVE":
            if (![yesEmoji, maybeEmoji].includes(emoji.id)
              || messageId !== eventMessage.id
              || userId === discordClient.user!.id) return;
            if (eventMessage.reactions.cache.reduce((hasUser, r) => {
              if (hasUser) return true;
              if (r.emoji.id === emoji.id || r.emoji.name === emoji.name) return false;
              return r.users.cache.some(u => u.id === userId);
            }, false)) return;
            await member!.roles.remove(eventRole);
            return;
          case "MESSAGE_DELETE":
            if (messageId !== eventMessage.id) return;
            discordClient.removeListener("raw", eventHandler);
            await eventRole.delete();
            await events!.item(event!.id, "/_partitionKey").delete();
            return;
        }
      } catch (err) {
        console.log(err);
      }
    };
    discordClient.on("raw", eventHandler);
  }
}
