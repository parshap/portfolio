// jshint browser:true
"use strict";

// Non-jQuery port of https://github.com/davatron5000/FitText.js
function fitText(el, options) {
	options = options || {};
	var scale = options.scale || 1,
		min = parseFloat(options.minFontSize) || Number.NEGATIVE_INFINITY,
		max = parseFloat(options.maxFontSize) || Number.POSITIVE_INFINITY,
		k = scale / 10;

	function resize() {
		var size = el.clientWidth * k;
		size = Math.min(size, max);
		size = Math.max(size, min);
		el.style.fontSize = size + "px";
	}

	resize();
	["orientationchange", "resize"].forEach(function(event) {
		window.addEventListener(event, resize);
	});
}

var heading = document.querySelector("h1");
fitText(heading, { scale: 1.35 });
