import { Injectable, Logger } from '@nestjs/common';
import { BlockchainMode, Client, PrivateKey } from 'dsteem';
import * as Promise from 'bluebird';

@Injectable()
export class SteemService {
    client: any;
    constructor() {
        this.client = new Client("https://api.steemit.com", {})
    }

    async getContent(author: string, permlink: string): Promise<any> {
        return this.client.database.call('get_content', [author, permlink]);
    }

    async getComments(query): Promise<any> {
        return this.client.database.call('get_discussions_by_comments', [query])
    }

    async vote(posting_key, voter, author, permlink, weight): Promise<any> {
        const key = PrivateKey.from(posting_key)
        return this.client.broadcast.vote(
            {
                voter: voter, 
                author: author, 
                permlink: permlink, 
                weight: weight,
            },
            key
        );
    }

    async getActiveVotes(author, permlink): Promise<any> {
        return this.client.database.call('get_active_votes', [author, permlink])
    }

    streamOperations(handler, errors): Promise<any> {
        const stream = this.client.blockchain.getOperationsStream();
        stream.on("data", handler)
        stream.on("error", errors)
    }
}
