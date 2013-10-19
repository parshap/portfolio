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
	eliminate = require("css-eliminator"),
	browserify = require("browserify"),
	uglify = require("uglify-js"),
	cleanCSS = require("clean-css").process,
	_ = require("lodash");

module.exports = function() {
	return combineStreams([
		staticHTML("templates/index.html"),
		staticHTML("templates/error.html"),
		staticHTML("templates/404.html"),
		staticFile("templates/robots.txt", null, TYPES.txt),
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

function _template(context, streams) {
	var output = through();
	var input = through();

	streams.body = input;
	var firstPass = mustachestreams("templates/template.mustache", context, streams);
	style(firstPass).pipe(concat(function(style) {
		context.style = style;
		mustache("templates/template.mustache", context).pipe(output);
	}));
	return duplexer(input, output);
}

function template(context) {
	return _template(context, {
		zoom: source("zoom-icon-def.svg"),
		script: script(),
	});
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
	return uglify.minify(source, {
		fromString: true,
	}).code;
});

var csscompressor = compressor(function(source) {
	return cleanCSS(source, {
		keepSpecialComments: 0,
		removeEmpty: true,
		processImport: false,
	});
});

function jscompressor() {
	if (process.env.NODE_ENV !== "production") {
		return through();
	}
	return concat(function(code) {
		var result = uglify.minify(code, {
			fromString: true,
		});
		this.emit("data", result.code);
		this.emit("end");
	});
}

function script() {
	return browserify("./client.js")
		.bundle()
		.pipe(jscompressor());
}

function style(dom) {
	return lesss("style.less").pipe(eliminator(dom)).pipe(csscompressor());
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
	var template = project.image ?
		"templates/image-link.mustache" :
		"templates/image.mustache";

	return mustachestreams("templates/project.mustache", project, {
		image: mustachestreams(template, project, {
			zoom: source("zoom-icon-ref.svg"),
		}),
	});
}

function portfolioHTML() {
	var out = through();
	projects().pipe(concat(function(projects) {
		mustache("templates/portfolio.mustache", {
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
		source("templates/intro.html"),
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
