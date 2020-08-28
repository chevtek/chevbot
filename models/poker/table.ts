import { Hand } from "pokersolver";
import { Card, Player, CardSuit, CardRank } from ".";
import { exception } from "console";

export class Table {
  public communityCards: Card[] = [];
  public currentRound?: BettingRound;
  public currentBet?: number;
  public lastRaise?: number;
  public players: TablePlayer[] = new Array(10).fill(null);
  public pots: Pot[] = [];
  public winner?: TablePlayer;
  public currentPosition: number = 0;
  public lastPosition: number = 0;

  private deck: Card[] = [];

  constructor (
    public buyIn: number = 1000,
    public dealerPosition: number = -1,
    public bigBlind: number = 20,
    public smallBlind: number = 10
  ) {}

  get currentActor () {
    return this.players[this.currentPosition];
  }

  get lastActor () {
    return this.players[this.lastPosition];
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
      return false;
    }
    return this.pots.slice(1, this.pots.length - 1)
  }

  sitDown(player: Player, buyIn: number, seat?: number) {
    this.players.push(new TablePlayer(player, buyIn, this));
  }

  startHand () {
    // Check for active round and throw if there is one.
    if (this.currentRound) {
      throw new exception("There is already an active hand!");
    }

    // Clear winner if there is one.
    if (this.winner) delete this.winner;

    // Reset player bets, hole cards, and fold status.
    this.players.forEach(player => { 
      delete player.bet;
      delete player.holeCards;
      player.folded = false;
    });

    // Reset community cards.
    this.communityCards = [];

    // Empty pots.
    this.pots = [new Pot()];

    // Set round to pre-flop.
    this.currentRound = BettingRound.PRE_FLOP;

    // Move dealer position.
    this.dealerPosition++;
    if (this.dealerPosition === this.players.length){
      this.dealerPosition = 0;
    }

    // Force small and big blind bets and set current bet amount.
    const sbPlayer = this.players[this.dealerPosition + 1];
    const bbPlayer = this.players[this.dealerPosition + 2]
    sbPlayer.stackSize -= sbPlayer.bet = this.smallBlind;
    bbPlayer.bet = this.bigBlind;
    this.currentBet = this.bigBlind;
    if (this.lastRaise) delete this.lastRaise;

    // Set current and last actors.
    this.currentPosition = this.dealerPosition + 3;
    this.lastPosition = this.dealerPosition + 2;

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

  finishHand () {
    delete this.currentRound;
    const activePlayers = this.players.filter(player => !player.folded);
    if (activePlayers.length === 1) {
      // Everyone else has folded, declare winner!
      [this.winner] = activePlayers;
      return;
    }
    // Show remaining player hole cards.
    activePlayers.forEach(player => player.showCards = true);
    // Deal remaining community cards.
    const remainingCards = 5 - this.communityCards.length;
    for (let index = 0; index < remainingCards; index++) {
      this.communityCards.push(this.deck.pop()!);
    }
    this.showdown();
  }

  nextAction () {
    // If current position is last position, move to next round.
    if (this.currentPosition === this.lastPosition) {
      this.nextRound();
      return;
    }

    // Send the action to the next player.
    this.currentPosition++;
    if (this.currentPosition === this.players.length) {
      this.currentPosition = 0;
    }

    // If the player has folded then move the action again.
    if (this.currentActor.folded) {
      this.nextAction();
    }
  }

  nextRound () {

    const gatherBets = () => {
      const currentPot = this.currentPot();
      this.players.forEach(player => {
        currentPot.amount += player.bet;
        player.bet = 0;
      });
    };

    const resetPosition = () => {
      // Set action to first player after dealer.
      if (this.currentPosition === this.players.length) {
        this.currentPosition = 0;
      }
      this.lastPosition = this.dealerPosition;
    };

    switch (this.currentRound) {
      case BettingRound.PRE_FLOP:

        // Gather bets and place them in the pot.
        gatherBets();

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
        gatherBets();

        // Set round to turn.
        this.currentRound = BettingRound.TURN;

        // Deal the turn.
        this.communityCards.push(this.deck.pop()!);

        // Reset position;
        resetPosition();

        break;
      case BettingRound.TURN:

        // Gather bets and place them in the pot.
        gatherBets();

        // Set round to river.
        this.currentRound = BettingRound.RIVER;

        // Deal the turn.
        this.communityCards.push(this.deck.pop()!);

        // Reset position.
        resetPosition();

        break;
      case BettingRound.RIVER:
        this.showdown();
        break;
    }
  }
  
  showdown () {
    if (this.currentRound) {
      throw new Error("Showdown called while there is still an active hand!");
    }
    const activePlayers = this.players.filter(player => !player.folded);
    const winningHand = Hand.winners(activePlayers.map(player => player.hand));
    [this.winner] = activePlayers.filter(player => player.hand === winningHand);
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
    bet: number = 0;
    holeCards?: [Card, Card];
    folded: boolean = false;
    showCards: boolean = false;
    lastRaise?: number;

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
      const currentBet = this.table.currentBet;
      if (currentBet) throw new Error("Illegal action. There is already a bet on the table.");
      if (amount < this.table.bigBlind) {
        throw new Error("A bet must be at least as much as the big blind.");
      } else if (amount > this.stackSize) {
        throw new Error("You cannot bet more than you brought to the table.");
      }
      this.stackSize -= amount;
      this.bet = this.table.currentBet = amount;
      this.table.nextAction();
    }

    callAction () {
      if (this !== this.table.currentActor) {
        throw new Error("Action invoked on player out of turn!");
      }
      const currentBet = this.table.currentBet;
      if (!currentBet) throw new Error("Illegal action. There is no bet to call.");
      const callAmount = currentBet - this.bet;
      // All-in via inability to call
      if (callAmount > this.stackSize) {
        const currentPot = this.table.currentPot();
        // Add stack to current bet and empty stack;
        this.bet += this.stackSize;
        this.stackSize = 0;
        this.table.players.forEach(player => {
          if (player === this) return;
          // If players have already out-bet the all-in player then subtract the all-in player's
          // stack size from their bet and add it to the current pot.
          if (player.bet >= this.bet) {
            player.bet -= this.bet;
            currentPot.amount += this.bet;
          }
        });
        // Add all-in player's bet to the pot and clear bet.
        currentPot.amount += this.bet;
        this.bet = 0;
        // Create a new pot and set the eligible players to all active players except the all-in player.
        const newPot = new Pot();
        newPot.eligiblePlayers = [...currentPot.eligiblePlayers];
        newPot.eligiblePlayers.splice(newPot.eligiblePlayers.indexOf(this), 1);
        this.table.pots.push(newPot);
        // If there are only two players, finish out the hand.
        const activePlayers = this.table.players.filter(player => !player.folded).length;
        if (activePlayers === 2) {
          this.table.finishHand();
        } else {
          this.table.nextAction();
        }
      } else {
        this.stackSize -= callAmount;
        this.bet += callAmount;
        this.table.nextAction();
      }
    }

    raiseAction (amount: number) {
      if (this !== this.table.currentActor) {
        throw new Error("Action invoked on player out of turn!");
      }
      const currentBet = this.table.currentBet;
      if (!currentBet) {
        throw new Error("Attempted to raise while there was no active bet!");
      }
      const lastRaise = this.table.lastRaise;
      const minRaise = lastRaise ? lastRaise * 2 : this.table.bigBlind;
      // Do not allow the raise if it's less than the minimum and they aren't going all-in.
      if (amount < minRaise && amount < this.stackSize) {
        throw new Error(`You must raise by at least ${minRaise}`);
      } else if (amount < minRaise && amount >= this.stackSize) {
        // When the all-in player is raising for less than the minimum raise then increase the bet amount but do not change last raise value.
        this.bet += this.stackSize;
        this.stackSize = 0;
        this.table.currentBet = this.bet;
      } else if (amount >= minRaise) {
        this.bet += amount;
        this.table.currentBet = currentBet + amount; 
        this.lastRaise = amount;
      }


      // Set last action to the player behind this one.
      this.table.lastPosition = this.table.currentPosition - 1;
      if (this.table.lastPosition === -1) this.table.lastPosition = this.table.players.length;
    }

    checkAction () {
      if (this !== this.table.currentActor) {
        throw new Error("Action invoked on player out of turn!");
      }
      this.table.nextAction();
    }

    foldAction () {
      if (this !== this.table.currentActor) {
        throw new Error("Action invoked on player out of turn!");
      }
      this.folded = true;
      // Remove player from all pots.
      this.table.pots.forEach(pot => {
        if (pot.eligiblePlayers.includes(this)) {
          pot.eligiblePlayers.splice(pot.eligiblePlayers.indexOf(this));
        }
      });
      // Determine how many players are left in the hand.
      const activePlayers = this.table.players.filter(player => !player.folded).length;
      if (activePlayers === 1) {
        this.table.finishHand();
      }
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
          actions.push("check", "raise");
        }
        if (this.bet < currentBet) {
          actions.unshift("call");
          if (!lastRaise) {
            actions.push("raise");
          } else {

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
}

export enum BettingRound {
  PRE_FLOP = "pre-flop",
  FLOP = "flop",
  TURN = "turn",
  RIVER = "river"
}