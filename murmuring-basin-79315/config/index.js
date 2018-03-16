module.exports = {
    user: process.env.STEEM_NAME,
    wif: process.env.STEEM_WIF,
    weight: process.env.VOTE_WEIGHT || 500,
    waittime: process.env.WAIT_TIME || 30 * 60 * 1000,
    follow: process.env.FOLLOW_TAG || "utopian-io"
}