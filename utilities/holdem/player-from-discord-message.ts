import { Message } from "discord.js";
import { Player } from "../../models/holdem";

export default function (message: Message) {
  return new Player(
    message.author.id,
    message.member?.displayName ?? message.author.username
  );
}