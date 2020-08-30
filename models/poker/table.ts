import { Hand } from "pokersolver";
// import { Card, Player, CardSuit, CardRank } from ".";
import { Player } from "./player";
import { Card, CardRank, CardSuit } from "./card";
import { MessageAttachment, MessageEmbed } from "discord.js";
import { renderPokerTable } from "../../drawing-utils";
import formatMoney from "../../utilities/formatMoney";

const { COMMAND_PREFIX } = process.env;

export class Table {
  public communityCards: Card[] = [];
  public currentRound?: BettingRound;
  public currentBet?: number;
  public lastRaise?: number;
  public players: TablePlayer[] = [];
  public pots: Pot[] = [];
  public winners?: TablePlayer[];
  public dealerPosition?: number;
  public smallBlindPosition?: number;
  public bigBlindPosition?: number;
  public currentPosition?: number;
  public lastPosition?: number;
  public debug: boolean = false;

  private deck: Card[] = [];

  constructor (
    public buyIn: number = 1000,
    public bigBlind: number = 20,
    public smallBlind: number = 10
  ) {
    if (smallBlind >= bigBlind) {
      throw new Error("The small blind must be less than the big blind.");
    }
  }

  get currentActor () {
    if (this.currentPosition === undefined) return;
    return this.players[this.currentPosition];
  }

  get lastActor () {
    if (this.lastPosition === undefined) return;
    return this.players[this.lastPosition];
  }

  get actingPlayers () {
    return this.players.filter(player => !player.folded && player.stackSize > 0);
  }

  get activePlayers () {
    return this.players.filter(player => !player.folded);
  }

  moveDealer() {
    if (this.dealerPosition === undefined) {
      this.dealerPosition = 0;
    } else {
      this.dealerPosition++;
    }
    if (this.dealerPosition === this.players.length) {
      this.dealerPosition = 0;
    }
    this.smallBlindPosition = this.dealerPosition + 1;
    if (this.smallBlindPosition === this.players.length) {
      this.smallBlindPosition = 0;
    }
    this.bigBlindPosition = this.dealerPosition + 2;
    if (this.bigBlindPosition >= this.players.length) {
      this.bigBlindPosition -= this.players.length;
    }
  }

  currentPot () {
    // If there is no pot, create one.
    if (this.pots.length === 0) {
      const newPot = new Pot();
      this.pots.push(newPot);
      return newPot;
    }
    return this.pots[this.pots.length - 1];
  }

  sidePots () {
    if (this.pots.length <= 1) {
      return null;
    }
    return this.pots.slice(1, this.pots.length - 1)
  }

  sitDown(newPlayer: Player, buyIn: number) {
    if (this.players.length === 10) {
      throw new Error("The table is currently full.");
    }
    if (buyIn < this.buyIn) {
      throw new Error(`Your buy-in must be greater or equal to the minimum buy-in of ${this.buyIn}.`);
    }
    const existingPlayers = this.players.filter(player => player.player.id === newPlayer.id);
    if (existingPlayers.length > 0 && !this.debug) {
      throw new Error("Player already joined this table.");
    }
    this.players.push(new TablePlayer(newPlayer, buyIn, this));
  }

  standUp(player: TablePlayer | string): void {
    if (typeof player === "string") {
      [player] = this.players.filter(tablePlayer => tablePlayer.player.id === player);
      if (!player) {
        throw new Error(`No player found.`);
      }
    }
    const playerIndex = this.players.indexOf(player);
    this.players.splice(playerIndex, 1);
  }

  startHand () {
    // Check for active round and throw if there is one.
    if (this.currentRound) {
      throw new Error("There is already an active hand!");
    }

    // Remove busted players;
    const bustedPlayers = this.players.filter(player => player.stackSize === 0);
    bustedPlayers.forEach(player => this.standUp(player));

    // Reset player bets, hole cards, and fold status.
    this.players.forEach(player => { 
      player.bet = 0;
      delete player.raise;
      delete player.holeCards;
      player.folded = false;
      player.showCards = false;
    });

    // Clear winner if there is one.
    if (this.winners) delete this.winners;

    // Reset community cards.
    this.communityCards = [];

    // Empty pots.
    this.pots = [new Pot()];

    // Ensure there are at least two players.
    if (this.players.length < 2) {
      throw new Error("Not enough players to start.");
    }

    // Set round to pre-flop.
    this.currentRound = BettingRound.PRE_FLOP;

    // Move dealer and blind positions.
    this.moveDealer();

    // Force small and big blind bets and set current bet amount.
    const sbPlayer = this.players[this.smallBlindPosition!];
    const bbPlayer = this.players[this.bigBlindPosition!]
    sbPlayer.stackSize -= sbPlayer.bet = this.smallBlind;
    bbPlayer.stackSize -= bbPlayer.bet = this.bigBlind;
    this.currentBet = this.bigBlind;
    if (this.lastRaise) delete this.lastRaise;

    // Set current and last actors.
    this.currentPosition = this.dealerPosition! + 3;
    if (this.currentPosition >= this.players.length) {
      this.currentPosition -= this.players.length * Math.floor(this.currentPosition / this.players.length);
    }
    this.lastPosition = this.dealerPosition! + 2;
    if (this.lastPosition >= this.players.length) {
      this.lastPosition -= this.players.length * Math.floor(this.lastPosition / this.players.length);
    }

    // Generate newly shuffled deck.
    this.deck = this.newDeck();

    // Deal cards to players.
    this.players.forEach(player => {
      player.holeCards = [
        this.deck.pop()!,
        this.deck.pop()!
      ];
    });
  }

  nextAction () {

    // See if everyone has folded.
    if (this.activePlayers.length === 1) {
      delete this.currentRound;
      this.showdown();
      return;
    }

    // If current position is last position, move to next round.
    if (this.currentPosition === this.lastPosition) {
      this.nextRound();
      return;
    }

    // Send the action to the next player.
    this.currentPosition!++;
    if (this.currentPosition! >= this.players.length) {
      this.currentPosition! -= this.players.length;
    }

    // If the player has folded or is all-in then move the action again.
    if (this.currentActor!.folded || this.currentActor!.stackSize === 0) {
      this.nextAction();
    }
  }

  gatherBets () {

    let currentPot = this.currentPot();

    // Obtain all players who placed bets.
    const bettingPlayers = this.players.filter(player => player.bet > 0);

    // Check for all-in players.
    let allInPlayers = bettingPlayers.filter(player => player.bet && player.stackSize === 0);

    // Iterate over them and gather bets until there are no more all in players.
    while (allInPlayers.length > 0) {
      // Find lowest all-in player.
      const lowestAllInBet = allInPlayers.map(player => player.bet).reduce((prevBet, evalBet) => evalBet < prevBet ? evalBet : prevBet);
      // If other players have bet more than the lowest all-in player then subtract the lowest all-in amount from their bet and add it to the pot.
      bettingPlayers.forEach(player => {
        if (player.bet === 0) return;
        if (player.bet >= lowestAllInBet) {
          player.bet -= lowestAllInBet;
          currentPot.amount += lowestAllInBet;
          if (!player.folded) {
            currentPot.eligiblePlayers.push(player);
          }
          return;
        }
        // Gather bets from folded players and players who only called the lowest all-in.
        currentPot.amount += player.bet;
        if (!player.folded) {
          currentPot.eligiblePlayers.push(player);
        }
        player.bet = 0;
      });
      // Check for all-in players again.
      allInPlayers = allInPlayers.filter(player => player.bet && player.stackSize === 0);
      // Create new pot.
      currentPot = new Pot();
      this.pots.push(currentPot);
    }

    // Once we're done with all-in players add the remaining bets to the pot.
    bettingPlayers.forEach(player => {
      if (player.bet === 0) return;
      currentPot.amount += player.bet;
      if (!player.folded) {
        currentPot.eligiblePlayers.push(player);
      }
      player.bet = 0;
    });
  }

  nextRound () {

    const resetPosition = () => {
      // Set action to first player after dealer.
      this.currentPosition = this.dealerPosition! + 1;
      if (this.currentPosition === this.players.length) {
        this.currentPosition = 0;
      }
      this.lastPosition = this.dealerPosition;
      if (!this.actingPlayers.includes(this.currentActor!) || this.actingPlayers.length <= 1) {
        this.nextAction();
      }
    };

    switch (this.currentRound) {
      case BettingRound.PRE_FLOP:

        // Gather bets and place them in the pot.
        this.gatherBets();

        // Reset current bet and last raise.
        delete this.currentBet;
        delete this.lastRaise;

        // Set round to flop.
        this.currentRound = BettingRound.FLOP;

        // Deal the flop.
        this.communityCards.push(
          this.deck.pop()!,
          this.deck.pop()!,
          this.deck.pop()!
        );

        // Reset position;
        resetPosition();

        break;
      case BettingRound.FLOP:

        // Gather bets and place them in the pot.
        this.gatherBets();

        // Reset current bet and last raise.
        delete this.currentBet;
        delete this.lastRaise;

        // Set round to turn.
        this.currentRound = BettingRound.TURN;

        // Deal the turn.
        this.communityCards.push(this.deck.pop()!);

        // Reset position;
        resetPosition();

        break;
      case BettingRound.TURN:

        // Gather bets and place them in the pot.
        this.gatherBets();

        // Reset current bet and last raise.
        delete this.currentBet;
        delete this.lastRaise;

        // Set round to river.
        this.currentRound = BettingRound.RIVER;

        // Deal the turn.
        this.communityCards.push(this.deck.pop()!);

        // Reset position.
        resetPosition();

        break;
      case BettingRound.RIVER:
        delete this.currentRound;
        this.players.forEach(player => player.showCards = !player.folded);
        this.showdown();
        break;
    }
  }
  
  showdown () {
    if (this.currentRound) {
      throw new Error("Showdown called while there is still an active hand!");
    }
    delete this.currentPosition;
    delete this.lastPosition;

    this.gatherBets();

    // Figure out all winners for display.

    const findWinners = (players: TablePlayer[]) =>
      Hand.winners(players.map(player => {
        const hand = player.hand;
        hand.player = player;
        return hand;
      })).map(hand => hand.player);

    if (this.activePlayers.length > 1) {
      this.activePlayers.forEach(player => player.showCards = true);
    }

    this.winners = findWinners(this.activePlayers);

    // Distribute pots and mark winners.
    this.pots.forEach(pot => {
       pot.winners = findWinners(pot.eligiblePlayers); 
       const award = pot.amount / pot.winners!.length;
       pot.winners!.forEach(player => player.stackSize += award);
    });
  }

  async render() {
    const pokerTable = new MessageAttachment(
      await renderPokerTable(this),
      "pokerTable.png"
    );
    const gameEmbed = new MessageEmbed()
      .setTitle("No-limit Hold'em!")
      .setDescription(`
        **Buy-in:** ${formatMoney(this.buyIn)}
        **Players:** ${this.players.length}

        > **Type \`${COMMAND_PREFIX}holdem join\` to play!**
      `)
      .setColor(0x00ff00)
      .attachFiles([pokerTable])
      .setImage("attachment://pokerTable.png")
      .setFooter(`"${COMMAND_PREFIX}holdem --help" for more options.`);
    const sidePots = this.sidePots();
    if (sidePots) {
      gameEmbed.addFields(sidePots.map((pot, index) => {
        const players = pot.winners ? pot.winners : pot.eligiblePlayers;
        return {
          name: `Side Pot ${index + 1}` ,
          value: `
            **Amount**: ${formatMoney(pot.amount)}
            **${pot.winners ? "Winners:" : "Players:"}**
            ${players.map(player => `<@${player.player.id}>\n`)}
          `
        };
      }));
    }
    return gameEmbed;
  }

  public toJson () {
    return {
      debug: this.debug,
      currentRound: this.currentRound,
      currentBet: this.currentBet,
      lastRaise: this.lastRaise,
      dealerPosition: this.dealerPosition,
      currentPosition: this.currentPosition,
      lastPosition: this.lastPosition,
      currentActor: this.currentActor?.player.name,
      lastActor: this.lastActor?.player.name,
      winner: this.winners?.map(player => ({
        name: player.player.name,
        hand: player.hand.descr
      })),
      pots: this.pots.map(pot => ({
        amount: pot.amount,
        players: pot.eligiblePlayers.map(player => player.player.name)
      })),
      players: this.players.map(player => ({
        id: player.player.id,
        name: player.player.name,
        bet: player.bet,
        stackSize: player.stackSize,
        raise: player.raise,
        folded: player.folded,
        holeCards: player.holeCards?.map(card => `${card.rank}${card.suitChar}`).join(),
        hand: player.hand.descr
      }))
    }
  }

  private newDeck (): Card[] {
    const newDeck: Card[] = [];
    Object.keys(CardSuit).forEach(suit => {
      Object.keys(CardRank).forEach(value => {
        newDeck.push(new Card(CardRank[value], CardSuit[suit]));
      });
    });
    for (let index = newDeck.length - 1; index > 0; index--) {
      const rndIndex = Math.floor(Math.random() * (index + 1));
      [newDeck[index], newDeck[rndIndex]] = [newDeck[rndIndex], newDeck[index]];
    }
    return newDeck;
  }
}

export class TablePlayer {
    bet: number = 0;
    raise?: number;
    holeCards?: [Card, Card];
    folded: boolean = false;
    showCards: boolean = false;

    constructor (
      public player: Player,
      public stackSize: number,
      public table: Table
    ) {}

    get hand () {
      if (!this.holeCards) return null;
      return Hand.solve(this.holeCards
        .concat(this.table.communityCards)
        .map(card => `${card.rank}${card.suit}`)
      );
    }

    betAction (amount: number) {
      if (this !== this.table.currentActor) {
        throw new Error("Action invoked on player out of turn!");
      }
      if (!this.legalActions().includes("bet")) {
        throw new Error("Illegal action.");
      }
      if (isNaN(amount)) {
        throw new Error("Amount was not a valid number.");
      }
      const currentBet = this.table.currentBet;
      if (currentBet) throw new Error("Illegal action. There is already a bet on the table.");
      if (amount < this.table.bigBlind) {
        throw new Error("A bet must be at least as much as the big blind.");
      } else if (amount > this.stackSize) {
        throw new Error("You cannot bet more than you brought to the table.");
      }
      this.raiseAction(amount);
    }

    callAction () {
      if (this !== this.table.currentActor) {
        throw new Error("Action invoked on player out of turn!");
      }
      if (!this.legalActions().includes("call")) {
        throw new Error("Illegal action.");
      }
      const currentBet = this.table.currentBet;
      if (!currentBet) throw new Error("Illegal action. There is no bet to call.");
      const callAmount = currentBet - this.bet;
      // All-in via inability to call
      if (callAmount > this.stackSize) {
        // Add stack to current bet and empty stack;
        this.bet += this.stackSize;
        this.stackSize = 0;
      } else {
        delete this.raise;
        this.stackSize -= callAmount;
        this.bet += callAmount;
      }
      this.table.nextAction();
    }

    raiseAction (amount: number) {
      if (this !== this.table.currentActor) {
        throw new Error("Action invoked on player out of turn!");
      }
      const legalActions = this.legalActions();
      if (!legalActions.includes("raise") && !legalActions.includes("bet")) {
        throw new Error("Illegal action.");
      }
      if (isNaN(amount)) {
        throw new Error("Amount was not a valid number.");
      }
      const currentBet = this.table.currentBet;
      const lastRaise = this.table.lastRaise;
      const minRaise = lastRaise ?? this.table.bigBlind;
      const raiseAmount = currentBet ? amount - currentBet : amount;
      // Do not allow the raise if it's less than the minimum and they aren't going all-in.
      if (raiseAmount < minRaise && amount < this.stackSize) {
        throw new Error(`You must raise by at least ${minRaise}`);
      } else if (raiseAmount < minRaise && amount >= this.stackSize) {
        // When the all-in player is raising for less than the minimum raise then increase the bet amount but do not change last raise value.
        this.bet += this.stackSize;
        this.stackSize = 0;
        this.table.currentBet = this.bet;
      } else if (amount >= minRaise) {
        this.bet += amount;
        this.stackSize -= amount;
        this.table.currentBet = this.bet; 
        this.raise = this.table.lastRaise = currentBet ? amount - currentBet : amount;
        // Set last action to the player behind this one.
        this.table.lastPosition = this.table.currentPosition! - 1;
        if (this.table.lastPosition === -1) this.table.lastPosition = this.table.players.length;
      }

      this.table.nextAction();
    }

    checkAction () {
      if (this !== this.table.currentActor) {
        throw new Error("Action invoked on player out of turn!");
      }
      if (!this.legalActions().includes("check")) {
        throw new Error("Illegal action.");
      }
      this.table.nextAction();
    }

    foldAction () {
      if (this !== this.table.currentActor) {
        throw new Error("Action invoked on player out of turn!");
      }
      if (!this.legalActions().includes("fold")) {
        throw new Error("Illegal action.");
      }
      this.folded = true;
      this.table.nextAction();
    }

    legalActions () {
      const currentBet = this.table.currentBet;
      const lastRaise = this.table.lastRaise;
      const actions: string[] = [];
      if (!currentBet) {
        actions.push("check", "bet");
      } else {
        if (this.bet === currentBet) {
          actions.push("check");
          if (this.stackSize > currentBet) {
            actions.push("raise");
          }
        }
        if (this.bet < currentBet) {
          actions.push("call");
          if (this.stackSize > currentBet && (!lastRaise || !this.raise || lastRaise >= this.raise)) {
            actions.push("raise");
          }
        }
      }
      actions.push("fold");
      return actions;
    }
}

export class Pot {
  amount: number = 0;
  eligiblePlayers: TablePlayer[] = new Array();
  winners?: TablePlayer[];
}

export enum BettingRound {
  PRE_FLOP = "pre-flop",
  FLOP = "flop",
  TURN = "turn",
  RIVER = "river"
}