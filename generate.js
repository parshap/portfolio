// jshint node:true
"use strict";

var fs = require("fs"),
	domain = require("domain").create,
	concat = require("concat-stream"),
	through = require("through"),
	marked = require("marked"),
	duplexer = require("duplexer"),
	Hogan = require("hogan.js");

module.exports = function() {
	return combineStreams([
		css(),
		home(),
	]);
};

// Combine streams into single streams emitting all data events and a single
// "end" event when all streams have ended
function combineStreams(streams) {
	var stream = through(),
		waiting = streams.length;
	streams.forEach(function(s) {
		s.on("data", stream.emit.bind(stream, "data"));
		s.on("error", stream.emit.bind(stream, "error"));
		s.on("end", function() {
			waiting -= 1;
			if (waiting === 0) {
				stream.emit("end");
			}
		});
	});
	return stream;
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
function template() {
	var input = through(),
		output = through();

	input.pipe(concat(function(data) {
		mustache("template.mustache", {
			content: data,
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

// Render markdown at path
function markdown(path) {
	return source(path).pipe(through(function(src) {
		this.emit("data", marked(src));
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

// -- Pages

function home() {
	return markdown("home.md")
		.pipe(template())
		.pipe(page("home"));
}

function css() {
	var streams = ["bootstrap.css", "style.css"].map(function(path) {
		return fs.createReadStream("style/" + path);
	});
	return concatStreams(streams).pipe(page("style.css"));
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
