// jshint node:true
"use strict";

var connect = require("connect"),
	generate = require("./generate");

var site = {};
generate().on("data", function(data) {
	site[data.path] = data.content;
});

function handle(req, res) {
	var path = req.url.slice(1);
	if ( ! path) {
		path = "home";
	}

	if (site[path]) {
		res.end(site[path]);
	}
	else {
		res.statusCode = 404;
		res.end("Not Found");
	}
}

module.exports = connect()
	.use(handle)
	.listen(process.env.PORT || 8080);
