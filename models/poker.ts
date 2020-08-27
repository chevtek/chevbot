export enum Round {
  PRE_FLOP,
  FLOP,
  TURN,
  RIVER
}

export class GameState {

  constructor () {
    // Create & shuffle game deck.
    Object.keys(CardSuit).forEach(suit => {
      Object.keys(CardValue).forEach(value => {
        this._deck.push(new Card(CardValue[value], CardSuit[suit]));
      });
    });
    this.shuffleDeck();
  }

  private _cards: Card[] = [];
  private _deck: Card[] = [];
  private _players: Player[] = [];
  private _foldedPlayers: Player[] = [];
  private _mainPot: Pot | undefined;
  private _sidePots: Pot[] = [];
  private _round: Round | undefined;
  private _bigBlind: number = 0;
  private _smallBlind: number = 0;
  private _turnIndex: number = 0;
  private _dealerIndex: number = 0;

  get currentPlayer() {
    return this._players[this._turnIndex];
  }

  public addPlayer(player: Player) {
    if (this._players.length === 10) {
      throw new Error("The table is full!");
    }
    this._players.push(player);
    return this;
  }

  public removePlayer(player: Player) {
    const index = this._players.indexOf(player);
    if (index === -1) {
      throw new Error("Player does not exist in this game!");
    }
    this._players.splice(index, 1);
    return this;
  }

  public fold(player: Player) {
    if (!this._players.includes(player)) {
      throw new Error("Player does not exist in this game!");
    }
    if (this._foldedPlayers.includes(player)) {
      throw new Error("Player has already folded.");
    }
  }

  public beginHand() {
    this._mainPot = {
      amount: 0,
      players: [...this._players]
    };
    this._sidePots = [];
    this._round = Round.PRE_FLOP;
    this._dealerIndex++;
    this._turnIndex = this._dealerIndex + 3;
    this._foldedPlayers = [];
    return this;
  }

  public nextRound() {
    switch (this._round) {
      case Round.PRE_FLOP:
        this._round = Round.FLOP;
        this._turnIndex = this._dealerIndex = 1;
        for (let index = 0; index < 3; index++) {
          this._cards.push(this._deck.pop()!);
        }
        break;
      case Round.FLOP:
        this._round = Round.TURN;
        this._turnIndex = this._dealerIndex = 1;
        this._cards.push(this._deck.pop()!);
        break;
      case Round.TURN:
        this._round = Round.RIVER;
        this._turnIndex = this._dealerIndex = 1;
        this._cards.push(this._deck.pop()!);
      case Round.RIVER:
        //showdown
        break;
    }
    return this;
  }

  public nextTurn() {
    this._turnIndex++;
    while (this._foldedPlayers.includes(this._players[this._turnIndex])) {
      this._turnIndex++;
    }
    return this;
  }

  public shuffleDeck() {
    for (let index = this._deck.length - 1; index > 0; index--) {
      const rndIndex = Math.floor(Math.random() * (index + 1));
      [this._deck[index], this._deck[rndIndex]] = [this._deck[rndIndex], this._deck[index]];
    }
  }

}

export interface Pot {
  amount: number;
  players: Player[];
}

export class Player {

  constructor (name: string) {
    this.name = name;
  }

  private _cards: Card[] = [];
  private _bankroll: number = 0;
  public name: string;
  public avatarUrl: string | undefined;

  public setAvatarUrl(avatarUrl: string) {
    this.avatarUrl = avatarUrl;
    return this;
  }

  public setBankroll(amount: number) {
    this._bankroll = amount;
    return this;
  }

  public addToBankroll(amount: number) {
    this._bankroll += amount;
    return this;
  }

  public subtractFromBankroll(amount: number) {
    this._bankroll -= amount;
    return this;
  }

  public get bankroll() {
    return this._bankroll;
  }

  public setCards(cards: Card[]) {
    if (cards.length !== 2) {
      throw new Error("Player must have two cards.");
    }
    this._cards = cards;
    return this;
  }

  public get cards() {
    return this._cards;
  }

}

export enum CardSuit {
  CLUB = "♣",
  DIAMOND = "♦",
  HEART = "♥",
  SPADE = "♠"
}

export enum CardValue {
  ACE = "A",
  KING = "K",
  QUEEN = "Q",
  JACK = "J",
  TEN = "10",
  NINE = "9",
  EIGHT = "8",
  SEVEN = "7",
  SIX = "6",
  FIVE = "5",
  FOUR = "4",
  THREE = "3",
  TWO = "2"
}

export class Card {

  private cardValue: CardValue;
  private suitEnum: CardSuit;

  constructor (value: CardValue, suit: CardSuit) {
    this.cardValue = value;
    this.suitEnum = suit;
  }

  get value() {
    return this.cardValue;
  }

  get suit() {
    return this.suitEnum;
  }

  get color() {
    switch (this.suitEnum) {
      case CardSuit.CLUB:
      case CardSuit.SPADE:
        return "#000000";
      case CardSuit.DIAMOND:
      case CardSuit.HEART:
        return "#ff0000";
    }
  }

}
