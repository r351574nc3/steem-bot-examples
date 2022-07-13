import { Injectable, Logger } from '@nestjs/common';
import { BlockchainMode, Client, PrivateKey } from '@hiveio/dhive';
import * as Promise from 'bluebird';

@Injectable()
export class HiveService {
    client: any;
    constructor() {
        this.client = new Client('https://api.deathwing.me')
    }

    getContent(author: string, permlink: string): any {
        return Promise.resolve(this.client.database.call('get_content', [author, permlink]));
    }
    
    async getComments(query) {
        return this.client.database.call('get_discussions_by_comments', [query])
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

    async getAccounts(user): Promise {
        return this.client.database.call('get_accounts', [[ user ]])
    }

    streamOperations(handler, errors): Promise {
        const stream = this.client.blockchain.getOperationsStream();
        stream.on("data", handler)
        stream.on("error", errors)
    }
}
