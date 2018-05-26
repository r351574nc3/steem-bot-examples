const steem = require('steem')
const Promise = require('bluebird')
const EventEmitter = require('events')
const moment = require('moment')
const fs = require('fs')

const voting_queue = [];
const FIVE_SECONDS = 5000
const TEN_MINUTES = 600000
const THIRTY_MINUTES = 1800000

const whitelist = [
    "tibra",
    "moeknows",
    "drakos",
    "beaphotos",
    "firedream",
    "the-resistance",
]

const voting = {
    length: () => { return voting_queue.length },
    push: (obj) => { return voting_queue.push(obj) },
    pop: () => { return voting_queue.pop() },
    shift: () => { return voting_queue.shift() },
    unshift: (obj) => { return voting_queue.unshift(obj) }
}

function url_to_post(url) {
    return new Promise((resolve, reject) => {
        if (!url.startsWith("https")) {
            return reject("Not a valid url")
        }
        if (url.indexOf("#") > -1 ) { // ignore comments
            return reject("Comments and replies are invalid")
        }
        if (url.indexOf('@') < 0) { // invalid path
            return reject("No author in path")
        }
        const path = url.split("@")[1] // there should only be one of these
        return resolve(path.split("/")) // valid url @author/permlink
    })
}

function processTransfer(transfer) {
    const amount = parseFloat(transfer.amount.split(" ").shift())

    if (amount > 30) {
        console.log("Found valid transfer ", transfer)
        return url_to_post(transfer.memo)
            .spread((author, permlink) => {
                return steem.api.getContentAsync(comment.author, comment.permlink)
                    .then((content) => {
                        const age_in_seconds = moment().utc().local().diff(moment(content.created).utc().local(), 'seconds')
                        const wait_time = 1801 - age_in_seconds
                        setTimeout(() => {
                            voting_queue.push({ author, permlink })
                        }, wait_time) 
                        return content
                    })
            })
            .catch((err) => {
                console.log("Unable to vote ", err)
            })
    }
}

function processComment(comment) {
    if (whitelist.includes(comment.author)) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                voting_queue.push({ author: comment.author, permlink: comment.permlink })
            }, THIRTY_MINUTES)
            resolve(comment)
        })
    }

    return steem.api.getContentAsync(comment.author, comment.permlink)
        .then((content) => {
            console.log("Comment ", content)
            if (content.json_metadata && content.json_metadata != '') {
                return JSON.parse(content.json_metadata);
            }
            return {};
        })
        .then((metadata) => {
            if (metadata.tags && metadata.tags.includes('utopian-io')) {
                setTimeout(() => {
                    voting_queue.push({ author: comment.author, permlink: comment.permlink })
                }, THIRTY_MINUTES)
            }
            return metadata
        })
}

function list_voters() {
    var voters = JSON.parse(fs.readFileSync(process.env.CONFIG_DIR + "/voters.json"));
    return Promise.map(voters, (item, index, length) => {
        return item
    })
}

function vote(post) {
    if (!post) {
        return Promise.reject("Invalid post")
    }

    return list_voters()
        .map((voter) => {
            console.log("Upvoting ", post)
            console.log("Voter ", voter.name)
            return steem.broadcast.voteAsync(voter.wif, voter.name, post.author, post.permlink, voter.weight)
                .then((results)  => {
                    console.log("Vote results ", results)
                    return results;
                })
        })
}

function main() {
    console.log("Streaming operations")
    steem.api.streamOperations('head', (err, results) => {
        if (err) {
            console.log("Unable to stream operations %s", err)
            main()
            return 
        }
        return Promise.resolve(results).spread((operation_name, operation) => {
            switch(operation_name) {
                case 'comment':
                    if (operation.parent_author == '') {
                        return processComment(operation)
                            .catch((err) => {
                                console.log("Unable to process comment because ", err)
                            })
                    }
                    break;
                case 'vote':
                    break;
                case 'unvote':
                    break;
                case 'transfer':
                    return processTransfer(operation)
                    break;
                default:
            }
        })
        .catch((err) => {
            console.log("Bot died. Restarting ... ", err)
        })
    })
}

setInterval(() => {
    vote(voting_queue.pop())
        .catch((err) => {

        })
}, FIVE_SECONDS)
main()