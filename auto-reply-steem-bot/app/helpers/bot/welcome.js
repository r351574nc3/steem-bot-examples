'use strict'

const Promise = require('bluebird')
const steem = Promise.promisifyAll(require('steem'))
const config = require('../../config')
const sleep = require('sleep')


module.exports = {
    execute
}

var cache = []

function in_cache(permlink) {
    return cache.filter((cachelink) => cachelink == permlink).length > 0
}


class Handler {
    constructor(handlerdef) {
        this.criteria = handlerdef.test
        this.meme = handlerdef.meme
    }

    test(comment) {
        var retval = -1
        this.criteria.some((match) => { 
            var check = comment.indexOf(' ' + match)
            if (check > -1) {
                retval = check
                return true
            }
            return false
        })
        return retval
    }

    excerpt(comment) {
        var index = this.test(comment.toLowerCase())
        var endidx = comment.indexOf(' ', index + 1)

        if (endidx < 0) {
            endidx = comment.length
        }

        if (index > 30) {
            var startidx = comment.indexOf(' ', index - 30)
            return comment.substring(startidx, endidx)
        }
        return comment.substring(0, endidx)
    }

    response(comment) {
        var excerpt = this.excerpt(comment)
        var message = "> " + excerpt + "\n\n"
            + "![](" + this.meme + ")"
        return message
    }
}

class Parent {
    constructor(comment_json) {
        this.author = comment_json.parent_author
        this.permlink = comment_json.parent_permlink
    }
}

class Comment {
    constructor(comment_json) {
        this.parent = new Parent(comment_json)
        this.title = comment_json.title
        this.author = comment_json.author
        this.permlink = comment_json.permlink
        this.body = comment_json.body
        this.url = this.reconstruct_url(comment_json)
    }

    reconstruct_url(comment) {
        var prefix = 'https://www.steemit.com'

        // get first tag
        if (comment.parent_author != '') {
            prefix = prefix + '/@' + comment.parent_author
        }
        else {
            prefix = prefix + '/@' + comment.author
        }

        if (comment.parent_permlink != '') {
            prefix = prefix + '/' + comment.parent_permlink
        }
        else {
            prefix = prefix + '/' + comment.permlink
        }
        return prefix
    }

    is_reply() {
        return this.parent.permlink != '' && this.title == ''
    }

    process() {
        if (this.parent.author == user) {
            
        }
    }
}

function handle(comment, handler) {
    var permlink = 're-' + comment.author 
        + '-' + comment.permlink 
        + '-' + new Date().toISOString().replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
    var user = config.user
    var wif = config.wif 

    if (in_cache(comment.permlink)) {
        return
    }

    if (cache.length > 200) {
        cache = []
    }

    cache.push(comment.permlink)

    // sleep.sleep(1)
    // Check if we already put a reply on the exact same post
    steem.api.getContentRepliesAsync(comment.author, comment.permlink).then((result) => {
        return result.filter((reply) => reply.author == user).length > 0
    }).then((result) => {
        if (result) {
            console.log("Rejecting post ")
            return Promise.reject('Duplicate post')
        }

        console.log("parent: ", comment.parent)
        console.log("author: ", comment.author)
        console.log("permlink: ", comment.permlink)
        console.log("newlink: ", permlink)
        steem.broadcast.commentAsync(
            wif,
            comment.author, // Leave parent author empty
            comment.permlink,
            user, // Author
            permlink, // Permlink
            permlink, // Title
            handler.response(comment.body), // Body
            { "app": "auto-meme-steem-bot/0.1.0" }
        ).then((result) => {
            console.log(result)
            sleep.sleep(120)
        }).catch((err) => {
            console.log("Unable to process comment. ", err)
            console.log("Bad comment: ", comment)
        })
    }).catch((err) => {
        console.log("Skipping ", permlink, err)
    })
}

/**
 * Stream replies and upvotes. If someone replies to a reply, upvote them. If they reply and previously upvoted, upvote. 
 * If they upvote and previously replied, upvote. Respond with, "you're welcome"
 */

function execute() {
    steem.api.streamOperations('head', (err, result) => {
        var user = config.user
        if (result && result.length > 0) {
            var operation_name = result[0]

            switch(operation_name) {
                case 'comment':
                    var comment = new Comment(result[1])
                    comment.process()
                    break
                case 'vote':
                    console.log(result[1])
                    break
                default:
                    console.log("Unsupported operation ", result[0])
                    break
            }
        }
    })
}