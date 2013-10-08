// jshint node:true
"use strict";

var generate = require("./generate");
var test = require("tape");

test("generate site", function(t) {
	var site = {};
	generate()
		.on("data", function(data) {
			site[data.path] = true;
		})
		.on("end", function() {
			t.ok(site["home"]);
			t.ok(site["style.css"]);
			t.end();
		});
});
