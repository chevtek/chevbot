import { Card, Player, CardSuit, CardRank } from ".";
import { exception } from "console";

export class Table {
  public communityCards: Card[] = [];
  public currentPlayer: TablePlayer | false = false;
  public currentRound: BettingRound | false = false;
  public currentBet: number | false = false;
  public players: TablePlayer[] = [];

  private deck: Card[] = [];
  private pots: Pot[] = [];

  constructor (
    public buyIn: number = 1000,
    public dealerPosition: number = -1,
    public bigBlind: number = 20,
    public smallBlind?: number,
    public ante?: number
  ) {
    if (!smallBlind) this.smallBlind = bigBlind / 2;
  }

  currentPot () {
    if (this.pots.length === 0) {
      return false;
    }
    return this.pots[this.pots.length - 1];
  }

  sidePots () {
    if (this.pots.length <= 1) {
      return false;
    }
    return this.pots.slice(1, this.pots.length - 1)
  }

  startHand () {
    // Check for active round and throw if there is one
    if (this.currentRound) {
      throw new exception("There is already an active hand!");
    }

    // Reset player bets, hole cards, and fold status
    this.players.forEach(player => { 
      delete player.bet;
      delete player.holeCards;
      player.folded = false;
    });

    // Reset community cards
    this.communityCards = [];

    // Set round to pre-flop
    this.currentRound = BettingRound.PRE_FLOP;

    // Move dealer position
    this.dealerPosition++;
    if (this.dealerPosition === this.players.length){
      this.dealerPosition = 0;
    }

    // Set current player to first seat to act
    this.currentPlayer = this.players[this.dealerPosition + 3];

    // Generate newly shuffled deck
    this.deck = this.newDeck();

    // Deal cards to players
    this.players.forEach(player => {
      player.holeCards = [
        this.deck.pop()!,
        this.deck.pop()!
      ];
    });
  }

  private newDeck (): Card[] {
    const newDeck: Card[] = [];
    Object.keys(CardSuit).forEach(suit => {
      Object.keys(CardRank).forEach(value => {
        newDeck.push(new Card(CardRank[value], CardSuit[suit]));
      });
    });
    for (let index = this.deck.length - 1; index > 0; index--) {
      const rndIndex = Math.floor(Math.random() * (index + 1));
      [newDeck[index], newDeck[rndIndex]] = [newDeck[rndIndex], newDeck[index]];
    }
    return newDeck;
  }
}

export class TablePlayer {
    bet?: number;
    holeCards?: [Card, Card];
    folded: boolean = false;

    constructor (
      public player: Player,
      public stackSize: number
    ) {}

    placeBet (amount: number) {
      this.bet = amount;
      this.stackSize -= amount;
    }
}


export class Pot {
  amount = 0;
  eligiblePlayers: Player[] = new Array()
}

export class Seat {
  holeCards: Card[] = new Array(2);
  player?: Player;
  stackSize?: number;
  bet?: number
}

export enum BettingRound {
  PRE_FLOP = "pre-flop",
  FLOP = "flop",
  TURN = "turn",
  RIVER = "river"
}

export interface Pot {
  amount: number
  eligiblePlayers: Player[]
}

export interface TableOptions {
  buyIn: number
  dealerPosition: number
  forcedBets: {
    ante: number
    smallBlind: number
    bigBlind: number
  }
  playersInHand: Player[]
  pots: Pot[] | false
  seats: Seat[],

  currentPot: () => Pot
  startHand: () => void
  nextRound: () => BettingRound
  showdown: () => {
    winner: Player,
    hand: string
  }
}