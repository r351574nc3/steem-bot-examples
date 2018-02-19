import * as Promise from "bluebird";
import { user, wif, telegraf_token } from "../../config";
import * as moment from "moment";
import * as Handlebars from "handlebars";
import * as Nodefs from "fs";
import * as path from "path";

const Telegraf = require("telegraf");

export let execute = () => {
    const bot = new Telegraf(telegraf_token);

    bot.start();
};