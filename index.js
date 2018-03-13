var nconf = require("nconf"),
    express = require("express"),
    passport = require("passport"),
    fs = require("fs"),
    adminController = require("./controllers/admin"),
    authController = require("./controllers/auth"),
    mainController = require("./controllers/main"),
    db = require("./models/db");

// setup nconf
nconf.argv().env().file({ file: "config.json" });

var app = express();

app.set("view engine", "pug");

// initialize middleware
app.use(require("serve-static")(__dirname + "/public"));
app.use(require("cookie-parser")());
app.use(require("body-parser").urlencoded({ extended: true }));
app.use(require("express-session")({
	secret: nconf.get("secret"),
	resave: false,
	saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

db(nconf, (err, db) => {
	if(err) throw err;

	app.use("/admin", adminController(nconf, db));
	app.use("/auth", authController(nconf));
	app.use("/", mainController(nconf));

	app.listen(nconf.get("port"));
	console.log("ready on port " + nconf.get("port"));
});