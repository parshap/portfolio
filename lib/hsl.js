// jshint node:true
"use strict";

module.exports = HSL;

function HSL(h, s, l, a) {
	if ( ! (this instanceof HSL)) {
		return new HSL(h, s, l, a);
	}

	this.h = h || 0;
	this.s = s || 0;
	this.l = l || 0;
	this.a = (typeof a === "undefined") ? 1 : a;
}

HSL.prototype = {
	lighten: function(k) {
		var l = clamp(this.l + (this.l * k));
		return new HSL(this.h, this.s, l);
	},

	darken: function(k) {
		return this.lighten(-k);
	},

	saturate: function(k) {
		var s = clamp(this.s + (this.s * k));
		return new HSL(this.h, s, this.l);
	},

	desaturate: function(k) {
		return this.saturate(-k);
	},

	rotate: function(deg) {
		var h = (this.h + deg) % 360;
		return new HSL(h, this.s, this.l);
	},

	fade: function(k) {
		var a = this.a - (this.a * k);
		return new HSL(this.h, this.s, this.l, a);
	},

	clone: function() {
		return new HSL(this.h, this.s, this.l);
	},

	toString: function() {
		var type = this.a === 1 ? "hsl" : "hsla";
		var vals = [this.h, percentage(this.s), percentage(this.l)];
		if (type === "hsla") vals.push(this.a);
		return type + "(" + vals.join(",") + ")";
	},
};

function percentage(val) {
	return (val * 100) + "%";
}

// Clamp to value to [0, 1]
function clamp(val) {
	return Math.min(1, Math.max(0, val));
}
