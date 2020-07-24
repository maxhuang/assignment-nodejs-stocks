var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

// setup header middleware
var helmet = require("helmet");
var cors = require("cors");

var httpRedirect = express();

// view engine setup
httpRedirect.use(logger("common"));
httpRedirect.use(helmet());
httpRedirect.use(cors());
httpRedirect.use(express.json());
httpRedirect.use(express.urlencoded({ extended: false }));
httpRedirect.use(cookieParser());
httpRedirect.use(express.static(path.join(__dirname, "public")));

// setup a logging level equivalent to Apache default
logger.token("req", (req, res) => JSON.stringify(req.headers));
logger.token("res", (req, res) => {
  let headers = {};
  res.getHeaderNames().map((h) => {
    headers[h] = res.getHeader(h);
  });
  return JSON.stringify(headers);
});

// setup hsts header for one month including subdomains
const timeToPin = 60 * 60 * 24 * 30;
httpRedirect.use(helmet.hsts({
  maxAge: timeToPin
}));

httpRedirect.use("*", (req, res) => {
  res.redirect("https://" + req.headers.host + req.url);
});

module.exports = httpRedirect;
