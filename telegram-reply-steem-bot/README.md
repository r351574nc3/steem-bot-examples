# Telegram Reply Steem Bot

Bot that allows users to receive replies in Telegram. It also allows users to send replies back and correspond to steemit replies through Telegram.

![](docs/images/telegram1.png)

![](docs/images/telegram2.png)

![](docs/images/telegram3.png)

## Setup

You can run your own version of this bot via docker container. If you run locally instead of using the existing service, you need to register your bot with [Botfather](https://telegram.me/botfather). It will give you an API key which you will use in this command.

```
docker run --rm -e STEEM_NAME=$STEEM_NAME  -e BOT_TOKEN=<token from the botfather> r351574nc3/telegram-reply-steem-bot:latest`
```

### Kubernetes Cluster

Getting running in a k8s cluster is easy. Use the helm chart

```
helm install orchestration/charts/telegram-reply-steem-bot --set steem.name=$STEEM_NAME
```

## Accessing from Telegram

You don't have to run your own instance of the bot though. It is available through telegram as `@steem-replies`. Just open a conversation with the bot and use the following command:

```
/start <your steem name> <your steem posting private key>
```

Once you have done this, the bot will take care of the rest. Your key is not saved or stored anywhere. When the bot restarts, you need to run the `/start` command again because your conversation will no longer exist (including any of your information).
