const express = require("express");
const expressApp = express();
const axios = require("axios");
const path = require("path");
expressApp.use(express.static("static"));
expressApp.use(express.json());
require("dotenv").config();
const { Telegraf } = require("telegraf");

const bot = new Telegraf(process.env.BOT_TOKEN);

let fetchStatus = false;
let minEpicPrice = 300;
let minMythicalPrice = 600;
const existData = new Map()

bot.launch();
bot.command("start", (ctx) => {
  bot.telegram.sendMessage(
    ctx.chat.id,
    `Hello ${ctx.from?.first_name}! Welcome to the Friday bot.\nI respond to /hello. Please try it`,
    {}
  );
});

bot.command("fetch", (ctx) => {
  fetchStatus = !fetchStatus;
  bot.telegram.sendMessage(
    ctx.chat.id,
    `${fetchStatus ? "turn on" : "turn off"} fetch data`,
    {}
  );
  if (fetchStatus) {
    setInterval(() => {
      console.log("Fetch ne");
      axios
        .post(
          `https://main-server.dagora.xyz/adapters/dagora/collection/meta/item`,
          {
            page: 1,
            size: 40,
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
          console.log("result", result)
          result.forEach((item) => {
            existData.set(item.listingData.id, item.listingData.price)
            const msg = createMessage(ctx.chat.id, item);
            bot.telegram.sendPhoto(msg.chat_id, msg.photo, msg);
          });
        });
    }, 10000);
  }
});

bot.command("thanks", (ctx) => {
  bot.telegram.sendMessage(
    ctx.chat.id,
    `My address: 👇\nBSC: 0x3952c3BaF84901442bd848E47E3F04d520A91972\nSPL: 8Nea5sQFaL6RjFnVLtxYTPiTMrpFcLtDzXRw1VXXUrjS\nVIC: 0x3952c3BaF84901442bd848E47E3F04d520A91972`,
    {}
  );
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
  const result = {
    chat_id: chatId,
    caption: `ID: ${data.listingData.id}\nPrice: ${data.listingData.price}$\n👉: https://dagora.xyz/detail/viction/${data.address}/${data.listingData.id}`,
    photo: data.image,
  };
  return result;
};
