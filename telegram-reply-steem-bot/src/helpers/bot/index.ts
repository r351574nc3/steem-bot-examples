import * as scheduler from "node-schedule";
import * as notify from "./notify";

export let run = () => {
    // scheduler.scheduleJob(HOURLY, require('./reply'))
    return notify.execute();
};