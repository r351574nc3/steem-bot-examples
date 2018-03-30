module.exports = {
    user: process.env.STEEM_NAME,
    wif: process.env.STEEM_WIF,
    weight: parseInt(process.env.VOTING_WEIGHT), 
    bennies: process.env.STEEM_BENEFICIARIES ? process.env.STEEM_BENEFICIARIES.split(",") : [],
    blacklist: [
        "emwalker",
        "tomlabe",
        "stranded", 
        "soma909", 
        "mammasitta",
        "pfunk", 
        "nwtdarren", 
        "betterthanhome",
        "karenb54",
        "teddy2",
        "spreadfire1",
        "ninahaskin",
        "wdoutjah"
    ]
}