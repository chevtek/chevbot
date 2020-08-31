import { MessageAttachment, MessageEmbed, Message } from "discord.js";
import { renderPokerTable } from "../../drawing-utils";
import { formatMoney } from "../../utilities/holdem";
import { ChannelTable } from "../../models/holdem";

const { COMMAND_PREFIX } = process.env;

export default async function renderTable (table: ChannelTable, message: Message) {
  const tableCreator = message.guild?.members.cache.get(table.creatorId);
  if ((!table.voiceConnection || table.voiceConnection.status === 4) && tableCreator?.voice.channel) {
    table.voiceConnection = await tableCreator?.voice.channel.join();
	} else if (table.voiceConnection && !tableCreator?.voice.channel) {
    table.voiceConnection.disconnect();
    delete table.voiceConnection;
  }
  const pokerTable = new MessageAttachment(
    await renderPokerTable(table, message),
    "pokerTable.png"
  );
  const gameEmbed = new MessageEmbed()
    .setTitle("No-limit Hold'em!")
    .setDescription(`
      **Buy-in:** ${formatMoney(table.buyIn)}
      **Players:** ${table.players.length}

      > **Type \`${COMMAND_PREFIX}th sit\` to play!**
    `.split("\n").map(line => line.trim()).join("\n"))
    .setColor(0x00ff00)
    .attachFiles([pokerTable])
    .setImage("attachment://pokerTable.png")
    .setFooter(`"${COMMAND_PREFIX}th help" for more options.`);
  const sidePots = table.sidePots;
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
}