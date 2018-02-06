'use strict'

const scheduler = require('node-schedule')
const HOURLY = '1 * * * *'


module.exports = {
    run
}

function run() {
    scheduler.scheduleJob(HOURLY, require('./upvote'))
    // require('./upvote.js').execute()
}