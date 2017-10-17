import "babel-polyfill";
import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";
import mongoose from "mongoose";
import axios from "axios";
import xml2js from "xml2js-es6-promise";
import { find } from "lodash";
import config from "./config";
import userFacade from "./user/facade";

mongoose.Promise = Promise;
mongoose
  .connect(config.mongo.url, {
    keepAlive: true,
    reconnectTries: Number.MAX_VALUE,
    useMongoClient: true
  })
  .then(() => {
    console.log("connected to mongo");
  });

const bot = new TelegramBot(config.telegram.apiToken);
bot.setWebHook(`${config.host}/bot${config.telegram.apiToken}`);

const app = express();
// parse the updates to JSON
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.json({
    msg: "Welcome to Pinbot"
  });
});

// We are receiving updates at the route below!
app.post(`/bot${config.telegram.apiToken}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Start Express Server
app.listen(config.port, () => {
  console.log(`Pinbot is listening on ${config.port}`);
});

bot.onText(/\/login (.+)/, async (msg, match) => {
  const pinboardToken = match[1];
  let pinboardUser = null;

  const currentUser = await userFacade.findOne({ userId: msg.from.id });
  if (currentUser.pinboardToken) {
    bot.sendMessage(
      msg.chat.id,
      "You're already logged in dummy. You can logout if you want 🍑"
    );
    return;
  }

  try {
    pinboardUser = await axios.get(
      config.pinboard.url + "/user/api_token/?auth_token=" + pinboardToken
    );
  } catch (err) {
    bot.sendMessage(msg.chat.id, "Your token is fucked up");
    bot.sendMessage(msg.chat.id, "Usage: `/login <pinboard token>`", {
      parse_mode: "Markdown"
    });
    bot.sendMessage(
      msg.chat.id,
      "Get your token [here](https://pinboard.in/settings/password)",
      {
        parse_mode: "Markdown"
      }
    );
    return;
  }

  const token = (await xml2js(pinboardUser.data)).result;
  const pinboardUsername = pinboardToken.replace(":" + token, "");

  const query = { userId: msg.from.id };
  const update = {
    userId: msg.from.id,
    pinboardToken,
    pinboardUsername
  };
  await userFacade.findOneAndUpdate(query, update);

  bot.sendMessage(
    msg.chat.id,
    "You are logged in to Pinboard as " + pinboardUsername
  );
});

bot.onText(/\/logout/, async (msg, match) => {
  const query = { userId: msg.from.id };
  const update = {
    pinboardToken: null,
    pinboardUsername: null
  };
  await userFacade.findOneAndUpdate(query, update);

  bot.sendMessage(
    msg.chat.id,
    "You are disconnected from Pinboard. Text me later if you need me 😉"
  );
});

bot.onText(/\/ping/, msg => {
  bot.sendMessage(msg.chat.id, "pong");
});

bot.onText(/@pin_board_bot/, async msg => {
  const urlEntity = find(msg.entities, { type: "url" });
  if (!urlEntity) {
    bot.sendMessage(msg.chat.id, "No URL found.");
    return;
  }

  const currentUser = await userFacade.findOne({ userId: msg.from.id });
  const url = msg.text.match(/\bhttps?:\/\/\S+/gi)[0];
  const tags = msg.text.match(/ tags=([[-\w\s]+(?:,[-\w\s]*)*)/);
  const toread = / toread/.test(msg.text) ? "yes" : "no";
  const shared = / shared/.test(msg.text) ? "yes" : "no";
  const website = await axios.get(url);
  const description = website.data.match(/<title>(.*?)<\/title>/)[1];

  try {
    const res = await axios.get(
      `${config.pinboard
        .url}/posts/add/?auth_token=${currentUser.pinboardToken}&url=${url}&description=${description}&tags=${tags
        ? tags[1]
        : ""}&toread${toread}&shared=${shared}`
    );
  } catch (err) {
    console.log("err man", err);
    bot.sendMessage(msg.chat.id, "Error posting link to Pinboard. Try again.");
    return;
  }

  bot.sendMessage(
    msg.chat.id,
    `[${description}](${url}) added to ${currentUser.pinboardUsername}'s pinboard!`,
    { parse_mode: "Markdown" }
  );
});

bot.onText(/\/help/, msg => {
  bot.sendMessage(
    msg.chat.id,
    `Welcome to Pinbot!
To get started, login to Pinboard by running \`/login <api token>\` ([link to find API token](https://pinboard.in/settings/password)).
To logout at anytime, just run \`/logout\`.
To add a link, just type \`@pin_board_bot\` and pass a valid link. You can also specify additional options just as \`shared\`, \`toread\`, and \`tags\`.
Example: \`@pin_board_bot https://www.nytimes.com/ toread shared tags=news,lib\``,
    { parse_mode: "Markdown" }
  );
});
