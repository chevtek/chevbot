import { Message, MessageReaction } from "discord.js";
import tables from "../../poker-tables";
import Yargs from "yargs/yargs";
import formatMoney from "../../utilities/formatMoney";
import discordClient from "../../discord-client";

export const command = "start";

export const description = "Start the hand!";

enum ActionEmoji {
  CHECK_OR_CALL = "749318088230699018",
  ALL_IN = "749318023755857932",
  FOLD = "749318088272642228",
  YES = "749412605218652381",
  NO = "749412605168189450"
}

export async function handler ({ discord }) {
  const message = discord.message as Message;
  if (message.channel.type === "dm") {
    message.reply("This command can only be run from a channel or server.");
    return;
  }
  let table = tables[message.channel.id];
  if (!table) {
    message.reply("There is no active Hold'em game in this channel.");
  }
  table.startHand();
  
  // Whisper each player their cards.
  message.channel.send("Dealing cards!");
  for (let index = 0; index < table.players.length; index++) {
    const tablePlayer = table.players[index];
    tablePlayer.showCards = true;
    const discordUser = discordClient.users.cache.get(tablePlayer.player.id);
    const tableEmbed = await table.render();
    tableEmbed
      .setTitle("Here's your cards!")
      .setDescription(`This message is related to your Hold'em table in the **#${message.channel.name}** channel in **${message.guild!.name}**.`);
    await discordUser!.send(tableEmbed);
    tablePlayer.showCards = false;
  }

  await message.channel.send(await table.render())

  while (table.currentRound) {
    table = tables[message.channel.id];
    const tablePlayer = table.currentActor!;
    try {
      const legalActions = tablePlayer.legalActions();
      const actionsTxt = legalActions.map((action, index) => {
        if (index === legalActions.length - 1){ 
          return ` or \`${action}\`?`
        }
        return `\`${action}\``;
      }).join();
      // Ask user what they would like to do.
      const promptMessage = await message.channel.send(`<@${tablePlayer.player.id}>, The current bet is \`${formatMoney(table.currentBet!)}\`. What would you like to do?\n${actionsTxt}`);
      if (legalActions.includes("check") || legalActions.includes("call")) {
        promptMessage.react(ActionEmoji.CHECK_OR_CALL);
      }
      if (legalActions.includes("bet") || legalActions.includes("raise")) {
        promptMessage.react(ActionEmoji.ALL_IN);
      }
      if (legalActions.includes("fold")) {
        promptMessage.react(ActionEmoji.FOLD);
      }
      const collected = await Promise.race([
        message.channel.awaitMessages(
          res => res.author.id === tablePlayer.player.id,
          { max: 1 }
        ),
        promptMessage.awaitReactions(
          (reaction, user) => [
            ActionEmoji.CHECK_OR_CALL,
            ActionEmoji.ALL_IN,
            ActionEmoji.FOLD
          ].includes(reaction.emoji.id)
          && user.id === tablePlayer.player.id,
          { max: 1 }
        )
      ]);

      const response = collected.first()!;
      let action: string;
      switch ((<MessageReaction>response).emoji?.id) {
        case ActionEmoji.CHECK_OR_CALL:
          if (legalActions.includes("check")) {
            action = "check";
          } else if (legalActions.includes("call")) {
            action = "call";
          }
          break;
        case ActionEmoji.ALL_IN:
          action = `raise ${tablePlayer.stackSize}`;
          break;
        case ActionEmoji.FOLD:
          action = "fold";
          break;
        case undefined:
          action = (<Message>response).content
          if (action === "all-in") action = `raise ${tablePlayer.stackSize}`;
          break;
      }

      await new Promise((resolve, reject) => Yargs()
        .exitProcess(false)
        .command(
          "bet <amount>",
          "Open the bet.",
          yargs => yargs.number("amount").required("amount"),
          ({ amount }) => tablePlayer.betAction(amount)
        )
        .command(
          "call",
          "Call the current bet.",
          () => {},
          async () => tablePlayer.callAction()
        )
        .command(
          "check",
          "Pass action forward if there is no bet.",
          () => {},
          async () => tablePlayer.checkAction()
        )
        .command(
          "raise <amount>",
          "Raise the current bet.",
          yargs => yargs.number("amount").required("amount"),
          async ({ amount }) => {
            if (amount === tablePlayer.stackSize) {
              const promptMessage = await message.channel.send(`<@${tablePlayer.player.id}>, are you sure you want to go **all-in**? (y/n)`);
              promptMessage.react(ActionEmoji.YES);
              promptMessage.react(ActionEmoji.NO);
              const collected = await Promise.race([
                message.channel.awaitMessages(
                  response => ["y", "yes", "n", "no"].includes(response.content.toLowerCase()) && response.author.id === tablePlayer.player.id,
                  { max: 1 }
                ),
                promptMessage.awaitReactions(
                  (reaction, user) => [
                    ActionEmoji.YES,
                    ActionEmoji.NO
                  ].includes(reaction.emoji.id)
                  && user.id === tablePlayer.player.id,
                  { max: 1 }
                )
              ]);

              const response = collected.first()!;
              switch ((<MessageReaction>response).emoji?.id) {
                case ActionEmoji.YES:
                  break;
                case ActionEmoji.NO:
                  return;
                case undefined:
                  if (!["yes", "y"].includes((<Message>response).content.toLowerCase())) {
                    return;
                  }
                  break;
              }
            }
            tablePlayer.raiseAction(amount);
          }
        )
        .command(
          "fold",
          "Leave the hand.",
          () => {},
          async () => tablePlayer.foldAction()
        )
        .onFinishCommand(resolve)
        .fail((msg, err) => reject(msg || err))
        .parse(action!)
      );

      await message.channel.send(await table.render());
    } catch (err) {
      await message.channel.send(`<@${tablePlayer.player.id}>, ${err.message}`);
    }
  }


}
