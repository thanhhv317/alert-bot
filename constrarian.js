const express = require("express");
const expressApp = express();
const axios = require("axios");
const path = require("path");
expressApp.use(express.static("static"));
expressApp.use(express.json());
require("dotenv").config();
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN_CONTRA);

let minPriceC98 = 100;
let intervalFn = null
const existData = new Map()

bot.launch();
bot.command("price", (ctx) => {
  if (!ctx.payload) {
    bot.telegram.sendMessage(
      ctx.chat.id,
      `Please set the price you want.\nCurrent price is ${minPriceC98}C98.\n if you want to bid 120C98, enter:\n price 120`,
    );
    return
  }
  const payload = parseInt(ctx.payload)
  if (isNaN(payload)) {
    bot.telegram.sendMessage(
      ctx.chat.id,
      `Invalid price, please retry again 😭`,
    );
    return
  }
  minPriceC98 = payload
  bot.telegram.sendMessage(
    ctx.chat.id,
    `Max price updated to ${payload} c98 🫡`,
  );
});


bot.command('stop', (ctx) => {
  bot.telegram.sendMessage(
    ctx.chat.id,
    `You unregistered for notification from the bot 🫵`,
  ); clearInterval(intervalFn)
})

bot.command('ping', (ctx) => {
  bot.telegram.sendMessage(
    ctx.chat.id,
    `pong`,
  );
})


bot.command("start", (ctx) => {
  bot.telegram.sendMessage(
    ctx.chat.id,
    `You registered for notification from the bot 🎉`,
  );
  intervalFn = setInterval(() => {
    axios.post(
      `https://main-server.dagora.xyz/adapters/dagora/collection/meta/item`,
      {
        page: 1,
        size: 60,
        address: "0x09201E7A42f548Dc56D7e61d8De3A3EDf2AaBAc5",
        chain: "tomo",
        sort: "price",
      },
      {
        headers: {
          accept: "application/json",
          signature:
            "a28edefb1c4e83c209ff67b60ad763f8c2b26e04ada509cc552ff45afd661991",
          source: "C98DAGDBMQ9",
          Referer: "https://dagora.xyz/",
          "Referrer-Policy": "strict-origin-when-cross-origin",
          "accept": "application/json",
        },
      }
    )
      .then((response) => {
        const { data } = response?.data.data;
        const result = data.filter((item) =>
          checkDataCorrect(item, existData)
        );
        result.forEach((item) => {
          existData.set(item.listingData.id, item.listingData.price)
          const msg = createMessage(ctx.chat.id, item);
          bot.telegram.sendPhoto(msg.chat_id, msg.photo, msg);
        });
      });
  }, 30000);

});


const checkDataCorrect = (data, existData) => {
  /** EXAMPLE data
     *  
     * {
    "listingData": {
        "type": "market",
        "name": "Contrarians #3112",
        "image": "https://ipfs-wrapper.dagora.xyz/ipfs/bafybeie4dllyyjbwchsvhxm5amlmxykxf252ba36vokq6lkhc5qsirczxq?height=500&width=500",
        "contractName": "The Contrarians ",
        "price": 30.968519999999998,
        "expireAt": 1719312895,
        "attributes": [
            {
                "value": "Matterhorn",
                "trait_type": "Background"
            },
            {
                "value": "Green Bomber",
                "trait_type": "Clothes"
            },
            {
                "value": "Black Wink",
                "trait_type": "Eyes"
            },
            {
                "value": "Crop Cut",
                "trait_type": "Hair"
            },
            {
                "value": "None",
                "trait_type": "Head Gears"
            },
            {
                "value": "M. Cigar",
                "trait_type": "Mouth"
            },
            {
                "value": "M.Black",
                "trait_type": "Skin"
            }
        ],
        "tokens": [
            {
                "address": "0x0Fd0288AAAE91eaF935e2eC14b23486f86516c8C",
                "amount": "120000000000000000000"
            }
        ],
        "signature": "0x53268f08cd6fa5e73f789f9ceb468f7afb0901d31bec85658850ff1a1bb4d9a667597fbc484fbaa8f6b0b8f00dd9ccbe3cbde0ddcb4a2fb2a32087f9e1feb2641c",
        "signMessage": "0x2772efc4ab7621d5df1aa0ff869b4f7d62ab6e192dbbbc7ffa600b8ded8d9e0a",
        "chain": "tomo",
        "address": "0x09201E7A42f548Dc56D7e61d8De3A3EDf2AaBAc5",
        "id": "3112",
        "from": "0x84A389C2e96825327038ff824000e42667511245",
        "time": 1716634495,
        "duration": 2678400,
        "nonce": 3,
        "isMinter": 0,
        "tokenPrice": "0.258071"
    },
    "address": "0x09201E7A42f548Dc56D7e61d8De3A3EDf2AaBAc5",
    "chain": "tomo",
    "name": "Contrarians #3112",
    "image": "https://ipfs-wrapper.dagora.xyz/ipfs/bafybeie4dllyyjbwchsvhxm5amlmxykxf252ba36vokq6lkhc5qsirczxq?height=500&width=500",
    "contractName": "The Contrarians "
}
    }
    */
  if (!data?.listingData?.attributes) {
    return false;
  }

  if (existData.get(data?.listingData?.id) === data?.listingData.price) {
    return false;
  }

  if (data.listingData.type === "auction") {
    return false
  }
  const price = parseC98Price(data)

  if (price > minPriceC98) {
    return false;
  }

  return true;

};

const parseC98Price = (data) => {
  const price = parseInt(data.listingData?.tokens[0]?.amount) / 1_000_000_000_000_000_000;
  return price
}

const createMessage = (chatId, data) => {
  const photo = data.image.replace('?height=500&width=500', '?height=200&width=200')
  const url = `https://dagora.xyz/detail/viction/${data.address}/${data.listingData.id}`
  const price = parseC98Price(data)
  const result = {
    chat_id: chatId,
    caption: [
      `Id: #${data.listingData.id}`,
      `Price: ${price} C98`,
    ].join("\n"),
    reply_markup: {
      inline_keyboard: [[{ text: "View", url }]],
    },
    photo: photo,
  };
  console.log(price)
  return result;
};
