const Promise = require('bluebird')
const steem = require('steem')
const { user, wif, weight } = require('../../config')
const schedule = require('node-schedule')
const Handlebars = require('handlebars')
const fs = Promise.promisifyAll(require('fs'))
const path = require('path')

const MINUTE = new schedule.RecurrenceRule();
MINUTE.second = 1

function loadTemplate(template) {
    return fs.readFileAsync(template, 'utf8')
}


function execute(comments) {
    schedule.scheduleJob(MINUTE, function() {

        if (comments.length() < 1) {
            return {};
        }

        const { author, permlink, tags } = comments.shift();
        var context = {
            tags: tags
        }

        Promise.each(tags, (tag, index, length) => {
            if (tag.name.toLowerCase() == 'url') {
                context.url = tag.description
                tags[index] = {}
            }
        })
        .then(() => {
            return loadTemplate(path.join(__dirname, '..', 'templates', "exif.hb"))
                .then((template) => {
                    var templateSpec = Handlebars.compile(template)
                    return templateSpec(context)
                })
                .then((message) => {
                    var new_permlink = 're-' + author 
                        + '-' + permlink 
                        + '-' + new Date().toISOString().replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();
                    console.log("Commenting on ", author, permlink)

                    return steem.broadcast.commentAsync(
                        wif,
                        author, // Leave parent author empty
                        permlink, // Main tag
                        user, // Author
                        new_permlink, // Permlink
                        new_permlink,
                        message, // Body
                        { tags: [], app: "steemit-exif-spider-bot/0.1.0" }
                    ).then((results) => {
                        console.log(results)
                        return results
                    })
                    .catch((err) => {
                        console.log("Error ", err.message)
                    })
                })
            })
    })
}

module.exports = {
    execute
}
    