const steem = require("steem");
const Promise = require("bluebird");
const { user, wif, weight, waittime, follow } = require("../../config")

/**
 * comment: {
 *  parent_author: "", // voter
 *  parent_permlink: "", // voter
 *  author: "r351574nc3", // author
 *  permlink: "introduction", // permlink
 *  body: "blah" // body of comment
 * }
 */
function processComment(comment) {
    return steem.api.getContentAsync(comment.author, comment.permlink)
        .then((content) => {
            if (content.json_metadata && content.json_metadata != '') {
                return content.json_metadata;
            }
            Promise.reject("No tags")
        })
        .then((metadata_str) => {
            const metadata = JSON.parse(metadata_str);
            if (metadata.tags.includes(follow)) {
                return setTimeout((comment) => {
                    return upvote(comment.author, comment.permlink)
                },
                waittime,
                comment)
            }
        })
        .catch((err) => {
            // no tags, do nothing
        })
}

function upvote(author, permlink) {
    return steem.broadcast.vote(wif, user, author, permlink, weight)
        .then((results) => {
            console.log(results)
        })
        .catch((err) => {
            return setTimeout((comment) => {
                return upvote(comment.author, comment.permlink)
            },
            waittime,
            comment)
        })
}

function execute() {
    steem.api.streamOperations((err, results) => {
        return new Promise((resolve, reject) => {
            if (err) {
                reject(err)
            }
            resolve(results) // results [ "operation name", operation:{} ]
        })
        .spread((name, operation) => {
            switch(name) {
                case "comment":
                    processComment(operation)
                break;
                default:

            }
        })
        .catch((err) => {
            console.log("Bot died. Restarting ... ", err)
            execute(); // restart bot since it died
        })
    });
}

module.exports = {
    execute
}