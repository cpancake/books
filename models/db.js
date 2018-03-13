var levelup = require("levelup"),
	leveldown = require("leveldown");

module.exports = function(nconf, cb)
{
	var db = levelup(leveldown(nconf.get("db_path")), cb);
}