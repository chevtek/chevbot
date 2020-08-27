import formatMoney from "../utilities/formatMoney";

const isWholeNumber = (num: number) => {
  return num - (Math.floor(num)) === 0;
};

export enum Round {
  PRE_FLOP,
  FLOP,
  TURN,
  RIVER
}

export class GameState {

  constructor (minBuyIn: number) {
    if (minBuyIn < 100) {
      throw new Error("Minimum buy-in cannot be less than $100.");
    }
    if (!isWholeNumber(minBuyIn)) {
      throw new Error("Game buy-in must be a whole number.");
    }
    this._minBuyIn = minBuyIn;
  }

  private _cards: Card[] = [];
  private _deck: Card[] = [];
  private _players: Player[] = [];
  private _holeCards: [Card,Card][] = [];
  private _budgets: number[] = [];
  private _foldedPlayers: Player[] = [];
  private _mainPot: Pot | undefined;
  private _sidePots: Pot[] = [];
  private _round: Round | undefined;
  private _bigBlind: number = 0;
  private _smallBlind: number = 0;
  private _turnIndex: number = 0;
  private _dealerIndex: number = 0;
  private _minBuyIn: number;

  get turnIndex() {
    return this._turnIndex;
  }

  get dealerIndex() {
    return this._dealerIndex;
  }

  get round() {
    return this._round;
  }

  get cards() {
    return this._cards;
  }

  get sidePots() {
    return this._sidePots;
  }

  get mainPot() {
    return this._mainPot;
  }

  get minBuyIn() {
    return this._minBuyIn;
  }

  get numPlayers() {
    return this._players.length;
  }

  public getBudget(index: number) {
    return this._budgets[index];
  }

  public addBudget(playerId: string, amount: number) {
    if (!isWholeNumber(amount)) {
      throw new Error("Amount must be a whole number.");
    }
    for (let index = 0; index < this._players.length; index++) {
      const player = this._players[index];
      if (player.id === playerId) {
        this._budgets[index] += amount;
        player.subtractFromBankroll(amount);
        break;
      }
    }
  }

  public getHoleCards(index: number) {
    return this._holeCards[index];
  }

  public getPlayer(index: number) {
    return this._players[index];
  }

  public isFolded(player: Player) {
    return this._foldedPlayers.includes(player);
  }

  public addPlayer(player: Player, amount?: number) {
    if (amount && !isWholeNumber(amount)) {
      throw new Error("Amount must be a whole number.");
    }
    for (let index = 0; index < this._players.length; index++) {
      if (this._players[index].id === player.id) {
        throw new Error("You have already joined this game.");
      }
    }
    if (this._players.length === 10) {
      throw new Error("The table is full!");
    }
    if (amount && amount < this._minBuyIn) {
      throw new Error(`Buy-in amount must be at least ${formatMoney(this._minBuyIn)}.`);
    }
    this._players.push(player);
    this._budgets.push(amount ?? this._minBuyIn);
    player.subtractFromBankroll(amount ?? this._minBuyIn);
    return this;
  }

  public removePlayer(player: Player | string) {
    if (typeof player === "string") {
      [player] = this._players.filter(p => p.id === player);
    }
    const index = this._players.indexOf(player);
    if (index === -1) {
      throw new Error("Player does not exist in this game!");
    }
    player.addToBankroll(this._budgets[index]);
    this._players.splice(index, 1);
    this._holeCards.splice(index, 1);
    this._budgets.splice(index, 1);
    return this;
  }

  public isPlayerInGame(playerId: string) {
    const [player] = this._players.filter(p => p.id === playerId);
    return !!player;
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
    this._holeCards = [];
    this._resetDeck();
    for (let index = 0; index < this._players.length; index++) {
      this._holeCards.push([
        this._deck.pop()!,
        this._deck.pop()!
      ]);
    }
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

  public end() {
    for (let index = 0; index < this._players.length; index++) {
      const player = this._players[index];
      this.removePlayer(player);
    }
  }

  private _resetDeck() {
    this._deck = [];
    // Create & shuffle game deck.
    Object.keys(CardSuit).forEach(suit => {
      Object.keys(CardValue).forEach(value => {
        this._deck.push(new Card(CardValue[value], CardSuit[suit]));
      });
    });
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

  constructor (name: string, avatarUrl: string, id: string) {
    this.name = name;
    this.avatarUrl = avatarUrl;
    this.id = id;
    this._bankroll = 1000;
  }

  private _cards: Card[] = [];
  private _bankroll: number = 0;
  public name: string;
  public avatarUrl: string;
  public id: string;

  public addToBankroll(amount: number) {
    if (!isWholeNumber(amount)) {
      throw new Error("Amount must be a whole number.");
    }
    this._bankroll += amount;
    return this;
  }

  public subtractFromBankroll(amount: number) {
    if (!isWholeNumber(amount)) {
      throw new Error("Amount must be a whole number.");
    }
    this._bankroll -= amount;
    if (this._bankroll < 0) this._bankroll = 1000;
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
