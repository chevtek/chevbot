export const command = ["holdem", "th"];

export const description = "Begin a game of Texas Hold'em!";

export const builder = yargs => yargs
  .commandDir("./holdem", {
    extensions: ["js", "ts"]
  });

// export const description = "Begin a game of Texas Hold'em!";
// const { COMMAND_PREFIX } = process.env;

// const knownPlayers: {[key: string]: Player} = {};

// const getPlayer = (message: Message) => {
//   let player = knownPlayers[message.author.id];
//   if (!player) {
//     player = Player.fromDiscordMessage(message);
//     knownPlayers[message.author.id] = player;
//   }
//   return player;
// };



// export function builder (yargs) {
//   yargs
//     .command(
//       ["create", "*"],
//       "Create a Hold'em table in this channel.",
//       (yargs) => yargs
//         .option("min-buy-in", {
//           description: "Specify a minimum buy-in amount for the game.",
//           default: 1000,
//           type: "number"
//         })
//         .option("buy-in", {
//           description: "Specify the amount to buy-in as the creator of the game. Default is the minimum buy-in.",
//           type: "number"
//         })
//         .option("force", {
//           description: "Forcibly begin a new game even if one is already in progress.",
//           type: "boolean"
//         }),
//       async ({ discord, minBuyIn, buyIn, force }) => {
//         const message = discord.message as Message;
//         if (message.channel.type === "dm"){
//           message.reply("This command can only be run from a channel on a server.");
//           return;
//         }
//         let gameState = gameStates[message.channel.id];
//         if (gameState && !force) {
//           message.reply("There is already a game in progress. Specify the `--force` flag to override.");
//           return;
//         }
//         const player = getPlayer(message);
//         gameState = gameStates[message.channel.id] = new GameState(minBuyIn);
//         gameState.addPlayer(player, buyIn ?? minBuyIn);
//         const gameEmbed = await render(gameState);
//         message.channel.send(gameEmbed);
//       }
//     )
//     .command(
//       "join [buy-in]",
//       "Join the current game.",
//       (yargs) => yargs.positional("amount", {
//         description: "Specify the amount to bring to the table. Default is the minimum buy-in for the active game.",
//         type: "number"
//       }),
//       async ({ discord, buyIn }) => {
//         const message = discord.message as Message;
//         if (message.channel.type === "dm"){
//           message.reply("This command can only be run from a channel on a server.");
//           return;
//         }
//         const gameState = gameStates[message.channel.id];
//         if (!gameState) {
//           message.reply("There is no active Hold'em game in this channel.");
//           return;
//         }
//         try {
//           const player = getPlayer(message);
//           gameState.addPlayer(player, buyIn);
//         } catch (err) {
//           message.reply(err.message);
//           return;
//         }
//         const gameEmbed = await render(gameState);
//         message.channel.send(gameEmbed);
//       }
//     )
//     .command(
//       "leave",
//       "Leave the current game.",
//       () => {},
//       async ({ discord }) => {
//         const message = discord.message as Message;
//         if (message.channel.type === "dm"){
//           message.reply("This command can only be run from a channel on a server.");
//           return;
//         }
//         const gameState = gameStates[message.channel.id];
//         if (!gameState) {
//           message.reply("There is no active Hold'em game in this channel.");
//           return;
//         }
//         message.reply(`Are you sure you want to leave the game? (y/n)`);
//         try {
//           await message.channel.awaitMessages(
//             response => response.author.id === message.author.id && response.content.toLowerCase() === "y",
//             { max: 1, time: 30000, errors: ['time'] }
//           );
//           gameState.removePlayer(message.author.id);
//           message.reply("You have been removed from the game.");
//           const embed = await render(gameState);
//           message.channel.send(embed);
//         } catch (err) {
//           message.reply("No confirmation received. You are still playing!");
//         }
//       }
//     )
//     .command(
//       ["bankroll", "bank"],
//       "Show your current bankroll.",
//       () => {},
//       async ({ discord }) => {
//         const message = discord.message as Message;
//         const player = getPlayer(message);
//         message.reply(`**Bankroll:** ${formatMoney(player.bankroll)}`)
//       }
//     )
//     .command(
//       "buy <amount>",
//       "Buy more chips.",
//       () => {},
//       async ({ discord, amount }) => {
//         const message = discord.message as Message;
//         if (message.channel.type === "dm") {
//           message.reply("This command can only be run from a channel on a server.");
//           return;
//         }
//         if (!amount) {
//           message.reply("You must specify an amount.");
//           return;
//         }
//         const gameState = gameStates[message.channel.id];
//         if (!gameState) {
//           message.reply("There is no active Hold'em game in this channel.");
//           return;
//         }
//         if (!gameState.isPlayerInGame(message.author.id)) {
//           message.reply("You are not currently in the active Hold'em game.");
//           return;
//         }
//         const player = getPlayer(message);
//         if (player.bankroll < amount) {
//           message.reply("Not enough in your bankroll.");
//           return;
//         }
//         gameState.addBudget(message.author.id, amount);
//         const embed = await render(gameState);
//         message.channel.send(embed);
//       }
//     )
//     .command(
//       "render",
//       "Re-renders the current game.",
//       () => {},
//       async ({ discord }) => {
//         const message = discord.message as Message;
//         if (message.channel.type === "dm") {
//           message.reply("This command can only be run from a channel on a server.");
//           return;
//         }
//         const gameState = gameStates[message.channel.id];
//         if (!gameState) {
//           message.reply("There is no active Hold'em game in this channel.");
//           return;
//         }
//         const gameEmbed = await render(gameState);
//         message.channel.send(gameEmbed);
//       }
//     )
//     .command(
//       "destroy",
//       "Destroys the current Hold'em game in this channel.",
//       () => {},
//       async ({ discord }) => {
//         const message = discord.message as Message;
//         if (message.channel.type === "dm") {
//           message.reply("This command can only be run from a channel on a server.");
//           return;
//         }
//         const gameState = gameStates[message.channel.id];
//         if (!gameState) {
//           message.reply("There is no active Hold'em game in this channel.");
//           return;
//         }
//         message.reply(`Type "CONFIRM" to make certain you want to end the current Hold'em game in this channel!`);
//         try {
//           await message.channel.awaitMessages(
//             response => response.author.id === message.author.id
//               && response.content === "CONFIRM",
//             { max: 1, time: 30000, errors: ['time'] }
//           );
//           gameState.end();
//           delete gameStates[message.channel.id];
//           message.channel.send("The active Hold'em game in this channel has ended.");
//         } catch (err) {
//           message.reply("No confirmation received. Current game was unaffected.")
//         }
//       }
//     );
// }

// async function render(gameState) {
//   if (!gameState) throw new Error("Render was called with no active game state!");
//   const pokerTable = new MessageAttachment(
//     await renderPokerTable(gameState),
//     "pokerTable.png"
//   );
//   const gameEmbed = new MessageEmbed()
//     .setTitle("No-limit Hold'em!")
//     .setDescription(`
//       **Buy-in:** ${formatMoney(gameState.minBuyIn)}
//       **Players:** ${gameState.numPlayers}

//       > **Type \`${COMMAND_PREFIX}holdem join\` to play!**
//     `)
//     .setColor(0x00ff00)
//     .attachFiles([pokerTable])
//     .setImage("attachment://pokerTable.png")
//     .setFooter(`"${COMMAND_PREFIX}holdem --help" for more options.`)
//     .addFields(gameState.sidePots.map((sidePot, index) => ({
//       name: `Side Pot ${index + 1}` ,
//       value: `
//         **Amount**: ${sidePot.amount}
//         **Players:**
//         ${sidePot.players.map(player => `<@${player.id}>\n`)}
//       `
//     })));
//   return gameEmbed;
// }
