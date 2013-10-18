// jshint browser:true, node:true
"use strict";

var MIN_COLOR_CHANGE = 60;

var EventEmitter = require("events").EventEmitter;

module.exports = function(opts) {
	var seed = opts.seed;
	var heading = opts.header.querySelector(".heading");
	var colors = new EventEmitter();

	colors.on("color", function() {
		var colors = getColors(seed);
		setColors(colors.bg, colors.fg, colors.fgHeading, colors.bgBody);
		opts.drawImage(colors.bg);
	});

	colors.generate = function() {
		seed = generateSeed(seed);
		colors.emit("color", seed);
	};

	colors.unset = function() {
		setColors("", "", "", "");
	};

	return colors;

	function setColors(bg, fg, fgHeading, bgBody) {
		opts.header.style.backgroundColor = bg;
		opts.header.style.color = fg;
		heading.style.color = fgHeading;
		opts.bodybg.style.backgroundColor = bgBody;
	}
};

function getColors(seed) {
	var fgBase = seed.clone().desaturate(0.5);

	return mapObjectValues({
		bg: seed,
		fg: fgBase.clone().lighten(0.2),
		fgHeading: fgBase.clone().lighten(0.267),
		bgBody: seed.clone().rotate(90),
	}, function(value) {
		return value.toString();
	});
}

function mapObjectValues(obj, fn) {
	return Object.keys(obj).reduce(function(acc, cur) {
		acc[cur] = fn(obj[cur], cur, obj);
		return acc;
	}, {});
}

function generateSeed(start) {
	var deg = Math.random() * (360 - (2 * MIN_COLOR_CHANGE)),
		seed = start.clone().rotate(deg + MIN_COLOR_CHANGE);
	return seed;
}
