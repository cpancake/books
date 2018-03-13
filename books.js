var fs = require("fs"),
    path = require("path"),
    sort = require("javascript-natural-sort"),
	_util = require("./util");

exports.getBooks = function getBooks(nconf)
{
	var files = fs.readdirSync(nconf.get("path"));
	var books = {};

	// go file by file through the data folder
	// we do this instead of parsing through books.json first,
	// so that we can add files that aren't in books.json
	files.forEach(function(f) {
		var ext = path.extname(f);
		// ignore books.json!
		if(ext == ".json") return;

		var name = path.basename(f, ext);
		ext = ext.substr(1);
		// if we've already added this book, add a new extension
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

	// read books.json
	var info = JSON.parse(fs.readFileSync(nconf.get("path") + "/books.json"));

	var categories = {};
	// this is a bit of a mess, but basically what we're doing here is going over every book
	// and finding out if we have an info on it in books.json
	var ba = 
		Object.keys(books)
		.map(function(k) {
			var book = books[k];
			var bookInfo = info[k];
			// nothing in books.json, go with defaults
			if(!bookInfo) return book;

			book.name = bookInfo.name || book.name;
			book.authors = bookInfo.authors;
			book.category = bookInfo.category || "Other";
			return book;
		})
		.forEach((b) => {
			// add book to the proper category
			if(categories[b.category])
			{
				categories[b.category].push(b);
			}
			else
			{
				categories[b.category] = [b];
			}
		});

	// sort books inside categories
	Object.keys(categories).forEach((c) => {
		categories[c].sort((a, b) => sort(_util.sortTitle(a.name), _util.sortTitle(b.name)));
	});

	return {books: categories, categories: info._categories};
};