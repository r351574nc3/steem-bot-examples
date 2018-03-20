'use strict'

const steem = require('steem')
const Promise = require('bluebird')


module.exports = {
    execute
}

function execute() {
    steem.api.getAccounts(['r351574nc3'], function(err, result) {
        console.log(err, result);
      });
}