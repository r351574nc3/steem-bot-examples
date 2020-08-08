const steem = require('steem')
const Promise = require('bluebird')
const moment = require('moment')
const fs = require('fs')

const voting_queue = [];
const ONE_SECOND = 1000
const FIVE_SECONDS = 5000
const SIX_MINUTES = 360000
const TEN_MINUTES = 600000
const FIFTEEN_MINUTES = 897000
const THIRTY_MINUTES = 1800000

const blacklist = [
    "iqbalel",
    "jhonysins",
    "khabir",
    "tombredy",
    "catonchronic",
    "adelsz",
    "timemaster",
    "shahinalom",
    "sjeezz",
    "mdfaysal",
    "maycoded",
    "soudy-jr74",
    "kyawmyoaung",
    "soomraa",
    "fatany",
    "delowar4181",
    "hormorhk18",
    "soumenz",
    "nahidcom",
    "sultanam",
    "smhp84",
    "smhp2016",
    "trbtc",
    "josegaldame",
    "funny3dkids2",
    "saidqautsar",
    "josephace135",
    "steem.moon",
    "markgreek",
    "karthikmbbs",
    "jemisteem",
    "doctorspence",
    "haikal21",
    "rashidnazirmir",
    "nurainiagani",
    "andreina89",
    "kgakakillerg",
    "tipsybosphorus",
    "ajpacheco1610",
    "albertocotua",
    "mundocreativo",
    "adip",
    "dwightjaden",
    "hatakekakashi",
    "princesammer3366",
    "najuz",
    "riamisna",
    "goldenaardvark",
    "chiquibencomo",
    "plimpd",
    "leob1234",
    "dexterflux",
    "fauzict",
    "aduwahsp",
    "olamatto",
    "nazmul.islam",
    "stefidifelice",
    "miguelalar"
]

const follow = [
    "frontrunner",
    "sahra-bot"
]

const allowed_tags = [
    "utopian-io",
    "task-development",
    "task-graphics",
    "task-bug-hunting",
    "task-social",
    "task-analysis",
    "task-documentation",
    "task-copywriting",
    "ideas",
    "blog",
    "tutorials",
    "video-tutorials",
    "graphics",
    "development",
    "bug-hunting",
    "analysis",
    "social",
    "documentation",
    "copywriting"
]

instant_voters = [
    'smartmarket',
    'minnowbooster'
]

// steem.api.setOptions({ url: 'wss://rpc.buildteam.io' });
// steem.api.setOptions({ url: 'api.steemit.com' })

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

    if (amount >= 25 && transfer.memo.startsWith("http")) {
        console.log("Found valid transfer ", transfer)
        return url_to_post(transfer.memo)
            .spread((author, permlink) => {
                return steem.api.getContentAsync(author, permlink)
                    .then((content) => {
                        const age_in_seconds = moment().utc().local().diff(moment(content.created).utc().local(), 'seconds')
                        const wait_time = instant_voters.includes(transfer.to) && (361 - age_in_seconds) > 0 ? (361 - age_in_seconds) * 1000 : 0
                        console.log(`Queueing for ${wait_time} milliseconds`)
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
    if (comment.body.indexOf("!tip") > -1
        || comment.body.indexOf("tip!") > -1) {
        console.log("Tip comment ", comment)
    }
    return list_whitelist()
        .then((whitelist) => {
            if (Object.keys(whitelist).includes(comment.author)) {
                setTimeout(() => {
                    voting_queue.push({ author: comment.author, 
                                        permlink: comment.permlink, 
                                        weight: whitelist[comment.author].weight,
                                        whitelisted: true })
                }, SIX_MINUTES)
                return comment
            }
            return steem.api.getContentAsync(comment.author, comment.permlink)
                .then((content) => {
                    if (content.json_metadata 
                        && content.json_metadata != ''
                        && content.parent_permlink == 'utopian-io') {
                        return JSON.parse(content.json_metadata);
                    }
                    return {};
                })
                .then((metadata) => {
                    if (metadata.tags && metadata.tags.length > 0 && metadata.tags.includes("utopian-io")) {
                        return metadata.tags
                    }
                    return []
                })
                .filter((tag) => allowed_tags.includes(tag))
                .then((tags) => {
                    if (tags && tags.length > 1) {
                        setTimeout(() => {
                            voting_queue.push({ author: comment.author, permlink: comment.permlink })
                        }, SIX_MINUTES)
                    }
                    return tags;
                })
        })
}

function list_voters(author, permlink) {
    const voters = JSON.parse(fs.readFileSync(process.env.CONFIG_DIR + "/voters.json"));
    return Promise.filter(voters, (voter, index, length) => {
        if (!(author && permlink)) {
            return true
        }

        // Filter promises by checking if the voter name is among the active voters
        return steem.api.getActiveVotesAsync(author, permlink)
            .map((vote) => vote.voter)
            .then((target) => {
                return !target.includes(voter.name)
            })
    })
}

function list_whitelist() {
    const retval = JSON.parse(fs.readFileSync(process.env.CONFIG_DIR + "/whitelist.json"));
    return Promise.resolve(retval)
}

function list_blacklist() {
    return Promise.all(blacklist)
}

function vote(post) {
    if (!post) {
        return Promise.reject("Invalid post")
    }

    return list_blacklist()
        .filter((member) => member === post.author)
        .then((blacklist) => {
            console.log(`Checking if ${post.author} in blacklist`)
            if (blacklist.length > 0) {
                return []
            }

            return list_voters(post.author, post.permlink)
        })
        .filter((voter) => (!post.whitelisted || !voter.skip_whitelist))
        .map((voter) => {
            const upvote_weight = post.weight ? post.weight : voter.weight
            console.log(voter.name, " upvoting ", post, ", weight: ", upvote_weight)
            return steem.broadcast.voteAsync(voter.wif, voter.name, post.author, post.permlink, upvote_weight)
                .then((results)  => {
                    console.log("Vote results ", results)
                    return results;
                })
                .catch((err) => {
                    console.log("Voting error ", err)
                    if (err.payload.indexOf("STEEMIT_MIN_VOTE_INTERVAL_SEC") > -1) {
                        voting_queue.push(post)
                    }
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
                    /*
                    if (operation.weight > 0 && follow.includes(operation.voter)) {
                        return vote({ author: operation.author, permlink: operation.permlink })
                    }
                    */
                    break;
                case 'unvote':
                    break;
                case 'transfer':
                    return processTransfer(operation)
                    break;
                default:
                    break;
            }
        })
        .catch((err) => {
            console.log("Bot died. Restarting ... ", err)
        })
    })
}

setInterval(() => {
    const to_vote = voting_queue.shift()
    vote(to_vote)
        .catch((err) => {
        })
}, ONE_SECOND)
main()
