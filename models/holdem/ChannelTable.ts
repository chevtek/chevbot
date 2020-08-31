import { Table } from "@chevtek/poker-engine";
import { VoiceConnection } from "discord.js";

export class ChannelTable extends Table {
  voiceConnection?: VoiceConnection
}