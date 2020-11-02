import axios from "axios";
import { TextChannel } from "discord.js";
import discordClient from "../discord-client";

const currentStatus = "Your county clerk mailed your ballot to you.";
const channelId = "772952921980796961";

export default async function () {
  const chevStatus = await checkStatus({
    "firstName": "Alex",
    "lastName": "Ford",
    "dob": "03-02-1987",
    "street": "1130 Topaz Rd",
    "city": "Saratoga Springs",
    "zip": "84045"
  });
  const nikkiStatus = await checkStatus({
    "firstName": "Alex",
    "lastName": "Ford",
    "dob": "03-02-1987",
    "street": "1130 Topaz Rd",
    "city": "Saratoga Springs",
    "zip": "84045"
  });

  const channel = (discordClient.channels.cache.get(channelId) || await discordClient.channels.fetch(channelId)) as TextChannel;
  channel.send(`**Chev:** \`${chevStatus}\``);
  channel.send(`**Nikki:** \`${nikkiStatus}\``);
}

async function checkStatus(payload) {
  const { headers: { "set-cookie": cookies } } = await axios.post("https://votesearch.utah.gov/voter-search/public-api/my-voter-profile", payload);
  const JSESSIONID = cookies.join("").match(/JSESSIONID=([^;]*);/)[1];
  const { data: { status } } = await axios.get("https://votesearch.utah.gov/voter-search/api/ballotStatus.json/1319655", {
    headers: {
      Cookie: `JSESSIONID=${JSESSIONID};`
    }
  });
  if (status === currentStatus) {
    return "Ballot not yet recieved.";
  }
  return status;
}