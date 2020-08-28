export class Card {
  private _value: CardRank;
  private _suit: CardSuit;

  constructor (value: CardRank, suit: CardSuit) {
    this._value = value;
    this._suit = suit;
  }

  get value() {
    return this._value;
  }

  get suit() {
    return this._suit;
  }

  get color() {
    switch (this._suit) {
      case CardSuit.CLUB:
      case CardSuit.SPADE:
        return CardColor.BLACK;
      case CardSuit.DIAMOND:
      case CardSuit.HEART:
        return CardColor.RED;
    }
  }
}

export enum CardColor {
  RED = "#ff0000",
  BLACK = "#000000"
}

export enum CardSuit {
  CLUB = "c",
  DIAMOND = "d",
  HEART = "h",
  SPADE = "s"
}

export enum CardRank {
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

export interface Card {
  color: CardColor
  suit: CardSuit
  value: CardRank
}