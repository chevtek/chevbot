import { Table } from "@chevtek/poker-engine";
import { VoiceConnection } from "discord.js";
import { min } from "moment";

export class ChannelTable extends Table {
  voiceConnection?: VoiceConnection

  constructor(
    public creatorId: string,
    minBuyIn?: number,
    smallBlind?: number,
    bigBlind?: number
  ) {
    super(minBuyIn, smallBlind, bigBlind);
  }
}