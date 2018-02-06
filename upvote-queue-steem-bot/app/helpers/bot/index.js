'use strict'

const scheduler = require('node-schedule')
const HOURLY = '* * * * *'


module.exports = {
    run
}

function run() {
    scheduler.scheduleJob(HOURLY, require('./upvote'))
    // require('./upvote.js').execute()
}