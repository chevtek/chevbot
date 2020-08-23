import yargs from "yargs";
import config from "config";

const prefix = config.get("commandPrefix");

yargs
  .alias("help", "h")
  .commandDir("commands", {
    extensions: ["js", "ts"]
  })
  .epilogue(`Remember to prefix commands with "${prefix}"`)
  .exitProcess(false)
  .parserConfiguration({
    "strip-aliased": true,
    "strip-dashed": true
  })
  .strict()
  .scriptName("")
  .version(false)
  .wrap(null);

export default (cmdInput, context) => {
  yargs.parse(cmdInput, context || false, (err, argv, output) => {
    if (output) console.log(context.message.channel.send(output));
  });
}
