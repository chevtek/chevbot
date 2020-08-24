import yargs from "yargs";
import { MessageEmbed } from "discord.js";

const { COMMAND_PREFIX } = process.env;

yargs
  .alias("help", "h")
  .commandDir("commands", {
    extensions: ["js", "ts"]
  })
  .exitProcess(false)
  .parserConfiguration({
    "strip-aliased": true,
    "strip-dashed": true
  })
  .scriptName("")
  .showHelpOnFail(false)
  .strict()
  .version(false)
  .wrap(null);

export default (cmdInput, context) => {
  yargs.parse(cmdInput, context || false, (err, { help }, output) => {
    if (output) {
      if (help) {

        let lines = output.split("\n");
        lines = lines
          .slice(3, lines.length - 3)
          .map(line => line
            .trimStart()
            .replace(/\s+/g, " ")
          );

        const helpEmbed = new MessageEmbed({
          title: "Chevbot Commands",
          description: "`<command>   [--help]`",
          color: 0x00ff00,
          fields: lines.map(line => ({
            name: `\`${COMMAND_PREFIX}${line.substr(0, line.indexOf(" "))}\``,
            value: line.substr(line.indexOf(" "))
          }))
        });


        context.discord.message.channel.send(helpEmbed);
        return;
      }
      context.discord.message.channel.send(output);
    }
  });
}
