'use strict'

const scheduler = require('node-schedule')
const EVERY_20_MINUTES = '*/20 * * * *'


module.exports = {
    run
}

function run() {
    scheduler.scheduleJob(EVERY_20_MINUTES, require('./upvote'))
    scheduler.scheduleJob(EVERY_20_MINUTES, require('./claim'))
    // require('./claim.js').execute()
}