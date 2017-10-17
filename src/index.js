import express from "express";
import bodyParser from "body-parser";
import config from "./config";
import TelegramBot from "node-telegram-bot-api";

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

// Just to ping!
bot.on("message", msg => {
  bot.sendMessage(msg.chat.id, "I am alive!");
});
