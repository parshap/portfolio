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

// Draw canvas photo
animate((function() {
	var canvas = q("#photo");
	return {
		enabled: isMinWidth,

		// Draw the image only once
		enable: once(function() {
			var image = new Image();
			image.src = PHOTO_SRC;
			image.onload = function() {
				raf(function() {
					drawImage(image);
				});
			};
		}),
	};

	function drawImage(image) {
		var context = canvas.getContext("2d");
		context.fillStyle = palette.bg.hslString();
		context.globalCompositeOperation = "source-over";
		context.fillRect(0, 0, 400, 500);
		context.globalCompositeOperation = "darken";
		context.drawImage(image, 0,0);
	}
}()));

// Set header colors
animate((function() {
	var heading = header.querySelector(".heading");

	var colors = {
		bg: palette.bg.hslString(),
		fg: palette.fg.hslString(),
		fgHeading: cloneColor(palette.fg).lighten(0.15).hslString(),
		bgBody: cloneColor(palette.bg).rotate(90).hslString(),
	};

	return {
		enabled: isMinWidth,

		enable: function() {
			setColors(colors.bg, colors.fg, colors.fgHeading, colors.bgBody);
		},

		disable: function() {
			setColors("", "", "", "");
		},
	};

	function setColors(bg, fg, fgHeading, bgBody) {
		header.style.backgroundColor = bg;
		header.style.color = fg;
		heading.style.color = fgHeading;
		bodybg.style.backgroundColor = bgBody;
	}
}()));

// Animate fading
animate((function() {
	// DOM elements
	var cHeader = header.querySelector(".container"),
		projects = q("#projects");

	var height, lastScroll;

	function setStyles(k) {
		var y = k * height * 0.15;
		cHeader.style[STYLES.transform] = getTranslateString(-y);
		header.style.opacity = 1 - k;
		projects.style.opacity = (k * 0.5) + 0.5;
		bodybg.style.opacity = 1 - k;
	}

	return {
		enabled: isMinWidth,

		enable: function() {
			height = header.clientHeight;
		},

		disable: function() {
			cHeader.style[STYLES.transform] = "";
			header.style.opacity = "";
			projects.style.opacity = "";
			bodybg.style.opacity = "";
		},

		draw: function() {
			var scroll = Math.min(window.scrollY / height, 1);

			if (scroll !== lastScroll) {
				setStyles(scroll);
				lastScroll = scroll;
			}
		},
	};
}()));

function cloneColor(c) {
	return color().rgb(c.rgb());
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
	var base = cloneColor(COLORS.start).rotate(deg);
	return {
		bg: base,
		fg: cloneColor(base).mix(color("#ccc"), 0.7),
	};
}

function getTranslateString(px) {
	return "translate3d(0, " + px + "px, 0)";
}

function isMinWidth() {
	return window.matchMedia("(min-width:768px)").matches;
}
