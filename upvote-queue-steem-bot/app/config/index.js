config = {
    user: process.env.STEEM_NAME || "YOU NEED TO FILL THIS IN ICEHOLE",
    wif: process.env.STEEM_WIF || "YOU NEED TO FILL THIS IN ICEHOLE",
    weight: process.env.DEFAULT_UPVOTE_WEIGHT || 500,
    threshold: process.env.VOTING_THRESHOLD || 9250,
    steemit_url: "https://www.steemit.com"
}


module.exports = config