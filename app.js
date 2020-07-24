var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");

// setup environment variables
require("dotenv").config();

// setup header middleware
var helmet = require("helmet");
var cors = require("cors");

// setup database connection
var options = require("./knexfile");
var knex = require("knex")(options);

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("common"));
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// propagate knex connection using middleware req
app.use((req, res, next) => {
  req.db = knex;
  next();
});

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
app.use(helmet.hsts({
  maxAge: timeToPin
}));

var indexRouter = require("./routes/index");
var stocksRouter = require("./routes/stocks")
var usersRouter = require("./routes/users");

app.use("/", indexRouter);
app.use("/stocks", stocksRouter);
app.use("/user", usersRouter);

// catch 404 and respond with JSON error message
app.use((req, res, next) => {
  res.status(404)
    .json({
      error: true,
      message: "Not Found"
    });
});

// error handler for malformed JSON in post requests

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
