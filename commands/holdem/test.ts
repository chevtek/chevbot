import { Message } from "discord.js";
import { Table } from "@chevtek/poker-engine";
import { renderPokerTable } from "../../drawing-utils";
import util from "util";

export const command = "test";

export const description = false;

export async function handler ({ discord }) {
  const message = discord.message as Message;

  // message.channel.send("Does this work?", { tts: true });

  const debug = async (obj) => message.channel.send(util.inspect(obj), { code: "js", split: true });

  const table = new Table(100, 20, 10);

  table.debug = true;

  const id = message.author.id;
  table.sitDown(id, 1000);
  table.sitDown(id, 1000);
  table.sitDown(id, 1000);
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
  await message.channel.send(await renderPokerTable(message));
}