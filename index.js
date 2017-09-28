var nconf = require("nconf"),
    express = require("express"),
    passport = require("passport"),
    DiscordStrategy = require("passport-discord").Strategy,
    fs = require("fs"),
    path = require("path"),
    sort = require("javascript-natural-sort"),
    crypto = require("crypto");

nconf.argv().env().file({ file: "config.json" });

var app = express();

app.set("view engine", "pug");

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

var scopes = ["identify", "guilds"];

passport.serializeUser(function(user, done) {
	done(null, user);
});

passport.deserializeUser(function(user, done) {
	done(null, user);
});

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

function checkAccount(req, res, next)
{
	if(!req.isAuthenticated()) return res.redirect(nconf.get("url") + "/auth");
	var servers = nconf.get("discord:servers");
	var anyGood = req.user.guilds.some(function(e, i, a) {
		return servers.indexOf(e.id) != -1;
	});

	if(anyGood)
		return next();
	res.render("noauth");
}

function getBooks()
{
	var files = fs.readdirSync(nconf.get("path"));
	var books = {};

	files.forEach(function(f) {
		var ext = path.extname(f);
		if(ext == ".json") return;
		var name = path.basename(f, ext);
		ext = ext.substr(1);
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

	var info = JSON.parse(fs.readFileSync(nconf.get("path") + "/books.json"));

	var categories = {};
	var ba = 
		Object.keys(books)
		.map(function(k) {
			var book = books[k];
			var bookInfo = info[k];
			if(!bookInfo) return book;
			book.name = bookInfo.name || book.name;
			book.authors = bookInfo.authors;
			book.category = bookInfo.category || "Other";
			return book;
		})
		.forEach((b) => {
			if(categories[b.category])
			{
				categories[b.category].push(b);
			}
			else
			{
				categories[b.category] = [b];
			}
		});

	Object.keys(categories).forEach((c) => {
		categories[c].sort((a, b) => sort(a.name.replace('The ', ''), b.name.replace('The ', '')));
	});

	return {books: categories, categories: info._categories};
}

app.get("/", checkAccount, function(req, res) {
	if(!req.isAuthenticated())
	{
		return res.redirect(nconf.get("url") + "/auth");
	}

	var data = getBooks();
	res.render("index", { categories: data.categories, books: data.books });
});

app.get("/share/:code", (req, res) => {
	if(req.isAuthenticated())
	{
		return res.redirect(nconf.get("url") + "/");
	}

	var decipher = crypto.createDecipher("aes-256-ctr", nconf.get("share_secret"));
	var dec = decipher.update(req.params.code, "hex", "utf8");
	dec += decipher.final("utf8");

	var date = Date.parse(dec.substr(8));
	console.log(typeof date);
})

app.get("/share", checkAccount, (req, res) => {
	// encode date, plus some junk
	crypto.randomBytes(4, (err, buffer) => {
		if(err) throw err;
		var encode = buffer.toString("hex") + new Date().toTimeString();
		var cipher = crypto.createCipher("aes-256-ctr", nconf.get("share_secret"));
		var crypt = cipher.update(encode, "utf8", "hex");
		crypt += cipher.final("hex");
		res.render("share", { url: nconf.get("url") + "/share/" + crypt, back: nconf.get("url") + "/" });
	})
});

app.get("/auth", passport.authenticate("discord", { scope: scopes }), function(req, res) {
	res.redirect(nconf.get("url") + "/");
});

app.get("/auth/callback", passport.authenticate("discord", { failureRedirect: "/" }), function(req, res) {
	res.redirect(nconf.get("url") + "/");
});

app.get("/auth/logout", function(req, res) {
	req.logout();
	res.redirect(nconf.get("url") + "/");
});

app.get("/file/:name", checkAccount, function(req, res) {
	if(!req.isAuthenticated())
	{
		return res.redirect(nconf.get("url") + "/auth");
	}

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