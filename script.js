// jshint browser:true, node:true
"use strict";

var color = require("color"),
	prefixed = require("prefixed");

var fitText = require("./lib/fittext"),
	image = require("./lib/image"),
	colorer = require("./lib/colorer"),
	cache = require("./lib/cache"),
	animate = require("./lib/animate"),
	isMobile = require("./lib/is-mobile");

var START_COLOR = color("hsl(0, 35%, 75%)"),
	PHOTO_SRC = "images/parshap.jpg";

var q = document.querySelector.bind(document),
	id = document.getElementById.bind(document);

fitText(q("#intro .heading"), 1.4);

var header = id("intro"),
	bodybg = id("bg"),
	photo = id("photo");

var drawImage = image(photo, PHOTO_SRC);

var colors = colorer({
	seed: loadSeedColor() || START_COLOR,
	drawImage: drawImage,
	header: header,
	bodybg: bodybg,
}).on("color", saveSeedColor);

// Draw photo
animate((function() {
	return {
		enabled: isMinWidth,
		enable: drawImage,
	};
}()));

// Set header colors
animate({
	enabled: isColorEffectEnabled,
	enable: colors.generate,
	disable: colors.unset,
});

// Animate fading
animate((function() {
	// DOM elements
	var cHeader = header.querySelector(".container"),
		projects = q("#projects");

	var height = cache(function() {
		return header.clientHeight * 0.9;
	});

	var tween = tweener(function(k) {
		// Change colors every time all colors are faded out completely
		if (k === 1) {
			colors.generate();
		}

		var headerY = k * height() * -0.15,
			headerTranslate = "translate3d(0, " + headerY + "px, 0)",
			headerOpacity = 1 - k,
			projectsOpacity = (k * 0.7) + 0.3,
			bgOpacity = 1 - k;
		setStyles(headerTranslate, headerOpacity, projectsOpacity, bgOpacity);
	});

	function setStyles() {
		prefixed(cHeader.style, "transform", arguments[0]);
		header.style.opacity = arguments[1];
		projects.style.opacity = arguments[2];
		bodybg.style.opacity = arguments[3];
	}

	return {
		enabled: isColorEffectEnabled,

		enable: function() {
			height.update();
		},

		disable: function() {
			setStyles("", "", "", "");
		},

		draw: function() {
			var k = window.scrollY / height();
			k = Math.min(1, k);
			tween(k);
		},
	};
}()));

function isColorEffectEnabled() {
	return isMinWidth() && ! isMobile();
}

function isMinWidth() {
	return window.matchMedia("(min-width:768px)").matches;
}

function tweener(fn) {
	var lastVal;
	return function(val) {
		if (val !== lastVal) {
			fn(val);
			lastVal = val;
		}
	};
}

function loadSeedColor() {
	var lastColor = window.localStorage.lastColor;
	if (color) {
		try {
			lastColor = JSON.parse(lastColor);
		}
		catch (e) {
			return;
		}
		return color().hsl(lastColor);
	}
}

function saveSeedColor(color) {
	window.localStorage.lastColor = JSON.stringify(color.hsl());
}
