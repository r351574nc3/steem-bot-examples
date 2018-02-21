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

const CACHE_SIZE = 100;
const HANDLERS: CommentEmitter[] = [];

class CommentEmitter extends EventEmitter {
    user: string;
    wif: string;
    context: any;
}

class Session {
    message_cache: SessionEntry[];

    constructor() {
        this.message_cache = [];
    }

    get_message_by_id(chat_id: string, message_id: string): Promise<SessionEntry> {
        return Promise.filter(this.message_cache,
            (entry: SessionEntry, index: number, length: number) => entry.chat_id == chat_id && entry.message_id == message_id)
            .then((messages: any) => {
                if (messages && messages.length > 0) {
                    return messages[0];
                }
                return {};
            });
    }

    get_message_by_permlink(author: string, permlink: string): Promise<SessionEntry> {
        return Promise.filter(this.message_cache,
            (entry: SessionEntry, index: number, length: number) => entry.author == author && entry.permlink == permlink)
            .then((messages: any) => {
                if (messages && messages.length > 0) {
                    return messages[0];
                }
                return Promise.reject("Message not found");
            });
    }
}

interface SessionEntry {
    message_id: string;
    chat_id: string;
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
            + this.author + "/" + this.permlink + ")";
    }

    toHeader(): string {
        return "See reply at: " + this.build_message_permlink();
    }

    toMessage(): string {
        return `You have a reply from @${this.author} on steemit:` + "\n\n" + this.body;
    }

    /**
     * Forwards reploy through telegraph
     */
    forward() {
        this.event_handler.emit("replied", this);
    }
}

function is_message_reply(message: any) {
    return message.reply_to_message ? true : false;
}

function handle_reply_to_bot(ctx: any) {
    const session = ctx.session;

    while (session.message_cache.length > CACHE_SIZE) {
        session.message_cache.pop();
    }

    if (is_message_reply(ctx.message)) {
        console.log("Searching message cache %s", JSON.stringify(session.message_cache));
        console.log("Searching for chat %s with message %s", ctx.message.chat.id, ctx.message.reply_to_message.message_id);
        ctx.session.get_message_by_id(ctx.message.chat.id, ctx.message.reply_to_message.message_id)
            .then((message: SessionEntry) => {
                if (!message.message_id) {
                    return Promise.reject("Message not found");
                }

                const permlink = "re-" + message.author
                    + "-" + message.permlink
                    + "-" + new Date().toISOString().replace(/[^a-zA-Z0-9]+/g, "").toLowerCase();

                steem.broadcast.commentAsync(
                    wif,
                    message.author, // Leave parent author empty
                    message.permlink,
                    user, // Author
                    permlink, // Permlink
                    permlink, // Title
                    ctx.message.text, // Body
                    { "app": "telegram-reply-steem-bot/0.1.0" }
                )
                .then((result: any) => {
                    console.log(result);
                    console.log("Pushing chat %d and message id %d", ctx.message.chat.id, ctx.message.message_id);
                    ctx.session.message_cache.push({
                        chat_id: ctx.message.chat.id,
                        message_id: ctx.message.message_id,
                        author: result.author,
                        permlink: result.permlink
                    });
                    return result;
                })
                .catch((err: any) => {
                    console.log("Unable to process comment. ", err);
                });
            })
            .catch((err: string) => {
                // Somehow the original message isn't in the cache anymore
                console.log(err);
            });
    }
    console.log("Got response %s", JSON.stringify(ctx.message));
}

/**
 * Middleware function used as a function to handle a reply to a user. The reply is the comment
 * and it replies to a message which will be fetched from the message cache using the parent_permlink
 *
 * @param comment comment used as a reply
 */
function handle_reply_to_user(comment: Comment) {
    const ctx = comment.event_handler.context;
    if (ctx) {
        const session = ctx.session;
        const data_transfer_object = {
            permlink: comment.permlink,
            author: comment.author,
            parent_permlink: comment.parent_permlink,
            parent_author: comment.parent_author,
            title: comment.title,
            body: comment.body,
            json_metadata: comment.json_metadata
        };

        // If we're replying to a previous telegram message, we should fetch it from the cache
        session.get_message_by_permlink(comment.parent_author, comment.parent_permlink)
            .then((message: any) => {
                const extras = {
                    reply_to_message_id: message.message_id,
                    parse_mode: "Markdown"
                };
                console.log("Replying with extras %s", JSON.stringify(extras));
                // Found a message! Let's reply!
                const retval = ctx.reply(comment.toMessage(), extras);
                ctx.reply(comment.toHeader(), extras);
                return retval;
            },
            (err: any) => {
                console.log("Handling non-reply ", err);
                console.log("Replying with %s", comment.toMessage());
                // There was no message in the cache.
                const retval = ctx.replyWithMarkdown(comment.toMessage());
                ctx.replyWithMarkdown(comment.toHeader());
                return retval;
            })
            .then((message: any) => {
                while (ctx.session.message_cache.length > CACHE_SIZE) {
                    ctx.session.message_cache.pop();
                }

                console.log(JSON.stringify(message));
                console.log("Pushing chat: %s and message: %s onto the cache", message.chat.id, message.message_id);
                ctx.session.message_cache.push({
                    chat_id: message.chat.id,
                    message_id: message.message_id,
                    author: comment.author,
                    permlink: comment.permlink
                });
                return message;
            });

    }
}

function find_handler_for(user: string): Promise<CommentEmitter> {
    return Promise.filter(HANDLERS,
            (handler: CommentEmitter, index: number, length: number) => handler.user == user)
            .then((handlers) => {
                if (handlers && handlers.length > 0) {
                    return Promise.resolve(handlers.pop());
                }
                return Promise.reject(`Handler not found for ${user}`);
            });
}

function parse_start_command(command: string): Promise<any> {
    return new Promise((resolve, reject) => {
        if (command.indexOf(" ") < 0) {
            return reject("Invalid command");
        }

        const arguments_str = command.substring(command.indexOf(" ") + 1);

        if (arguments_str.indexOf(" ") < 0) {
            return reject("Invalid command arguments");
        }

        const user = arguments_str.substring(0, arguments_str.indexOf(" "));
        const wif = arguments_str.substring(arguments_str.indexOf(" ")).replace(" ", "");

        return resolve({user: user, wif: wif});
    });
}

/**
 * main execution loop for the task
 */
export let execute = () => {

    const bot = new Telegraf(telegraf_token);
    bot.context.session = new Session();

    bot.start((ctx: any) => {

        const handler = new CommentEmitter();
        handler.on("replied", handle_reply_to_user);
        handler.context = ctx;

        return parse_start_command(ctx.message.text)
            .then((args: any) => {
                handler.user = args.user;
                handler.wif = args.wif;
                HANDLERS.push(handler);
                return ctx.reply(`Welcome ${args.user}!`);
            },
            (err: any) => {
                return ctx.reply("Start command usage: `/start <steem user> <wif>`");
            });
    });

    bot.on("text", handle_reply_to_bot);

    bot.startPolling();

    console.log("Processing comments from stream of operations");
    steem.api.streamOperations("head", (err: String, result: any[]) => {
        if (result && result.length > 0) {
            const operation_name = result[0];
            switch (operation_name) {
                case "comment":
                    find_handler_for(result[1].parent_author)
                        .then((handler) => {
                            const comment = new Comment(result[1], handler);
                            if (comment.is_reply_to_user()) {
                                comment.forward();
                            }
                        },
                        (err) => {
                            // console.log(err); // suppress logging
                        });
                    break;
                default:
            }
        }
    });

};