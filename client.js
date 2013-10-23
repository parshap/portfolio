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

var q = document.querySelector.bind(document),
	id = document.getElementById.bind(document);

var header = id("intro"),
	headerContainer = header.querySelector(".container"),
	photo = id("photo");

var HAS_CANVAS = photo.getContext;

fitText(q("#intro .heading"), 1.4);

effects({
	header: id("intro"),
	headerContainer: headerContainer,
	photo: HAS_CANVAS ? photo : null,
	projects: id("projects"),
	headerbg: id("headerbg"),
	bodybg: id("bodybg"),
});
