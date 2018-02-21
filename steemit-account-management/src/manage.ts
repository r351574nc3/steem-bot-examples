import * as Promise from "bluebird";
import * as steem from "steem";
import { user, wif } from "./config";
import * as moment from "moment";
import * as Handlebars from "handlebars";
import * as Nodefs from "fs";
import * as path from "path";
import * as sc2 from "sc2-sdk";
import * as base64 from "base-64";
import * as jwt from "jsonwebtoken";


/*
const api = sc2.Initialize({
    app: "we-resist",
    callbackURL: "https://we-resist-bot.herokuapp.com/",
    accessToken: "Basic " + base64.encode(`we-resist:${key}`),
    scope: ["vote", "comment"]
  });

 const api = sc2.Initialize({
    app: "sylveon",
    callbackURL: "http://localhost:3000/",
    accessToken: "Basic " + base64.encode(`sylveon:${key}`),
    scope: ["vote", "comment"]
  });

  const issueUserToken = (user: any) => (
    jwt.sign(
      { role: "user", user },
      process.env.JWT_SECRET
    )
  );

const token = issueUserToken("sylveon");
console.log("token %s", token);


const decoded = jwt.verify(token, process.env.JWT_SECRET);
console.log("Decoded %s", JSON.stringify(decoded));

*/

interface KeyPair {
    private_key: string;
    public_key: string;
}

function generate_keys(account: string, password: string, role: string): KeyPair {
    const private_key = steem.auth.isWif(password) ? password : steem.auth.toWif(account, password, role);
    const public_key = steem.auth.wifToPublic(private_key);
    return { private_key: private_key, public_key: public_key };
}

function recoverAccount(accountToRecover: string, oldPassword: string, newPassword: string) {
    return new Promise((resovle, reject) => {
        const old_owner_keypair = generate_keys(accountToRecover, oldPassword, "owner");
        const new_owner_keypair = generate_keys(accountToRecover, newPassword, "owner");
        const new_active_keypair = generate_keys(accountToRecover, newPassword, "active");
        const new_posting_keypair = generate_keys(accountToRecover, newPassword, "posting");
        const new_memo_keypair = generate_keys(accountToRecover, newPassword, "memo");

        const newOwnerAuthority = {
            weight_threshold: 1,
            account_auths: [["r351574nc3", 1]],
            key_auths: [[new_owner_keypair.public_key, 1]],
          };

        const recent_owner_account_auths: any = [];
        const recentOwnerAuthority = {
            weight_threshold: 1,
            account_auths: recent_owner_account_auths,
            key_auths: [[old_owner_keypair.public_key, 1]],
        };

        steem.broadcast.sendAsync({
            extensions: [],
            operations: [
              ["recover_account", {
                account_to_recover: accountToRecover,
                new_owner_authority: newOwnerAuthority,
                recent_owner_authority: recentOwnerAuthority,
              }],
            ]
        },
        [
            old_owner_keypair.private_key,
            new_owner_keypair.private_key
        ])
        .then((results: any) => {
            console.log("Results %s", JSON.stringify(results));

            return steem.broadcast.sendAsync({
                extensions: [],
                operations: [
                  ["account_update", {
                    account: accountToRecover,
                    active: { weight_threshold: 1, account_auths: [], key_auths: [[new_active_keypair.public_key, 1]] },
                    posting: { weight_threshold: 1, account_auths: [], key_auths: [[new_posting_keypair.public_key, 1]] },
                    memo_key: new_memo_keypair.public_key,
                    json_metadata: ""
                  }],
                ]
            },
            [
                new_owner_keypair.private_key
            ]);
        },
        (error: any) => {
            console.log("Error %s", JSON.stringify(error));
        });
      });
}

function requestAccountRecovery(accountToRecover: string, newPassword: string) {
    const new_owner_keypair = generate_keys(accountToRecover, newPassword, "owner");
    const newOwnerAuthority = {
        weight_threshold: 1,
        account_auths: [["r351574nc3", 1]],
        key_auths: [[new_owner_keypair.public_key, 1]],
      };

    return steem.broadcast.requestAccountRecoveryAsync(wif, user, accountToRecover, newOwnerAuthority, [])
        .then((results: any) => {
            console.log("Results %s", JSON.stringify(results));
        },
        (error: any) => {
            console.log("Unable to request recovery 1 %s", JSON.stringify(error));
        });
}

function accountHistory(user: string, date: string) {
    return steem.api.getAccountHistoryAsync(user, -1, 10000)
        .each((history: any[]) => {
            const item = history[1];
            const on_date = moment(date);
            const ts = moment(item.timestamp);
            console.log("Comparing %s to %s", ts.toString(), on_date.toString());
            console.log("History %s", JSON.stringify(history));
            /*
            if (ts.startOf("day").isSame(on_date.startOf("day"))) {
                console.log("History %s", JSON.stringify(item));
            }*/
        });
}


/*
class AccountHistory {
    constructor(user: string, date: string) {
        const iterator = this.generator(10);
        iterator.next();
    }
    *generator(count:number): IterableIterator<number> {

    }
}
*/

function *find_first_tx_on(user: string, date: string): any {
    const buffer = 100;
    for (let idx = 100; idx < 10000; idx = idx + 100) {
        steem.api.getAccountHistoryAsync(user, idx, buffer)
            .each((history: any[]) => {
                if (history && history.length > 0) {
                    const record = history[1];
                    const item = record[1];
                    console.log(JSON.stringify(record));
                    return item;
                }
            });
    }
}

const result = find_first_tx_on("busy.app", "2017-10-11");
for (const item of result) {
    item.then((history: any) => {
        console.log("Got %s", JSON.stringify({ operation: history.op[0], timestamp: history.timestamp }));
    });
}

// accountHistory("anonsteem", "2017-10-11");

/*
requestAccountRecovery("sylveon", "P5JAooMaSP8Z9VnVov8xZQXaJR8rvzXFxTzPgKLsyqw2Qwo8bPm8")
    .catch((error: any) => {
        console.log("Unable to request recovery %s", JSON.stringify(error));
    });

recoverAccount("sylveon", "P5JAooMaSP8Z9VnVov8xZQXaJR8rvzXFxTzPgKLsyqw2Qwo8bPm8", "P5JispxHka6g6a2tDfd1uBAD7N3zZ4c24KoCGAwaBxXeGcQPJUEv")
    .catch((error: any) => {
        console.log("Couldn't recover account %s", JSON.stringify(error));
    });
*/


    // console.log("Generate private key %s", JSON.stringify(generate_private_key("sylveon", "P5JAooMaSP8Z9VnVov8xZQXaJR8rvzXFxTzPgKLsyqw2Qwo8bPm8", "owner")));

/*
api.setAccessToken("c3lsdmVvbjowODEzMDQzNjc0MzE1N2JmMzhkYWViZjk4ODRkZTFhNTQ5NTNjODA4ZTMzMWUwNmE=");

console.log("Basic " + base64.encode(`sylveon:${key}`));

api.send("oauth2/token", "POST", { client_id: "sylveon", client_secret: key })
    .then((results: any) => {
        console.log("Me %s", JSON.stringify(results));
    })
    .catch((err: any) => {
        console.log("Failed %s", JSON.stringify(err));
    });
*/
/*
api.me().then((result: any) => {
    console.log("Me: %s", JSON.stringify(result));
})
.catch((err: any) => {
    console.log("Something went wrong %s", err);
});
*/