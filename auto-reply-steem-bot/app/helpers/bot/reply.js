'use strict'

const Promise = require('bluebird')
const steem = Promise.promisifyAll(require('steem'))
const { user, wif } = require('../../config')
const sleep = require('sleep')
const moment = require('moment')
const Handlebars = require('handlebars')
const fs = Promise.promisifyAll(require('fs'))
const path = require('path')


module.exports = {
    execute
}

const HALF_PERCENT = 50

// Some names to generally steer clear of if you don't want to be downvoted
const defaults = {
    blacklist: [
        'r351574nc3', 'steemitboard', 'booster', 'cryptographic', 'pawsdog', 'bethwheatcraft',
        'boomerang', 'kittybot', 'minnowbooster', 'moneymatchgaming', 'mercurybot', 'originalworks',
        'minnowhelper', 'jerrybanfield', 'buildawhale', 'smartsteem', 'steemcleaners', 'spaminator', 
        'patrice', 'trogladactyl'
    ]
}

function loadTemplate(template) {
    return fs.readFileAsync(template, 'utf8')
}

/**
 * Lookup a week's worth of comments/posts. Look for replies. Compare replies to upvotes. 
 * Anyone that replies and upvotes gets a thank you.
 */

function is_original(author, permlink) {
    return steem.api.getContentAsync(author, permlink)
        .then((results) => {
            return results.id != 0
        })
        .catch((err) => {
            console.log("Errors checking if original content ", err)
        })
}

function is_in_blacklist(author) {
    return Promise.filter(defaults.blacklist, (entry) => entry == author)
        .then((entries) => { entries.length > 0 })
}


function is_voted_on_by(author, permlink, voter) {
    return steem.api.getActiveVotesAsync(author, permlink)
        .filter((vote) => voter == vote.voter)
        .then((votes) => votes.length > 0)
}

function is_already_replied_to(author, permlink) {
    return steem.api.getContentRepliesAsync(author, permlink)
        .filter((reply) => user == reply.author)
        .then((replies) => { return replies.length > 0 })
}

function find_replies_by_upvoters(author, permlink) {
    console.log("Getting replies for ", {author: author, permlink: permlink})
    return steem.api.getContentRepliesAsync(author, permlink)
        .filter((reply) => is_in_blacklist(reply.author))
        .filter((reply) => is_already_replied_to(reply.author, reply.permlink))
        .filter((reply) => is_voted_on_by(author, permlink, reply.author))
}

function thank(reply) {
    var context = {
        poster: reply.author
    }
    console.log(path.join(__dirname, '..', 'templates', 'reply.hb'))
    return loadTemplate(path.join(__dirname, '..', 'templates', 'reply.hb'))
        .then((template) => {
            var templateSpec = Handlebars.compile(template)
            return templateSpec(context)
        })
        .then((body) => {
            var permlink = 're-' + reply.author 
                + '-' + reply.permlink 
                + '-' + new Date().toISOString().replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();

            console.log("Replying to ", {author: reply.author, permlink: reply.permlink})
            return steem.broadcast.commentAsync(
                wif,
                reply.author, // Leave parent author empty
                reply.permlink,
                user, // Author
                permlink, // Permlink
                permlink, // Title
                body, // Body
                { "app": "auto-reply-steem-bot/0.1.0" }
            ).then((result) => {
                console.log(result)
                sleep.sleep(30) // Sleep 30 seconds at least to allow for replies
            }).catch((err) => {
                console.log("Unable to process comment. ", err)
            })
        })
        .then((response) => {
            return steem.broadcast.voteAsync(wif, user, reply.author, reply.permlink, HALF_PERCENT)
                .then((results) =>  {
                    console.log(results)
                })
                .catch((err) => {
                    console.log("Vote failed: ", err)
                })
        })
}

function execute() {
    return steem.api.getDiscussionsByBlogAsync({tag: user, limit: 100})
        .filter((post) => moment(post.created).diff(moment(), 'days') < 7)
        .map((post) => {
            return {
                author: user,
                permlink: post.permlink,
                parent_permlink: post.parent_permlink,
                created: post.created,
                title: post.title
            }
        })
        .filter((post) => is_original(post.author, post.permlink))
        .each((post) => find_replies_by_upvoters(post.author, post.permlink)
            .each((reply) => thank(reply)))
}