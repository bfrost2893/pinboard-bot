export default {
  telegram: {
    url: "https://api.telegram.org/bot",
    apiToken: process.env.TELEGRAM_API_TOKEN
  },
  pinboard: {
    url: "https://api.pinboard.in/v1"
  },
  port: process.env.PORT || 8000,
  host: "https://pinboard-bot.herokuapp.com"
};
