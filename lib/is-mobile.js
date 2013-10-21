var re = /Android|BlackBerry|iPhone|iPad|iPod|IEMobile|Opera Mini|Opera Mobi|webOS/i;

module.exports = function(userAgent) {
	return re.test(userAgent);
};
