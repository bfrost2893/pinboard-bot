import "babel-polyfill";
import express from "express";
import bodyParser from "body-parser";
import TelegramBot from "node-telegram-bot-api";
import mongoose from "mongoose";
import axios from "axios";
import xml2js from "xml2js-es6-promise";
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

  const currentUser = await userFacade.findOne({ chatId: msg.chat.id });
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

  const query = { chatId: msg.chat.id };
  const update = { chatId: query.chatId, pinboardToken, pinboardUsername };
  await userFacade.findOneAndUpdate(query, update);

  bot.sendMessage(
    msg.chat.id,
    "You are logged in to Pinboard as " + pinboardUsername
  );
});

bot.onText(/\/logout/, async (msg, match) => {
  const query = { chatId: msg.chat.id };
  const update = {
    chatId: query.chatId,
    pinboardToken: null,
    pinboardUsername: null
  };
  await userFacade.findOneAndUpdate(query, update);

  bot.sendMessage(
    msg.chat.id,
    "You are disconnected from Pinboard. Text me later if you need me 😉"
  );
});

// Just to ping!
// bot.on("message", msg => {
//   bot.sendMessage(msg.chat.id, "I am alive!");
//   const query = { chatId: msg.chat.id };
//   const update = query;
//   userFacade.findOneAndUpdate(query, update);
// });
