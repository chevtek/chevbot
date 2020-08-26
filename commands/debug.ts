import { createCanvas, registerFont, loadImage } from "canvas";
import { MessageAttachment } from "discord.js";
import { table } from "console";

export const command = "debug <action> [args..]";

export const description = false;

export async function handler ({ discord, action, args }) {
  const { message } = discord;
  switch (action) {
    case "emit-join-event":
      let user = message.member;
      if (args && args.length) {
        const mentionId = args[0].match(/^<@!?(\d+)>$/)[1];
        user = message.member.guild.members.cache.get(mentionId);
      }
      message.client.emit("guildMemberAdd", user);
      break;
    case "throw":
      throw new Error(args[0]);
    case "draw":
      message.channel.send(await draw(message));
      break;
  }
}

async function draw (message): Promise<MessageAttachment> {
  registerFont("./fonts/arial.ttf", { family: "sans-serif" });
  registerFont("./fonts/arialbd.ttf", { family: "sans-serif" });

  const width = 600, height = 600;
  const xCenter = width / 2, yCenter = height / 2;
  const tableSize = 230, tableEdgeWidth = 35;
  const numberOfSeats = 10;
  const SUITS = {
    club: {
      color: "#000000",
      value: "♣"
    },
    diamond: {
      color: "#ff0000",
      value: "♦"
    },
    heart: {
      color: "#ff0000",
      value: "♥"
    },
    spade: {
      color: "#000000",
      value: "♠"
    }
  };

  const calcPoint = (index, size, offset) => [
    xCenter + size * Math.cos((index + offset) * 2 * Math.PI / numberOfSeats),
    yCenter + size * Math.sin((index + offset) * 2 * Math.PI / numberOfSeats)
  ];

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const drawBackground = async () => {
    const cornerRadius = 30;
    ctx.beginPath();
    ctx.moveTo(cornerRadius, 0);
    ctx.lineTo(width - cornerRadius, 0);
    ctx.quadraticCurveTo(width, 0, width, cornerRadius);
    ctx.lineTo(width, height - cornerRadius);
    ctx.quadraticCurveTo(width, height, width - cornerRadius, height);
    ctx.lineTo(cornerRadius, height);
    ctx.quadraticCurveTo(0, height, 0, height - cornerRadius);
    ctx.lineTo(0, cornerRadius);
    ctx.quadraticCurveTo(0, 0, cornerRadius, 0)
    ctx.closePath();
    ctx.clip();
    const carpet = await loadImage(`./images/casino-carpet.jpg`);
    ctx.drawImage(carpet, 0, 0, width, height);
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, width, height);
  };

  const drawTable = async () => {
    ctx.beginPath();
    let index = 0;
    let [x, y] = calcPoint(index++, tableSize, 0);
    ctx.moveTo (x, y);          
    while (index <= numberOfSeats) {
      [x, y] = calcPoint(index, tableSize, 0);
      ctx.lineTo(x, y);
      index++;
    }
    ctx.fillStyle = "#065D21";
    ctx.fill();
    index = 0;
    while (index < tableEdgeWidth) {
      const redMin = 64, redMax = 189;
      const red = Math.floor((((redMax - redMin) / tableEdgeWidth) * index) + redMin);
      const greenMin = 45, greenMax = 126;
      const green = Math.floor((((greenMax - greenMin) / tableEdgeWidth) * index) + greenMin);
      const blueMin = 38, blueMax = 74;
      const blue = Math.floor((((blueMax - blueMin) / tableEdgeWidth) * index) + blueMin);
      ctx.strokeStyle = `rgba(${red},${green},${blue}, 1)`;
      // const color = Math.floor((50 / tableEdgeWidth) * index);
      // ctx.strokeStyle = `rgba(${color},${color},${color}, 1)`;
      ctx.lineWidth = tableEdgeWidth - index;
      ctx.stroke();
      index++;
    }
  };

  const drawSeats = async (turnIndex = Math.floor(Math.random() * numberOfSeats)) => {
    
    // Temporary code to grab ten random server members.
    const members: any[] = Array.from(message.guild.members.cache.values());
    const rndUsers: any[] = shuffle(members).slice(0, 10);


    for (let index = 0; index < numberOfSeats; index++) {
      const member = rndUsers[index];
      const [x, y] = calcPoint(index, tableSize + 10, 0.5);
      const radius = 50;

      const drawAvatar = async () => {
        const padding = 7;
        const avatarCanvas = createCanvas(radius * 2, radius * 2);
        const avatarCtx = avatarCanvas.getContext("2d");
        avatarCtx.beginPath();
        avatarCtx.arc(radius, radius, radius, 0, Math.PI * 2, true);
        avatarCtx.closePath();
        avatarCtx.clip();
        avatarCtx.fillStyle = "#000000"//"#292B2F";
        avatarCtx.fillRect(0, 0, radius * 2, radius * 2);
        const avatar = await loadImage(member.user.displayAvatarURL({ format: "png" }));
        avatarCtx.drawImage(avatar, 0, 0, radius * 2, radius * 2);
        avatarCtx.beginPath();
        avatarCtx.arc(radius, radius, radius - (padding/2), 0, Math.PI * 2, true);
        avatarCtx.closePath();
        if (turnIndex === index) {
          for (let index = 0; index < padding; index++) {
            const color = Math.floor((255 / padding) * index);
            avatarCtx.strokeStyle = `rgb(0,${color},0, 1)`;
            avatarCtx.lineWidth = (padding - index) * 1.5;
            avatarCtx.stroke();
          }
        } else {
          for (let index = 0; index < padding; index++) {
            const color = Math.floor((255 / padding) * index);
            avatarCtx.strokeStyle = `rgb(${color},${color},${color}, 1)`;
            avatarCtx.lineWidth = padding - index;
            avatarCtx.stroke();
          }
          // avatarCtx.beginPath();
          // avatarCtx.arc(radius, radius, radius, 0, Math.PI * 2, true);
          // avatarCtx.closePath();
          avatarCtx.fillStyle = "rgba(0,0,0,0.6)";
          avatarCtx.fill();
        }
        const avatarFinal = await loadImage(avatarCanvas.toBuffer(), `${member.id}.png`);
        ctx.drawImage(avatarFinal, x - radius, y - radius, radius * 2, radius * 2);
      };

      const drawNameplate = async () => {
        const cornerRadius = 10;
        const nameplateX = x - radius;
        const nameplateY = y + radius/2;
        const nameplateWidth = radius*2;
        const nameplateHeight = radius - (radius/3);
        ctx.beginPath();
        ctx.moveTo(nameplateX + cornerRadius, nameplateY);
        ctx.lineTo(nameplateX + (nameplateWidth - cornerRadius), nameplateY);
        ctx.quadraticCurveTo(nameplateX + nameplateWidth, nameplateY, nameplateX + nameplateWidth, nameplateY + cornerRadius);
        ctx.lineTo(nameplateX + nameplateWidth, nameplateY + (nameplateHeight - cornerRadius));
        ctx.quadraticCurveTo(nameplateX + nameplateWidth, nameplateY + nameplateHeight, nameplateX + (nameplateWidth - cornerRadius), nameplateY + nameplateHeight);
        ctx.lineTo(nameplateX + cornerRadius, nameplateY + nameplateHeight);
        ctx.quadraticCurveTo(nameplateX, nameplateY + nameplateHeight, nameplateX, nameplateY + (nameplateHeight - cornerRadius));
        ctx.lineTo(nameplateX, nameplateY + cornerRadius);
        ctx.quadraticCurveTo(nameplateX, nameplateY, nameplateX + cornerRadius, nameplateY);
        ctx.closePath();
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fill();
        // ctx.fillRect(x - radius, y + radius/2, radius*2, (radius - radius/3));
        ctx.fillStyle = turnIndex === index ? "#00ff00" : "#ffffff";
        let fontSize = 18;
        let text = member.displayName;
        const measureText = (text) => ctx.measureText(text).width < radius*2 - 5;
        let textFits = measureText(text);
        ctx.font = `bold ${fontSize}px Arial`;
        if (!textFits && text.indexOf(" ") !== -1) {
          text = text.substr(0, text.indexOf(" "));
        }
        textFits = measureText(text);
        while (!textFits) {
          text = text.substr(0, text.length - 1);
          textFits = measureText(text);
        }
        ctx.fillText(text, x, (y + (radius/2)) + ((radius - radius/3)/2));
      };

      await drawAvatar();
      await drawNameplate();
    }
  };

  const drawButtons = async (dealerIndex = Math.floor(Math.random() * numberOfSeats)) => {
    const buttonSize = 20;
    const buttonDistance = tableSize - 65;
    
    // Dealer Button
    const drawDealer = () => {
      const [x, y] = calcPoint(dealerIndex, buttonDistance, 0.75);
      ctx.beginPath();
      ctx.arc(x, y, buttonSize, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.font = "bold 28px Arial";
      ctx.fillStyle = "#000000";
      ctx.fillText("D", x, y);
    };

    // Small Blind
    const drawSmallBlind = () => {
      const [x, y] = calcPoint(dealerIndex + 1, buttonDistance, 0.75);
      ctx.beginPath();
      ctx.arc(x, y, buttonSize, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fillStyle = "#0000aa";
      ctx.fill();
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.font = "bold 20px Arial";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("SB", x, y);
    };

    // Big Blind
    const drawBigBlind = () => {
      const [x, y] = calcPoint(dealerIndex + 2, buttonDistance, 0.75);
      ctx.beginPath();
      ctx.arc(x, y, buttonSize, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.fillStyle = "#ffff00";
      ctx.fill();
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.font = "bold 20px Arial";
      ctx.fillStyle = "#000000";
      ctx.fillText("BB", x, y);
    };

    drawDealer();
    drawBigBlind();
    drawSmallBlind();
  };

  const drawCards = (round = 0) => {
    const cornerRadius = 10,
      cardWidth = 50,
      cardHeight = 75,
      cardSpacing = 3;

    const drawCardPlaceholders = (xCenter, yCenter) => {
      for (let index = 0; index < 5; index++) {
        const xStart = (xCenter - (cardSpacing * 2)) - (cardWidth * 2.5);
        const x = xStart + ((cardWidth + cardSpacing) * index);
        const y = yCenter - (cardHeight / 2);
        ctx.beginPath();
        ctx.moveTo(x + cornerRadius, y);
        ctx.lineTo(x + (cardWidth - cornerRadius), y);
        ctx.quadraticCurveTo(x + cardWidth, y, x + cardWidth, y + cornerRadius);
        ctx.lineTo(x + cardWidth, y + (cardHeight - cornerRadius));
        ctx.quadraticCurveTo(x + cardWidth, y + cardHeight, x + (cardWidth - cornerRadius), y + cardHeight);
        ctx.lineTo(x + cornerRadius, y + cardHeight);
        ctx.quadraticCurveTo(x, y + cardHeight, x, y + (cardHeight - cornerRadius));
        ctx.lineTo(x, y + cornerRadius);
        ctx.quadraticCurveTo(x, y, x + cornerRadius, y)
        ctx.closePath();
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const drawCard = (xCenter, yCenter, cards) => {
      for (let index = 0; index < cards.length; index++) {
        const card = cards[index];
        const xStart = (xCenter - (cardSpacing * 2)) - (cardWidth * 2.5);
        const x = xStart + ((cardWidth + cardSpacing) * index);
        const y = yCenter - (cardHeight / 2);
        ctx.beginPath();
        ctx.moveTo(x + cornerRadius, y);
        ctx.lineTo(x + (cardWidth - cornerRadius), y);
        ctx.quadraticCurveTo(x + cardWidth, y, x + cardWidth, y + cornerRadius);
        ctx.lineTo(x + cardWidth, y + (cardHeight - cornerRadius));
        ctx.quadraticCurveTo(x + cardWidth, y + cardHeight, x + (cardWidth - cornerRadius), y + cardHeight);
        ctx.lineTo(x + cornerRadius, y + cardHeight);
        ctx.quadraticCurveTo(x, y + cardHeight, x, y + (cardHeight - cornerRadius));
        ctx.lineTo(x, y + cornerRadius);
        ctx.quadraticCurveTo(x, y, x + cornerRadius, y)
        ctx.closePath();
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.font = "bold 35px Arial";
        ctx.fillStyle = card.suit.color;
        ctx.fillText(card.value, x + (cardWidth/2), y + (cardHeight/3.5));
        ctx.font = "bold 45px Arial";
        ctx.fillStyle = card.suit.color;
        ctx.fillText(card.suit.value, x + (cardWidth/2), y + (cardHeight - (cardHeight/3.5)));
      }
    };

    const cardValues = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
    const cardSuits = [SUITS.club, SUITS.diamond, SUITS.heart, SUITS.spade];
    const numCards = Math.floor((Math.random() * 3)) + 3;
    const cards: any[] = [];
    for (let index = 0; index < numCards; index++) {
      cards.push({
        value: cardValues[Math.floor(Math.random() * cardValues.length)],
        suit: cardSuits[Math.floor(Math.random() * cardSuits.length)]
      });
    }
    drawCardPlaceholders(xCenter, yCenter);
    if (Math.floor(Math.random() * 2) === 0) {
      drawCard(xCenter, yCenter, cards);
    }
  };

  await drawBackground();
  await drawTable();
  await drawButtons();
  await drawSeats();
  await drawCards();

  return new MessageAttachment(canvas.toBuffer(), "polygon.png");
}

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
