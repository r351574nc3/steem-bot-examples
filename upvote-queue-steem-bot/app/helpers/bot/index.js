'use strict'

const scheduler = require('node-schedule')
const EVERY_20_MINUTES = '*/20 * * * *'


module.exports = {
    run
}

function run() {
    scheduler.scheduleJob(EVERY_20_MINUTES, require('./upvote'))
    // require('./upvote.js').execute()
}