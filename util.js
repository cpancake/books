function userInServers(req, nconf)
{
	var servers = nconf.get("discord:servers");
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

function checkAccount(nconf)
{
	// middleware to test if the user should be able to access this page
	return function checkAccountInternal(req, res, next)
	{
		// if unauthenticated, send them straight to the info page
		if(!isAuthenticated(req)) return res.redirect(nconf.get("url") + "/info");

		// if we're still in temp access, ignore server check
		if(req.session.tempAccess) return next();

		// check if they're in any of the servers allowed
		if(userInServers(req, nconf))
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

exports.userInServers = userInServers;
exports.isAuthenticated = isAuthenticated;
exports.checkAccount = checkAccount;