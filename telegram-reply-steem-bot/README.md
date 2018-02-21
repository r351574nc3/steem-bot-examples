# Telegram Reply Steem Bot

Bot that allows users to receive replies in Telegram. It also allows users to send replies back and correspond to steemit replies through Telegram.

![](images/telegram1.png)

![](images/telegram2.png)

![](images/telegram3.png)

## Setup

You can run your own version of this bot via docker container

```
docker run --rm -e STEEM_NAME=$STEEM_NAME r351574nc3/telegram-reply-steem-bot:latest`
```

## Accessing from Telegram

You don't have to run your own instance of the bot though. It is available through telegram as `@steem-replies`. Just open a conversation with the bot and use the following command:

```
/start <your steem name> <your steem posting private key>
```

Once you have done this, the bot will take care of the rest. Your key is not saved or stored anywhere. When the bot restarts, you need to run the `/start` command again because your conversation will no longer exist (including any of your information).
