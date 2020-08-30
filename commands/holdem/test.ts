import { Message } from "discord.js";
// import { Table, Player } from "../../models/poker";
import { Table } from "../../models/poker/table";
import { Player } from "../../models/poker/player";
import util from "util";

export const command = "test";

export const description = false;

export async function handler ({ discord }) {
  const message = discord.message as Message;

  // message.channel.send("Does this work?", { tts: true });

  const debug = async (obj) => message.channel.send(util.inspect(obj), { code: "js", split: true });

  const table = new Table(100, 20, 10);

  table.debug = true;

  const player1 = Player.fromDiscordMessage(message);
  const player2 = Player.fromDiscordMessage(message);
  const player3 = Player.fromDiscordMessage(message);
  const player4 = Player.fromDiscordMessage(message);
  const player5 = Player.fromDiscordMessage(message);

  table.sitDown(player1, 1000);
  table.sitDown(player2, 1000);
  table.sitDown(player3, 1000);
  // table.sitDown(player4, 1000);
  // table.sitDown(player5, 1000);
  
  // table.players.forEach(player => player.showCards = true);

  table.startHand();

  // pre-flop
  table.currentActor!.callAction();
  table.currentActor!.callAction();
  table.currentActor!.checkAction();

  // flop
  table.currentActor!.checkAction();
  table.currentActor!.checkAction();
  table.currentActor!.checkAction();

  // turn
  table.currentActor!.checkAction();
  table.currentActor!.checkAction();
  table.currentActor!.checkAction();

  // river
  table.currentActor!.checkAction();
  table.currentActor!.checkAction();
  table.currentActor!.checkAction();

  await debug(table.toJson());
  // await debug(table.currentActor!.legalActions());
  await message.channel.send(await table.render());
}