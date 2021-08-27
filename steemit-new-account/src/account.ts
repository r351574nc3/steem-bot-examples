import * as steem from "steem";
import { user, wif } from "./config";
import * as moment from "moment";
import * as Nodefs from "fs";
import * as path from "path";
import * as sc2 from "sc2-sdk";
import * as base64 from "base-64";
import * as jwt from "jsonwebtoken";



interface KeyPair {
    private_key: string;
    public_key: string;
}

function generate_keys(account: string, password: string, role: string): KeyPair {
    const private_key = steem.auth.toWif(account, password, role);
    const public_key = steem.auth.wifToPublic(private_key);
    return { private_key: private_key, public_key: public_key };
}

function createAccount(account_name: string, password: string ) {
    return new Promise((resolve: any, reject: any) => {
        const new_owner_keypair = generate_keys(account_name, password, "owner");
        const new_active_keypair = generate_keys(account_name, password, "active");
        const new_posting_keypair = generate_keys(account_name, password, "posting");
        const new_memo_keypair = generate_keys(account_name, password, "memo");

        const retval = {
            owner_kp: new_owner_keypair,
            active_kp: new_active_keypair,
            posting_kp: new_posting_keypair,
            memo_kp: new_memo_keypair
        };
        console.log("Generated keys ", JSON.stringify(retval));
        resolve(retval);
    })
    .then((results: any) => {
        const {owner_kp, active_kp, posting_kp, memo_kp} = results;


        const owner_auth = {
            weight_threshold: 1,
            account_auths: [["r351574nc3", 1]],
            key_auths: [[owner_kp.public_key, 1]],
          };
          const posting_auth = {
            weight_threshold: 1,
            account_auths: [["r351574nc3", 1]],
            key_auths: [[owner_kp.public_key, 1]],
          };
          const active_auth = {
            weight_threshold: 1,
            account_auths: [["r351574nc3", 1]],
            key_auths: [[owner_kp.public_key, 1]],
          };

          console.log("owner_auth ", JSON.stringify(owner_auth));
          console.log("posting_auth ", JSON.stringify(posting_auth));
          console.log("active_auth ", JSON.stringify(active_auth));
          console.log("memo_auth ", JSON.stringify(memo_kp));

          return {
              owner: owner_auth,
              active: active_auth,
              posting: posting_auth,
              memo_kp
          };
    })
    .then((results: any) => {
        const {owner, active, posting, memo_kp} = results;

        return steem.broadcast.accountCreateAsync(wif, "3.001 STEEM", user, account_name, owner, active, posting, memo_kp.public_key, "")
            .then((result: any) =>  {
                console.log(result);
            })
            .catch((error: any) => {
                console.log("Unable to create account because of ", JSON.stringify(error));
            });
    })
    .catch((error: any) => {
        console.log("Something catastrophic happened ", error);
    });
}

function changeKeys(account_name: string, oldkey: string, newkey: string) {
    return new Promise((resolve: any, reject: any) => {
        const new_owner_keypair = generate_keys(account_name, newkey, "owner");
        const new_active_keypair = generate_keys(account_name, newkey, "active");
        const new_posting_keypair = generate_keys(account_name, newkey, "posting");
        const new_memo_keypair = generate_keys(account_name, newkey, "memo");

        const retval = {
            owner_kp: new_owner_keypair,
            active_kp: new_active_keypair,
            posting_kp: new_posting_keypair,
            memo_kp: new_memo_keypair
        };
        console.log("Generated keys ", JSON.stringify(retval));
        resolve(retval);
    })
    .then((results: any) => {
        const {owner_kp, active_kp, posting_kp, memo_kp} = results;


        const owner_auth = {
            weight_threshold: 1,
            account_auths: [["r351574nc3", 1]],
            key_auths: [[owner_kp.public_key, 1]],
          };
          const posting_auth = {
            weight_threshold: 1,
            account_auths: [["r351574nc3", 1]],
            key_auths: [[owner_kp.public_key, 1]],
          };
          const active_auth = {
            weight_threshold: 1,
            account_auths: [["r351574nc3", 1]],
            key_auths: [[owner_kp.public_key, 1]],
          };

          console.log("owner_auth ", JSON.stringify(owner_auth));
          console.log("posting_auth ", JSON.stringify(posting_auth));
          console.log("active_auth ", JSON.stringify(active_auth));
          console.log("memo_auth ", JSON.stringify(memo_kp));

          return {
              owner: owner_auth,
              active: active_auth,
              posting: posting_auth,
              memo_kp
          };
    })
    .then((results: any) => {
        const {owner, active, posting, memo_kp} = results;

        return steem.broadcast.accountCreateAsync(wif, "3.001 STEEM", user, account_name, owner, active, posting, memo_kp.public_key, "")
            .then((result: any) =>  {
                console.log(result);
            })
            .catch((error: any) => {
                console.log("Unable to create account because of ", JSON.stringify(error));
            });
    })
    .catch((error: any) => {
        console.log("Something catastrophic happened ", error);
    });
}

function main() {
    /*
    if (process.argv[2] && process.argv[3]) {
        (async () => {
            return await createAccount(process.argv[2], process.argv[3]);
        })();
    }
    */
    const account = process.argv[2];
    const oldk = process.argv[3];
    const newk = process.argv[4];

    if (process.argv[2] && process.argv[3] && process.argv[4]) {
        /*
        const account = process.argv[2]
        const oldk = process.argv[3]
        const newk = process.argv[4]
        */
    }

    steem.api.getAccountsAsync([ account ])
        .map((userAccount: any) => {
            const updatedAuthority = userAccount.active;
            /** Release callback if the key already exist in the key_auths array */
            const authorizedKeys = updatedAuthority.key_auths.map((auth: any) => auth[0]);
            console.log("Authorized keys ", authorizedKeys);
            // const hasAuthority = authorizedKeys.indexOf(authorizedKey) !== -1;
        });
}

main();