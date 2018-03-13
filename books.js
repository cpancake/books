var fs = require("fs"),
    path = require("path"),
    sort = require("javascript-natural-sort"),
	_util = require("./util");

// get all the books
// includeUnsorted - should we include books that have no metadata? default is false
// restricted - should we get books that are restricted or regular books? default is false (regular)
function getBooks(nconf, includeUnsorted, restricted)
{
	if(includeUnsorted === undefined) includeUnsorted = false;
	if(restricted === undefined) restricted = false;

	var files = [];
	if(restricted)
		files = fs.readdirSync(nconf.get("restricted_path"));
	else
		files = fs.readdirSync(nconf.get("path"));

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
			unsorted: false,
			category: "Other"
		};
	});

	// read books.json
	var info = {};
	if(restricted)
		info = JSON.parse(fs.readFileSync(nconf.get("restricted_path") + "/books.json"));
	else
		info = JSON.parse(fs.readFileSync(nconf.get("path") + "/books.json"));

	var unsortedCount = 0;
	var categories = {};
	// this is a bit of a mess, but basically what we're doing here is going over every book
	// and finding out if we have an info on it in books.json
	var ba = 
		Object.keys(books)
		.map(function(k) {
			var book = books[k];
			var bookInfo = info[k];
			// nothing in books.json, go with defaults
			if(!bookInfo)
			{
				book.unsorted = true;
				unsortedCount++;
				return book;
			}

			book.name = bookInfo.name || book.name;
			book.authors = bookInfo.authors;
			book.category = bookInfo.category || "Other";
			return book;
		})
		.forEach((b) => {
			if(!includeUnsorted && b.unsorted) return;

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
		if(!categories[c])
			categories[c] = [];
		categories[c].sort((a, b) => sort(_util.sortTitle(a.name.toLowerCase()), _util.sortTitle(b.name.toLowerCase())));
	});

	return {books: categories, categories: info._categories, unsortedCount: unsortedCount};
};

function getUnsortedBooks(nconf)
{
	return getBooks(nconf, true).books["Other"].filter(b => b.unsorted);
}

exports.getBooks = getBooks;
exports.getUnsortedBooks = getUnsortedBooks;