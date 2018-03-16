const express = require('express')
const bot = require("./helpers/bot")

const app = express()

app.get('/', (req, res) => res.send('Hello World!'))

bot.run();  // Bot execution

app.listen(3000, () => console.log('Example app listening on port 3000!'))