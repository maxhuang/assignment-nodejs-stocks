var express = require("express");
var router = express.Router();

const authVerify = require("../utils/authTools");
const errorResponse = require("../utils/errorTools");

/**
 * Authentication middleware for validating JWT header
 * GET /authed/:stockSymbol
 */
router.get("/authed/:stockSymbol", (req, res, next) => {
  const authHeader = req.headers.authorization;
  let authToken = "";

  // retrieve token
  if (authHeader && authHeader.split(" ").length === 2) {
    authToken = authHeader.split(" ")[1];
    if (authVerify(authToken)) {
      next();
    } else {
      errorResponse(res, 403,
        "Authorisation header is invalid"
      );
    }
  } else {
    errorResponse(res, 403,
      "Authorisation header not found"
    );
  }
});

/**
 * GET /stocks/symbols
 * Returns all available stocks, optionally filtered by
 * industry sector
 */
router.get("/symbols", (req, res, next) => {
  const queryWhitelist = [
    "industry"
  ];
  let queryUnknown = Object.keys(req.query).filter((query) => {
    return !queryWhitelist.includes(query);
  });
  if (queryUnknown.length) {
    res.status(400)
      .json({
        "error": true,
        "message": "Invalid query parameter: only 'industry' is permitted"
      });
    return;
  }

  let searchIndustry = "";
  if (req.query["industry"] !== undefined) {
    searchIndustry = req.query["industry"];
  }

  req.db.select("name", "symbol", "industry")
    .from("stocks")
    .where("industry", "like", `%${searchIndustry}%`)
    .distinct("name")
    .then((rows) => {
      if (rows.length) {
        res.status(200)
          .json(rows);
      } else {
        res.status(404)
          .json({
            "error": true,
            "message": "Industry sector not found"
          });
      }
    })
    .catch((err) => {
      console.error(err);
    });
});

/**
 * GET /stocks/{symbol}
 * Returns the latest entry for a particular stock searched
 * by symbol (1-5 upper case letters).
 */
router.get("/:stockSymbol", (req, res, next) => {
  // different error messages can be implemented but are
  // optional
  let queryUnknown = Object.keys(req.query);
  if (queryUnknown.length) {
    res.status(400)
      .json({
        "error": true,
        "message": "Date parameters only available on authenticated route /stocks/authed"
      });
    return;
  }

  let validStockSymbolRe = new RegExp("^[A-Z]{1,5}$");
  if (!validStockSymbolRe.test(req.params.stockSymbol)) {
    res.status(400)
      .json({
        "error": true,
        "message": "Stock symbol incorrect format - must be 1-5 capital letters"
      });
    return;
  }

  let selectFilter = [
    "timestamp",
    "symbol",
    "name",
    "industry",
    "open",
    "high",
    "low",
    "close",
    "volumes"
  ];

  req.db.select(selectFilter)
    .from("stocks")
    .where({
      symbol: req.params.stockSymbol
    })
    .then((rows) => {
      if (rows.length) {
        res.status(200)
          .json(rows[0]);
      } else {
        res.status(404)
          .json({
            "error": true,
            "message": "No entry for symbol in stocks database"
          });
      }
    })
    .catch((err) => {
      console.error(err);
    });
});

/**
 * GET /stocks/authed/{symbol}
 * Return entries of stock searched by symbol, optionally
 * filtered by date.
 */
router.get("/authed/:stockSymbol", (req, res, next) => {
  // DEBUG ADD AUTHORISATION VALIDATION
  let validStockSymbolRe = new RegExp("^[A-Z]{1,5}$");
  if (!validStockSymbolRe.test(req.params.stockSymbol)) {
    res.status(400)
      .json({
        "error": true,
        "message": "Stock symbol incorrect format - must be 1-5 capital letters"
      });
    return;
  }

  const queryWhitelist = [
    "from",
    "to"
  ];
  let queryUnknown = Object.keys(req.query).filter((query) => {
    return !queryWhitelist.includes(query);
  });
  if (queryUnknown.length) {
    res.status(400)
      .json({
        "error": true,
        "message": "Parameters allowed are 'from' and 'to', example: /stocks/authed/AAL?from=2020-03-15"
      });
    return;
  }

  // Check that from and to dates given are valid
  let searchDateRange = false;
  if (req.query.from) {
    if (!isNaN(Date.parse(req.query.from))) {
      searchDateRange = true;
    } else {
      res.status(400)
        .json({
          "error": true,
          "message": "From date cannot be parsed by Date.parse()"
        });
      return;
    }
  }
  if (req.query.to) {
    if (!isNaN(Date.parse(req.query.to))) {
      searchDateRange = true;
    } else {
      res.status(400)
        .json({
          "error": true,
          "message": "To date cannot be parsed by Date.parse()"
        });
      return;
    }
  }

  // date range is implemented as from <= stock date < to
  // By default, the response will be a single object. It
  // at least one valid to or from query is supplied with
  // a valid date then the response will be an array of
  // stock objects.
  let selectFilter = [
    "timestamp",
    "symbol",
    "name",
    "industry",
    "open",
    "high",
    "low",
    "close",
    "volumes"
  ];
  let result = req.db.select(selectFilter)
    .from("stocks")
    .where("symbol", "=", req.params.stockSymbol);
  if (searchDateRange) {
    result
      .then((rawRows) => {
        let rows = rawRows.filter((row) => {
          // database times are in New York (ET) UTC-04:00 timezone
          let rowDate = new Date(row.timestamp);
          // will be in local time if no timezone is specified
          let fromDate = new Date(req.query.from);
          let toDate = new Date(req.query.to);
          return (
            (!fromDate.toJSON() ^ (rowDate >= fromDate))
            && (!toDate.toJSON() ^ (rowDate < toDate))
          );
        });
        if (rows.length) {
          res.status(200)
            .json(rows);
        } else {
          res.status(404)
            .json({
              "error": true,
              "message": "No entries available for query symbol for supplied date range"
            })
        }
      })
      .catch((err) => {
        console.error(err);
      });
  } else {
    result
      .then((rows) => {
        if (rows.length) {
          res.status(200)
            .json(rows[0]);
        } else {
          res.status(404)
            .json({
              "error": true,
              "message": "No entry for symbol in stocks database"
            });
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }

});

module.exports = router;
