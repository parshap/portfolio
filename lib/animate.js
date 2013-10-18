module.exports = function(effect) {
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
};

function onFrame(fn) {
	window.requestAnimationFrame(function(t) {
		fn(t);
		onFrame(fn);
	});
}
