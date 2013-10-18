var re = /Android|BlackBerry|iPhone|iPad|iPod|IEMobile|Opera Mini|webOS/i;

module.exports = function() {
	return re.test(window.navigator.userAgent);
};
