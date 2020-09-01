import {
  Message,
  MessageReaction,
  Collection,
  CollectorFilter,
  AwaitMessagesOptions,
  AwaitReactionsOptions
} from "discord.js";
import Yargs from "yargs/yargs";
import formatMoney from "./format-money";
import fs from "fs";
import util from "util";
import { BettingRound } from "@chevtek/poker-engine";
import { ChannelTable } from "../../models/holdem";
import ytdl from "ytdl-core";

const readDir = util.promisify(fs.readdir);

enum ActionEmoji {
  CHECK_OR_CALL = "749318088230699018",
  BET_OR_RAISE = "749318023755857932",
  FOLD = "749318088272642228",
  ALL_IN = "750432704230588457",
  YES = "749412605218652381",
  NO = "749412605168189450"
}

interface Prompt { 
  userId: string,
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
  promise?: Promise<Collection<string, Message> | Collection<string, MessageReaction>>,
  resolve?: (value?: Collection<string, Message> | Collection<string, MessageReaction>) => void,
  reject?: (reason?: any) => void
}

const prompts: {[key: string]: Prompt} = {};

export default async function (table: ChannelTable) {

  // Elaborate discord prompt creator. Allows chaining of previous promises.
  const createPrompt = async (oldPrompt: Prompt) => {
    if (!oldPrompt.awaitReactions && !oldPrompt.awaitMessages) {
      throw new Error("You must provide a message or reaction collector.");
    }
    const user = table.channel.guild!.members.cache.get(oldPrompt.userId)!.user;
    const channel = user!.dmChannel || await user!.createDM();
    const newPrompt: Prompt = Object.assign({}, oldPrompt);
    const newMessage = await channel.send(oldPrompt.text);
    if (oldPrompt.reactions) {
      oldPrompt.reactions.forEach(reaction => newMessage.react(reaction));
    }
    newPrompt.promise = new Promise<Collection<string, Message> | Collection<string, MessageReaction>>((resolve, reject) => {
      let discordPromise: Promise<Collection<string, Message> | Collection<string, MessageReaction>>;
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
      discordPromise!.then(resolve).catch(reject);
      newPrompt.resolve = resolve;
      newPrompt.reject = reject;
    });

    if (oldPrompt.promise) {
      newPrompt.promise.then(oldPrompt.resolve).catch(oldPrompt.reject);
    }

    return prompts[table.channel.id] = newPrompt;
  };

  // If there is an existing prompt for this channel then create a new prompt and resolve the old one with it.
  const currentPrompt = prompts[table.channel.id];
  if (currentPrompt) return createPrompt(currentPrompt);

  (async function () {
    await table.render();
    let lastAction;
    while (table.currentRound) {
      const player = table.currentActor!;
      try {
        const legalActions = player.legalActions();
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
        const currentBetTxt = table.currentBet && table.currentBet > 0 ? `The current bet is \`${formatMoney(table.currentBet)}\`.` : "There is no bet yet.";
        const reactions: ActionEmoji[] = [];
        if (legalActions.includes("check") || legalActions.includes("call")) {
          reactions.push(ActionEmoji.CHECK_OR_CALL);
        }
        if (legalActions.includes("bet") || legalActions.includes("raise")) {
          reactions.push(ActionEmoji.BET_OR_RAISE);
        }
        if (legalActions.includes("fold")) {
          reactions.push(ActionEmoji.FOLD);
        }
        const prompt = await createPrompt({
          userId: player.id,
          text: `<@${player.id}>,${lastAction ? ` ${lastAction}` : ""} ${currentBetTxt} What would you like to do?\n You can type: ${actionsTxt}. You can also use the emoji reacts below this message.`,
          reactions,
          awaitMessages: {
            filter: response => response && legalActions.includes(response.content.toLowerCase().split(" ")[0]) && response.author.id === player.id,
            options: { max: 1 }
          },
          awaitReactions: {
            filter: (reaction, user) => reaction
              && [
                ActionEmoji.CHECK_OR_CALL,
                ActionEmoji.BET_OR_RAISE,
                ActionEmoji.FOLD
              ].includes(reaction.emoji.id)
              && user.id === player.id,
            options: { max: 1 }
          }
        });

        const collected = await prompt.promise!;

        const response = collected.first()!;
        let action: string;
        if (!response) continue;
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
              userId: player.id,
              text: `<@${player.id}>, how much would you like to bet? \`<number|"all-in">\``,
              reactions: [ActionEmoji.ALL_IN],
              awaitMessages: {
                filter: response => response && response.content !== "" && ((!isNaN(response.content.replace("$", "")) || response.content.toLowerCase() === "all-in")),
                options: { max: 1 }
              },
              awaitReactions: {
                filter: (reaction, user) => reaction && reaction.emoji.id === ActionEmoji.ALL_IN
                  && user.id === player.id,
                options: { max: 1 }
              }
            });

            const collected = await prompt.promise!;

            const betResponse = collected.first()!;
            if (!betResponse) continue;
            switch ((<MessageReaction>betResponse).emoji?.id) {
              case ActionEmoji.ALL_IN:
                action = legalActions.includes("raise") ? `raise ${player.stackSize}` : `bet ${player.stackSize}`;
                break;
              case undefined:
                const amount = (<Message>betResponse).content.toLowerCase().replace("$", "");
                if (!amount) return;
                if (amount === "all-in") {
                  action = legalActions.includes("raise") ? `raise ${player.stackSize}` : `bet ${player.stackSize}`;
                } else {
                  action = legalActions.includes("raise") ? `raise ${amount}` : `bet ${amount}`;
                }
                break;
            }
            break;
          case ActionEmoji.FOLD:
            action = "fold";
            break;
          case undefined:
            action = (<Message>response).content.toLowerCase();
            if (action === "all-in") action = `raise ${player.stackSize}`;
            break;
          default:
            throw new Error(`<@${player.id}>, unrecognized action.`);
        }

        const roundBeforeAction = table.currentRound;
        const playerName = table.channel.guild!.members.cache.get(player.id)!.displayName;

        await new Promise((resolve, reject) => Yargs()
          .exitProcess(false)
          .command(
            "bet <amount>",
            "Open the bet.",
            yargs => yargs.number("amount").required("amount"),
            async ({ amount }) => {
              player.betAction(amount);
              lastAction = `${playerName} bet \`$${amount}\`.`;
              if (table.voiceConnection) {
                const betSoundFiles = await readDir("./sounds/holdem/call-bet-raise");
                const randomSound = betSoundFiles[Math.floor(Math.random() * betSoundFiles.length)];
                await new Promise((resolve, reject) => table.voiceConnection!.play(`./sounds/holdem/call-bet-raise/${randomSound}`).on("finish", resolve).on("error", reject));
              }
            }
          )
          .command(
            "call",
            "Call the current bet.",
            () => {},
            async () => {
              player.callAction();
              lastAction = `${playerName} called.`;
              if (table.voiceConnection) {
                const callSoundFiles = await readDir("./sounds/holdem/call");
                const randomSound = callSoundFiles[Math.floor(Math.random() * callSoundFiles.length)];
                await new Promise((resolve, reject) => table.voiceConnection!.play(`./sounds/holdem/call/${randomSound}`).on("finish", resolve).on("error", reject));
              }
            }
          )
          .command(
            "check",
            "Pass action forward if there is no bet.",
            () => {},
            async () => {
              player.checkAction();
              lastAction = `${playerName} checked.`;
              if (table.voiceConnection) {
                const checkSoundFiles = await readDir("./sounds/holdem/check");
                const randomSound = checkSoundFiles[Math.floor(Math.random() * checkSoundFiles.length)];
                await new Promise((resolve, reject) => table.voiceConnection!.play(`./sounds/holdem/check/${randomSound}`).on("finish", resolve).on("error", reject));
              }
            }
          )
          .command(
            "raise <amount>",
            "Raise the current bet.",
            yargs => yargs.number("amount").required("amount"),
            async ({ amount }) => {
              player.raiseAction(amount);
              lastAction = `${playerName} raised to \`$${amount}\`.`;
              if (table.voiceConnection) {
                const raiseSoundFiles = await readDir("./sounds/holdem/bet-raise");
                const randomSound = raiseSoundFiles[Math.floor(Math.random() * raiseSoundFiles.length)];
                await new Promise((resolve, reject) => table.voiceConnection!.play(`./sounds/holdem/bet-raise/${randomSound}`).on("finish", resolve).on("error", reject));
              }
            }
          )
          .command(
            "fold",
            "Leave the hand.",
            () => {},
            async () => {
              player.foldAction();
              lastAction = `${playerName} folded.`;
              if (table.voiceConnection) {
                const foldSoundFiles = await readDir("./sounds/holdem/fold");
                const randomSound = foldSoundFiles[Math.floor(Math.random() * foldSoundFiles.length)];
                await new Promise((resolve, reject) => table.voiceConnection!.play(`./sounds/holdem/fold/${randomSound}`).on("finish", resolve).on("error", reject));
              }
            }
          )
          .onFinishCommand(resolve)
          .fail((msg, err) => reject(msg || err))
          .parse(action!)
        );

        const roundAfterAction = table.currentRound;

        if (roundAfterAction !== roundBeforeAction) {
          lastAction = `Betting for the ${roundAfterAction} has begun.`;
          if (table.voiceConnection) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            (async () => {
              const placeCardSoundFiles = await readDir("./sounds/holdem/place-card");
              const placeCardSound = placeCardSoundFiles[Math.floor(Math.random() * placeCardSoundFiles.length)];
              const gatherChipsSoundFiles = await readDir("./sounds/holdem/gather-chips");
              const gatherChipsSound = gatherChipsSoundFiles[Math.floor(Math.random() * gatherChipsSoundFiles.length)];
              await new Promise((resolve, reject) => table.voiceConnection!.play(`./sounds/holdem/gather-chips/${gatherChipsSound}`).on("finish", resolve).on("error", reject));
              await new Promise((resolve) => setTimeout(resolve, 500));
              switch (roundAfterAction) {
                case BettingRound.FLOP:
                  for (let index = 0; index < 3; index++) {
                    const randomSoundFlop = placeCardSoundFiles[Math.floor(Math.random() * placeCardSoundFiles.length)];
                    await new Promise((resolve, reject) => table.voiceConnection!.play(`./sounds/holdem/place-card/${randomSoundFlop}`).on("finish", resolve).on("error", reject));
                  }
                  break;
                case BettingRound.TURN:
                  await new Promise((resolve, reject) => table.voiceConnection!.play(`./sounds/holdem/place-card/${placeCardSound}`).on("finish", resolve).on("error", reject));
                  break;
                case BettingRound.RIVER:
                  await new Promise((resolve, reject) => table.voiceConnection!.play(`./sounds/holdem/place-card/${placeCardSound}`).on("finish", resolve).on("error", reject));
                  break;
                default:
                  const winSoundFiles = await readDir("./sounds/holdem/winner");
                  const randomSoundWin = winSoundFiles[Math.floor(Math.random() * winSoundFiles.length)];
                  await new Promise((resolve, reject) => table.voiceConnection!.play(`./sounds/holdem/winner/${randomSoundWin}`).on("finish", resolve).on("error", reject));
                  break;
              }
            })();
          }
        }

        delete prompts[table.channel.id];
        await table.render();
      } catch (err) {
        await table.render();
        const user = table.channel.guild.members.cache.get(player.id)!.user;
        const channel = user.dmChannel || user.createDM();
        channel.send(`<@${player.id}>, ${err.message || err}`);
      }
    }
  })();
}