import * as express from "express";
import * as session from "express-session";
import * as bodyParser from "body-parser";
import * as path from "path";
import * as expressValidator from "express-validator";
import * as bluebird from "bluebird";

// Controllers (route handlers)
import * as homeController from "./controllers/home";

// Create Express server
const app = express();

// Express configuration
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "ejs");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public"), { maxAge: 31557600000 }));

/**
 * Primary app routes.
 */
app.get("/", homeController.index);


module.exports = app;