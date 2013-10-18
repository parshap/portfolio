// jshint browser:true, node:true
"use strict";

var cache = require("./cache");

module.exports = function(canvas, src) {
	var load = createLoader(src);
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

		// Load and draw it
		load(function(image) {
			window.requestAnimationFrame(function() {
				draw(image);
			});
		});
	};

	function draw(image) {
		var c = context();
		if (nextColor) {
			c.fillStyle = nextColor;
			c.globalCompositeOperation = "source-over";
			c.fillRect(0, 0, 400, 500);
			c.globalCompositeOperation = "darken";
		}
		c.drawImage(image, 0,0);
		lastColor = nextColor;
	}
};

// Load the image once and then always return the same value
// If this function is called multiple time while the image is still loading
// Only the last callback will ever be called
function createLoader(src) {
	var image, loaded;
	return function(callback) {
		if (image && loaded) return callback(image);
		if ( ! image) {
			image = new Image();
			image.src = src;
		}
		// This overrides any previous callback waiting to load
		image.onload = function() {
			loaded = true;
			callback(image);
		};
	};
}
