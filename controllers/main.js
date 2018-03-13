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
		_util.renderPage(req, res, nconf, "index", { categories: data.categories, books: data.books, unsortedCount: data.unsortedCount });
	});

	router.get("/info", function(req, res) {
		if(_util.isAuthenticated(req))
		{
			return res.redirect(nconf.get("url") + "/");
		}

		_util.renderPage(req, res, nconf, "info", { render_menubar: false });
	});

	router.get("/info/external", function(req, res) {
		if(_util.isAuthenticated(req))
			return res.redirect(nconf.get("blog_url"));
		_util.renderPage(req, res, nconf, "info_external", { render_menubar: false });
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
		var name = req.params.name;
		res.redirect(nconf.get("url") + "/file/" + encodeURIComponent(new Buffer(data).toString("base64")) + "/" + encodeURIComponent(name));
	});

	// unsorted books
	router.get("/unsorted.json", _util.checkAccount(nconf), (req, res) => {
		res.json({ unsorted_books: books.getUnsortedBooks(nconf) });
	});

	return router;
}