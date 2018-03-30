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

const exif_profiles = {
    basics: (key) => {
        return [
                "make",
                "model",
                "pixelxdimension",
                "pixelydimension",
                "focallength",
                "lightsource",
                "flash",
                "fnumber",
                "exposuretime",
                "datetime",
                "isospeedratings",
                "exposurebiasvalue",
                "exposuremode",
                "whitebalance",
                "meteringmode",
                "software",
                "exposureprogram",
                "datetimeoriginal",
                "shutterspeedvalue",
                "aperturevalue",
                "brightnessvalue",
                "focallengthin35mmfilm",
                "creatortool"       
            ].includes(key.toLowerCase())
    }, 
    minimal: (key) => {
        return [
                "make",
                "model",
                "focallength",
                "lightsource",
                "flash",
                "fnumber",
                "exposuretime",
                "datetime",
                "isospeedratings",
                "exposurebiasvalue",
                "whitebalance",
                "meteringmode",
                "datetimeoriginal",
                "shutterspeedvalue" 
            ].includes(key.toLowerCase())
    }, 
    the_works: (key) => { return true}
}

function loadTemplate(template) {
    return fs.readFileAsync(template, 'utf8')
}

function get_profiles_from(text) {
    return text.replace("@" + user, "").replace(",", " ").split(" ")
        .filter((profile) => profile && profile.trim() != "")
        .map((profile) => { return profile.toLowerCase()});
}

function profile_check(profiles, key) {
    // Default profile
    if (profiles.length < 1) {
        return exif_profiles.basics(key)
    }

    if (profiles.includes(key.toLowerCase())) {
        return true
    }

    // all profiles exist
    const profile = profiles.shift();
    if (Object.keys(exif_profiles).includes(profiles)) {
        return exif_profiles[profile](key)
    }

    return false
}

function handle_exif(comment, profiles, images) {
    console.log("Handling exif for ", images)
    return Promise.map(images, (image, index, length) => {
        const buffers = [];
        return got(image, {encoding: null })
            .then((response) => {
                const tags = ExifReader.load(response.body);
                tags.URL = { description: image, value: image }
                return tags;
            })
            .catch((error) => {
                if (error.message == "No Exif data") {
                    console.log("error ", error)
                }
                else {
                    console.log("error ", error)
                }
            });
    })
    .filter((tags) => tags ? true : false)
    .each((input) => {
        const tags = []
        let URL = ""

        if (!Object.keys(input).includes("Make")) {
            return 
        }

        for (let key in input) {
            const value = input[key];
            if (key == "URL") {
                URL = value
                tags.push({ name: key, value: value.value, description: value.description })                
            }

            if (profile_check(profiles, key)) {            
                tags.push({ name: key, value: value.value, description: value.description })
            }
        }
        console.log("Pushing tags for ", URL)
        reply(comment, tags)
    })
    .catch((error) => {
        console.log("Error ", error)
    });

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
            if (metadata.users && metadata.users.includes(user)) {
                console.log("Found @exifr request")

                if (comment.parent_author == "") {
                    metadata.exif_profiles = get_profiles_from(comment.body)
                    return metadata;
                }
                
                return steem.api.getContentAsync(comment.parent_author, comment.parent_permlink)
                    .then((content) => {
                        if (content.json_metadata && content.json_metadata != '') {
                            const metadata = JSON.parse(content.json_metadata);
                            metadata.exif_profiles = get_profiles_from(comment.body)
                            return metadata;
                        }
                        return {};
                    })
            }
            return {}
        })
        .then((metadata) => {
            if (metadata.image && metadata.image.length > 0) {
                return [metadata.exif_profiles, metadata.image]
            }
            return [];
        })
        .spread((profiles, images) => {
            if (images) {
                return handle_exif(comment, profiles, images);
            }
            return {}
        })
}

function reply(comment, tags) {
    const target = { author: comment.author, permlink: comment.permlink }
    if (comment.parent_author != "") {
        target.author = comment.parent_author
        target.permlink = comment.parent_permlink
    }

    return new Promise((resolve, reject) => {
        // console.log("Pushing comment for ", { author: comment.author, permlink: comment.permlink})
        COMMENTS.push({ author: target.author, permlink: target.permlink, tags: tags })

        resolve([ target.author, target.permlink])
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