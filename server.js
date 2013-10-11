// jshint node:true
"use strict";

var connect = require("connect"),
	generate = require("./generate");

var limitedGen = (function() {
	var TTL = 4000;
	var lastTime;
	var site;

	function doGen(callback) {
		console.log("generating");
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

		var isExpired = Date.now() > (lastTime + TTL);

		if ( ! site || isExpired) {
			doGen(done);
		}
		else {
			done();
		}
	};
})();

function gen(callback) {
	var site = {};
	generate()
		.on("data", function(data) {
			site[data.path] = data.content;
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
			res.statusCode = 500;
			res.end("Error");
		}
		else if (site[path]) {
			res.end(site[path]);
		}
		else {
			res.statusCode = 404;
			res.end("Not Found");
		}
	});
}

module.exports = connect()
	.use(handle)
	.listen(process.env.PORT || 8080);
