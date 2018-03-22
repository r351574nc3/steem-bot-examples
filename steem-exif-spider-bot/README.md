# Steem Exif Spider Bot

Bot that scours and spiders across the steemit blockchain in search of EXIF data. It then automatically adds comments and exif data to posts in the steemit blockchain as metadata.

## Usage

To install and use this bot, you will be required to install [Docker](https://www.docker.com/community-edition#/download).

Once [Docker](https://www.docker.com/community-edition#/download) is installed, the environment variables need to be set.

|Varable|Description|
|-------|-----------|
|`STEEM_NAME`|Steem user name|
|`STEEM_WIF`|Steem private posting key|

> **Notice** If you do not know your private posting key, it can be retrieved at: https://steemit.com/@<STEEM_NAME>/permissions


When [Docker](https://www.docker.com/community-edition#/download)  is installed and the environment variables are set, installation and execution are a single docker command: 

```
docker run --rm -e STEEM_NAME=$STEEM_NAME -e STEEM_WIF=$STEEM_WIF r351574nc3/steem-exif-spider-bot:latest
```