# Steem Exif Spider Bot

Bot that scours and spiders across the steemit blockchain in search of EXIF data. It then automatically adds comments and exif data to posts in the steemit blockchain as metadata.

## Usage

```
docker run --rm -e STEEM_NAME=$STEEM_NAME -e STEEM_WIF=$STEEM_WIF r351574nc3/steem-exif-spider-bot:latest
```