// jshint browser:true, node:true
"use strict";

var fitText = require("./lib/fittext");

var q = document.querySelector.bind(document);

fitText(q("#intro .heading"), 1.4);

var color = require("color"),
	once = require("once");

var raf = window.requestAnimationFrame;

// Base colors
var COLORS = {
	white: color("#fff"),
	start: color("hsl(0, 30%, 75%)"),
};

// Vendor prefixed element.style property names
var STYLES = {
	transform: "webkitTransform",
};

var PHOTO_SRC = "images/parshap.jpg";

var palette = generatePalette();
var header = q("#intro"),
	bodybg = q("#bg");

// Load the image once and then always return the same value
// If this function is called multiple time while the image is still loading
// Only the last callback will ever be called
var loadImage = (function() {
	var image, loaded;
	return function(callback) {
		if (image && loaded) return callback(image);
		if ( ! image) {
			console.log("loading");
			image = new Image();
			image.src = PHOTO_SRC;
		}
		// This overrides any previous callback waiting to load
		image.onload = function() {
			loaded = true;
			callback(image);
		};
	};
}());

var drawImage = (function() {
	var canvas = q("#photo");
	var lastColor = -1, nextColor;

	var context = cache(function() {
		return canvas.getContext("2d");
	});

	return function(color) {
		if (color) {
			nextColor = color;
		}

		// Don't do anything if the image is already drawn in this color
		if (nextColor === lastColor) {
			return;
		}

		eventuallyDrawImage();
	};

	function eventuallyDrawImage() {
		loadImage(function(image) {
			raf(function() {
				draw(image);
			});
		});
	}

	function draw(image) {
		var c = context();
		console.log("drawing");
		if (nextColor) {
			c.fillStyle = nextColor;
			c.globalCompositeOperation = "source-over";
			c.fillRect(0, 0, 400, 500);
			c.globalCompositeOperation = "darken";
		}
		c.drawImage(image, 0,0);
		lastColor = nextColor;
	}
}());

// Draw canvas photo
animate((function() {
	return {
		enabled: isMinWidth,
		enable: drawImage,
	};
}()));

var colors = (function() {
	var heading = header.querySelector(".heading");

	return {
		set: function() {
			var colors = generateColors();
			setColors(colors.bg, colors.fg, colors.fgHeading, colors.bgBody);
			drawImage(colors.bg);
		},
		unset: function() {
			setColors("", "", "", "");
		}
	};

	function setColors(bg, fg, fgHeading, bgBody) {
		header.style.backgroundColor = bg;
		header.style.color = fg;
		heading.style.color = fgHeading;
		bodybg.style.backgroundColor = bgBody;
	}
}());

// Set header colors
animate({
	enabled: isColorEffectEnabled,
	enable: colors.set,
	disable: colors.unset,
});

// Animate fading
animate((function() {
	// DOM elements
	var cHeader = header.querySelector(".container"),
		projects = q("#projects");

	var height = cache(function() {
		return header.clientHeight;
	});

	var tween = tweener(function(k) {
		// Change colors every time all colors are faded out completely
		if (k === 1) {
			colors.set();
		}

		var headerTranslate = getTranslateString(k * height() * -0.15),
			headerOpacity = 1 - k,
			projectsOpacity = (k * 0.7) + 0.3,
			bgOpacity = 1 - k;
		setStyles(headerTranslate, headerOpacity, projectsOpacity, bgOpacity);
	});

	function setStyles() {
		cHeader.style[STYLES.transform] = arguments[0];
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

function generateColors() {
	var palette = generatePalette();
	return {
		bg: palette.bg.hslString(),
		fg: palette.fg.hslString(),
		fgHeading: palette.fg.clone().lighten(0.15).hslString(),
		bgBody: palette.bg.clone().rotate(90).hslString(),
	};
}

function onFrame(fn) {
	raf(function(t) {
		fn(t);
		onFrame(fn);
	});
}

function animate(effect) {
	var enabled = false;
	onFrame(function(time) {
		if ( ! effect.enabled || effect.enabled()) {
			if ( ! enabled) {
				if (effect.enable) effect.enable();
				enabled = true;
			}
			if (effect.draw) effect.draw(time);
		}
		else {
			if (enabled) {
				if (effect.disable) effect.disable();
				enabled = false;
			}
		}
	});
}

function generatePalette() {
	var deg = Math.random() * 360;
	var base = COLORS.start.clone().rotate(deg);
	return {
		bg: base,
		fg: base.clone().mix(color("#ccc"), 0.7),
	};
}

function getTranslateString(px) {
	return "translate3d(0, " + px + "px, 0)";
}

function isColorEffectEnabled() {
	return isMinWidth() && ! isMobile();
}

function isMinWidth() {
	return window.matchMedia("(min-width:768px)").matches;
}

var reMobile = /Android|BlackBerry|iPhone|iPad|iPod|IEMobile|Opera Mini|webOS/i;

function isMobile() {
	return reMobile.test(window.navigator.userAgent);
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

function cache(fn) {
	var called, val;
	function fetch() {
		return called ? val : fetch.update();
	}
	fetch.update = function() {
		return val = fn();
	};
	return fetch;
}
