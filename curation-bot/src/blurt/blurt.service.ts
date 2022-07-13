import { Injectable, Logger } from '@nestjs/common';
import * as blurt from '@blurtfoundation/blurtjs';
import * as Promise from 'bluebird';

@Injectable()
export class BlurtService {
    constructor() {
        blurt.api.setOptions({ url: "https://blurtrpc.actifit.io"})
    }

    async getContent(author: string, permlink: string): Promise<any> {
        return blurt.api.getContentAsync(author, permlink)
    }

    getComments(query): any {
        return blurt.api.getDiscussionsByCommentsAsync(query)
    }

    async vote(posting_key, voter, author, permlink, weight): Promise<any> {
        return null
    }

    getActiveVotes(author, permlink): any {
        return blurt.api.getActiveVotesAsync(author, permlink)
    }


    streamOperations(handler) {
        blurt.api.streamOperations('head', handler)
    }
}
