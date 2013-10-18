module.exports = function(fn) {
	var called, val;
	function fetch() {
		return called ? val : fetch.update();
	}
	fetch.update = function() {
		return val = fn();
	};
	return fetch;
};
