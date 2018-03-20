'use strict'

const scheduler = require('node-schedule')
const HOURLY = '0 1 * * * *'


module.exports = {
    run
}

function run() {
    scheduler.scheduleJob(HOURLY, require('./task'))
}