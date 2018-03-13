// some discord api stuff
var request = require("request");

function makeRequest(nconf, endpoint, cb)
{
	var url = "https://discordapp.com/api" + endpoint;
	var token = nconf.get("discord:token");
	var options = {
		url: url,
		headers: {
			"Authorization": "Bot " + token
		}
	};

	request(options, cb);
}

exports.getGuild = function(nconf, id, cb)
{
	makeRequest(nconf, "/guilds/" + id, (err, res, body) => {
		if(err) return cb(err);
		if(res.statusCode == 404) return cb(null, null);
		return cb(null, JSON.parse(body));
	});
}