import { Message } from "discord.js";
import { Table, Player } from "../../models/poker";
import tables from "../../poker-tables";

export const command = ["create", "*"];

export const description = "Create a Hold'em table in this channel.";

export const builder = {
  "min-buy-in": {
    description: "Specify a minimum buy-in amount for the table.",
    default: 1000,
    type: "number"
  },
  "buy-in": {
    description: "Specify the amount to buy-in as the creator of the game. Default is the minimum buy-in.",
    type: "number"
  },
  "big-blind": {
    description: "Specify the amount of the big blind.",
    default: 20
  },
  "small-blind": {
    description: "Specify the amount of the small blind.",
    default: 10
  },
  "reset": {
    description: "Remove all players and reset the table.",
    type: "boolean"
  },
  "debug": {
    type: "boolean",
    hidden: true
  }
};

export async function handler (argv) {
  const {
    discord,
    minBuyIn,
    buyIn,
    bigBlind,
    smallBlind,
    reset,
    debug
  } = argv;
  const message = discord.message as Message;
  if (message.channel.type === "dm") {
    message.reply("This command can only be run from a channel on a server.");
    return;
  }
  let table = tables[message.channel.id];
  if (table) {
    if (!reset) {
      const [player] = table.players.filter(player => player.player.id === message.author.id);
      if (!player) {
        table.sitDown(Player.fromDiscordMessage(message), table.buyIn);
      }
      return;
    }
    try {
      message.reply("Are you sure? Type `CONFIRM` to reset the table.");
      await message.channel.awaitMessages(
        response => {
          if (response.author.id !== message.author.id) return false;
          return response.content === "CONFIRM";
        },
        { max: 1, time: 20000, errors: ["time"] }
      );
    } catch (err) {
      message.reply("No confirmation received. The table was not reset.");
      return;
    }
  }
  table = new Table(minBuyIn, bigBlind, smallBlind);
  table.debug = debug;
  table.sitDown(Player.fromDiscordMessage(message), buyIn || table.buyIn);
  tables[message.channel.id] = table;
  message.channel.send(await table.render());
}