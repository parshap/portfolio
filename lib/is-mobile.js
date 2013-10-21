var AGENTS = [
	"Android",
	"Android",
	"BlackBerry",
	"iPhone",
	"iPad",
	"iPod",
	"IEMobile",
	"Opera Mini",
	"Opera Mobi",
	"Opera Tablet",
	"webOS",
];

var re = new RegExp(AGENTS.join("|"), "i");

module.exports = function(userAgent) {
	return re.test(userAgent);
};
