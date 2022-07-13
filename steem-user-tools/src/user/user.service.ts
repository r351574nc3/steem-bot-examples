import { Injectable, Logger } from '@nestjs/common';
import { BlockchainMode, Client, PrivateKey } from '@hiveio/dhive';
import { HiveService } from '../hive/hive.service';
import { SteemService } from '../steem/steem.service';
import * as Promise from 'bluebird';
import * as moment from 'moment';
import * as fs from 'fs';

@Injectable()
export class UserService {
    private hiveService: HiveService;
    private steemService: SteemService;

    constructor(hiveService: HiveService,
            steemService: SteemService) {
        this.hiveService = hiveService;
        this.steemService = steemService;
    }
    

    api() {
        if (process.env.BLOCKCHAIN === 'HIVE') {
            return this.hiveService
        }
        return this.steemService
    }

    async getMaxMana(accountData): Promise {
        const totalShares = parseFloat(accountData.vesting_shares) + parseFloat(accountData.received_vesting_shares) - parseFloat(accountData.delegated_vesting_shares)
        return totalShares * 1000000
    }

    run() {
        const username = process.argv[2]
        this.api().getAccounts(username)
            .then((accounts) => {
                const account = accounts[0]
                const max_mana = this.getMaxMana(account)
            })
    }
}
