var nconf = require("nconf"),
    express = require("express"),
    passport = require("passport"),
    fs = require("fs"),
    crypto = require("crypto"),
    _util = require("./util"),
    books = require("./books"),
    authController = require("./controllers/auth");

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

app.use("/auth", authController(nconf));

// get book index
app.get("/", _util.checkAccount(nconf), function(req, res) {
	var data = books.getBooks(nconf);
	_util.renderPage(req, res, nconf, "index", { categories: data.categories, books: data.books });
});

app.get("/info", function(req, res) {
	if(_util.isAuthenticated(req))
	{
		return res.redirect(nconf.get("url") + "/");
	}

	_util.renderPage(req, res, nconf, "info", { render_menubar: false });
});

app.get("/info/external", function(req, res) {
	if(_util.isAuthenticated(req))
		return res.redirect(nconf.get("blog_url"));
	_util.renderPage(req, res, nconf, "info_external", { render_menubar: false });
});

// download book
app.get("/file/:code/:name", function(req, res) {
	// validate URL code
	var code = new Buffer(req.params.code, "base64").toString("utf8");
	var data = code.split("|");
	var hash = 
		crypto.createHash("sha256")
		.update(data[1] + "|" + nconf.get("share_secret"))
		.digest("hex")
		.substr(0, 16);

	if(hash != data[0])
		return res.status(403).send("access denied - let me know");

	var name = req.params.name;
	var p = path.join(nconf.get("path"), name);
	if(!fs.existsSync(p))
	{
		res.status(404).send("not found");
		return;
	}

	res.sendFile(p);
});

// redirect with code
app.get("/file/:name", _util.checkAccount(nconf), (req, res) => {
	var hash = crypto.createHash("sha256").update(req.user.id + "|" + nconf.get("share_secret")).digest("hex").substr(0, 16);
	var data = hash + "|" + req.user.id;
	var name = req.params.name;
	res.redirect(nconf.get("url") + "/file/" + encodeURIComponent(new Buffer(data).toString("base64")) + "/" + encodeURIComponent(name));
});

app.listen(nconf.get("port"));
console.log("ready");