const express = require('express')
const bot = require("./helpers/bot");
const app = express()

app.get('/', (req, res) => res.send('Check!'))

bot.run();

app.listen(3000, () => console.log('Spider listening on port 3000!'))

