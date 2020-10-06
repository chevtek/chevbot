import { TextChannel } from "discord.js";
import db from "../db";
import discordClient from "../discord-client";

const yesEmoji = "749412605218652381";

export default async function (event?) {
  if (event) {
    setupListeners(event);
    return;
  }
  const { events } = db;
  const { resources: eventEntries } = await events!.items.readAll().fetchAll()!;
  await Promise.all(eventEntries.map(setupListeners));

  async function setupListeners(event) {

    const guild = discordClient.guilds.cache.get(event.guildId)!;
    const channel = guild.channels.cache.get(event.channelId)! as TextChannel;
    const eventMessage = await channel.messages.fetch(event.messageId);
    const eventRole = guild.roles.cache.get(event.roleId)!;

    const reactionAddHandler = async (reaction, user) => {
      try {
        if (reaction.message.id !== eventMessage.id || user.id === discordClient.user!.id) return;
        if (reaction.emoji.id !== yesEmoji) {
          await eventMessage.reactions.cache.get(reaction.emoji.id || reaction.emoji.name)!.remove();
          return;
        }
        const member = reaction.message.guild?.members.cache.get(user.id);
        await member?.roles.add(eventRole);
      } catch (err) {
        console.log(err);
      }
    };
    discordClient.on("messageReactionAdd", reactionAddHandler);

    const reactionRemoveHandler = async (reaction, user) => {
      try {
        if (reaction.emoji.id !== yesEmoji
          || reaction.message.id !== eventMessage.id
          || user.id === discordClient.user!.id) return;
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
