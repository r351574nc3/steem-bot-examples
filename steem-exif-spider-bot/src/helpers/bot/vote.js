const Promise = require('bluebird')
const steem = require('steem')
const { user, wif, weight } = require('../../config')
const schedule = require('node-schedule')
const moment = require('moment');

const MINUTE = new schedule.RecurrenceRule();
MINUTE.second = 1

const SECONDS_PER_HOUR = 3600
const PERCENT_PER_DAY = 20
const HOURS_PER_DAY = 24
const MAX_VOTING_POWER = 10000
const DAYS_TO_100_PERCENT = 100 / PERCENT_PER_DAY
const SECONDS_FOR_100_PERCENT = DAYS_TO_100_PERCENT * HOURS_PER_DAY * SECONDS_PER_HOUR
const RECOVERY_RATE = MAX_VOTING_POWER / SECONDS_FOR_100_PERCENT
const DEFAULT_THRESHOLD = 9500


function current_voting_power(vp_last, last_vote) {
    console.log("Comparing %s to %s ", moment().utc().add(7, 'hours').local().toISOString(), moment(last_vote).utc().local().toISOString())

    var seconds_since_vote = moment().utc().local().diff(moment(last_vote).utc().local(), 'seconds')
    return (RECOVERY_RATE * seconds_since_vote) + vp_last
}

function time_needed_to_recover(voting_power, threshold) {
    return (threshold - voting_power) / RECOVERY_RATE
}

function check_can_vote() {
    return steem.api.getAccountsAsync([ user]).then((accounts) => {
        if (accounts && accounts.length > 0) {
            const account = accounts[0];
            console.log("Voting threshold for %s: %s", user, DEFAULT_THRESHOLD)
            console.log("Getting voting power for %d %s", account.voting_power, account.last_vote_time + "Z")
            var voting_power = current_voting_power(account.voting_power, account.last_vote_time)
            if (voting_power > DEFAULT_THRESHOLD) {
                return true;
            }
        }
        return false;
    })
}

function vote(author, permlink, weight) {
    return steem.broadcast.voteAsync(
        wif, 
        user, 
        author,
        permlink,
        weight
    )
    .then((results) =>  {
        console.log("Vote results: ", results)
        return results;
    },
    (err) => {
        console.log("Vote failed for %s: %s", user, err.message)
    })
}

function execute(voting) {
    schedule.scheduleJob(MINUTE, function() {
        if (voting.length() < 1) {
            return {};
        }
               
        const { author, permlink, weight } = voting.shift();

        return check_can_vote().then((can_vote) => {
            if (can_vote) {
                vote(author, permlink, weight)
            }
            else {
                voting.push({ author, permlink, weight })
            }
        })
    })
}

module.exports = {
    execute
}
