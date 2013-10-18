// jshint browser:true, node:true
"use strict";

// Shim old browsers
require("./shim");

var fitText = require("./lib/fittext"),
	effects = require("./lib/effects");

var q = document.querySelector.bind(document),
	id = document.getElementById.bind(document);

fitText(q("#intro .heading"), 1.4);

effects({
	header: id("intro"),
	bodybg: id("bg"),
	photo: id("photo"),
});
