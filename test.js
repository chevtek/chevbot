require("dotenv").config();
const Client = require("discord.js").Client;
const { DISCORD_BOT_TOKEN } = process.env;
const client = new Client();
client.login(DISCORD_BOT_TOKEN).then(() => {
  client.users.fetch("251192242834767873").then(user => {
    console.log(user);
  });
});
