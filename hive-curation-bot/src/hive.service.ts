import { Injectable, Logger } from '@nestjs/common';
import { BlockchainMode, Client, PrivateKey } from '@hiveio/dhive';

@Injectable()
export class HiveService {
    client: any;
    key: any;
    constructor() {
        this.client = new Client(
            [
                "https://api.hive.blog",
                "https://api.hivekings.com",
                "https://anyx.io",
                "https://api.openhive.network"
            ]
        );
        this.key = PrivateKey.from(process.env['POSTING_KEY'])
    }

    getContent(author: string, permlink: string): any {
        return this.client.database.call('get_content', [author, permlink]);
    }

    vote(posting_key, voter, author, permlink, weight): any {
        return this.client.broadcast.vote(
            {
                voter: voter, 
                author: author, 
                permlink: permlink, 
                weight: weight
            },
            posting_key
        );
    }

    getActiveVotes(author, permlink): any {
        return this.client.database.call('get_active_votes', [author, permlink])
    }

    streamOperations(handler): any {
        const stream = this.client.blockchain.getOperationsStream();
        return stream.on("data", handler)
    }
}
