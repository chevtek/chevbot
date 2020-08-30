export const command = ["holdem", "th"];

export const description = "Begin a game of Texas Hold'em!";

export const builder = yargs => yargs.commandDir("./holdem", { extensions: ["js", "ts"] });