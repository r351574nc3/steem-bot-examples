const config = {
    steemEnabled: process.env.STEEM_ENABLED || false,
    redisHost: process.env.REDIS_HOST || "redis.botnet",
    blockchain: process.env.BLOCKCHAIN || "Hive",
    redisDb: "0",
}

switch (config.blockchain) {
    case "Hive":
        config.blockchain = "0";
        break;
    case "Steem":
        config.blockchain = "1";
        break;
    case "Blurt":
        config.blockchain = "2";
        break;
    default:
        break;
}

export { config }