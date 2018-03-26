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

let VOTING = {}
let COMMENTS = {}

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
            if ((metadata.tags && (metadata.tags.includes("photofeed")
                                    || metadata.tags.includes("photography")))
                && metadata.image && metadata.image.length > 0) {
                return metadata.image;
            }
            return [];
        })
        .map((image) => {
            if (image.indexOf(".jpg") > -1 || image.indexOf(".JPG") > -1) {
                const buffers = [];
                return got(image, {encoding: null })
                    .then((response) => {
                        const tags = ExifReader.load(response.body);
                        tags.URL = { description: image, value: image }
                        return tags;
                    })
                    .catch((error) => {
                        if (error.message == "No Exif data") {

                        }
                        else {
                            console.log("error ", error)
                        }
                    });
            }
        })
        .filter((tags) => tags ? true : false)
        .each((input) => {
            const tags = []
            let URL = ""
            for (let key in input) {

                const value = input[key];
                if (key == "URL") {
                    URL = input[key]
                }

                if (key != "MakerNote"
                    && key.indexOf("undefined") < 0
                    && key.indexOf("omment") < 0
                    && key.indexOf("ersion") < 0) {
                    tags.push({ name: key, value: value.value, description: value.description })
                }
            }
            if (tags.length > 5) {
                console.log("Pushing tags for ", URL)
                reply(comment, tags)
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

    return new Promise((resolve, reject) => {
        // console.log("Pushing comment for ", { author: comment.author, permlink: comment.permlink})
        COMMENTS.push({ author: comment.author, permlink: comment.permlink, tags: tags })

        resolve([ comment.author, comment.permlink])
    })
    .spread((author, permlink) => {
        console.log("Pushing vote for ", { author: author, permlink: permlink, weight: weight })
        VOTING.push({ author: author, permlink: permlink, weight: weight });
    })
    .catch((err) => {
        console.log("Error loading template ", err)
    })
}

function execute(voting, comments) {
    VOTING = voting
    COMMENTS = comments

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
                    if (operation.parent_author == '') {
                        return processComment(operation);
                    }
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