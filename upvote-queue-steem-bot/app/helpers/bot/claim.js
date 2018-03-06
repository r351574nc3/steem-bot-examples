'use strict'

const steem = require('steem')
const {user, wif } = require('../../config')

module.exports = {
    execute
}

/** 
 * Claims reward balance
 * Invokes the following API
 * {
 *    "roles": ["posting", "active", "owner"],
 *    "operation": "claim_reward_balance",
 *    "params": [
 *      "account",
 *      "reward_steem",
 *      "reward_sbd",
 *      "reward_vests"
 *    ]
 * }
 */
function execute() {
    return steem.api.getAccountsAsync([ user ])
        .map((account) => {
            return {
                name: account.name,
                sbd: parseFloat(account.reward_sbd_balance),
                steem: parseFloat(account.reward_steem_balance),
                sp: parseFloat(account.reward_vesting_balance)
            }
        })
        .filter((account) => account.sbd > 0 || account.sp > 0)
        .each((account) => {
            console.log("Account %s", JSON.stringify(account));
            return steem.broadcast.claimRewardBalanceAsync(wif, user, account.steem, account.sbd, account.sp)
                .then((results) => {
                    console.log("Claim balance %s", JSON.stringify(results));
                })
                .catch((err) => {
                    console.log("Unable to claim reward balance %s", JSON.stringify(err));
                }) 
        });
}