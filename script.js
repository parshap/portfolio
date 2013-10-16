// jshint browser:true, node:true
"use strict";

var fitText = require("./lib/fittext");

var q = document.querySelector.bind(document);

fitText(q("#intro .heading"), 1.4);

(function() {
	var color = require("color");
	var ctx = q("#photo").getContext("2d");
	var intro = q("#intro");
	var introContainer = intro.querySelector(".container");
	var projects = q("#portfolio");
	var projectsContainer = projects.querySelector("#projects");
	var startColor = randomColor();
	var shouldDraw, height;
	var lastScroll;
	var fgcolor = color("#ffffff");

	intro.style.backgroundColor = ctx.fillStyle = startColor;

	intro.style.color = color(startColor).mix(fgcolor, 0.7).hslString();
	intro.querySelector(".heading").style.color =
		color(startColor).mix(fgcolor, 0.8).hslString();

	(function request() {
		window.requestAnimationFrame(function() {
			draw();
			request();
		});
	})();

	function randomColor() {
		return color("hsl(0, 30%, 75%)")
			.rotate(Math.random() * 360)
			.hslString();
	}

	function draw() {
		var isBig = matchMedia("(min-width:768px)").matches;

		if (isBig !== shouldDraw) {
			shouldDraw = isBig;
			if (shouldDraw) {
				height = intro.clientHeight * 0.95;
			}
		}

		if ( ! shouldDraw) {
			introContainer.style.webkitTransform = "";
			intro.style.opacity = "";
			projectsContainer.style.webkitTransform = "";
			projects.style.opacity = "";
			lastScroll = null;
			return;
		}

		var scroll = Math.min(window.scrollY / height, 1);

		drawHeading(scroll);
		drawProjects(scroll);
		lastScroll = scroll;
	}

	function drawHeading(scroll) {
		drawImage();

		if (scroll !== lastScroll && scroll < 1) {
			introContainer.style.webkitTransform =
				"translate3d(0, -" + (scroll * height * 0.15) + "px, 0)";
			intro.style.opacity = 1 - scroll;
		}
	}

	var hasProjectsTranslate;
	function drawProjects(scroll) {
		if (scroll !== lastScroll && scroll < 1) {
			hasProjectsTranslate = true;
			projectsContainer.style.webkitTransform =
				"translate3d(0, " + ((1 - scroll) * height * 0.15) + "px, 0)";
			projects.style.opacity = scroll * 0.5 + 0.5;
		}

		if (scroll === 1 && hasProjectsTranslate) {
			projectsContainer.style.webkitTransform = "";
			projects.style.opacity = "";
			hasProjectsTranslate = false;
		}
	}

	var image, loaded;
	function createImage() {
		image = new Image();
		image.src = "images/parshap.jpg";
		image.onload = function() {
			loaded = true;
		};
	}

	var drawnImage;
	function drawImage() {
		if (drawnImage) {
			return;
		}

		if ( ! image ) {
			createImage();
		}

		if (loaded) {
			ctx.globalCompositeOperation = "source-over";
			ctx.fillRect(0, 0, 400, 500);
			ctx.globalCompositeOperation = "darken";
			ctx.drawImage(image, 0,0);
			drawnImage = true;
		}
	}
})();
