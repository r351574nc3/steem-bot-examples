import { Injectable, Logger } from '@nestjs/common';
import { BlockchainMode, Client, PrivateKey } from '@hiveio/dhive';
import { HiveService } from './hive.service';
import { SteemService } from './steem.service';
import { BlurtService } from './blurt/blurt.service';
import { PersistanceService } from './persistance.service';
import { config } from './config';
import * as Promise from 'bluebird';
import * as moment from 'moment';
import * as fs from 'fs';   

const ONE_SECOND = 1000
const FIVE_SECONDS = 5000
const THREE_MINUTES = 180000
const TWO_MINUTES = 120000
const SIX_MINUTES = 360000
const TEN_MINUTES = 600000
const FIFTEEN_MINUTES = 898000
const THIRTY_MINUTES = 1800000
const ONE_HOUR = 3600000
const SIX_HOUR = 21600000
const ONE_DAY = 86400
const THREE_DAYS = ONE_DAY * 3
const SIX_DAYS = (ONE_DAY * 6)
const ONE_WEEK = ONE_DAY * 7
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
    "robbinkrs",
    ""
]

const follow = [
    "r351574nc3",
    "salty-mcgriddles",
    "exifr",
    "exifr0",
    "perpetuator",
    "joongkwang"
]

const communities = {
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

const feed = {
    entries: {},
    min: 0.0,
    max: 0.0,
    avg: 0.0
}

class VotingQueue {
    private voting_queue: string[]
    constructor() {
        this.voting_queue = []
    }
    length() { return this.voting_queue.length }
    push(obj) { return this.voting_queue.push(obj) }
    pop() { return this.voting_queue.pop() }
    shift() { return this.voting_queue.shift() }
    unshift(obj) { return this.voting_queue.unshift(obj) }
    contains(obj) { return this.voting_queue.indexOf(obj) > -1}

    remove(obj) {
        const index_pos = this.voting_queue.indexOf(obj)
        if (index_pos > -1) {
            return this.voting_queue.splice(index_pos, 1)
        }
    }
}

@Injectable()
export class CurationService {
    private hiveService: HiveService;
    private steemService: SteemService;
    private voting: VotingQueue

    constructor(hiveService: HiveService,
            steemService: SteemService) {
        this.hiveService = hiveService;
        this.steemService = steemService;
        this.voting = new VotingQueue()
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

    getWaitTime(age_in_seconds: number, maxWait: number, noWait: boolean): number {
        if (noWait && (maxWait <= (age_in_seconds * 1000))) {
            return 0;
        }
        return maxWait - (age_in_seconds * 1000)
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
                            const wait_time = this.getWaitTime(age_in_seconds, TWO_MINUTES, instant_voters.includes(transfer.to));
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

    uncurate(comment) {
        
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
                            before: whitelist[comment.author].before,
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

    async list_valid_voters(author: string, permlink: string, exclusions: string[]): Promise<string[]> {
        return this.api().getActiveVotes(author, permlink)
            .map((vote) => vote.voter)
            .then((target_voters) => {
                // If any exclusions are found, invalidate
                if (target_voters.filter(
                    (voter) => exclusions.includes(voter)).length > 0) {
                    Logger.log(`Found exclusions ${JSON.stringify(exclusions)} already voted for. Skipping.`)
                    const buffer = fs.readFileSync(process.env.CONFIG_DIR + "/voters.json").toString();
                    return JSON.parse(buffer).map((voter) => voter.name)
                }
				Logger.log(`${permlink} has voters ${JSON.stringify(target_voters)}`)
                return target_voters
            })
    }
    
    async list_not_voted(author: string, permlink: string): Promise<string[]> {
        const buffer = fs.readFileSync(process.env.CONFIG_DIR + "/voters.json").toString();
        const voters = JSON.parse(buffer)
        if (!(author && permlink)) {
            return true
        }
        const content_voters = await this.list_valid_voters(author, permlink, ["acom"])
        return Promise.filter(voters, (voter, index, length) => {
			Logger.log(`Checking if voter ${voter.name} has already voted ${!content_voters.includes(voter.name)}`)
            return !content_voters.includes(voter.name)
        }).then((voters) => {
			Logger.log(`Voters that haven't voted yet ${JSON.stringify(voters)}`)
			return voters
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

    async vote(post) {
        if (!post) {
            return Promise.reject("Invalid post")
        }
        if (this.voting.contains(`${post.author}/${post.permlink}`)) {
            this.voting.push(`${post.author}/${post.permlink}`)
        }
        const downvoted = await this.isDownvoted(post);
        return this.list_blacklist()
            .filter((member) => member === post.author)
            .then((blacklist) => {
                Logger.log(`Checking if ${post.author} in blacklist`)
                if (blacklist.length > 0) {
                    return []
                }

                // now allow voting before a specific account votes.
                return this.list_not_voted(post.author, post.permlink)
            })
            .filter((voter) => (!voter.skip_whitelist))
            .map((voter) => {
                const upvote_weight = post.weight ? post.weight : voter.weight
                if (upvote_weight > 1 && downvoted) {
                    Logger.log(`Downvoted? ${downvoted})`)
                    if (["r351574nc3", "exifr", "exifr0", "perpetuator", "salty-mcgriddles", "joongkwang"].includes(post.author)) {
                        return false
                    }
                }

                Logger.log(`${voter.name} voting ${JSON.stringify(post)}, weight: ${upvote_weight}`)
                return this.api().vote(voter.wif, voter.name, post.author, post.permlink, upvote_weight)
                    .then((results) => {
                        // It's been voted on, remove from the queue
                        this.voting.remove(`${post.author}/${post.permlink}`)
                        return results
                    })
                    .then((results) => {
                        Logger.log(`Vote results ${JSON.stringify(results)}`)
                        return results;
                    })
                    .catch((err) => {
                        Logger.error("Voting error ", JSON.stringify(err.jse_shortmsg))

                        // if (err && err.jse_shortmsg && err.jse_shortmsg.indexOf("STEEM_MIN_VOTE_INTERVAL_SEC") > -1) {
                        if (err.jse_shortmsg
			    && err.jse_shortmsg.indexOf("identical") < 0
			    && err.jse_shortmsg.indexOf("Duplicate") < 0
			    && err.jse_shortmsg.indexOf("skip_transaction_dupe_check") < 0) {
                            Logger.log(`Rescheduling vote on ${post.author}/${post.permlink} by ${voter.name}`)
                            setTimeout(() => {
                                this.vote(post)
                            }, ONE_SECOND)    
                        }
                    })
            })

    }

    async isDownvoted(comment) {
        const downvotes = (await this.api().getActiveVotes(comment.author, comment.permlink))
            .filter((vote) => vote.percent < 0)
        return downvotes.length > 0
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
                        if (!voteService.isWeekOld(comment)
                            && voteService.isDownvoted(comment)) {
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
            const wait_time = ((SIX_DAYS * 1000) - (age_in_seconds * 1000)) > 0 ? (SIX_DAYS * 1000) - (age_in_seconds * 1000) : SIX_DAYS
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
        /*
        const voters = [     
            {
                "name": "perpetuator",
                "wif": "5Jm48KxBqeGL1aAv7vX5dgutL3pAsMkoEQYpnEbZcgxZB3THBKZ",
                "weight": 0,
                "skip_whitelist": true
            },
        ]
        */
        return Promise.filter(voters, (voter, index, length) => {
            this.processComments(voter)
            return setInterval(() => { this.processComments(voter) }, SIX_HOUR)
           return true
        })
    }

    async trail(op) {
        return setTimeout(() => {
            this.vote({ author: op.author, permlink: op.permlink, weight: op.weight })
        }, FIVE_SECONDS)
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
                            else if (["acom"].includes(operation.author)) {
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
                            if (["r351574nc3", "perpetuator", "salty-mcgriddles"].includes(operation.voter)) {
								Logger.log(`Vote following ${JSON.stringify(operation)}`)
								return this.trail(operation).
									catch((err) => {
										Logger.error("Unable to process vote because ", err)
									})
                            }
                            break;
                        case 'unvote':
                            break;
                        case 'transfer':
                            //  return this.processTransfer(operation)
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
						case 'effective_comment_vote':
							break;
						case 'transfer_to_vesting_completed':
                            break;
                        case 'comment_reward':
							break;
						case 'delayed_voting':
                            break;
						case 'witness_update':
							break;
						case 'account_witness_proxy':
							break;
						case 'expired_account_notification':
							break;
						case 'fill_collateralized_convert_request':
							break;
						case 'fill_recurrent_transfer':
							break;
                        case 'changed_recovery_account':
                            break;
                        case 'collateralized_convert':
                            break;
                        case 'clear_null_account_balance':
                            break;
                        case 'set_withdraw_vesting_route':
                            break;
                        case 'cancel_transfer_from_savings':
                            break;
                        case 'interest':
                            break;
                        default:
                            Logger.log(`Unknown operation: ${operation_name}: ${JSON.stringify(operation)}`)
                            break;
                    }
                })
                .catch((err) => {
                    Logger.error("Bot died. Restarting ... ", err)
                    Logger.log(`Error Operation ${JSON.stringify(results.op)}`)
                })
            },
            (error) => {
                Logger.error(`Failed ${JSON.stringify(error)}`)
                this.run()
            })
    }
}
