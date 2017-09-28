# books

This is a node.js server for hosting a directory full of books. It can host other things, I suppose, but books are what it's made for.

This server is not meant to be open to the public, though it can be if you make the necessary modifications. Authentication is handled through Discord, where users who are a member of servers specified in config.json can access this book directory.

## Configuration

A file named `config.template.json` is provided with this source code. To set up this server, rename the template to `config.json` and fill in the fields as follows:
```js
{
    "discord": {
        "id": "", // the ID of your Discord app (create in Discord API)
        "secret": "", // your Discord API secret
        "servers": [ // a list of IDs of servers (as strings). users must be in one of these to access books
        ]
    },
    "path": "", // the path to the data folder (see next section)
    "port": 3001,
    "secret": "", // should be a random string, used for sessions
    "share_secret": "", // should be a different string, used for sharing (not working yet)
    "url": "http://localhost:3001" // the url of the web page
}
```

## Data

To add books to this directory you must place them in a data folder, specified by the `data` field in the config file. Books can be of any file type you wish, and you can include multiple file types of the same book (as long as they have the same file name).

Inside your data folder must be a JSON file named `books.json`, which specifies the metadata for every book. The file should look something like this:
```js
{
    "_categories": ["Fiction", "Non-Fiction", "Other"],
    "book": {
        "title": "The Name of the Book", // if not set, title will be the filename of the book
        "authors": ["Author One", "Author Two", "Etc"], // if not set, book will have no authors
        "category": "Fiction" // if not set, book will be placed in "Other"
    }
}
```

For example, if I added "Tunnel in the Sky" by Robert A. Heinlein to the directory, and I had it in epub, mobi, pdf, and htmlz formats, I would add every format to the data directory under the name "Tunnel in the Sky" (so "Tunnel in the Sky.pdf", "Tunnel in the Sky.epub", etc) and I'd add this to books.json:
```js
{
    "_categories": ["Fiction", "Other"],
    "Tunnel in the Sky": {
        "title": "Tunnel in the Sky", // not really needed because it's the same as the filename
        "authors": ["Robert A. Heinlein"],
        "category": "Fiction"
    }
}
```

Now, all four formats will be under the same listing in the directory, under the "Fiction" category.