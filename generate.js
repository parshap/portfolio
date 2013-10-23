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
	pipeline = require("event-stream").pipeline,
	through = require("through"),
	duplexer = require("duplexer"),
	Hogan = require("hogan.js"),
	less = require("less"),
	findit = require("findit"),
	mime = require("mime"),
	css = require("css"),
	eliminate = require("css-eliminator"),
	browserify = require("browserify"),
	uglify = require("uglify-js"),
	_ = require("lodash"),
	datauri = require("data-uri-stream");

module.exports = function() {
	return combineStreams([
		staticHTML("templates/index.html", "index.html"),
		staticHTML("templates/error.html", "error.html"),
		staticHTML("templates/404.html", "404.html"),
		staticFile("templates/robots.txt", "robots.txt", TYPES.txt),
		staticFile("favicon.ico", "favicon.ico", TYPES.ico),
		portfolio(),
		images(),
	]);
};

var TYPES = {
	"html": "text/html; charset=UTF-8",
	"txt": "text/plain",
	"ico": "image/x-icon",
	"png": "image/png",
};

function staticFile(src, dst, type) {
	if ( ! dst ) dst = src;
	return source(src).pipe(page(dst, type));
}

function staticHTML(src, dst) {
	return staticFile(src, dst, TYPES.html);
}

function portfolio() {
	return portfolioHTML().pipe(page(
		"me/index.html", "text/html; charset=UTF-8"));
}

function images() {
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
	return map(function(stream, callback) {
		stream.pipe(concat(function(data) {
			callback(null, data);
		}));
	});
}

// Create a domain with errors bound to the given stream
function streamDomain(stream) {
	var d = domain();
	d.on("error", stream.emit.bind(stream, "error"));
	return d;
}

function template(context) {
	var t = "templates/template.mustache",
		output = through(),
		input = through(),
		firstPass = mustachestreams(t, context, { body: input }),
		uristream = datauri({ type: TYPES.ico }),
		favicon = fs.createReadStream("favicon.ico").pipe(uristream);

	mustachestreams("templates/template.mustache", context, {
		style: style(firstPass),
		favicon: favicon,
		script: script(),
	}).pipe(output);

	return duplexer(input, output);
}

// Helper to create compressor stream creator functions
function compressor(fn) {
	return function() {
		if (process.env.NODE_ENV !== "production") {
			return through();
		}

		return concat(function(source) {
			this.emit("data", fn(source));
			this.emit("end");
		});
	};
}

var jscompressor = compressor(function(source) {
	console.time("uglify");
	var code = uglify.minify(source, {
		fromString: true,
	}).code;
	console.timeEnd("uglify");
	return code;
});

function csscompressor(dom) {
	if (process.env.NODE_ENV !== "production") {
		return through();
	}

	return pipeline(
		eliminator(dom),
		mapSync(function(data) {
			console.time("css-stringify");
			var code = css.stringify(data, {
				compress: process.env.NODE_ENV === "production",
			});
			console.timeEnd("css-stringify");
			return code;
		})
	);
}

function script() {
	return browserify("./client.js")
		.bundle()
		.pipe(jscompressor());
}

function prefixer(prefix) {
	var first = true;
	return mapSync(function(data) {
		if (first) {
			data = prefix + data;
			first = false;
		}
		return data;
	});
}

function suffixer(suffix) {
	return through(null, function() {
		this.queue(suffix);
		this.queue(null);
	});
}

function zoomiconcss() {
	var prefix = prefixer(".zoom-icon { background-image: url(\""),
		suffix = suffixer("\") }"),
		datauristream = datauri({ type: TYPES.png });
	return fs.createReadStream("zoom-icon.png")
		.pipe(datauristream)
		.pipe(prefix)
		.pipe(suffix);
}

function style(dom) {
	return readArray([
		lesss("style.less").pipe(csscompressor(dom)),
		zoomiconcss(),
	]).pipe(concater());
}

// Render the mustache template at the given path
function mustache(path, data) {
	return source(path).pipe(mapSync(function(src) {
		return Hogan.compile(src).render(data);
	}));
}

function mustachestreams(path, data, streams) {
	var output = through();
	streamsFinisher(streams, function(streamsData) {
		mustache(path, _.extend(data, streamsData)).pipe(output);
	});
	return output;
}

function streamsFinisher(streams, callback) {
	var data = {};

	_.each(streams, function(stream, key) {
		stream.pipe(concat(function(val) {
			data[key] = val;
		}));
	});

	ender(_.toArray(streams)).on("end", function() {
		callback(data);
	});
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
	var code = source(p).pipe(map(compile));
	return code;

	function compile(src, callback) {
		console.time("less");
		less.render(src, options, function(err, css) {
			console.timeEnd("less");
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

// Through stream that unwraps arrays
function unwrapper(prop) {
	return through(function(data) {
		data[prop].forEach(this.emit.bind(this, "data"));
	});
}

function projects() {
	return source("./data.json")
		.pipe(json())
		.pipe(unwrapper("projects"))
		.pipe(mapSync(renderProject))
		.pipe(concater());
}

function renderProject(project) {
	return mustachestreams("templates/project.mustache", project, {
		image: mustache("templates/image.mustache", project),
	});
}

function projectsHTML() {
	var out = through();
	projects().pipe(concat(function(projects) {
		mustache("templates/projects.mustache", {
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

function portfolioHTML() {
	return concatStreams([
		source("templates/intro.html"),
		projectsHTML(),
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
	var source = input.pipe(concat());
	ender([htmlStream, input]).on("end", function() {
		var cssString = source.getBody();
		console.time("css-parse");
		cssString = css.parse(cssString);
		console.timeEnd("css-parse");
		console.time("css-eliminator");
		cssString = eliminate(cssString, html.getBody());
		console.timeEnd("css-eliminator");
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
