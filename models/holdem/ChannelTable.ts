import {
  VoiceConnection,
  MessageAttachment,
  Message,
  MessageEmbed,
  TextChannel,
  Collection,
  MessageReaction
} from "discord.js";
import { Table } from "@chevtek/poker-engine";
import { renderPokerTable } from "../../drawing-utils";
import { formatMoney } from "../../utilities/holdem";
import { Prompt } from "./Prompt";
import fs from "fs";
import util from "util";
import path from "path";

const readDir = util.promisify(fs.readdir);
const { COMMAND_PREFIX } = process.env;

export class ChannelTable extends Table {

  voiceConnection?: VoiceConnection
  prompt?: Prompt
  sound = true

  constructor(
    public creatorId: string,
    public channel: TextChannel,
    minBuyIn?: number,
    smallBlind?: number,
    bigBlind?: number
  ) {
    super(minBuyIn, smallBlind, bigBlind);
  }

  async createPrompt(prompt: Prompt) {
    if (!prompt.awaitReactions && !prompt.awaitMessages) {
      throw new Error("You must provide a message or reaction collector.");
    }
    const user = this.channel.guild!.members.cache.get(prompt.userId)!.user;
    const channel = user!.dmChannel || await user!.createDM();
    const newPrompt: Prompt = Object.assign({}, prompt);
    const newMessage = await channel.send(prompt.text);
    if (prompt.reactions) {
      prompt.reactions.forEach(reaction => newMessage.react(reaction));
    }
    newPrompt.promise = new Promise<Collection<string, Message> | Collection<string, MessageReaction>>((resolve, reject) => {
      let discordPromise: Promise<Collection<string, Message> | Collection<string, MessageReaction>>;
      if (prompt.awaitMessages && prompt.awaitReactions) {
        discordPromise = Promise.race([
          newMessage.channel.awaitMessages(prompt.awaitMessages.filter, prompt.awaitMessages.options),
          newMessage.awaitReactions(prompt.awaitReactions.filter, prompt.awaitReactions.options)
        ]);
      } else if (prompt.awaitMessages) {
        discordPromise = newMessage.channel.awaitMessages(prompt.awaitMessages.filter, prompt.awaitMessages.options);
      } else if (prompt.awaitReactions) {
        discordPromise = newMessage.awaitReactions(prompt.awaitReactions.filter, prompt.awaitReactions.options);
      }
      discordPromise!.then(resolve).catch(reject);
      newPrompt.resolve = resolve;
      newPrompt.reject = reject;
    });

    if (prompt.promise) {
      newPrompt.promise.then(prompt.resolve).catch(prompt.reject);
    }

    return this.prompt = newPrompt;
  }

  async playRandomSound (directory: string) {
    if (!this.sound) return;
    const tableCreator = this.channel.guild?.members.cache.get(this.creatorId);
    if ((!this.voiceConnection || this.voiceConnection.status === 4) && tableCreator?.voice.channel) {
      this.voiceConnection = await tableCreator?.voice.channel.join();
    } else if (this.voiceConnection && !tableCreator?.voice.channel) {
      this.voiceConnection.disconnect();
      delete this.voiceConnection;
    }
    if (!this.voiceConnection) return;
    const files = (await readDir(directory)).filter(file => file !== "rare");
    const skipFraction = 30;
    let soundPath = path.join(directory, files[Math.floor(Math.random() * files.length)]);
    if (Math.floor(Math.random() * skipFraction) === 0) {
      try {
        const rareFiles = await readDir(path.join(directory, "rare"));
        if (rareFiles.length > 0) {
          soundPath = path.join(directory, "rare", rareFiles[Math.floor(Math.random() * rareFiles.length)]);
        }
      } catch (err) {}
    }
    return new Promise((resolve, reject) => this.voiceConnection!.play(soundPath).on("finish", resolve).on("error", reject));
  }

  async render () {
    const generateGameEmbed = async () => {
      const pokerTable = new MessageAttachment(
        await renderPokerTable(this),
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
            name: index === 0 ? "Main Pot" : `Side Pot ${index + 1}`,
            value: `
              **Amount:** ${formatMoney(pot.amount)}
              **${pot.winners ? "Winners:" : "Players:"}** ${players.map(player => `<@${player.id}>`).join(", ")}
            `.split("\n").map(line => line.trim()).join("\n")
          };
        }));
      }
      return gameEmbed;
    };
    await this.channel.send(await generateGameEmbed());
    if (!this.currentRound && this.handNumber === 0) return;
    if (this.debug) {
      this.players.forEach(player => player.showCards = true);
      const user = this.channel.guild!.members.cache.get(this.creatorId)!.user;
      await user.send(await generateGameEmbed());
      return;
    }
    for (let index = 0; index < this.players.length; index++) {
      const player = this.players[index];
      const oldValue = player.showCards;
      player.showCards = true;
      const user = this.channel.guild!.members.cache.get(player.id)!.user;
      await user.send(await generateGameEmbed());
      player.showCards = oldValue;
    }
  }
}