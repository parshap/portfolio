// jshint browser:true, node:true
"use strict";

var HAS_QUERYSELECTOR = !! document.querySelector,
	HAS_BIND = !! Function.prototype.bind;

// Minimum requirements
if ( ! HAS_QUERYSELECTOR || ! HAS_BIND) {
	return;
}

var fitText = require("./lib/fittext"),
	effects = require("./lib/effects");

var id = document.getElementById.bind(document);

var header = id("intro"),
	photo = id("photo");

var HAS_CANVAS = photo.getContext;

fitText(header.querySelector(".heading"), 1.25);

effects({
	photo: HAS_CANVAS ? photo : null,
	header: header,
	projects: id("projects"),
	headerbg: id("headerbg"),
	bodybg: id("bodybg"),
});
