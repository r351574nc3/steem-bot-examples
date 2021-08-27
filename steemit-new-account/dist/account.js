"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const steem = require("steem");
const config_1 = require("./config");
function generate_keys(account, password, role) {
    const private_key = steem.auth.toWif(account, password, role);
    const public_key = steem.auth.wifToPublic(private_key);
    return { private_key: private_key, public_key: public_key };
}
function createAccount(account_name, password) {
    return new Promise((resolve, reject) => {
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
        .then((results) => {
        const { owner_kp, active_kp, posting_kp, memo_kp } = results;
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
        .then((results) => {
        const { owner, active, posting, memo_kp } = results;
        return steem.broadcast.accountCreateAsync(config_1.wif, "3.001 STEEM", config_1.user, account_name, owner, active, posting, memo_kp.public_key, "")
            .then((result) => {
            console.log(result);
        })
            .catch((error) => {
            console.log("Unable to create account because of ", JSON.stringify(error));
        });
    })
        .catch((error) => {
        console.log("Something catastrophic happened ", error);
    });
}
function changeKeys(account_name, oldkey, newkey) {
    return new Promise((resolve, reject) => {
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
        .then((results) => {
        const { owner_kp, active_kp, posting_kp, memo_kp } = results;
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
        .then((results) => {
        const { owner, active, posting, memo_kp } = results;
        return steem.broadcast.accountCreateAsync(config_1.wif, "3.001 STEEM", config_1.user, account_name, owner, active, posting, memo_kp.public_key, "")
            .then((result) => {
            console.log(result);
        })
            .catch((error) => {
            console.log("Unable to create account because of ", JSON.stringify(error));
        });
    })
        .catch((error) => {
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
    steem.api.getAccountsAsync([account])
        .map((userAccount) => {
        const updatedAuthority = userAccount.active;
        /** Release callback if the key already exist in the key_auths array */
        const authorizedKeys = updatedAuthority.key_auths.map((auth) => auth[0]);
        console.log("Authorized keys ", authorizedKeys);
        // const hasAuthority = authorizedKeys.indexOf(authorizedKey) !== -1;
    });
}
main();
//# sourceMappingURL=account.js.map