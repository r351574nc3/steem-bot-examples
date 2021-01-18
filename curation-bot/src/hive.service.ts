import { Injectable, Logger } from '@nestjs/common';
import { BlockchainMode, Client, PrivateKey } from '@hiveio/dhive';
import * as Promise from 'bluebird';

@Injectable()
export class HiveService {
    client: any;
    constructor() {
        this.client = new Client(
            [
                "https://api.hive.blog",
                "https://api.hivekings.com",
                "https://anyx.io",
                "https://api.openhive.network"
            ]
        );
    }

    getContent(author: string, permlink: string): any {
        return Promise.resolve(this.client.database.call('get_content', [author, permlink]));
    }

    vote(posting_key, voter, author, permlink, weight): any {
        const key = PrivateKey.from(posting_key)
        return Promise.resolve(this.client.broadcast.vote(
            {
                voter: voter, 
                author: author, 
                permlink: permlink, 
                weight: weight
            },
            key
        ));
    }

    getActiveVotes(author, permlink): any {
        return Promise.resolve(
            this.client.database.call('get_active_votes', [author, permlink])
        )
    }

    streamOperations(handler, errors): Promise {
        const stream = this.client.blockchain.getOperationsStream();
        stream.on("data", handler)
        stream.on("error", errors)
    }
}
