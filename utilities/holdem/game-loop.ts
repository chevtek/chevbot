import { Message, MessageReaction, Collection, CollectorFilter, AwaitMessagesOptions, AwaitReactionsOptions } from "discord.js";
import Yargs from "yargs/yargs";
import formatMoney from "./format-money";
import tables from "./tables";

enum ActionEmoji {
  CHECK_OR_CALL = "749318088230699018",
  BET_OR_RAISE = "749318023755857932",
  FOLD = "749318088272642228",
  ALL_IN = "749469452952666164",
  YES = "749412605218652381",
  NO = "749412605168189450"
}

interface Prompt { 
  text: string,
  reactions?: ActionEmoji[],
  awaitReactions?: {
    filter: CollectorFilter,
    options: AwaitReactionsOptions
  },
  awaitMessages?: {
    filter: CollectorFilter,
    options: AwaitMessagesOptions
  },
  // message?: Message,
  promise?: Promise<Collection<string, Message> | Collection<string, MessageReaction>>,
  resolve?: (value?: Collection<string, Message> | Collection<string, MessageReaction>) => void,
  reject?: (reason?: any) => void
}

const prompts: {[key: string]: Prompt} = {};

export default async function (message: Message) {

  // Elaborate discord prompt creator. Allows chaining of previous promises.
  const createPrompt = async (oldPrompt: Prompt) => {
    if (!oldPrompt.awaitReactions && !oldPrompt.awaitMessages) {
      throw new Error("You must provide a message or reaction collector.");
    }
    const newPrompt: Prompt = Object.assign({}, oldPrompt);
    const newMessage = await message.channel.send(oldPrompt.text);
    if (oldPrompt.reactions) {
      oldPrompt.reactions.forEach(reaction => newMessage.react(reaction));
    }
    newPrompt.promise = new Promise<Collection<string, Message> | Collection<string, MessageReaction>>((resolve, reject) => {
      let discordPromise;
      if (oldPrompt.awaitMessages && oldPrompt.awaitReactions) {
        discordPromise = Promise.race([
          newMessage.channel.awaitMessages(oldPrompt.awaitMessages.filter, oldPrompt.awaitMessages.options),
          newMessage.awaitReactions(oldPrompt.awaitReactions.filter, oldPrompt.awaitReactions.options)
        ]);
      } else if (oldPrompt.awaitMessages) {
        discordPromise = newMessage.channel.awaitMessages(oldPrompt.awaitMessages.filter, oldPrompt.awaitMessages.options);
      } else if (oldPrompt.awaitReactions) {
        discordPromise = newMessage.awaitReactions(oldPrompt.awaitReactions.filter, oldPrompt.awaitReactions.options);
      }
      discordPromise.then(resolve).catch(reject);
      // if (prompt.resolve) {
      //   discordPromise.then(prompt.resolve).catch(prompt.reject);
      //   // prompt.message!.delete();
      // }
      newPrompt.resolve = resolve;
      newPrompt.reject = reject;
    });

    if (oldPrompt.promise) {
      newPrompt.promise.then(oldPrompt.resolve).catch(oldPrompt.reject);
    }

    return prompts[message.channel.id] = newPrompt;
  };

  // If there is an existing prompt for this channel then create a new prompt and resolve the old one with it.
  const currentPrompt = prompts[message.channel.id];
  if (currentPrompt) return createPrompt(currentPrompt);

  (async function () {
    let table = tables[message.channel.id];
    await message.channel.send(await table.render());
    while (table.currentRound) {
      table = tables[message.channel.id];
      const tablePlayer = table.currentActor!;
      try {
        const legalActions = tablePlayer.legalActions();
        if (legalActions.includes("bet") || legalActions.includes("raise")) {
          legalActions.push("all-in");
        }
        const actionsTxt = legalActions.map((action, index) => {
          if (["bet", "raise"].includes(action)) {
            action += " <number>";
          }
          if (index === legalActions.length - 1){ 
            return ` or \`${action}\``
          }
          return ` \`${action}\``;
        }).join();
        // Ask user what they would like to do.
        const currentBetTxt = table.currentBet && table.currentBet > 0 ? `the current bet is \`${formatMoney(table.currentBet)}\`.` : "there is no bet yet.";
        const reactions: ActionEmoji[] = [];
        if (legalActions.includes("check") || legalActions.includes("call")) {
          reactions.push(ActionEmoji.CHECK_OR_CALL);
        }
        if (legalActions.includes("bet") || legalActions.includes("raise")) {
          reactions.push(ActionEmoji.BET_OR_RAISE);
          legalActions.push("all-in");
        }
        if (legalActions.includes("fold")) {
          reactions.push(ActionEmoji.FOLD);
        }
        const prompt = await createPrompt({
          text: `<@${tablePlayer.player.id}>, ${currentBetTxt} What would you like to do?\n You can type: ${actionsTxt}. You can also use the emoji reacts below this message.`,
          reactions,
          awaitMessages: {
            filter: response => response && legalActions.includes(response.content.toLowerCase().split(" ")[0]) && response.author.id === tablePlayer.player.id,
            options: { max: 1 }
          },
          awaitReactions: {
            filter: (reaction, user) => reaction
            && [
              ActionEmoji.CHECK_OR_CALL,
              ActionEmoji.BET_OR_RAISE,
              ActionEmoji.FOLD
            ].includes(reaction.emoji.id)
            && user.id === tablePlayer.player.id,
            options: { max: 1 }
          }
        });

        const collected = await prompt.promise!;

        console.log(`Listener finished for ${tablePlayer.player.name}.`);

        const response = collected.first()!;
        let action: string;
        if (!response) return;
        switch ((<MessageReaction>response)?.emoji?.id) {
          case ActionEmoji.CHECK_OR_CALL:
            if (legalActions.includes("check")) {
              action = "check";
            } else if (legalActions.includes("call")) {
              action = "call";
            }
            break;
          case ActionEmoji.BET_OR_RAISE:
            const prompt = await createPrompt({
              text: `<@${tablePlayer.player.id}>, how much would you like to bet? \`<number|"all-in">\``,
              reactions: [ActionEmoji.ALL_IN],
              awaitMessages: {
                filter: response => response && response.content !== "" && ((!isNaN(response.content.replace("$", "")) || response.content.toLowerCase() === "all-in")),
                options: { max: 1 }
              },
              awaitReactions: {
                filter: (reaction, user) => reaction && reaction.emoji.id === ActionEmoji.ALL_IN
                  && user.id === tablePlayer.player.id,
                options: { max: 1 }
              }
            });

            const collected = await prompt.promise!;

            const betResponse = collected.first()!;
            if (!betResponse) return;
            switch ((<MessageReaction>betResponse).emoji?.id) {
              case ActionEmoji.ALL_IN:
                action = `raise ${tablePlayer.stackSize}`;
                break;
              case undefined:
                const amount = (<Message>betResponse).content.toLowerCase().replace("$", "");
                if (!amount) return;
                if (amount === "all-in") {
                  action = `raise ${tablePlayer.stackSize}`;
                } else {
                  action = `raise ${amount}`;
                }
                break;
            }
            break;
          case ActionEmoji.FOLD:
            action = "fold";
            break;
          case undefined:
            action = (<Message>response).content.toLowerCase();
            if (action === "all-in") action = `raise ${tablePlayer.stackSize}`;
            break;
          default:
            await message.channel.send(`<@${tablePlayer.player.id}>, unrecognized action.`);
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
            async ({ amount }) => tablePlayer.raiseAction(amount)
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

        delete prompts[message.channel.id];

        await message.channel.send(await table.render());
      } catch (err) {
        await message.channel.send(await table.render());
        await message.channel.send(`<@${tablePlayer.player.id}>, ${err.message || err}`);
      }
    }
  })();
}