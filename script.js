// jshint browser:true, node:true
"use strict";

var fitText = require("./lib/fittext");

var q = document.querySelector.bind(document);

fitText(q("#intro .heading"), 1.4);
