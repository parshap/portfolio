// jshint node:true
"use strict";

module.exports = HSL;

function HSL(h, s, l) {
	if ( ! this) {
		return new HSL(h, s, l);
	}

	this.h = h || 0;
	this.s = s || 0;
	this.l = l || 0;
}

HSL.prototype = {
	lighten: function(k) {
		this.l = clamp(this.l + (this.l * k));
		return this;
	},

	darken: function(k) {
		return this.lighten(-k);
	},

	saturate: function(k) {
		this.s = clamp(this.s + (this.s * k));
		return this;
	},

	desaturate: function(k) {
		return this.saturate(-k);
	},

	rotate: function(deg) {
		this.h = (this.h + deg) % 360;
		return this;
	},

	clone: function() {
		return new HSL(this.h, this.s, this.l);
	},

	toArray: function() {
		return [this.h, this.s, this.l];
	},

	toString: function() {
		return "hsl(" + [this.h, percentage(this.s), percentage(this.l)]
			.join(",") + ")";
	},
};

forEachProp(function(prop) {
	HSL.prototype["set" + prop.toUpperCase()] = function(val) {
		this[prop] = val;
		return this;
	};
});

function forEachProp(fn) {
	["h", "s", "l"].forEach(fn);
}

function percentage(val) {
	return (val * 100) + "%";
}

// Clamp to value to [0, 1]
function clamp(val) {
	return Math.min(1, Math.max(0, val));
}
