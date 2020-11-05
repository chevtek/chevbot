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

    const reactionAddHandler = async (reaction, user) => {
      try {
        if (reaction.message.id !== eventMessage.id || user.id === discordClient.user!.id) return;
        if (![yesEmoji, maybeEmoji].includes(reaction.emoji.id)) {
          await eventMessage.reactions.cache.get(reaction.emoji.id || reaction.emoji.name)!.remove();
          return;
        }
        await eventMessage.reactions.cache
          .filter(r => r.emoji.id !== reaction.emoji.id && r.emoji.name !== reaction.emoji.name)
          .map(async r => r.users.remove(user.id));
        const member = reaction.message.guild?.members.cache.get(user.id);
        await member?.roles.add(eventRole);
      } catch (err) {
        console.log(err);
      }
    };
    discordClient.on("messageReactionAdd", reactionAddHandler);

    const reactionRemoveHandler = async (reaction, user) => {
      try {
        if (![yesEmoji, maybeEmoji].includes(reaction.emoji.id)
          || reaction.message.id !== eventMessage.id
          || user.id === discordClient.user!.id) return;
        if (eventMessage.reactions.cache.reduce((hasUser, r) => hasUser || r.users.cache.some(u => u.id === user.id), false)) return;
        const member = reaction.message.guild!.members.cache.get(user.id);
        await member!.roles.remove(eventRole);
      } catch (err) {
        console.log(err);
      }
    };
    discordClient.on("messageReactionRemove", reactionRemoveHandler);

    const messageDeleteHandler = async deletedMessage => {
      try {
        if (deletedMessage.id !== eventMessage.id) return;
        discordClient.removeListener("messageReactionAdd", reactionAddHandler);
        discordClient.removeListener("messageReactionRemove", reactionRemoveHandler);
        discordClient.removeListener("messageDelete", messageDeleteHandler);
        await eventRole.delete();
        await events!.item(event!.id, "/_partitionKey").delete();
      } catch (err) {
        console.log(err);
      }
    };
    discordClient.on("messageDelete", messageDeleteHandler);
  }
}
