import { Injectable, Logger } from '@nestjs/common';
import { BlockchainMode, Client, PrivateKey } from 'dsteem';
import * as Promise from 'bluebird';

@Injectable()
export class SteemService {
    client: any;
    constructor() {
        this.client = new Client("https://api.justyy.com", {})
    }

    async getContent(author: string, permlink: string): Promise<any> {
        return this.client.database.call('get_content', [author, permlink]);
    }

    getComments(query): any {
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

    getActiveVotes(author, permlink): any {
        return Promise.resolve(this.client.database.call('get_active_votes', [author, permlink]))
    }

    streamOperations(handler, errors): Promise<any> {
        const stream = this.client.blockchain.getOperationsStream();
        stream.on("data", handler)
        stream.on("error", errors)
    }
}
