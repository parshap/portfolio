require("raf.js");

module.exports = function(effect) {
	var prev;
	onFrame(function(time) {
		var enabled = ( ! effect.enabled || effect.enabled()) &&
			( ! effect.disabled || ! effect.disabled());
		if (enabled) {
			if (prev !== true) {
				if (effect.enable) effect.enable();
				prev = true;
			}
			if (effect.draw) effect.draw(time);
		}
		else {
			if (prev !== false) {
				if (effect.disable) effect.disable();
				prev = false;
			}
		}
	});
};

function onFrame(fn) {
	window.requestAnimationFrame(function(t) {
		fn(t);
		onFrame(fn);
	});
}
