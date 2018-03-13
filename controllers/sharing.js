var express = require("express"),
	_util = require("../util");

module.exports = function(nconf)
{
	var router = express.Router();

	// use a share code
	router.get("/:code", (req, res) => {
		if(_util.isAuthenticated(req))
		{
			return res.redirect(nconf.get("url") + "/");
		}

		var code = _util.desafeBase64(req.params.code);
		var decipher = crypto.createDecipher("aes-256-ctr", nconf.get("share_secret"));
		var dec = decipher.update(code, "base64", "utf8");
		dec += decipher.final("utf8");

		var dateUtc = parseInt(dec.substr(4), 10);
		// compute dateUtc + share_length
		var dateEnd = dateUtc + (nconf.get("share_length") * 1000);
		if(dateEnd < Date.now())
			return _util.renderPage(res, nconf, "share_fail");
		req.session.tempAccess = true;
		req.session.tempAccessUntil = dateEnd;
		res.redirect(nconf.get("url") + "/");
	})

	// create a share code
	router.get("/", _util.checkAccount(nconf), (req, res) => {
		if(req.session.tempAccess)
		{
			return _util.renderPage(res, nconf, "share_noauth");
		}

		// encode date, plus some junk
		crypto.randomBytes(2, (err, buffer) => {
			if(err) throw err;
			var encode = buffer.toString("hex") + Date.now().toString();
			var cipher = crypto.createCipher("aes-256-ctr", nconf.get("share_secret"));
			var crypt = cipher.update(encode, "utf8", "base64");
			crypt += cipher.final("base64");
			_util.renderPage(res, nconf, "share", { 
				url: nconf.get("url") + "/share/" + _util.safeBase64(crypt), 
				back: nconf.get("url") + "/" });
		})
	});

	return router;
}