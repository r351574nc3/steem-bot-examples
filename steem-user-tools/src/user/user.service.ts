import { Injectable } from '@nestjs/common';
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

}
