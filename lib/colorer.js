// jshint browser:true, node:true
"use strict";

var MIN_COLOR_CHANGE = 60;

var EventEmitter = require("wolfy87-eventemitter");

module.exports = function(opts) {
	var heading = opts.header.querySelector(".heading"),
		descs = opts.projects.querySelectorAll(".desc"),
		seed = opts.seed,
		colors = new EventEmitter();

	colors.on("color", function() {
		setColors(getColors(seed));
		opts.drawImage(colors.bg);
	});

	colors.generate = function() {
		seed = generateSeed(seed);
		colors.emit("color", seed);
	};

	colors.unset = function() {
		setColors({
			c1: "",
			c1FgLight: "",
			c1FgLightHeading: "",
			c2: "",
			c1FgDark: "",
			c1FgDarkDesc: "",
		});
	};

	return colors;

	function setColors(c) {
		opts.header.style.backgroundColor = c.c1;
		opts.header.style.color = c.c1FgLight;
		heading.style.color = c.c1FgLightHeading;
		opts.bodybg.style.backgroundColor = c.c2;
		opts.projects.style.color = c.c1FgDark;
		multiStyle(descs, "color", c.c1FgDarkDesc);
	}
};

function multiStyle(nodeList, style, val) {
	Array.prototype.forEach.call(nodeList, function(node) {
		node.style[style] = val;
	});
}

function getColors(seed) {
	var fgbase = seed.clone().setS(0.3);

	return mapObjectValues({
		c1: seed,
		c1FgLight: fgbase.clone().setL(0.9),
		c1FgLightHeading: fgbase.clone().setL(0.95),
		c1FgDark: fgbase.clone().setL(0.33).darken(0.15),
		c1FgDarkDesc: fgbase.clone().setL(0.47).darken(0.15),
		c2: seed.clone().rotate(90),
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
