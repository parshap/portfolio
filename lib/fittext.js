// Non-jQuery port of https://github.com/davatron5000/FitText.js
module.exports = function(el, k) {
	if (typeof k === "undefined") k = 1;
	k = k / 10;

	function resize() {
		window.requestAnimationFrame(function() {
			var size = el.clientWidth * k;
			size = Math.round(size);
			el.style.fontSize = size + "px";
		});
	}

	resize();
	["orientationchange", "resize"].forEach(function(event) {
		window.addEventListener(event, resize);
	});
};
