var express = require("express"),
	_util = require("../util"),
	GuildModel = require("../models/guild");

function guilds(nconf, db, router)
{
	router.get("/guilds/info.json", (req, res) => {
		if(!req.query.id)
			return res.json({ error: true, message: "No ID provided." });
		GuildModel.load(db, req.query.id, (err, model) => {
			if(err) throw err;

			if(model == null)
			{
				res.json({ error: false, data: null });
			}
			else
				res.json({ error: false, data: model });
		});
	});
}

module.exports = function(nconf, db)
{
	var router = express.Router();
	router.use(_util.checkAccount(nconf, _util.PERMISSION_LEVELS.ADMIN));

	//guilds(nconf, db, router);

	return router;
}