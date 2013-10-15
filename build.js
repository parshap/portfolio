// jshint node:true
"use strict";

var fs = require("fs"),
	path = require("path"),
	mkdirp = require("mkdirp"),
	generate = require("./generate");

var DIST_PATH = path.join(__dirname, "/dist");

function getPath(p) {
	return path.join(DIST_PATH, p);
}

generate().on("data", function(data) {
	var dirpath = getPath(path.dirname(data.path));
	mkdirp(dirpath, function(err) {
		if (err) throw err;
		fs.writeFile(getPath(data.path), data);
	});
});
