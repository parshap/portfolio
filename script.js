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
		size = Math.round(size);
		el.style.fontSize = size + "px";
	}

	resize();
	["orientationchange", "resize"].forEach(function(event) {
		window.addEventListener(event, resize);
	});
}

var html = document.querySelector("html"),
	heading = document.querySelector("#intro .heading"),
	homeLinks = document.querySelectorAll(".link-home"),
	btnPortfolio = document.querySelector("#btn-portfolio");

fitText(heading, { scale: 1.35 });

Array.prototype.forEach.call(homeLinks, function(el) {
	el.addEventListener("click", function(e) {
		html.className = "home";
		e.preventDefault();
	});
});

btnPortfolio.addEventListener("click", function(e) {
	html.className = "portfolio";
	e.preventDefault();
});
