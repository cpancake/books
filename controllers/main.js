var crypto = require("crypto"),
	express = require("express"),
	_util = require("../util"),
	books = require("../books");

module.exports = function(nconf)
{
	var router = express.Router();

	// get book index
	router.get("/", _util.checkAccount(nconf), function(req, res) {
		var data = books.getBooks(nconf);
		data.restricted = false;
		_util.renderPage(req, res, nconf, "index", data);
	});

	router.get("/info", function(req, res) {
		if(_util.isAuthenticated(req))
		{
			return res.redirect(nconf.get("url") + "/");
		}

		_util.renderPage(req, res, nconf, "info", { render_menubar: false });
	});

	router.get("/restricted", _util.checkAccount(nconf, _util.PERMISSION_LEVELS.RESTRICTED), (req, res) => {
		var data = books.getBooks(nconf, false, true);
		data.restricted = true;
		_util.renderPage(req, res, nconf, "index", data);
	});

	router.get("/restricted/info", _util.checkAccount(nconf), (req, res) => {
		var isCool = _util.userInServers(req, nconf, true);
		_util.renderPage(req, res, nconf, "restricted_info", { isCool: isCool });
	});

	// download book
	router.get("/file/:code/:name", function(req, res) {
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
	router.get("/file/:name", _util.checkAccount(nconf), (req, res) => {
		var hash = crypto.createHash("sha256").update(req.user.id + "|" + nconf.get("share_secret")).digest("hex").substr(0, 16);
		var data = hash + "|" + req.user.id;
		var name = _util.sanitizeName(req.params.name);
		res.redirect(nconf.get("url") + "/file/" + encodeURIComponent(new Buffer(data).toString("base64")) + "/" + encodeURIComponent(name));
	});

	// restricted files can't be shared, so we don't need any faux-crypto
	router.get("/file/restricted/:name", _util.checkAccount(nconf, _util.PERMISSION_LEVELS.RESTRICTED), (req, res) => {
		var name = _util.sanitizeName(req.params.name);
		var p = path.join(nconf.get("restricted_path"), name);
		if(!fs.existsSync(p))
		{
			res.status(404).send("not found");
			return;
		}

		res.sendFile(p);
	});

	// unsorted books
	router.get("/unsorted.json", _util.checkAccount(nconf), (req, res) => {
		res.json({ unsorted_books: books.getUnsortedBooks(nconf) });
	});

	// a logged in admin user can visit this url to reload the config file
	// bad solution...
	router.get("/reload", _util.checkAccount(nconf, _util.PERMISSION_LEVELS.ADMIN), (req, res) => {
		nconf.file({ file: "config.json" });
		res.send("reloaded ok");
	});

	return router;
}