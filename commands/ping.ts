export const description = "Test if Chevbot is listening";

export async function exec (argv, { message }) {
  message.reply("pong!");
}
