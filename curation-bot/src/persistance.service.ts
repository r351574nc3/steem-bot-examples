import { Injectable, Logger } from '@nestjs/common';

import Redis from 'ioredis';
import * as Promise from 'bluebird';
import * as moment from 'moment';
import * as fs from 'fs';
import { config } from './config';


@Injectable()
export class PersistanceService {

    // TODO: Track users with largest author rewards
    // * Track author rewards
    //      * Author gets reward
    //      * Get Community for reward
    //      * Get Author for reward
    //      * Determine if top reward
    //          * Keep top 10 posts for an author
    //          * Keep top 10 posts for a community
    // * Tables 
    //      * Posts
    //      * Authors
    //      * Communities
    //      * Author Posts
    //      * Community Posts
    // TODO: Track users with most author rewards in a week
    // * Don't use database for this. Use steem feed to fetch author rewards
    //   for a week.
    // * Another option is to track author rewards and instead of updating the
    //   database with every reward
    //      * increment the author rewards for an author.
    //      * reset rewards 7 days after previous reset
    //      * update last reset date
    // TODO: Track users getting most curation rewards per post
    // TODO: Track communities with the most rewards
    // TODO: Track communities with posts that have the highest rewards
    // TODO: Track when votes start coming in on the highest rewarded posts
    
    private db: any;

    constructor() {
        const redisUrl = `redis://@${config.redisHost}:6379/${config.redisDb}`
        this.db = new Redis(redisUrl)
    }

    async get_voters() {
        return this.db.get("voters")
    }

    async set_voters(voters) {
        Logger.log("Setting voters")
        this.db.set("voters", voters).catch((err) => {
            Logger.error("Unable to store voters because ", err)
        })
    }

    async get_downvoters() {
        return this.db.get("downvoters")
    }

    async set_downvoters(voters) {
        this.db.set("downvoters", voters)
    }

    async get_whitelist() {
        return this.db.get("whitelist")
    }

    async set_whitelist(whitelist) {
        this.db.set("whitelist", whitelist)
    }

    async get_blacklist() {
        return this.db.get("blacklist")
    }

    async set_blacklist(blacklist) {
        this.db.set("blacklist", blacklist)
    }

    async get_vote_cache() {
        return this.db.get("cache")
    }

    async update_vote_cache(cache) {
        this.db.set("cache", cache)
    }
}