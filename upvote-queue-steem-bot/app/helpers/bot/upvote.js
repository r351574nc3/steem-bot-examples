'use strict'

const Promise = require('bluebird')
const steem = Promise.promisifyAll(require('steem'))
const {user, wif, weight, threshold} = require('../../config')
const moment = require('moment')
const schedule = require('node-schedule')


module.exports = {
    execute
}

const FLAG = 'https://steemitimages.com/0x0/https://memegenerator.net/img/instances/500x/71701676/my-ultimate-is-still-charging.jpg'

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
    return RECOVERY_RATE * (threshold - voting_power)
}

function upvote(post) {
    var recovery_wait = 0
    return steem.api.getAccountsAsync([ user ]).then((account) => {
        var voting_power = current_voting_power(account.voting_power, account.last_vote_time)
        recovery_wait = time_needed_to_recover(voting_power) / 60
        return post
    })
    .then((post) => {

        // Reschedule vote
        if (recovery_wait > 0) {
            var later = moment().add(recovery_wait, 'minutes').toDate()
            console.log("Rescheduling ", recovery_wait, " minutes to recover")
            schedule.scheduleJob(later, function() {
                upvote(post)
            })
            return post
        }

        return steem.broadcast.voteAsync(wif, user, post.parent_author, post.parent_permlink, weight)
        .then((results) =>  {
            console.log(results)
        })
        .catch((err) => {
            console.log("Vote failed: ", err)
        })
    })
}

function not_already_voted_on(post) {
    return steem.api.getActiveVotesAsync(post.parent_author, post.parent_permlink)
    .filter((vote) => vote.voter == user)
    .then((votes) => { return votes < 1 })
}

function execute() {
    console.log("Upvotes running on schedule")
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
        })
        .filter((post) => not_already_voted_on(post))
        .each((post) => upvote(post))
}