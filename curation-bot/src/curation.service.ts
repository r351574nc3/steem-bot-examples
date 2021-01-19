import { Injectable, Logger } from '@nestjs/common';
import { BlockchainMode, Client, PrivateKey } from '@hiveio/dhive';
import { HiveService } from './hive.service';
import { SteemService } from './steem.service';
import { PersistanceService } from './persistance.service';
import { config } from './config';
import * as Promise from 'bluebird';
import * as moment from 'moment';
import * as fs from 'fs';   

const voting_queue = [];
const ONE_SECOND = 1000
const FIVE_SECONDS = 5000
const THREE_MINUTES = 150000
const TWO_MINUTES = 120000
const SIX_MINUTES = 360000
const TEN_MINUTES = 600000
const FIFTEEN_MINUTES = 898000
const THIRTY_MINUTES = 1800000
const ONE_HOUR = 3600000
const SIX_HOUR = 21600000
const SIX_DAYS = 518400
const ONE_WEEK = 604800
const MAX_VOTE = 10000

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
    "miguelalar",
    "emsonic",
    "treecko",
    "cgicreator",
    "palasatenea",
    "andryjovalles",
    "gorayii",
    "coqueto",
    "shmoogleosukami",
    "ghastlygames",
    "gregoriovd",
    "andielor",
    "anibal-aa",
    "alfonsoj",
    "elias15g",
    "sanderjansenart",
    "sarau",
    "klausklaus",
    "shirahoshi",
    "stefannikolov",
    "elgatomayor",
    "darkwitch",
    "fransrayati",
    "esecholito",
    "dimanesis",
    ""
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

const feed = {
    entries: {},
    min: 0.0,
    max: 0.0,
    avg: 0.0
}

@Injectable()
export class CurationService {
    private hiveService: HiveService;
    private steemService: SteemService;

    constructor(hiveService: HiveService,
            steemService: SteemService) {
        this.hiveService = hiveService;
        this.steemService = steemService;
    }

    api() {
        return config.steemEnabled ? this.steemService : this.hiveService;
    }

    url_to_post(url) {
        return new Promise((resolve, reject) => {
            if (!url.startsWith("https")) {
                return reject("Not a valid url")
            }
            if (url.indexOf("#") > -1) { // ignore comments
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
                    return this.api().getContent(author, permlink)
                        .then((content) => {
                            const age_in_seconds = moment().utc().local().diff(moment(content.created).utc().local(), 'seconds')
                            const wait_time = instant_voters.includes(transfer.to) && (TWO_MINUTES - (age_in_seconds * 1000)) > 0 ? 
                                    (TWO_MINUTES - (age_in_seconds * 1000)) : 0
                            Logger.log(`Queueing for ${wait_time} milliseconds`)
                            setTimeout(() => {
                                this.vote({ author, permlink })
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

    updateFeed(publisher: string, exchangeRate: string): void {
        feed.entries[publisher] = parseFloat(exchangeRate.split(" ")[0]);

        let i = 0
        let total = 0.0
        let min = 99999
        let max = 0

        Object.values(feed.entries).forEach((entry: number) => {
            total = total + entry;
            if (entry < min) {
                min = entry;
            }
            if (entry > max) {
                max = entry;
            }
	    i++
        });
        const avg = total / i;

        if (min !== feed.min) {
            const delta = feed.min - min
            Logger.log(`Updating minimum feed value to ${min}: ${delta}`);
            feed.min = min
    
        }
        if (min !== feed.max) {
            const delta = feed.max - max
            Logger.log(`Updating maximum feed value to ${max}: ${delta}`);
            feed.max = max
    
        }
        if (avg !== feed.avg) {
            const delta = feed.avg - avg
            Logger.log(`Updating average feed value to ${avg}: ${delta}`);
            feed.avg = avg
        }
    }

    processComment(comment) {
        return this.list_whitelist()
            .then((whitelist) => {
                if (Object.keys(whitelist).includes(comment.author)) {
                    Logger.log(`Queueing @${comment.author}/${comment.permlink} for ${TWO_MINUTES} milliseconds`)
                    setTimeout(() => {
                        this.vote({
                            author: comment.author,
                            permlink: comment.permlink,
                            weight: whitelist[comment.author].weight,
                            whitelisted: true
                        })
                    }, TWO_MINUTES)
                    return comment
                }

                if (Object.keys(communities).includes(comment.parent_permlink)) {
                    setTimeout(() => {
                        this.vote({
                            author: comment.author,
                            permlink: comment.permlink
                        })
                    }, TWO_MINUTES)
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

            // Filter promises by checking if the voter name is among the active voters
            return this.api().getActiveVotes(author, permlink)
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
        if (voting_queue.indexOf(`${post.author}/${post.permlink}`) < 0) {
            voting.push(`${post.author}/${post.permlink}`)
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
                return this.api().vote(voter.wif, voter.name, post.author, post.permlink, upvote_weight)
                    .then((results) => {
                        // It's been voted on, remove from the queue
                        const index_pos = voting_queue.indexOf(`${post.author}/${post.permlink}`)
                        if (index_pos > -1) {
                            voting_queue.splice(index_pos, 1)
                        }
                        Logger.log("Vote results ", JSON.stringify(results))
                        return results;
                    })
                    .catch((err) => {
                        Logger.error("Voting error ", JSON.stringify(err))

                        if (err.jse_shortmsg.indexOf("STEEMIT_MIN_VOTE_INTERVAL_SEC") > -1) {
                            setTimeout(() => {
                                this.vote(post)
                            }, ONE_SECOND)                        }
                    })
            })

    }


    comments(author) {
        let weekOldPermlink = "";
        const base_query = {
            "start_author": author,
            "limit": 10,
            "truncate_body": 1
        }
        let permlink = ""
        const voteService = this
        return {
            async *[Symbol.asyncIterator]() {
                while (weekOldPermlink === "") {
                    for (let comment of await voteService.api().getComments(
                        {
                            ...base_query,
                            "start_permlink": permlink
                        }
                    )) {
                        permlink = comment.permlink
                        if (!voteService.isWeekOld(comment)) {
                            yield comment
                        }
                        else {
                            weekOldPermlink = comment.permlink
                        }
                    }
                }        
            }
        }
    }
    
    isWeekOld(content:any):boolean {
        const age_in_seconds = moment().utc().local().diff(moment(content.created).utc().local(), 'seconds')
        return ONE_WEEK <= age_in_seconds
    }

    async processComments(voter) {
        for await (let comment of this.comments(voter.name)) {
            Logger.log("Queueing post for vote ", JSON.stringify(
                {
                    author: comment.author,
                    permlink: comment.permlink,
                    weight: MAX_VOTE
                }
            ))
            const age_in_seconds = moment().utc().local().diff(moment(comment.created).utc().local(), 'seconds')
            const wait_time = ((SIX_DAYS * 1000) - (age_in_seconds * 1000)) > 0 ? (SIX_DAYS * 1000) - (age_in_seconds * 1000) : THREE_MINUTES
            Logger.log(`Queueing for post that is ${(age_in_seconds * 1000)} old for ${wait_time} milliseconds`)
            setTimeout(() => {
                this.vote(
                    {
                        author: comment.author,
                        permlink: comment.permlink,
                        weight: MAX_VOTE
                    }
                )
            }, wait_time)
        }
    }

    batch() {
        const buffer = fs.readFileSync(process.env.CONFIG_DIR + "/voters.json").toString();
        const voters = JSON.parse(buffer)
        return Promise.filter(voters, (voter, index, length) => {
            this.processComments(voter)
            return setInterval(() => { this.processComments(voter) }, SIX_HOUR)
        })
    }
        
    run() {
        Logger.log("Streaming started")
        const retval = this.api().streamOperations(
            (results) => {
                return Promise.resolve(results.op).spread((operation_name, operation) => {
                    switch (operation_name) {
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
                        case 'comment_benefactor_reward':
                            break;
                        case 'account_update2':
                            break;
                        case 'transfer_to_vesting':
                            break;
                        case 'custom_json':
                            break;
                        case 'feed_publish':
                            this.updateFeed(operation.publisher, operation.exchange_rate.base)
                            //Logger.log(`${operation_name}: ${JSON.stringify(operation)}`)
                            break;
                        case 'producer_reward':
                            break;
                        case 'comment_options':
                            break;
                        case 'curation_reward':
                            break;
                        case 'author_reward':
                            break;
                        case 'claim_reward_balance':
                            break;
                        case 'limit_order_create':
                            break;
                        case 'limit_order_cancel':
                            break;
                        case 'claim_account':
                            break;
                        case 'fill_vesting_withdraw':
                            break;
                        case 'fill_order':
                            break;
                        case 'fill_convert_request':
                            break;
                        case 'convert':
                            // Logger.log(`${operation_name}: ${JSON.stringify(operation)}`)
                            break;
                        case 'create_claimed_account':
                            break;
                        case 'delegate_vesting_shares':
                            break;
                        case 'account_update':
                            break;
                        case 'witness_set_properties':
                            break;
                        case 'delete_comment':
                            break;
                        case 'account_witness_vote':
                            break;
                        case 'withdraw_vesting':
                            // Logger.log(`${operation_name}: ${JSON.stringify(operation)}`)
                            break;
                        case 'proposal_pay':
                            break;
                        case 'sps_fund':
                            break;
                        case 'return_vesting_delegation':
                            break;
                        case 'transfer_from_savings':
                            break;
                        case 'transfer_to_savings':
                            break;
                        case 'fill_transfer_from_savings':
                            break;
                        case 'fill_transfer_to_savings':
                            break;
                        case 'update_proposal_votes':
                            break;
                        case 'change_recovery_account':
                            break;
                        case 'account_create':
                            break;
                        case 'comment_payout_update':
                            break;
                        case 'comment_reward':
                            break;
                        default:
                            Logger.log(`Unknown operation: ${operation_name}: ${JSON.stringify(operation)}`)
                            break;
                    }
                })
                    .catch((err) => {
                        Logger.error("Bot died. Restarting ... ", err)
                    })
            },
            (error) => {
                Logger.error(`Failed ${JSON.stringify(error)}`)
                this.run()
            })
    }
}
