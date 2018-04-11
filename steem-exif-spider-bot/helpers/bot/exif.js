const steem = require("steem");
const Promise = require('bluebird');
const {user, wif, weight, bennies } = require('../../config');
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
let POSTS = {}

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
                "iso",
                "lensmodel",
                "lensinfo",
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
                "model",
                "focallength",
                "lightsource",
                "flash",
                "fnumber",
                "iso",
                "lensmodel",
                "lensinfo",
                "exposuretime",
                "datetime",
                "isospeedratings",
                "exposurebiasvalue",
                "whitebalance",
                "meteringmode",
                "shutterspeedvalue" 
            ].includes(key.toLowerCase())
    }, 
    copyright: (key) => {
        return (key.indexOf("opyright") > -1
                || key.indexOf("reator") > -1)
    },
    the_works: (key) => { return true}
}

function get_beneficiaries() {
    const num_beneficiaries = bennies.length
    return bennies.map((beneficiary) => {
        return {
            account: beneficiary,
            weight: 500 / num_beneficiaries
        }
    });
}

function loadTemplate(template) {
    return fs.readFileAsync(template, 'utf8')
}

function get_profiles_from(text) {
    console.log("Looking up profiles")

    return new Promise.filter(text.split("\n"), (line, index, length) => {
        return line.indexOf("@exifr") > -1 
    })
    .reduce((base, current) => Object.keys(base).length > 0 ? base : current)
    .then((command) => {
        console.log("Command ", command)
        if (!command) {
            return []
        }
        const profiles = command.split(" ")
        profiles.shift();
        return profiles;
    })
}

function profile_check(profiles, key) {
    // Default profile
    if (profiles.length < 1) {
        return exif_profiles.basics(key)
    }

    // console.log("Checking if %s includes %s", profiles, key.toLowerCase())
    if (profiles.includes(key.toLowerCase())) {
        return true
    }

    // all profiles exist
    const profile = profiles && profiles.length > 0 ? profiles[0] : null
    if (Object.keys(exif_profiles).includes(profile)) {
        return exif_profiles[profile](key)
    }

    return false
}

function handle_exif(comment, profiles, images) {
    return Promise.map(images, (image, index, length) => {
        const buffers = [];
        return got(image, {encoding: null })
            .then((response) => {
                const tags = ExifReader.load(response.body);
                tags.URL = { description: image }
                console.log("Found good exif data for ", image)
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
    .map((input) => {
        const tags = []
        
        let URL = ""

        if (!input) {
            return 
        }

        for (let key in input) {
            const value = input[key];
            if (key == "URL") {
                URL = value
                tags.push({ name: key, description: value.description })                
            }

            if (profile_check(profiles, key)) {            
                tags.push({ name: key, description: value.description })
            }
        }
        console.log("Pushing tags for ", URL)
        console.log("Tags ", tags)
        return tags
    })
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
            if (metadata.users && metadata.users.includes('r351574nc3')) {
                console.log("Found @exifr request @%s/%s", comment.author, comment.permlink)

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
        console.log("Pushing comment for ", { author: comment.author, permlink: comment.permlink})
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

function processPost(post) {
    return steem.api.getContentAsync(post.author, post.permlink)
        .then((content) => {
            if (content.json_metadata && content.json_metadata != '') {
                return JSON.parse(content.json_metadata);
            }
            return {};
        })
        .then((metadata) => {
            if (metadata.users 
                && metadata.users.includes(user)
                && post.body.indexOf('@' + user) > -1) {
                console.log("Found @exifr request @%s/%s", post.author, post.permlink)

                const start_idx = post.body.indexOf('@' + user)
                if (start_idx > -1) {
                    const end_idx = post.body.indexOf("\n", start_idx) || post.body.length - 1
                    post.body = post.body.substring(0, start_idx) + post.body.substring(end_idx + 1)
                }
                metadata.exif_profiles = get_profiles_from(post.body)
                return metadata
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
                return handle_exif(post, profiles, images);
            }
            return []
        })
        .map((tags) => {
            if (tags) {
                return updatePost(post, tags)
            }
            return
        })
        .filter((tags) => tags ? true : false)
        .then((bodies) => {
            return bodies ? bodies.pop() : undefined
        })
        .then((new_body) => {
            if (new_body) {
                console.log("Posting comment with ", new_body)
                return steem.broadcast.commentAsync(
                    wif,
                    post.parent_author, // Leave parent author empty
                    post.parent_permlink, // Main tag
                    post.author, // Author
                    post.permlink, // Permlink
                    post.title,
                    new_body, // Body
                    post.json_metadata
                ).then((results) => {
                    console.log("Comment posted: ", results)
                    const extensions = [
                        [
                            0,
                            {
                                beneficiaries: get_beneficiaries()
                            }
                        ]
                    ];
                    return steem.broadcast.commentOptionsAsync(wif, user, post.permlink, "1000000.000 SBD", 10000, true, true, extensions)
                        .then((results) => {
                            console.log("Comment Options: ", results);
                        });
                })
                .catch((err) => {
                    console.log("Error ", err.message)
                })
            }
        })
}

function convert_tags_to_markdown(tags) {
    const context = {
        tags: tags
    }

    return Promise.each(tags, (tag, index, length) => {
        if (tag.name.toLowerCase() == 'url') {
            context.url = tag.description
            tags[index] = {}
        }
    })
    .then(() => {
        return [ context.url, loadTemplate(path.join(__dirname, '..', 'templates', "post.hb"))
            .then((template) => {
                var templateSpec = Handlebars.compile(template)
                return templateSpec(context)
            })]
    })
}

function updatePost(post, tags) {
    return convert_tags_to_markdown(tags)
        .spread((url, message) => {
            console.log("Image ", url)
            return Promise.filter(post.body.match(/\!\[.*\]\(.+\)/g), (match, index, length) => {
                return match.indexOf(url) > -1
            })
            .reduce((base, current) => Object.keys(base).length > 0 ? base : current)
            .then((line) => {
                return post.body.replace(line, line + "\n\n----\n\n" + message)
            })
            /*
            .then((new_body) => {
            })*/
        })
}

function execute(voting, comments, notifier) {
    VOTING = voting
    COMMENTS = comments

    steem.api.streamOperations((err, results) => {
        if (err) {
            console.log("Unable to stream operations %s", err)
            notifier.emit("fail")
            return false
        }

        return Promise.resolve(results).spread((operation_name, operation) => {
            switch(operation_name) {
                case "comment":
                    if (operation.parent_author == '') {
                        return processPost(operation);
                    }
                    return processComment(operation);
                break;
                default:
            }
        })
        .catch((err) => {
            console.log("Some failure ", err)
        });
    });
}