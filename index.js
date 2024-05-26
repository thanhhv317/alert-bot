const express = require("express");
const expressApp = express();
const axios = require("axios");
const path = require("path");
expressApp.use(express.static("static"));
expressApp.use(express.json());
require("dotenv").config();
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

let minEpicPrice = 300;
let minMythicalPrice = 600;
let intervalFn = null
const existData = new Map()

bot.launch();
bot.command("epic", (ctx) => {
  if (!ctx.payload) {
    bot.telegram.sendMessage(
      ctx.chat.id,
      `Please set the price you want.\nCurrent epic price is ${minEpicPrice}$.\n if you want to bid 200$, enter:\n epic 200`,
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
  minEpicPrice = payload
  bot.telegram.sendMessage(
    ctx.chat.id,
    `Max epic price updated to ${payload}$ 🫡`,
  );
});


bot.command("myth", (ctx) => {
  if (!ctx.payload) {
    bot.telegram.sendMessage(
      ctx.chat.id,
      `Please set the price you want.\nCurrent myth price is ${minMythicalPrice}$\nif you want to bid 200$, enter:\n myth 200`,
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
  minMythicalPrice = payload
  bot.telegram.sendMessage(
    ctx.chat.id,
    `Max mythical price updated to ${payload}$ 🫡`,
  );
});

bot.command('stop', (ctx) => {
  bot.telegram.sendMessage(
    ctx.chat.id,
    `You unregistered for notification from the bot 🫵`,
  ); clearInterval(intervalFn)
})

bot.command("start", (ctx) => {
  bot.telegram.sendMessage(
    ctx.chat.id,
    `You registered for notification from the bot 🎉`,
  );
  intervalFn = setInterval(() => {
    axios
      .post(
        `https://main-server.dagora.xyz/adapters/dagora/collection/meta/item`,
        {
          page: 1,
          size: 60,
          address: "0xD4A3639794e85160eF2e953e28eeE73a84fD9279",
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
     *  {
        "listingData": {
            "type": "market",
            "name": "Holy Cat#815",
            "image": "https://ipfs-wrapper.dagora.xyz/ipfs/QmcV3nk8eyw4MFUTZishbayKkwBepXY8GdbP6qr4LgpiAE?height=500&width=500",
            "contractName": "The Eternals",
            "price": 509.03600000000006,
            "expireAt": 1718766584,
            "attributes": [
                {
                    "value": "815",
                    "trait_type": "id"
                },
                {
                    "value": "epic",
                    "trait_type": "rarity"
                },
                {
                    "value": "legend",
                    "trait_type": "element"
                }
            ],
            "tokens": [
                {
                    "address": "0x0Fd0288AAAE91eaF935e2eC14b23486f86516c8C",
                    "amount": "2000000000000000000000"
                }
            ],
            "signature": "0x5292f67422e8fc343cdda6ce240a87403cd2dff224b117be8abf86f494ef7b484c8fa01add56896d563f30f369422b0d187509cfe2e398fc76ffc330431790d01b",
            "signMessage": "0x3aef59c64d64bbcb437d3328bbbe4930286116d7fc59912808a1219cf732627d",
            "chain": "tomo",
            "address": "0xD4A3639794e85160eF2e953e28eeE73a84fD9279",
            "id": "815",
            "from": "0xCE253CF58C397C8FA278170a7e4Ffee1efD46fcB",
            "time": 1716088184,
            "duration": 2678400,
            "nonce": 320,
            "isMinter": 0,
            "tokenPrice": "0.254518"
        },
        "address": "0xD4A3639794e85160eF2e953e28eeE73a84fD9279",
        "chain": "tomo",
        "name": "Holy Cat#815",
        "image": "https://ipfs-wrapper.dagora.xyz/ipfs/QmcV3nk8eyw4MFUTZishbayKkwBepXY8GdbP6qr4LgpiAE?height=500&width=500",
        "contractName": "The Eternals"
    }
    */
  if (!data?.listingData?.attributes) {
    return false;
  }

  if (existData.get(data?.listingData?.id) === data?.listingData.price) {
    return false;
  }

  const rarity = data.listingData.attributes.find(
    (item) => item.trait_type === "rarity"
  )?.value;
  const { price } = data.listingData;
  if (rarity === "epic") {
    if (price > minEpicPrice) {
      return false;
    }
    return true;
  }

  if (rarity === "mythical") {
    if (price > minMythicalPrice) {
      return false;
    }
    return true;
  }

  return false;
};

const createMessage = (chatId, data) => {
  const photo = data.image.replace('?height=500&width=500', '?height=200&width=200')
  const url = `https://dagora.xyz/detail/viction/${data.address}/${data.listingData.id}`
  const result = {
    chat_id: chatId,
    caption: [
      `Id: #${data.listingData.id}`,
      `Price: ${data.listingData.price} $`,
    ].join("\n"),
    reply_markup: {
      inline_keyboard: [[{ text: "View", url }]],
    },
    photo: photo,
  };
  return result;
};
