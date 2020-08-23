import Discord from "discord.js";
import config from "config";
import moment from "moment";

const { token } = config.get("discord");

const client = new Discord.Client();

client.on("ready", () => {
  console.log(`Chevbot online [${moment()}]`);
});

client.login(token);

export default client;
