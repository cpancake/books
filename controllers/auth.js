var express = require("express"),
	passport = require("passport"),
    DiscordStrategy = require("passport-discord").Strategy,
    DummyStrategy = require("passport-dummy").Strategy,
    fs = require("fs"),
	_util = require("../util");

function initializeTesting(nconf)
{
	var testData = JSON.parse(fs.readFileSync("test_data.json", "utf8"));

	passport.serializeUser(function(user, done) {
		done(null, user);
	});

	passport.deserializeUser(function(user, done) {
		done(null, user);
	});

	passport.use(new DummyStrategy(function(done) {
		done(null, testData.user);
	}));
}

function initializeReal(nconf)
{
	// the scopes we need from discord
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
			var admins = nconf.get("admins");
			profile.admin = admins.indexOf(profile.id) !== -1;
			return done(null, profile);
		})
	);
}

// creates and initializes the auth controller
module.exports = function(nconf)
{
	var router = express.Router();

	var strategyName = "discord";
	if(nconf.get("testing", false) === true)
	{
		initializeTesting(nconf);
		strategyName = "dummy";
	}
	else
	{
		initializeReal(nconf);
	}

	// send user to discord auth
	router.get("/", passport.authenticate(strategyName, { scope: ["identify", "guilds"] }), function(req, res) {
		res.redirect(nconf.get("url") + "/");
	});

	// user coming back from discord auth
	router.get("/callback", passport.authenticate(strategyName, { failureRedirect: "/" }), function(req, res) {
		res.redirect(nconf.get("url") + "/");
	});

	// goodbye!
	router.get("/logout", function(req, res) {
		req.session.tempAccess = false;
		req.logout();
		res.redirect(nconf.get("url") + "/");
	});

	return router;
}