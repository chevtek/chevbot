export const command = "debug <action>";

export const description = false;

export function handler ({ discord, action }) {
  const { message } = discord;
  switch (action) {
    case "emit-join-event":
      message.client.emit("guildMemberAdd", message.member);
  }
}
