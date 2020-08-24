import Discord, { TextChannel, MessageAttachment } from "discord.js";
import { createCanvas, registerFont, loadImage } from "canvas";
import config from "config";
import moment from "moment";

const {
  discord: { token },
  commandPrefix
} = config as any;

const client = new Discord.Client();

client.on("ready", () => {
  client.user?.setActivity({ name: `for cmds | ${commandPrefix}help`, type: "WATCHING" });
  console.log(`Chevbot online [${moment()}]`);
});

client.on("guildMemberAdd", async member => {
  const channel = member.guild.channels.cache.find(ch => ch.name === "general") as TextChannel;
	if (!channel) return;
	registerFont("./fonts/arial.ttf", { family: "sans-serif" });
	const canvas = createCanvas(700, 250);
  const ctx = canvas.getContext('2d');
	const background = await loadImage("./wallpaper.jpg");
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  ctx.font = "28px Arial";
	ctx.fillStyle = "#ffffff";
	ctx.fillText("Welcome to the server,", canvas.width / 2.5, canvas.height / 3.5);
  ctx.font = applyText(canvas, `${member.displayName}!`);
	ctx.fillStyle = "#00ff00";
	ctx.fillText(member.displayName, canvas.width / 2.5, canvas.height / 1.8);
  ctx.beginPath();
  ctx.arc(125, 125, 100, 0, Math.PI * 2, true);
  ctx.strokeStyle = "#00ff00";
  ctx.lineWidth = 3;
  ctx.stroke();
	ctx.closePath();
	ctx.clip();
  const avatar = await loadImage(member.user!.displayAvatarURL({ format: 'jpg' }));
  ctx.drawImage(avatar, 25, 25, 200, 200);
	const attachment = new MessageAttachment(canvas.toBuffer(), "welcome-image.png");
  channel.send(`<@${member.id}>`,attachment);
});

client.login(token);

export default client;

function applyText (canvas, text) {
	const ctx = canvas.getContext('2d');

	// Declare a base size of the font
	let fontSize = 70;

	do {
		// Assign the font to the context and decrement it so it can be measured again
		ctx.font = `${fontSize -= 10}px Arial`;
		// Compare pixel width of the text to the canvas minus the approximate avatar size
	} while (ctx.measureText(text).width > canvas.width - 300);

	// Return the result to use in the actual canvas
	return ctx.font;
};
