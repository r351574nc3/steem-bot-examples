import * as steem from "steem";
import { user, wif } from "./config";

function printUsage() {
    return `Usage:
    recovery <new recovery account>
    `;
}

function main() {
    if (process.argv.length < 3) {
        printUsage();
        return;
    }

    const new_recovery_account = process.argv[2];

    const pk = steem.auth.toWif(user, wif, "owner");

    console.log("Recovering %s %s %s", user, pk, new_recovery_account);
    steem.broadcast.changeRecoveryAccountAsync(pk, user, new_recovery_account, [])
        .then((results: any) => {
            console.log(JSON.stringify(results));
        });
}

main();