export class Pot implements Pot {
  amount = 0;
  eligiblePlayers: string[] = new Array()
}

export interface Pot {
  amount: number
  eligiblePlayers: string[]
}

var pot = new Pot();

console.log(pot);