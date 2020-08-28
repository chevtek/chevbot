import { Message } from "discord.js";

export class Player {
  constructor (
    public id: string,
    public name: string,
    public avatarUrl: string,
    public bankroll?: number
  ) {
    if (!bankroll) this.bankroll = 1000;
  }
  
  static fromDiscordMessage (message: Message) {
    return new Player(
      message.author.displayAvatarURL({ format: "png"}),
      message.member?.displayName ?? message.author.username,
      message.author.id
    );
  }
}