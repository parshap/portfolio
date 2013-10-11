// jshint node:true
"use strict";

var fs = require("fs"),
	path = require("path"),
	domain = require("domain").create,
	concat = require("concat-stream"),
	map = require("map-stream"),
	through = require("through"),
	duplexer = require("duplexer"),
	Hogan = require("hogan.js"),
	less = require("less"),
	findit = require("findit"),
	mime = require("mime");

var PROJECTS = require("./projects.json");

module.exports = function() {
	return combineStreams([
		css(),
		js(),
		home(),
		images(),
	]).end();
};

// Combine streams into single streams emitting all data events and a single
// "end" event when all streams have ended
function combineStreams(streams) {
	var ended = false,
		waiting = 0;
	var stream = through(addStream, function() {
		ended = true;
		maybeEnd();
	});
	streams && streams.forEach(addStream);
	return stream;

	function maybeEnd() {
		if (ended && waiting === 0) {
			stream.emit("end");
		}
	}

	function addStream(s) {
		waiting += 1;
		s.on("data", stream.emit.bind(stream, "data"));
		s.on("error", stream.emit.bind(stream, "error"));
		s.on("end", function() {
			waiting -= 1;
			maybeEnd();
		});
	}
}

// Like combineStream but preserve order of data events
function concatStreams(streams) {
	var output = through(),
		current = 0;

	step();
	return output;

	function process(stream) {
		stream.pipe(output, { end: false });
		stream.on("end", function() {
			step();
		});
	}

	function step() {
		if (current >= streams.length) {
			return output.end();
		}

		process(streams[current]);
		current += 1;
	}
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

	input.pipe(concat(function(data) {
		mustache("template.mustache", {
			content: data,
			name: name,
		}).pipe(output);
	}));

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
		sourceMap: true,
		optimization: 0,
		compile: true,
		compress: false,
		dumpLineNumbers: "all",
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

function projects() {
	return concatStreams(PROJECTS.map(function(project) {
		return mustache("project.mustache", project);
	}));
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
	var stream = combineStreams();

	findit(dirPath)
		.on("file", onFile)
		.on("end", stream.end.bind(stream));

	return stream;

	function onFile(filePath) {
		console.log(filePath);
		var mimeType = mime.lookup(filePath);
		stream.write(fs.createReadStream(filePath)
			.pipe(page(filePath, mimeType)));
	}
}

// -- Pages

function home() {
	var streams = [
		mustache("intro.html"),
		portfolio(),
	];
	return concatStreams(streams)
		.pipe(template("home"))
		.pipe(page("index.html", "text/html"));
}

function css() {
	return lesss("style.less")
		.pipe(page("style.css", "text/css"));
}

function js() {
	return source("script.js")
		.pipe(page("script.js", "text/javascript"));
}

function images() {
	return staticDir("images");
}

function page(path) {
	var input = through(),
		output = through();

	input.pipe(concat(function(data) {
		output.emit("data", {
			path: path,
			content: data,
		});
		output.emit("end");
	}));

	return duplexer(input, output);
}
