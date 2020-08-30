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
  
  public static fromDiscordMessage (message: Message) {
    return new Player(
      message.author.id,
      message.member?.displayName ?? message.author.username,
      message.author.displayAvatarURL({ format: "png"})
    );
  }
}