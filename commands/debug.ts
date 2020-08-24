export const command = "debug <action>";

export const description = false;

export function handler ({ message, action }) {
  switch (action) {
    case "emit-join-event":
      message.client.emit("guildMemberAdd", message.member);
  }
}
