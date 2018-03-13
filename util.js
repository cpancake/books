var path = require("path");

const PERMISSION_LEVELS = {
	NONE: 0,
	REGULAR: 1,
	RESTRICTED: 2,
	ADMIN: 3
};

function userInServers(req, nconf, checkRestricted)
{
	if(req.user == null) return false;
	
	var users = nconf.get(checkRestricted ? "restricted:users" : "discord:users");
	if(users.indexOf(req.user.id) != -1)
		return true;

	var servers = nconf.get(checkRestricted ? "restricted:servers" : "discord:servers");
	var anyGood = req.user.guilds.some(function(e, i, a) {
		return servers.indexOf(e.id) != -1;
	});

	return anyGood;
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

	return req.isAuthenticated();
}

// middleware to check if a user is logged in
// check level - the constant from PERMISSION_LEVELS to check if this user is at or above
function checkAccount(nconf, checkLevel)
{
	if(checkLevel === undefined)
	{
		checkLevel = PERMISSION_LEVELS.REGULAR;
	}

	// middleware to test if the user should be able to access this page
	return function checkAccountInternal(req, res, next)
	{
		// if unauthenticated, send them straight to the info page
		if(!isAuthenticated(req)) return res.redirect(nconf.get("url") + "/info");

		if(checkLevel >= PERMISSION_LEVELS.ADMIN && req.user.admin)
			return next();
		else if(checkLevel >= PERMISSION_LEVELS.RESTRICTED && userInServers(req, nconf, true))
			return next();
		else if(
			checkLevel >= PERMISSION_LEVELS.REGULAR && 
			(req.session.tempAccess || userInServers(req, nconf)))
			return next();

		// can't get in
		renderPage(res, "noauth");
	};
}

// make base64 url safe without encoding
exports.safeBase64 = function safeBase64(b64)
{
	return b64.replace(/\+/g, "~").replace(/\//g, "-").replace(/\=/g, "_");
}

exports.desafeBase64 = function desafeBase64(b64)
{
	return b64.replace(/\~/g, "+").replace(/\-/g, "/").replace(/\_/g, "=");
}

// return the name that the book should be sorted by
// ex, "The Giver" -> "Giver"
exports.sortTitle = function sortTitle(title)
{
	return title.replace(/^(The|An|A)\s/, "");
}

exports.renderPage = function renderPage(req, res, nconf, name, params)
{
	params = params || {};
	params.user = req.user;
	params.nconf = nconf;
	params.root_url = nconf.get("url");
	res.render(name, params);
}

exports.sanitizePath = function(path) 
{
	return path.replace(new RegExp(path.sep, "g"), "");
}

exports.userInServers = userInServers;
exports.isAuthenticated = isAuthenticated;
exports.checkAccount = checkAccount;
exports.PERMISSION_LEVELS = PERMISSION_LEVELS;