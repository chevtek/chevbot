import config from "config";
import Discord from "discord.js";
import yargs from "yargs";
import fs from "fs";
import util from "util";
import moment from "moment";

const prefix = "cb.";

const readDir = util.promisify(fs.readdir);

async function main() {

  const { token, chevbotTag } = config.get("discord");

  const discord = new Discord.Client();

  yargs
    .scriptName("")
    .wrap(null)
    .alias('h', "help")
    .help("help")
    .version(false);

  // Dynamically discover and parse command modules.
  const commandFiles = await readDir("./commands/");
  const commands: any = {};
  for (const file of commandFiles) {
    const [cmdName] = file.split('.');
    const { description, exec } = await import(`./commands/${file}`);
    yargs.command(cmdName, description);
    commands[cmdName] = exec;
  }

  discord.on("ready", async () => {
    console.log(`Chevbot online [${moment()}]`);
  });

  discord.on("message", async message => {
    try {
      const { content, channel, author } = message;

      const send = channel.send.bind(channel);

      // If the author of the message is the bot itself then ignore.
      if (author.tag === chevbotTag) return;

      // Check if message is a bot command.
      if (content.substr(0, prefix.length) !== prefix) {
        return;
      }

      yargs.parse(content.substr(prefix.length), async (err: any, argv: any, output: any) => {
        try {
          if (err) {
            send(err);
            return;
          }
          if (output) {
            if (argv.help) {
              send([
                "```",
                `Be sure to prefix all commands with "${prefix}"\n`,
                output,
                "```"
              ].join("\n"));
              return;
            }
            send(output);
            return;
          }
          const cmdName = argv._.shift();
          const command: any = commands[cmdName];
          if (command) {
            const context = {
              message,
              discord,
              yargs
            };
            await command(argv, context);
          } else {
            send(`Command "${cmdName}" not found.`);
          };
        } catch (err) {
          console.log(err);
        }
      });
    } catch (err) {
      console.log(err);
    }
  });

  discord.login(token);

}

main().catch(console.log);
