// jshint node:true
"use strict";

var ENV = process.env.NODE_ENV;

var fs = require("fs"),
	path = require("path"),
	domain = require("domain").create,
	concat = require("concat-stream"),
	map = require("map-stream"),
	mapSync = require("event-stream").mapSync,
	readArray = require("event-stream").readArray,
	through = require("through"),
	mapLimit = require("map-stream-limit"),
	duplexer = require("duplexer"),
	Hogan = require("hogan.js"),
	less = require("less"),
	findit = require("findit"),
	mime = require("mime"),
	eliminate = require("css-eliminator");

module.exports = function() {
	return combineStreams([
		staticHTML("index.html"),
		staticHTML("error.html"),
		staticHTML("404.html"),
		staticFile("robots.txt", null, TYPES.txt),
		portfolio(),
	]);
};

var TYPES = {
	"html": "text/html; charset=UTF-8",
	"txt": "text/plain",
};

function staticFile(src, dst, type) {
	if ( ! dst ) dst = src;
	return source(src).pipe(page(dst, type));
}

function staticHTML(src, dst) {
	return staticFile(src, dst, TYPES.html);
}

function portfolio() {
	return combineStreams([
		portfolioHome(),
		portfolioImages(),
	]);
}

function portfolioHome() {
	return portfolioHomeHTML().pipe(page(
		"me/index.html", "text/html; charset=UTF-8"));
}

function portfolioImages() {
	return finder("images").pipe(pager("me/"));
}

function combineStreams(streams) {
	return readArray(streams).pipe(combiner());
}

function concatStreams(streams) {
	return readArray(streams).pipe(concater());
}

// Combine streams into single streams emitting all data events and a single
// "end" event when all streams have ended
function combiner() {
	var output = through();

	// Lots of streams can be piped to output - remove listener warning
	output.setMaxListeners(0);

	var input = map(function(stream, callback) {
		stream.pipe(output, { end: false });
		stream.on("error", callback);
		stream.on("end", callback);
	});

	input.on("end", output.emit.bind(output, "end"));
	input.on("error", output.emit.bind(output, "error"));

	return duplexer(input, output);
}

// Like combiner but preserve order of data events
function concater() {
	var output = through();

	var input = mapLimit(function(stream, callback) {
		stream.pipe(output, { end: false });
		stream.on("error", callback);
		stream.on("end", callback);
	}, 1);

	input.on("end", output.emit.bind(output, "end"));
	input.on("error", output.emit.bind(output, "error"));

	return duplexer(input, output);
}

// Create a domain with errors bound to the given stream
function streamDomain(stream) {
	var d = domain();
	d.on("error", stream.emit.bind(stream, "error"));
	return d;
}

function _template(context) {
	var output = through();
	var input = concat(function(input) {
		context.content = input;
		var firstPass = mustache("template.mustache", context);
		style(firstPass).pipe(concat(function(style) {
			context.style = style;
			mustache("template.mustache", context).pipe(output);
		}));
	});
	return duplexer(input, output);
}

function template(context) {
	var input = through().pause();
	var output = through();
	script().pipe(concat(function(script) {
		context.script = script;
		input.pipe(_template(context)).pipe(output);
		input.resume();
	}));
	return duplexer(input, output);
}

function script() {
	return source("script.js");
}

function style(dom) {
	return lesss("style.less").pipe(eliminator(dom));
}

// Render the mustache template at the given path
function mustache(path, data) {
	return source(path).pipe(mapSync(function(src) {
		return Hogan.compile(src).render(data);
	}));
}

function noop() {}
function sink() {
	return through(noop, noop);
}

// Stream that emits entire file content as a single data event
function source(path) {
	var stream = sink();
	var d = streamDomain(stream);
	fs.readFile(path, "utf8", d.intercept(function(data) {
		stream.queue(data);
		stream.queue(null);
	}));
	return stream;
}

function lesss(p) {
	var options = {
		filename: p,
		paths: [ path.dirname(p) ],
		sourceMap: ENV !== "production",
		compress: ENV === "production",
		dumpLineNumbers: ENV === "production" ? false : "comments",
	};
	return source(p).pipe(map(compile));

	function compile(src, callback) {
		less.render(src, options, function(err, css) {
			if (err) {
				err.message = less.formatError(err);
			}
			callback(err, css);
		});
	}
}

function json() {
	return through(function(data) {
		this.emit("data", JSON.parse(data));
	});
}

function projects() {
	return source("./projects.json")
		.pipe(json())
		.pipe(through(function(projects) {
			projects.forEach(this.emit.bind(this, "data"));
		}))
		.pipe(through(function(project) {
			this.emit("data", mustache("project.mustache", project));
		}))
		.pipe(concater());
}

function portfolioHTML() {
	var out = through();
	projects().pipe(concat(function(projects) {
		mustache("portfolio.mustache", {
			projects: projects,
		}).pipe(out);
	}));
	return out;
}

// Generate static file contained in given directory
function finder(dirPath) {
	var stream = sink();

	findit(dirPath)
		.on("file", onFile)
		.on("end", stream.emit.bind(stream, "end"));

	return stream;

	function onFile(filePath) {
		stream.emit("data", filePath);
	}
}

// Files from a finder() to pages
function pager(prefix) {
	var output = combiner();
	var input = mapSync(function(path) {
		var type = mime.lookup(path);
		return fs.createReadStream(path)
			.pipe(page(prefix + path, type));
	});
	input.pipe(output);
	return duplexer(input, output);
}

function portfolioHomeHTML() {
	return concatStreams([
		source("intro.html"),
		portfolioHTML(),
	]).pipe(template({ name: "home" }));
}

function ender(streams) {
	var output = through();
	var waiting = streams.length;
	streams.forEach(function(stream) {
		stream.on("data", function() {});
		stream.on("end", function() {
			waiting -= 1;
			if (waiting === 0) {
				output.emit("end");
			}
		});
	});
	return output;
}

function eliminator(htmlStream) {
	var input = through();
	var output = through();
	var html = htmlStream.pipe(concat());
	var css = input.pipe(concat());
	ender([htmlStream, input]).on("end", function() {
		var cssString = css.getBody();
		cssString = eliminate(cssString, html.getBody());
		output.emit("data", cssString);
		output.emit("end");
	});
	return duplexer(input, output);
}

function page(path, type) {
	var input = through(),
		output = through();

	input.pipe(concat(function(data) {
		output.emit("data", {
			path: path,
			type: type,
			content: data,
		});
		output.emit("end");
	}));

	return duplexer(input, output);
}
