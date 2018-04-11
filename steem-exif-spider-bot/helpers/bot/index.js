const EventEmitter = require('events');

const voting_queue = [];
const comment_queue = [];
const post_queue = [];

const voting = {
    length: () => { return voting_queue.length },
    push: (obj) => { return voting_queue.push(obj) },
    pop: () => { return voting_queue.pop() },
    shift: () => { return voting_queue.shift() },
    unshift: (obj) => { return voting_queue.unshift(obj) }
}

const comments = {
    length: () => { return comment_queue.length },
    includes: (author, permlink) => {
        comment_queue.filter((comment) => comment.author == author && comment.permlink == permlink).length > 0
    },
    push: (obj) => { 
        return comment_queue.push(obj) 
    },
    pop: () => { return comment_queue.pop() },
    shift: () => {
        return comment_queue.shift() 
    },
    unshift: (obj) => { return comment_queue.unshift(obj) }
}

const posts = {
    length: () => { return comment_queue.length },
    includes: (author, permlink) => {
        post_queue.filter((post) => post.author == author && post.permlink == permlink).length > 0
    },
    push: (obj) => { 
        return post_queue.push(obj) 
    },
    pop: () => { return post_queue.pop() },
    shift: () => {
        return post_queue.shift() 
    },
    unshift: (obj) => { return post_queue.unshift(obj) }
}

class FailureHandler extends EventEmitter {}
const steemFailureHandler = new FailureHandler();

function run() {
    require('./comment').execute(comments)
    require('./vote').execute(voting)
    require('./exif').execute(voting, comments, steemFailureHandler)

    steemFailureHandler.on('fail', () => {
        require('./exif').execute(voting, comments, steemFailureHandler)
    });
}


module.exports = {
    run
}