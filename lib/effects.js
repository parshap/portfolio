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
		photo = opts.photo,
		projects = opts.projects,
		headerbg = opts.headerbg,
		bodybg = opts.bodybg;

	// Create a function that will draw the photo onto the canvas
	var drawImage = photo ? image(photo, PHOTO_SRC) : function() {};

	var changeTheme = theme(function(c) {
		function setStyles(colors) {
			headerbg.style.backgroundColor = colors[0].toString();
			bodybg.style.backgroundColor = colors[1].toString();
			header.style.color = colors[2].toString();
		}

		var colors = c ?
			[c, c.rotate(90), hsl(c.h, 0.3, 0.95)] :
			["", "", ""];

		setStyles(colors);
		drawImage();
	});

	// Fading
	animate((function() {
		var height = cache(function() {
			return header.clientHeight * 0.75;
		});

		var tween = tweener(function(k, lastK) {
			// Change colors when we are about to fade in
			if (lastK === 1) {
				changeTheme(true);
			}

			// Prevent any mouse interactions with #projects when not scrolled
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

			// Opacities
			headerbg.style.opacity =
				header.style.opacity = 1 - k; // [1,0]
			projects.style.opacity = k2 * 0.8 + 0.2; // [.2,1]
			bodybg.style.opacity = (1 - k) * 0.85 + 0.25; // [1,.25]

			// Rotations
			prefixed(header.style, "transform", rotateX(k * 90));
			prefixed(projects.style, "transform", rotateX((1 - k) * -60));
		});

		return {
			disabled: isSimple,

			enable: function() {
				var headerHeight = header.clientHeight + "px";
				height.update();

				// Match the header background to the size of the header
				headerbg.style.height = headerHeight;

				// Set the observer's perspective to be level with teh bottom
				// of the header
				prefixed(document.body.style, "perspective-origin-y", headerHeight);

				tween.force();
			},

			disable: function() {
				projects.style.pointerEvents = "";
				headerbg.style.opacity =
					header.style.opacity =
					projects.style.opacity =
					bodybg.style.opacity = "";
				prefixed(header.style, "transform", "");
				prefixed(projects.style, "transform", "");
			},

			draw: function() {
				var k = scrollY() / height();
				k = Math.min(1, k);
				tween(k);
			},
		};
	}()));

	animate({
		disabled: isSimple,
		enable: changeTheme.bind(null, true),
		disable: changeTheme,
	});
};

function isSimple() {
	return isMobile(window.navigator.userAgent) || ! isMinWidth();
}

function isMinWidth() {
	return window.matchMedia ?
		window.matchMedia("(min-width:818px)").matches :
		window.innerWidth >= 818;
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

function theme(onChange) {
	var seed = loadSeedColor() || START_COLOR;

	return function(isColored) {
		var color;

		if (isColored) {
			color = seed = generateColor(seed);
			saveSeedColor(seed);
		}

		onChange(color);
	};
}

function loadSeedColor() {
	START_COLOR.h = Number(window.localStorage.lastColor) || 0;
	return START_COLOR;
}

function rotateX(deg) {
	return "rotateX(" + deg + "deg)";
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

function generateColor(start) {
	var deg = Math.random() * (360 - (2 * MIN_COLOR_CHANGE)),
		seed = start.rotate(deg + MIN_COLOR_CHANGE);
	return seed;
}
