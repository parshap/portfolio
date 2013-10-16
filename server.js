// jshint node:true
"use strict";

var REGEN = process.env.NODE_ENV !== "production";

var connect = require("connect"),
	generate = require("./generate");

var limitedGen = (function() {
	var TTL = 4000;
	var lastTime;
	var site;

	function doGen(callback) {
		lastTime = Date.now();
		gen(function(err, s) {
			site = s;
			callback();
		});
	}

	return function(callback) {
		function done() {
			callback(null, site);
		}

		var isExpired = REGEN && Date.now() > (lastTime + TTL);

		if ( ! site || isExpired) {
			doGen(done);
		}
		else {
			done();
		}
	};
})();

function gen(callback) {
	console.log("Generating site");
	var site = {};
	generate()
		.on("data", function(data) {
			console.log(" >", data.path);
			site[data.path] = data;
		})
		.on("end", callback.bind(null, null, site))
		.on("error", callback);
}

function handle(req, res) {
	var path = req.url.slice(1);
	if ( ! path) {
		path = "index.html";
	}

	limitedGen(function(err, site) {
		if (err) {
			outputError(res, err);
		}
		else if (site[path]) {
			outputPage(res, site[path]);
		}
		else {
			output404(res);
		}
	});
}

function outputPage(res, page) {
	res.setHeader("Content-Type", page.type);
	res.end(page.content);
}

function output404(res) {
	res.statusCode = 404;
	res.end("Not Found");
}

function outputError(res, err) {
	res.statusCode = 500;
	res.end("Error");
}

module.exports = connect()
	.use(connect.logger("short"))
	.use(handle)
	.listen(process.env.PORT || 8080);
