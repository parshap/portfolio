// jshint browser:true, node:true
"use strict";

var image = require("./image"),
	colorer = require("./colorer"),
	cache = require("./cache"),
	animate = require("./animate"),
	isMobile = require("./is-mobile"),
	hsl = require("./hsl"),
	prefixed = require("prefixed");

var START_COLOR = hsl(0, 0.35, 0.75),
	PHOTO_SRC = "images/parshap.jpg",
	SUPPORTS_CANVAS = !! window.document.createElement("canvas").getContext;

var q = document.querySelector.bind(document);

module.exports = function(opts) {
	var header = opts.header,
		bodybg = opts.bodybg,
		photo = opts.photo;

	var drawImage = image(photo, PHOTO_SRC);

	var colors = colorer({
		seed: loadSeedColor() || START_COLOR,
		drawImage: drawImage,
		header: header,
		bodybg: bodybg,
		projects: opts.projects,
	}).on("color", saveSeedColor);

	// Draw photo
	if (SUPPORTS_CANVAS) {
		animate({
			enabled: isMinWidth,
			enable: drawImage,
		});
	}
	else {
		photo.style.display = "none";
	}

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
			return header.clientHeight * 0.75;
		});

		var tween = tweener(function(k, lastK) {
			// Change colors when we are about to fade in
			if (lastK === 1) {
				colors.generate();
			}

			var headerY = k * height() * -0.15,
				headerTranslate = "translate3d(0, " + headerY + "px, 0)",
				headerOpacity = 1 - k,
				projectsOpacity = (k * 0.75) + 0.25,
				bgOpacity = 1 - k;
			setStyles(headerTranslate, headerOpacity, projectsOpacity, bgOpacity);
		});

		function setStyles() {
			prefixed(header.style, "transform", arguments[0]);
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
				var k = scrollY() / height();
				k = Math.min(1, k);
				tween(k);
			},
		};
	}()));
};

function isColorEffectEnabled() {
	return isMinWidth() && ! isMobile(window.navigator.userAgent);
}

function isMinWidth() {
	return window.matchMedia ?
		window.matchMedia("(min-width:768px)").matches :
		window.innerWidth >= 768;
}

function tweener(fn) {
	var lastVal;
	return function(val) {
		if (val !== lastVal) {
			fn(val, lastVal);
			lastVal = val;
		}
	};
}

function loadSeedColor() {
	START_COLOR.h = Number(window.localStorage.lastColor) || 0;
	return START_COLOR;
}

function saveSeedColor(color) {
	window.localStorage.lastColor = color.h;
}

function scrollY() {
	return window.scrollY || window.pageYOffset ||
		(document.documentElement ||
			document.body.parentNode ||
			document.body).scrollTop;
}
