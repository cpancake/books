var nconf = require("nconf"),
    express = require("express"),
    passport = require("passport"),
    DiscordStrategy = require("passport-discord").Strategy,
    fs = require("fs"),
    path = require("path"),
    sort = require("javascript-natural-sort"),
    crypto = require("crypto");

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

// the scopes we need from discord
var scopes = ["identify", "guilds"];
passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(user, done) {
	done(null, user);
});

// allow discord login using passport
passport.use(new DiscordStrategy({
		clientID: nconf.get("discord:id"),
		clientSecret: nconf.get("discord:secret"),
		callbackURL: nconf.get("url") + "/auth/callback",
		scope: scopes
	},
	function(accessToken, refreshToken, profile, done) {
		return done(null, profile);
	})
);

function renderPage(res, name, params)
{
	params = params || {};
	params.nconf = nconf;
	res.render(name, params);
}

// make base64 url safe without encoding
function safeBase64(b64)
{
	return b64.replace(/\+/g, "~").replace(/\//g, "-").replace(/\=/g, "_");
}

function desafeBase64(b64)
{
	return b64.replace(/\~/g, "+").replace(/\-/g, "/").replace(/\_/g, "=");
}

// check if is authenticated through discord or through share link
function isAuthenticated(req)
{
	if(req.session.tempAccess)
	{
		if(req.session.tempAccessUntil < Date.now())
		{
			req.session.tempAccess = false;
		}
		else
		{
			return true;
		}
	}

	if(req.isAuthenticated()) return true;
	return false;
}

// middleware to test if the user should be able to access this page
function checkAccount(req, res, next)
{
	// if unauthenticated, send them straight to the info page
	if(!isAuthenticated(req)) return res.redirect(nconf.get("url") + "/info");

	// if we're still in temp access, ignore server check
	if(req.session.tempAccess) return next();

	// check if they're in any of the servers allowed
	var servers = nconf.get("discord:servers");
	var anyGood = req.user.guilds.some(function(e, i, a) {
		return servers.indexOf(e.id) != -1;
	});

	if(anyGood)
		return next();

	// can't get in
	renderPage(res, "noauth");
}

// return the name that the book should be sorted by
// ex, "The Giver" -> "Giver"
function sortTitle(title)
{
	return title.replace(/^(The|An|A)/, "");
}

// returns a list of all books
function getBooks()
{
	var files = fs.readdirSync(nconf.get("path"));
	var books = {};

	// go file by file through the data folder
	// we do this instead of parsing through books.json first,
	// so that we can add files that aren't in books.json
	files.forEach(function(f) {
		var ext = path.extname(f);
		// ignore books.json!
		if(ext == ".json") return;

		var name = path.basename(f, ext);
		ext = ext.substr(1);
		// if we've already added this book, add a new extension
		if(books[name])
		{
			books[name].extensions.push(ext);
			return;
		}

		books[name] = {
			name: name,
			extensions: [ext],
			file: name,
			category: "Other"
		};
	});

	// read books.json
	var info = JSON.parse(fs.readFileSync(nconf.get("path") + "/books.json"));

	var categories = {};
	// this is a bit of a mess, but basically what we're doing here is going over every book
	// and finding out if we have an info on it in books.json
	var ba = 
		Object.keys(books)
		.map(function(k) {
			var book = books[k];
			var bookInfo = info[k];
			// nothing in books.json, go with defaults
			if(!bookInfo) return book;

			book.name = bookInfo.name || book.name;
			book.authors = bookInfo.authors;
			book.category = bookInfo.category || "Other";
			return book;
		})
		.forEach((b) => {
			// add book to the proper category
			if(categories[b.category])
			{
				categories[b.category].push(b);
			}
			else
			{
				categories[b.category] = [b];
			}
		});

	// sort books inside categories
	Object.keys(categories).forEach((c) => {
		categories[c].sort((a, b) => sort(sortTitle(a.name), sortTitle(b.name)));
	});

	return {books: categories, categories: info._categories};
}

// get book index
app.get("/", checkAccount, function(req, res) {
	var data = getBooks();
	renderPage(res, "index", { categories: data.categories, books: data.books });
});

app.get("/info", function(req, res) {
	if(req.isAuthenticated())
	{
		return res.redirect(nconf.get("url") + "/");
	}

	renderPage(res, "info", { render_menubar: false });
});

// use a share code
app.get("/share/:code", (req, res) => {
	if(isAuthenticated(req))
	{
		return res.redirect(nconf.get("url") + "/");
	}

	var code = desafeBase64(req.params.code);
	var decipher = crypto.createDecipher("aes-256-ctr", nconf.get("share_secret"));
	var dec = decipher.update(code, "base64", "utf8");
	dec += decipher.final("utf8");

	var dateUtc = parseInt(dec.substr(4), 10);
	// compute dateUtc + share_length
	var dateEnd = dateUtc + (nconf.get("share_length") * 1000);
	if(dateEnd < Date.now())
		return renderPage(res, "share_fail");
	req.session.tempAccess = true;
	req.session.tempAccessUntil = dateEnd;
	res.redirect(nconf.get("url") + "/");
})

// create a share code
app.get("/share", checkAccount, (req, res) => {
	if(req.session.tempAccess)
	{
		return renderPage(res, "share_noauth");
	}

	// encode date, plus some junk
	crypto.randomBytes(2, (err, buffer) => {
		if(err) throw err;
		var encode = buffer.toString("hex") + Date.now().toString();
		var cipher = crypto.createCipher("aes-256-ctr", nconf.get("share_secret"));
		var crypt = cipher.update(encode, "utf8", "base64");
		crypt += cipher.final("base64");
		renderPage(res, "share", { url: nconf.get("url") + "/share/" + safeBase64(crypt), back: nconf.get("url") + "/" });
	})
});

// send user to discord auth
app.get("/auth", passport.authenticate("discord", { scope: scopes }), function(req, res) {
	res.redirect(nconf.get("url") + "/");
});

// user coming back from discord auth
app.get("/auth/callback", passport.authenticate("discord", { failureRedirect: "/" }), function(req, res) {
	res.redirect(nconf.get("url") + "/");
});

// goodbye!
app.get("/auth/logout", function(req, res) {
	req.session.tempAccess = false;
	req.logout();
	res.redirect(nconf.get("url") + "/");
});

// download book
app.get("/file/:name", checkAccount, function(req, res) {
	var name = req.params.name;
	var p = path.join(nconf.get("path"), name);
	if(!fs.existsSync(p))
	{
		res.status(404).send("not found");
		return;
	}

	res.sendFile(p);
});

app.listen(nconf.get("port"));
console.log("ready");