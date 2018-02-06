'use strict'

const Promise = require('bluebird')
const steem = Promise.promisifyAll(require('steem'))
const {user, wif} = require('../../config')
const sleep = require('sleep')
const moment = require('moment')


module.exports = {
    execute
}

const FLAG = 'https://steemitimages.com/0x0/https://memegenerator.net/img/instances/500x/71701676/my-ultimate-is-still-charging.jpg'
const TWO_PERCENT = 200

const SECONDS_PER_HOUR = 3600
const PERCENT_PER_DAY = 20
const HOURS_PER_DAY = 24
const MAX_VOTING_POWER = 10000
const DAYS_TO_100_PERCENT = 100 / PERCENT_PER_DAY
const SECONDS_FOR_100_PERCENT = DAYS_TO_100_PERCENT * HOURS_PER_DAY * SECONDS_PER_HOUR
const RECOVERY_RATE = MAX_VOTING_POWER / SECONDS_FOR_100_PERCENT
const UTC_OFFSET = 60 * 7

/**
 * Look for https://steemitimages.com/0x0/https://memegenerator.net/img/instances/500x/71701676/my-ultimate-is-still-charging.jpg
 * in blog post comment. vote on parent 2%.
 */

function current_voting_power(vp_last, last_vote) {
    var seconds_since_vote = moment().add(7, 'hours').diff(moment(last_vote), 'seconds')
    return (RECOVERY_RATE * seconds_since_vote) + vp_last
}

function time_needed_to_recover(voting_power) {
    return RECOVERY_RATE * (9250 - voting_power)
}

function upvote(post) {
    return steem.api.getAccountsAsync([ user ]).then((account) => {
        var voting_power = current_voting_power(account.voting_power, account.last_vote_time)
        var recovery_wait = time_needed_to_recover(voting_power)
        while (recovery_wait > 0) {
            console.log("Waiting ", recovery_wait, " seconds to recover")
            sleep.sleep(recovery_wait)
            voting_power = current_voting_power(account.voting_power, account.last_vote_time)
            recovery_wait = time_needed_to_recover(voting_power)
        }
        return post
    })
    .then((post) => {
        return steem.broadcast.voteAsync(wif, user, post.parent_author, post.parent_permlink, TWO_PERCENT)
        .then((results) =>  {
            console.log(results)
        })
        .catch((err) => {
            console.log("Vote failed: ", err)
        })
    })
}

function execute() {
    return steem.api.getDiscussionsByCommentsAsync({start_author: user, limit: 100})
        .filter((post) => moment(post.created).diff(moment(), 'days') <= 7)
        .filter((post) => post.body.indexOf(FLAG) > -1)
        .map((post) => {
            return {
                author: user,
                permlink: post.permlink,
                parent_author: post.parent_author,
                parent_permlink: post.parent_permlink
            }
        }).each((post) => upvote(post))
}