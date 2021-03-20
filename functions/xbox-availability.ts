import axios from "axios";
import config from "../config";
import discordClient from "../discord-client";
import { JSDOM } from "jsdom";
import { MessageEmbed, TextChannel } from "discord.js";

const {
  TWC_GUILD_ID,
  XBOX_AVAILABILITY_CHANNEL_ID
} = config;

export default async function () {
  const guild = discordClient.guilds.cache.get(TWC_GUILD_ID) || await discordClient.guilds.fetch(TWC_GUILD_ID);
  const channel = (guild.channels.cache.get(XBOX_AVAILABILITY_CHANNEL_ID) || await discordClient.channels.fetch(XBOX_AVAILABILITY_CHANNEL_ID)) as TextChannel;

  const availability = {
    amazon: false,
    bestbuy: false,
    gamestop: false,
    microsoft: false,
    newegg: false,
    target: false,
    walmart: false
  };

  const errors: string[] = [];

  try {
    // Check Amazon
    const amazonResponse = await axios.get("https://www.amazon.com/Xbox-X/dp/B08H75RTZ8/ref=sr_1_2?dchild=1&keywords=xbox+series+x&qid=1616192789&sr=8-2", {
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36"
      }
    });
    const amazonDom = new JSDOM(amazonResponse.data);
    availability.amazon = amazonDom.window.document.querySelector("#availability").textContent.includes("In Stock.");
  } catch (err) {
    errors.push(`Amazon Request Error: ${err.message}`);
  }

  try {
    // Check Newegg
    const neweggResponse = await axios.get("https://www.newegg.com/product/api/ProductRealtime?ItemNumber=68-105-273&RecommendItem=&BestSellerItemList=&IsVATPrice=true");
    availability.newegg = neweggResponse.data["MainItem"]["Instock"];
  } catch (err) {
    errors.push(`Newegg Request Error: ${err.message}`);
  }

  try {
    // Check BestBuy
    const bestbuyResponse = await axios.get("https://www.bestbuy.com/site/microsoft-xbox-series-x-1tb-console-black/6428324.p?skuId=6428324");
    const bestbuyDom = new JSDOM(bestbuyResponse.data);
    availability.bestbuy = !bestbuyDom.window.document.querySelector("[data-sku-id='6428324']").disabled;
  } catch (err) {
    errors.push(`Best Buy Request Error: ${err.message}`);
  }

  try {
    // Check Target
    const targetResponse = await axios.get("https://redsky.target.com/redsky_aggregations/v1/web/pdp_fulfillment_v1?key=ff457966e64d5e877fdbad070f276d18ecec4a01&tcin=80790841&store_id=1196&store_positions_store_id=1196&has_store_positions_store_id=true&zip=18901&state=PA&latitude=40.290&longitude=-75.110&scheduled_delivery_store_id=1196&pricing_store_id=1196");
    availability.target = targetResponse.data["data"]["product"]["fulfillment"]["shipping_options"]["availability_status"] !== "OUT_OF_STOCK";
  } catch (err) {
    errors.push(`Target Request Error: ${err.message}`);
  }

  try {
    // Check Walmart
    const walmartResponse = await axios.get("https://www.walmart.com/ip/Xbox-Series-X/443574645", {
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.90 Safari/537.36"
      }
    });
    const walmartDom = new JSDOM(walmartResponse.data);
    availability.walmart = !walmartDom.window.document.querySelector(".prod-blitz-copy-message").textContent.includes("This item is out of stock.");
  } catch (err) {
    errors.push(`Walmart Request Error: ${err.message}`);
  }

  try {
    // Check GameStop
    const gamestopResponse = await axios.get("https://www.gamestop.com/on/demandware.store/Sites-gamestop-us-Site/default/Product-Variation?pid=B224744V&redesignFlag=true&rt=productDetailsRedesign", {
      headers: {
        "cookie": "customergroups=Everyone;",
        "referer": "https://www.gamestop.com/video-games/xbox-series-x/consoles/products/xbox-series-x/B224744V.html"
      }
    });
    availability.gamestop = gamestopResponse.data["product"]["available"];
  } catch (err) {
    errors.push(`GameStop Request Error: ${err.message}`);
  }
  const anyAvailable = availability.amazon || availability.bestbuy || availability.gamestop || availability.microsoft || availability.newegg || availability.target || availability.walmart;
  const msg = new MessageEmbed();
  msg
    .setColor(anyAvailable ? "#00ff00" : "#ff0000")
    .setTitle("Xbox Series X Availability")
    .setThumbnail("https://i.imgur.com/GhhO4mG.png")
    .setDescription(`
      **Amazon:** ${availability.amazon ? "[IN STOCK!](https://www.amazon.com/Xbox-X/dp/B08H75RTZ8/ref=sr_1_3?dchild=1&keywords=xbox%2Bseries%2Bx&qid=1616185914&s=videogames&sr=1-3&th=1)" : "Still sold out."}
      **Best Buy:** ${availability.bestbuy ? "[IN STOCK!](https://www.bestbuy.com/site/microsoft-xbox-series-x-1tb-console-black/6428324.p?skuId=6428324)" : "Still sold out."}
      **GameStop:** ${availability.gamestop ? "[IN STOCK!](https://www.gamestop.com/video-games/xbox-series-x/consoles/products/xbox-series-x/B224744V.html)" : "Still sold out."}
      **Microsoft:** ${availability.microsoft ? "[IN STOCK!](https://www.xbox.com/en-US/consoles/xbox-series-x?ranMID=24542&ranEAID=0JlRymcP1YU&ranSiteID=0JlRymcP1YU-25gauTIrLePRAHQfqef3_Q&epi=0JlRymcP1YU-25gauTIrLePRAHQfqef3_Q&irgwc=1&OCID=AID2000142_aff_7593_1243925&tduid=%28ir__txsefogkdckfqkspkk0sohzifn2xpvcpg3rwgse300%29%287593%29%281243925%29%280JlRymcP1YU-25gauTIrLePRAHQfqef3_Q%29%28%29&irclickid=_txsefogkdckfqkspkk0sohzifn2xpvcpg3rwgse300#purchase)" : "Still sold out."}
      **Newegg:** ${availability.newegg ? "[IN STOCK!](https://www.newegg.com/p/N82E16868105273?Description=Xbox%20Series%20X&cm_re=Xbox_Series%20X-_-68-105-273-_-Product&quicklink=true&RandomID=3839016670677020210319131431)" : "Still sold out."}
      **Target:** ${availability.target ? "[IN STOCK!](https://www.target.com/p/xbox-series-x-console/-/A-80790841)" : "Still sold out."}
      **Walmart:** ${availability.walmart ? "[IN STOCK!](https://www.walmart.com/ip/Xbox-Series-X/443574645)" : "Still sold out."}
    `);
  await channel.send(msg);

  if (errors.length > 0) {
    await channel.send(`Errors:\n\n${errors.join("\n")}`);
  }
}