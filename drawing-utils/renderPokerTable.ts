import { createCanvas, registerFont, loadImage } from "canvas";
import { calcShapePoints, roundRect } from ".";
import { GameState, Card, Round, CardSuit } from "../models/poker";
import formatMoney from "../utilities/formatMoney";

export default async function (gameState: GameState): Promise<Buffer> {

  registerFont("./fonts/arial.ttf", { family: "sans-serif" });
  registerFont("./fonts/arialbd.ttf", { family: "sans-serif" });

  const width = 600, height = 600;
  const xCenter = width / 2, yCenter = height / 2;
  const tableRadius = 230, tableEdgeWidth = 35;
  const numberOfSeats = 10;
  const cardWidth = 50, cardHeight = 75, cardSpacing = 3;
  const tableCorners = calcShapePoints(xCenter, yCenter, tableRadius, 0, numberOfSeats);
  const seatLocations = calcShapePoints(xCenter, yCenter, tableRadius + 10, 0.5, numberOfSeats);
  const buttonLocations = calcShapePoints(xCenter, yCenter, tableRadius - 65, 0.75, numberOfSeats);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const drawCard = (x: number, y: number, card: Card) => {
    const cornerRadius = 10;
    roundRect(x, y, cardWidth, cardHeight, cornerRadius, ctx);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.font = "bold 35px Arial";
    ctx.fillStyle = card.color;
    ctx.fillText(card.value, x + (cardWidth/2), y + (cardHeight/3.5));
    ctx.font = "bold 45px Arial";
    ctx.fillStyle = card.color;
    ctx.fillText(card.suit, x + (cardWidth/2), y + (cardHeight - (cardHeight/3.5)));
  };

  const drawBackground = async () => {
    const carpet = await loadImage(`./images/casino-carpet2.jpg`);
    ctx.drawImage(carpet, 0, 0, width, height);
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(0, 0, width, height);
  };

  const drawTable = async () => {
    ctx.beginPath();
    let [x, y] = tableCorners[0];
    ctx.moveTo (x, y);          
    for (let index = 1; index < numberOfSeats; index++) {
      [x, y] = tableCorners[index];
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = "#065D21";
    ctx.fill();
    for (let index = 0; index < tableEdgeWidth; index++) {
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
    }
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.font = "bold 500px Arial";
    ctx.fillText(CardSuit.CLUB, xCenter, yCenter - 35);
  };

  const drawSeats = async () => {
    
    for (let index = 0; index < numberOfSeats; index++) {
      const player = gameState.getPlayer(index);
      if (!player) return;

      const [x, y] = seatLocations[index];
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
        const avatar = await loadImage(player.avatarUrl);
        avatarCtx.drawImage(avatar, 0, 0, radius * 2, radius * 2);
        avatarCtx.beginPath();
        avatarCtx.arc(radius, radius, radius - (padding/2), 0, Math.PI * 2, true);
        avatarCtx.closePath();
        if (gameState.turnIndex === index) {
          for (let index = 0; index < padding; index++) {
            const color = Math.floor((255 / padding) * index);
            avatarCtx.strokeStyle = `rgb(0,${color},0, 1)`;
            avatarCtx.lineWidth = (padding - index) * 1.5;
            avatarCtx.stroke();
          }
        } else if (gameState.isFolded(player)) {
          for (let index = 0; index < padding; index++) {
            const color = Math.floor((100 / padding) * index);
            avatarCtx.strokeStyle = `rgb(${color},${color},${color}, 1)`;
            avatarCtx.lineWidth = padding - index;
            avatarCtx.stroke();
          }
          avatarCtx.fillStyle = "rgba(0,0,0,0.85)";
          avatarCtx.fill();
        } else {
          for (let index = 0; index < padding; index++) {
            const color = Math.floor((255 / padding) * index);
            avatarCtx.strokeStyle = `rgb(${color},${color},${color}, 1)`;
            avatarCtx.lineWidth = padding - index;
            avatarCtx.stroke();
          }
          avatarCtx.fillStyle = "rgba(0,0,0,0.3)";
          avatarCtx.fill();
        }
        const avatarFinal = await loadImage(avatarCanvas.toBuffer(), `${player.id}.png`);
        ctx.drawImage(avatarFinal, x - radius, y - radius, radius * 2, radius * 2);
      };

      const drawNameplate = async () => {
        const cornerRadius = 10;
        const nameplateWidth = (radius*2);
        const nameplateHeight = radius - (radius/2);
        const nameplateX = x - radius;
        const nameplateY = y + (radius - (nameplateHeight/1.5));
        roundRect(nameplateX, nameplateY, nameplateWidth, nameplateHeight, cornerRadius, ctx);
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fill();
        if (gameState.turnIndex === index) {
          ctx.fillStyle = "#00ff00";
        } else if (gameState.isFolded(player)) {
          ctx.fillStyle = "#999999";
        } else {
          ctx.fillStyle = "#ffffff";
        }
        let text = player.name;
        const measureText = (text) => ctx.measureText(text).width < radius*2 - 3;
        let textFits = measureText(text);
        ctx.font = gameState.turnIndex === index ? `bold 18px Arial` : `18px Arial`;
        if (!textFits && text.indexOf(" ") !== -1) {
          text = text.substr(0, text.indexOf(" "));
        }
        textFits = measureText(text);
        while (!textFits) {
          text = text.substr(0, text.length - 1);
          textFits = measureText(text);
        }
        ctx.fillText(text, nameplateX + radius, nameplateY + (nameplateHeight/2));
      };

      const drawBudget = async () => {
        const cornerRadius = 10;
        const budgetWidth = (radius*2);
        const budgetHeight = radius - (radius/2);
        const budgetX = x - radius;
        const budgetY = y - (radius + (budgetHeight/2.5));
        roundRect(budgetX, budgetY, budgetWidth, budgetHeight, cornerRadius, ctx);
        ctx.fillStyle = "rgba(0,0,0,0.7)";
        ctx.fill();
        if (gameState.isFolded(player)) {
          ctx.fillStyle = "#999955";
        } else if (gameState.turnIndex === index) {
          ctx.fillStyle = "#ffff00";
        } else {
          ctx.fillStyle = "#ffffbb";
        }
        ctx.font = gameState.turnIndex === index ? `bold 16px Arial` : `16px Arial`;
        ctx.fillText(formatMoney(gameState.getBudget(index)), budgetX + radius, budgetY + (budgetHeight/2));
      };

      const drawHoleCards = async () => {
        const cardsX = x - (cardWidth + (cardSpacing/2));
        const cardsY = y - (cardHeight/2);
        const holeCards = gameState.getHoleCards(gameState.turnIndex);
        if (!holeCards) return;
        for (let index = 0; index < 2; index++) {
          drawCard(cardsX + (((cardWidth + cardSpacing) * index)), cardsY, holeCards[index]);
        }
      };

      await drawAvatar();
      await drawBudget();
      await drawHoleCards();
      await drawNameplate();
    }
  };

  const drawButtons = async () => {
    const buttonSize = 20;
    
    // Dealer Button
    const drawDealer = () => {
      const [x, y] = buttonLocations[gameState.dealerIndex];
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
      const [x, y] = buttonLocations[gameState.dealerIndex + 1];
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
      const [x, y] = buttonLocations[gameState.dealerIndex + 2];
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

    if (gameState.round !== undefined) {
      drawDealer();
    }
    if (gameState.round === Round.PRE_FLOP) {
      drawBigBlind();
      drawSmallBlind();
    }
  };

  const drawCards = async () => {

    const drawCardPlaceholders = () => {
      const cornerRadius = 10;
      for (let index = 0; index < 5; index++) {
        const xStart = (xCenter - (cardSpacing * 2)) - (cardWidth * 2.5);
        const x = xStart + ((cardWidth + cardSpacing) * index);
        const y = yCenter - (cardHeight / 2);
        roundRect(x, y, cardWidth, cardHeight, cornerRadius, ctx);
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    drawCardPlaceholders();
    for (let index = 0; index < gameState.cards.length; index++) {
      const xStart = (xCenter - (cardSpacing * 2)) - (cardWidth * 2.5);
      const x = xStart + ((cardWidth + cardSpacing) * index);
      const y = yCenter - (cardHeight / 2);
      const card = gameState.cards[index];
      drawCard(x, y, card);
    }

  };

  const drawPot = async () => {
    if (!gameState.mainPot) return;
    const cornerRadius = 10;
    const width = ((cardWidth * 5) + (cardSpacing * 4) - (cardWidth*1.5));
    const height = 50;
    const x = xCenter - (width/2);
    const y = yCenter + ((cardHeight/2) + (cardSpacing*2));
    roundRect(x, y, width, height, cornerRadius, ctx);
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fill();
    ctx.font = "bold 30px Arial";
    ctx.fillStyle = "#ffff00";
    ctx.fillText(formatMoney(gameState.mainPot.amount), xCenter, y + (height/2));
  };

  const drawWinner = async () => {
    const cornerRadius = 10;
    const width = ((cardWidth * 5) + (cardSpacing * 4) - (cardWidth*1.5));
    const height = 75;
    const x = xCenter - (width/2);
    const y = yCenter - (((cardHeight/2) + (cardSpacing*2)) + height);
    roundRect(x, y, width, height, cornerRadius, ctx);
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fill();
    ctx.font = "bold 30px Arial";
    ctx.fillStyle = "#00ff00";
    ctx.fillText("WINNER!", xCenter, y + (height/4));
    ctx.fillText("Chev", xCenter, y + (height - (height/4)));
  };

  await drawBackground();
  await drawTable();
  await drawButtons();
  await drawSeats();
  await drawCards();
  await drawPot();
  //await drawWinner();

  return canvas.toBuffer();

}
