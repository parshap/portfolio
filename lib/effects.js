// jshint browser:true, node:true
"use strict";

var image = require("./image"),
	cache = require("./cache"),
	animate = require("./animate"),
	isMobile = require("./is-mobile"),
	hsl = require("./hsl"),
	prefixed = require("prefixed");

var START_COLOR = hsl(0, 0.35, 0.75),
	PHOTO_SRC = "images/parshap.jpg";

module.exports = function(opts) {
	var header = opts.header,
		headerContainer = opts.headerContainer,
		photo = opts.photo,
		projects = opts.projects,
		bodybg = opts.bodybg;

	var seed = loadSeedColor() || START_COLOR;

	var drawImage = photo ? image(photo, PHOTO_SRC) : function() {};

	function generateTheme() {
		seed = generateSeed(seed);
		setColors(seed);
		drawImage(seed.toString());
		saveSeedColor(seed);
	}

	function removeTheme() {
		unsetColors();
		drawImage();
	}

	function setColors(c) {
		setBG(header, c);
		setC(header, hsl(c.h, 0.3, 0.95));
		setBG(bodybg, c.rotate(90));
	}

	function unsetColors() {
		setBG(header, "");
		setC(header, "");
		setBG(bodybg, "");
		setC(projects, "");
	}

	// Fading
	animate((function() {
		var height = cache(function() {
			return header.clientHeight * 0.75;
		});

		var tween = tweener(function(k, lastK) {
			// Change colors when we are about to fade in
			if (lastK === 1) {
				generateTheme();
			}

			if (k === 0) {
				projects.style.pointerEvents = "none";
			}
			else if (lastK === 0) {
				projects.style.pointerEvents = "";
			}

			// Determine if this is the first frame of the animation after
			// leaving the peak but not also the last frame (i.e., we are not
			// jumping straight from 0 to 1 or 1 to 0).
			var firstFrameAndNotLast = (lastK === 0 && k !== 1) ||
				(lastK === 1 && k !== 0);

			// When the tween is first leaving a peak (i.e., k=0 or k=1) some
			// style changes (the scale transform on `#intro .container` and
			// the opacity on `#projects`) seem to cause a repaint. We will
			// not change these styles until the next frame in an effort to
			// keep down the cost of each individual frame.
			var k2 = firstFrameAndNotLast ? lastK : k;

			var ik = 1 - k,
				headerY = k * height() * -0.15,
				headerS = (k2 * 0.2) + 1,
				headerTranslate = "translate3d(0, " + headerY + "px, 0)",
				headerScale = "scale(" + headerS + ")",
				headerTransform = headerTranslate + " " + headerScale,
				headerOpacity = ik,
				projectsOpacity = (k2 * 0.8) + 0.2,
				bgOpacity = (ik * 0.85) + 0.25;
			setStyles(headerTranslate, headerTransform, headerOpacity, projectsOpacity, bgOpacity);
		});

		function setStyles() {
			prefixed(header.style, "transform", arguments[0]);
			prefixed(headerContainer.style, "transform", arguments[1]);
			header.style.opacity = arguments[2];
			projects.style.opacity = arguments[3];
			bodybg.style.opacity = arguments[4];
		}

		return {
			disabled: isSimple,

			enable: function() {
				height.update();
				generateTheme();
				tween.force();
			},

			disable: function() {
				setStyles("", "", "", "");
				removeTheme();
			},

			draw: function() {
				var k = scrollY() / height();
				k = Math.min(1, k);
				tween(k);
			},
		};
	}()));
};

function setC(el, c) {
	el.style.color = c.toString();
}

function setBG(el, c) {
	el.style.backgroundColor = c.toString();
}

function isSimple() {
	return isMobile(window.navigator.userAgent) || ! isMinWidth();
}

function isMinWidth() {
	return window.matchMedia ?
		window.matchMedia("(min-width:768px)").matches :
		window.innerWidth >= 768;
}

function tweener(fn) {
	var lastVal;
	var retval = function(val) {
		if (val !== lastVal) {
			retval.force(val);
		}
	};
	retval.force = function(val) {
		fn(val, lastVal);
		lastVal = val;
	};
	return retval;
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

var MIN_COLOR_CHANGE = 60;

function generateSeed(start) {
	var deg = Math.random() * (360 - (2 * MIN_COLOR_CHANGE)),
		seed = start.rotate(deg + MIN_COLOR_CHANGE);
	return seed;
}
