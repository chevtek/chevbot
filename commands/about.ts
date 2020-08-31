import { Message, MessageEmbed } from "discord.js";
import fs from "fs";
import util from "util";

const readFile = util.promisify(fs.readFile);

export const command = "about";

export const description = "Display information about Chevbot.";

export async function handler ({ discord }) {
  const message = discord.message as Message;
  const packageFile = JSON.parse((await readFile("./package.json")).toString());
  const aboutEmbed = new MessageEmbed()
    .setTitle(`Chevbot v${packageFile.version}`)
    .setDescription(packageFile.description)
    .setColor(0x00ff00)
    .addField("Author", `
      ${packageFile.author.name}
      ${packageFile.author.email}
      ${packageFile.author.url}
    `.split("\n").map(line => line.trim()).join("\n"))
    .addField("License", packageFile.license)
    .addField("Homepage", packageFile.homepage)
    .addField("\u200b", "**Dependencies:**")
    .addFields(Object.keys(packageFile.dependencies).map(name => {
      const value = packageFile.dependencies[name].replace("^", ""); 
      return {
        name,
        value,
        inline: true
      };
    }));
  message.channel.send(aboutEmbed);
}