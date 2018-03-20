const steem = require("steem");
const Promise = require('bluebird');
const {user, wif, weight } = require('../../config');
global.DataView = require('jdataview');
global.DOMParser = require('xmldom').DOMParser;
const ExifReader = require("exifreader");
const http = require('http');
const got = require('got');
const fs = Promise.promisifyAll(require("fs"));
const path = require("path");
const tempfile = require("tempfile");
const Handlebars = require("handlebars");

const Stream = require('stream').Transform

module.exports = {
    execute
}

function loadTemplate(template) {
    return fs.readFileAsync(template, 'utf8')
}

function processComment(comment) {
    return steem.api.getContentAsync(comment.author, comment.permlink)
        .then((content) => {
            if (content.json_metadata && content.json_metadata != '') {
                return JSON.parse(content.json_metadata);
            }
            return {};
        })
        .then((metadata) => {
            if (metadata.image && metadata.image.length > 0) {
                return metadata.image;
            }
            return [];
        })
        .each((image) => {
            if (image.indexOf(".jpg") > -1|| image.indexOf(".JPG") > -1) {
                const dest = tempfile('.jpg');
                try {
                    got.stream(image).pipe(fs.createWriteStream(dest))
                        .on('close', () => {
                            try {
                                const input = ExifReader.load(fs.readFileSync(dest));
                                const tags = []
                                for (let key in input) {
                                    const value = input[key];
                                    if (key.indexOf("Make") > -1
                                        || key.indexOf("Model") > -1
                                        || key.indexOf("oftware") > -1
                                        || key.indexOf("ISO") > -1
                                        || key.indexOf("xposure") > -1
                                        || key.indexOf("ate") > -1
                                        || key.indexOf("FNumber") > -1
                                        || key.indexOf("Aperture") > -1 
                                        || key.indexOf("GPS") > -1
                                        || key.indexOf("utter") > -1
                                        || key.indexOf("ocal") > -1
                                        || key.indexOf("alance") > -1
                                        || key.indexOf("eter") > -1
                                        || key.indexOf("lash") > -1
                                        || key.indexOf("ool") > -1) {
                                        tags.push({ name: key, value: value.value, description: value.description })
                                    }
                                }

                                reply(comment, tags)
                            }
                            catch(err) {
                                if (err.message == "No Exif data") {

                                }
                            }
                        })
                }
                catch (err) {
                    console.log("Error ", err)
                }
                finally {
                    fs.unlink(dest, (err) => {
                        // file deleted
                    });
                }
            }
        })
        .catch((error) => {
            console.log("Error ", error)
        });
}

function reply(comment, tags) {
    const context = {
        poster: comment.author,
        tags: tags
    }


    return loadTemplate(path.join(__dirname, '..', 'templates', 'exif.hb'))
    .then((template) => {
        var templateSpec = Handlebars.compile(template)
        return templateSpec(context)
    })
    .then((body) => {
        console.log("Body ", body)
        return body;
    })
    .then((body) => {
        var permlink = 're-' + comment.author 
            + '-' + comment.permlink 
            + '-' + new Date().toISOString().replace(/[^a-zA-Z0-9]+/g, '').toLowerCase();

        console.log("Replying to ", {author: comment.author, permlink: comment.permlink})
        return steem.broadcast.commentAsync(
            wif,
            comment.author, // Leave parent author empty
            comment.permlink,
            user, // Author
            permlink, // Permlink
            permlink, // Title
            body, // Body
            { "app": "steem-exif-spider-bot/0.1.0" }
        )
        .catch((err) => {
            console.log("Unable to process comment. ", err)
        })
    })
    .then((response) => {
        return steem.broadcast.voteAsync(wif, user, comment.author, comment.permlink, weight)
            .then((results) =>  {
                console.log(results)
            })
            .catch((err) => {
                console.log("Vote failed: ", err)
            })
    })
    .catch((err) => {
        console.log("Error loading template ", err)
    })
}

function execute() {

    steem.api.streamOperations((err, results) => {
        return new Promise((resolve, reject) => {
            if (err) {
                console.log("Unable to stream operations %s", err)
                return reject(err)
            }
            return resolve(results) // results [ "operation name", operation:{} ]
        })
        .spread((operation_name, operation) => {
            switch(operation_name) {
                case "comment":
                    return processComment(operation);
                break;
                default:
            }
        })
        .catch((err) => {
            // Probably lost connection with websocket. Restart communication.
            execute();
        });
    });
}