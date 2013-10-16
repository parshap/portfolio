// jshint node:true
"use strict";

var ENV = process.env.NODE_ENV;

var fs = require("fs"),
	path = require("path"),
	domain = require("domain").create,
	concat = require("concat-stream"),
	map = require("map-stream"),
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
	return readArray([
		homeHTML().pipe(page(
			"index.html", "text/html; charset=UTF-8")),
		staticDir("images"),
	]).pipe(combiner());
};

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

// Put data piped into stream inside of template
function template(name) {
	var input = through(),
		output = through();

	// @TODO This control flow sucks
	var scriptSource = source("script.js");
	var script = scriptSource.pipe(concat());
	var content = input.pipe(concat());

	ender([input, scriptSource]).on("end", function() {
		var firstPass = mustache("template.mustache", {
			content: content.getBody(),
			name: name,
		});
		var css = lesss("style.less").pipe(eliminator(firstPass));
		css.pipe(concat(function(style) {
			mustache("template.mustache", {
				name: name,
				content: content.getBody(),
				style: style,
				script: script.getBody(),
			}).pipe(output);
		}));
	});

	return duplexer(input, output);
}

// Render the mustache template at the given path
function mustache(path, data) {
	return source(path).pipe(through(function(src) {
		var template = Hogan.compile(src),
			html = template.render(data);
		this.emit("data", html);
	}));
}

function noop() {}

// Stream that emits entire file content as a single data event
function source(path) {
	var stream = through(noop, noop);
	var d = streamDomain(stream);
	fs.readFile(path, "utf8", d.intercept(function(data) {
		stream.emit("data", data);
		stream.emit("end");
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

function portfolio() {
	var out = through();
	projects().pipe(concat(function(projects) {
		mustache("portfolio.mustache", {
			projects: projects,
		}).pipe(out);
	}));
	return out;
}

// Generate static file contained in given directory
function staticDir(dirPath) {
	var stream = combiner();

	findit(dirPath)
		.on("file", onFile)
		.on("end", stream.end.bind(stream));

	return stream;

	function onFile(filePath) {
		var mimeType = mime.lookup(filePath);
		stream.write(fs.createReadStream(filePath)
			.pipe(page(filePath, mimeType)));
	}
}

function homeHTML() {
	var stream = concater();
	stream.write(mustache("intro.html"));
	stream.write(portfolio());
	stream.end();
	return stream.pipe(template("home"));
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
