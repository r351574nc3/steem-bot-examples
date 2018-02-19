import * as errorHandler from "errorhandler";

// Scheduled backend automation
import * as bot from "./helpers/bot";

const app = require("./app");

/**
 * Error Handler. Provides full stack - remove for production
 */
app.use(errorHandler());

bot.run();


/**
 * Start Express server.
 */
const server = app.listen(app.get("port"), () => {
  console.log(("  App is running at http://localhost:%d in %s mode"), app.get("port"), app.get("env"));
  console.log("  Press CTRL-C to stop\n");
});

export = server;