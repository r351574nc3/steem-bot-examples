import { Injectable, Logger } from '@nestjs/common';

import Redis from 'ioredis';
import * as Promise from 'bluebird';
import * as moment from 'moment';
import * as fs from 'fs';


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

    }
}