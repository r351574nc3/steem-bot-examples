import { Injectable, Logger } from '@nestjs/common';
import { BlockchainMode, Client, PrivateKey } from '@hiveio/dhive';
import { HiveService } from './hive.service';
import * as Promise from 'bluebird';
import * as moment from 'moment';
import * as fs from 'fs';
import { runInContext } from 'vm';

const voting_queue = [];
const ONE_SECOND = 1000
const FIVE_SECONDS = 5000
const SIX_MINUTES = 360000
const TEN_MINUTES = 600000
const FIFTEEN_MINUTES = 898000
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

const communities = {
    "hive-140217": "Hive Gaming",
    "hive-156509": "OnChainArt"
}

const allowed_tags = [
    "callofdutywarzone",
    "hive-140217",
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

const instant_voters = [
]

const voting = {
    length: () => { return voting_queue.length },
    push: (obj) => { return voting_queue.push(obj) },
    pop: () => { return voting_queue.pop() },
    shift: () => { return voting_queue.shift() },
    unshift: (obj) => { return voting_queue.unshift(obj) }
}

@Injectable()
export class CurationService {

    private hiveService: HiveService;

    constructor(hiveService: HiveService) {
        this.hiveService = hiveService;
        setInterval(() => {
            const to_vote = voting_queue.shift()
            this.vote(to_vote)
                .catch((err) => {
                })
        }, ONE_SECOND)
    }

    url_to_post(url) {
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

    processTransfer(transfer) {
        const amount = parseFloat(transfer.amount.split(" ").shift())

        if (amount >= 25 && transfer.memo.startsWith("http")) {
            Logger.log(`Found valid transfer ${JSON.stringify(transfer)}`)
            return this.url_to_post(transfer.memo)
                .spread((author, permlink) => {
                    return this.hiveService.getContent(author, permlink)
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
                    Logger.error("Unable to vote ", err)
                })
        }
    }

    hasTag(comment, tag) {
    }

    processComment(comment) {
        return this.list_whitelist()
            .then((whitelist) => {
                if (Object.keys(whitelist).includes(comment.author)) {
                    Logger.log(`Queueing @${comment.author}/${comment.permlink} for ${SIX_MINUTES} milliseconds`)
                    setTimeout(() => {
                        voting_queue.push({ author: comment.author, 
                                            permlink: comment.permlink, 
                                            weight: whitelist[comment.author].weight,
                                            whitelisted: true })
                    }, SIX_MINUTES)
                    return comment
                }

		if (Object.keys(communities).includes(comment.parent_permlink)) {
                    setTimeout(() => {
                        voting_queue.push({ author: comment.author, 
                                            permlink: comment.permlink })
                    }, SIX_MINUTES)
                    return comment		   
		}

		/* Voting by tags. Communities are preferred.
                return this.hiveService.getContent(comment.author, comment.permlink)
                    .then((content) => {
                        if (content.json_metadata 
                            && content.json_metadata !== '') {
                            return JSON.parse(content.json_metadata);
                        }
                        return {};
                    })
                    .then((metadata) => {
			Logger.log("...with tags: ", JSON.stringify(metadata.tags))
			return metadata.tags
                    })
                    .filter((tag) => allowed_tags.includes(tag))
                    .then((tags) => {
                        if (tags && tags.length > 1) {
                            Logger.log(`Queueing @${comment.author}${comment.permlink} for ${SIX_MINUTES} milliseconds`)
                            setTimeout(() => {
                                voting_queue.push({ author: comment.author, permlink: comment.permlink })
                            }, SIX_MINUTES)
                        }
                        return tags;
                    })
		    */
            })
    }

    list_voters(author, permlink) {
        const buffer = fs.readFileSync(process.env.CONFIG_DIR + "/voters.json").toString();
        const voters = JSON.parse(buffer)
        return Promise.filter(voters, (voter, index, length) => {
            if (!(author && permlink)) {
                return true
            }
            const results = this.hiveService.getActiveVotes(author, permlink)

            // Filter promises by checking if the voter name is among the active voters
            return this.hiveService.getActiveVotes(author, permlink)
                .map((vote) => vote.voter)
                .then((target) => {
                    return !target.includes(voter.name)
                })
        })
    }

    list_whitelist() {
        const buffer = fs.readFileSync(process.env.CONFIG_DIR + "/whitelist.json")
        const retval = JSON.parse(buffer.toString());
        return Promise.resolve(retval)
    }

    list_blacklist() {
        return Promise.all(blacklist)
    }

    vote(post) {
        if (!post) {
            return Promise.reject("Invalid post")
        }

        return this.list_blacklist()
            .filter((member) => member === post.author)
            .then((blacklist) => {
                Logger.log(`Checking if ${post.author} in blacklist`)
                if (blacklist.length > 0) {
                    return []
                }

                return this.list_voters(post.author, post.permlink)
            })
            .filter((voter) => (!post.whitelisted || !voter.skip_whitelist))
            .map((voter) => {
                const upvote_weight = post.weight ? post.weight : voter.weight
                Logger.log(`${voter.name} upvoting ${JSON.stringify(post)}, weight: ${upvote_weight}`)
                return this.hiveService.vote(voter.wif, voter.name, post.author, post.permlink, upvote_weight)
                    .then((results)  => {
                        Logger.log("Vote results ", JSON.stringify(results))
                        return results;
                    })
                    .catch((err) => {
                        Logger.error("Voting error ", JSON.stringify(err))
                        if (err.payload.indexOf("STEEMIT_MIN_VOTE_INTERVAL_SEC") > -1) {
                            voting_queue.push(post)
                        }
                    })
                })
            
    }

    run() {
        Logger.log("Streaming started")
        const retval = this.hiveService.streamOperations(
            (results) => {
                return Promise.resolve(results.op).spread((operation_name, operation) => {
                    switch(operation_name) {
                        case 'comment':
                            if (operation.parent_author == '') {
                                return this.processComment(operation)
                                    .catch((err) => {
                                        Logger.error("Unable to process comment because ", err)
                                    })
                            }
                            break;
                        case 'vote':
                            // Logger.log(`${operation.voter} voted on @${operation.author}/${operation.permlink}`)
                            /*
                            if (operation.weight > 0 && follow.includes(operation.voter)) {
                                return vote({ author: operation.author, permlink: operation.permlink })
                            }
                            */
                            break;
                        case 'unvote':
                            break;
                        case 'transfer':
                            return this.processTransfer(operation)
                            break;
                    default:
			Logger.log("Unknown operation: ${JSON.stringify(operation)}")
                            break;
                    }
                })
                .catch((err) => {
                    Logger.error("Bot died. Restarting ... ", err)
                })
            },
            (error) => {
                Logger.error("Failed ${error}")
                this.run()
            })
    }
}
