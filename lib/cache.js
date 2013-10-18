// jshint node:true
"use strict";
module.exports = function(fn) {
	var called, val;
	function fetch() {
		return called ? val : fetch.update();
	}
	fetch.update = function() {
		called = true;
		return val = fn();
	};
	return fetch;
};
