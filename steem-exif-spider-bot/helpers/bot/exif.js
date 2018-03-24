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
            if (metadata.image && metadata.image.length > 0) {
                return metadata.image;
            }
            return [];
        })
        .map((image) => {
            if (image.indexOf(".jpg") > -1 || image.indexOf(".JPG") > -1) {
                const buffers = [];
                return got(image, {encoding: null })
                    .then((response) => {
                        console.log("Loading ", image);
                        return ExifReader.load(response.body);
                    })
                    .catch((error) => {
                        if (err.message == "No Exif data") {

                        }
                    });
            }
        })
        .filter((tags) => tags ? true : false)
        .each(input => {
            const tags = []
            for (let key in input) {
                const value = input[key];
                if (key != "MakerNote"
                    && key.indexOf("undefined") < 0
                    && key.indexOf("omment") < 0
                    && key.indexOf("ersion") < 0) {
                    tags.push({ name: key, value: value.value, description: value.description })
                }
            }
            reply(comment, tags)
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
        console.log("Replying to ", {author: comment.author, permlink: comment.permlink})
        COMMENTS.push({ author: comment.author, permlink: comment.permlink })

        return [ comment.author, comment.permlink]
    })
    .spread((author, permlink) => {
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