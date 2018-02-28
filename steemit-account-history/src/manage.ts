// import * as Promise from "bluebird";
import * as steem from "steem";
import { user, wif } from "./config";
import * as moment from "moment";
import * as Handlebars from "handlebars";
import * as Nodefs from "fs";
import * as path from "path";
import * as sc2 from "sc2-sdk";
import * as base64 from "base-64";
import * as jwt from "jsonwebtoken";

async function find_last_record(user: string): Promise<number> {
    let retval = 0;
    await steem.api.getAccountHistoryAsync(user, Number.MAX_SAFE_INTEGER, 1)
        .then((history: any[]) => {
            const record = history[0];
            retval = record[0];
        });
    return retval;
}

async function* seek(user: string, date: string): any {
    const step = 1000;
    const retval: any[] = [];
    let end = 0;
    await find_last_record(user).then((result: number) => {
        end = result;
    });

    for (let start = step; start < end; start = start + step) {
        await steem.api.getAccountHistoryAsync(user, start, step)
            .each((history: any[]) => {
                if (!history || history.length < 1) {
                    return;
                }
                const record = history[1];
                const on_date = moment(date);
                const ts = moment(record.timestamp);
                if (ts.startOf("day").isAfter(on_date.startOf("day"))) {
                    retval.push(record);
                }
            });
    }
    yield* retval;
}

async function main() {
    const result = seek("anonsteem", "2017-10-11");
    for await (const item of result) {
        console.log("Record %s", JSON.stringify({ operation: item.op[0], timestamp: item.timestamp }));
        // console.log("Record %s", JSON.stringify(item));
    }
}

main();
