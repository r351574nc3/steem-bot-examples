import * as Promise from "bluebird";
import * as Steem from "steem";
import { user, wif, telegraf_token } from "../../config";
import * as moment from "moment";
import * as Handlebars from "handlebars";
import * as Nodefs from "fs";
import * as path from "path";
import * as EventEmitter from "events";

const Telegraf = require("telegraf");
const steem = Promise.promisifyAll(Steem);
const fs = Promise.promisifyAll(Nodefs);

const CACHE_SIZE = 1000;

class CommentEmitter extends EventEmitter {
    context: any;
}

class Session {
    message_cache: SessionEntry[];

    get_message_by_id(message_id: string): Promise<SessionEntry> {
        return Promise.filter(this.message_cache, 
                (message: SessionEntry, index: number, length: number) => message.message_id == message_id)
                .then((messages) => {
                    if (messages.length > 0) {
                        return messages[0];
                    }
                    Promise.reject("Message doesn't exist");
                });
    }
    get_message_by_permlink(permlink: string): Promise<SessionEntry> {
        return Promise.filter(this.message_cache, 
                (message: SessionEntry, index: number, length: number) => message.permlink == permlink)
                .then((messages) => {
                    if (messages.length > 0) {
                        return messages[0];
                    }
                    Promise.reject("Message doesn't exist");
                });
    }
}

interface SessionEntry {
    message_id: string;
    permlink: string;
    author: string;
}

class Comment {
    permlink: String;
    author: String;
    parent_permlink: String;
    parent_author: String;
    title: String;
    body: String;
    json_metadata: Object;
    event_handler: CommentEmitter;

    constructor(json_comment: any, handler: CommentEmitter) {
        this.permlink = json_comment.permlink;
        this.author = json_comment.author;
        this.parent_permlink = json_comment.parent_permlink;
        this.parent_author = json_comment.parent_author;
        this.body = json_comment.body;
        this.json_metadata = json_comment.json_metadata;
        this.event_handler = handler;
    }

    is_reply_to_user(): boolean {
        return this.parent_author == user || this.body.indexOf("@" + user) > -1;
    }

    build_message_permlink(): string {
        return "[@" + this.author
            + "/" + this.permlink
            + "](https://www.steemit.com/@"
            + this.author + "/" + this.permlink + ")";``
    }

    toMessage(): string {
        const message_permlink = this.build_message_permlink();
        return message_permlink + "\n\n" + this.body;
    }

    /**
     * Forwards reploy through telegraph
     */
    forward() {
        this.event_handler.emit("replied", this);
    }
}

function is_message_reply(message: any) {
    return message.reply_to_message ? true : false
}

function reply_middleware(ctx: any) {
    if (is_message_reply(ctx.message)) {
        ctx.session.get_message_by_id(ctx.message.reply_to_message.message_id)
            .then((message: SessionEntry) => {

            })
            .catch((err: string) => {
                // Somehow the original message isn't in the cache anymore
                console.log(err)
            })
    }
    console.log("Got response %s", JSON.stringify(ctx.message));
}


/**
 * main execution loop for the task
 */
export let execute = () => {

    const handler = new CommentEmitter();
    handler.on("replied", (comment: Comment) => {
        const ctx = handler.context;
        const session = ctx.session;
        if (ctx) {
            const data_transfer_object = {
                permlink: comment.permlink,
                author: comment.author,
                parent_permlink: comment.parent_permlink,
                parent_author: comment.parent_author,
                title: comment.title,
                body: comment.body,
                json_metadata: comment.json_metadata
            };

            const extras = {
                reply_to_message_id: 60,
                parse_mode: "Markdown"
            };

            ctx.replyWithMarkdown(comment.toMessage(), extras)
                .then((message: any) => {
                    while (session.message_cache.length > CACHE_SIZE) {
                        session.message_cache.pop();
                    }

                    ctx.session.message_cache.push({ 
                        message_id: message.message_id,
                        author: comment.author,
                        permlink: comment.permlink
                    });
                    return message;
                });
        }
    });

    const bot = new Telegraf(telegraf_token);
    bot.context.session = new Session();

    bot.start((ctx: any) => {
        handler.context = ctx;
        return ctx.reply("Welcome!");
    });

    bot.on("text", reply_middleware);

    bot.startPolling();

    console.log("Processing comments from stream of operations");
    steem.api.streamOperations("head", (err: String, result: any[]) => {
        if (result && result.length > 0) {
            const operation_name = result[0];
            switch (operation_name) {
                case "comment":
                    const comment = new Comment(result[1], handler);
                    if (comment.is_reply_to_user()) {
                        comment.forward();
                    }
                    break;
                default:
            }
        }
    });

};