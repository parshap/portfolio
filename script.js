// jshint browser:true, node:true
"use strict";

var fitText = require("./lib/fittext");

var q = document.querySelector.bind(document);

fitText(q("#intro .heading"), 1.4);

(function() {
	var color = require("color");
	var ctx = q("#photo").getContext("2d");
	var intro = q("#intro");
	var startColor = "#ff8500";
	var image, loaded, shouldDraw, height, lastColor;

	(function request() {
		window.requestAnimationFrame(function(dt) {
			draw(dt);
			request();
		});
	})();

	function createImage() {
		image = new Image();
		image.src = "images/parshap.jpg";
		image.onload = function() {
			loaded = true;
		};
	}

	function draw() {
		var isBig = window.document.documentElement.clientWidth > 768;

		if (isBig !== shouldDraw) {
			shouldDraw = isBig;
			if (shouldDraw) {
				height = intro.clientHeight * 0.9;
			}
		}

		if ( ! shouldDraw) {
			intro.style.backgroundColor = "";
			return;
		}

		var scrollY = Math.min(window.scrollY / height, 1);

		// Update color
		var c = getColor(scrollY);
		if (c !== lastColor ) {
			console.log(c);
			ctx.fillStyle = intro.style.backgroundColor = c;
			lastColor = c;
		}

		if ( ! image ) {
			createImage();
		}

		if (loaded) {
			ctx.globalCompositeOperation = "source-over";
			ctx.fillRect(0, 0, 400, 500);
			ctx.globalCompositeOperation = "luminosity";
			ctx.drawImage(image, 0,0);
		}
	}

	function getColor(scrollY) {
		return color(startColor)
			.desaturate(1 * scrollY)
			.hslString();
	}
})();
