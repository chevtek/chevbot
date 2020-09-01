import { Table } from "@chevtek/poker-engine";
import { VoiceConnection, MessageAttachment, Message, MessageEmbed } from "discord.js";
import { renderPokerTable } from "../../drawing-utils";
import { formatMoney } from "../../utilities/holdem";

const { COMMAND_PREFIX } = process.env;

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

  async render (message: Message) {
    const tableCreator = message.guild?.members.cache.get(this.creatorId);
    if ((!this.voiceConnection || this.voiceConnection.status === 4) && tableCreator?.voice.channel) {
      this.voiceConnection = await tableCreator?.voice.channel.join();
    } else if (this.voiceConnection && !tableCreator?.voice.channel) {
      this.voiceConnection.disconnect();
      delete this.voiceConnection;
    }
    const generateGameEmbed = async () => {
      const pokerTable = new MessageAttachment(
        await renderPokerTable(this, message),
        "pokerTable.png"
      );
      const gameEmbed = new MessageEmbed()
        .setTitle("No-limit Hold'em!")
        .setDescription(`
          **Buy-in:** ${formatMoney(this.buyIn)}
          **Players:** ${this.players.length}

          > **Type \`${COMMAND_PREFIX}th sit\` to play!**
        `.split("\n").map(line => line.trim()).join("\n"))
        .setColor(0x00ff00)
        .attachFiles([pokerTable])
        .setImage("attachment://pokerTable.png")
        .setFooter(`"${COMMAND_PREFIX}th help" for more options.`);
      const sidePots = this.sidePots;
      if (sidePots) {
        gameEmbed.addFields(sidePots.map((pot, index) => {
          const players = pot.winners ? pot.winners : pot.eligiblePlayers;
          return {
            name: `Side Pot ${index + 1}` ,
            value: `
              **Amount**: ${formatMoney(pot.amount)}
              **${pot.winners ? "Winners:" : "Players:"}**
              ${players.map(player => `<@${player.id}>\n`)}
            `.split("\n").map(line => line.trim()).join("\n")
          };
        }));
      }
      return gameEmbed;
    };
    await message.channel.send(await generateGameEmbed());
    if (!this.currentRound && this.handNumber === 0) return;
    for (let index = 0; index < this.players.length; index++) {
      const player = this.players[index];
      const oldValue = player.showCards;
      player.showCards = true;
      const user = message.guild!.members.cache.get(player.id)!.user;
      await user.send(await generateGameEmbed());
      player.showCards = oldValue;
    }
  }
}