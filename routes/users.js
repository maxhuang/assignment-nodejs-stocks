var express = require("express");
var router = express.Router();

var bcrypt = require("bcrypt");
var jwt = require("jsonwebtoken");

var errorResponse = require("../utils/errorTools");

/**
 * POST /user/login
 * Log in to existing account
 */
router.post("/login", (req, res, next) => {
  let userEmail = req.body.email;
  let userPassword = req.body.password;

  if (!userEmail || !userPassword) {
    errorResponse(res, 400,
      "Request body invalid - email and password are required"
    );
    return;
  }

  req.db.select("*")
    .from("users")
    .where("email", "=", userEmail)
    .then((users) => {
      if (users.length === 0) {
        errorResponse(res, 401,
          "Incorrect email or password"
        );
        return;
      }

      // check password validity
      const userDetail = users[0];
      if (!bcrypt.compareSync(userPassword, userDetail.password)) {
        errorResponse(res, 401,
          "Incorrect email or password"
        );
        return;
      }

      // generate JWT token
      const secretKey = process.env.SECRET_KEY;
      const expireInSec = 60 * 60 * 24; // 24 hours
      const expireInMs = expireInSec * 1000;
      const expireDate = Date.now() + expireInMs;
      const authToken = jwt.sign({
        "email": userEmail,
        "exp": expireDate
      }, secretKey);

      res.status(200)
        .json({
          "token": authToken,
          "token_type": "Bearer",
          "expires_in": expireInSec
        });
    })
    .catch((err) => {
      console.error(err);
    });
});

/**
 * POST /user/register
 * Create a new user account
 */
router.post("/register", (req, res, next) => {
  // SANITISE FIELDS HERE
  // SANITISE PARAMS

  let userEmail = req.body.email;
  let userPassword = req.body.password;

  if (!userEmail || !userPassword) {
    errorResponse(res, 400,
      "Request body incomplete - email and password needed"
    );
    return;
  }

  let userFieldRe = new RegExp("^[ -~]{1,72}$");
  if (!userFieldRe.test(userEmail) || !userFieldRe.test(userPassword)) {
    errorResponse(res, 400,
      "Request body invalid. Only alphanumeric and common symbols may be used. The length must be between 1 and 72."
    );
    return;
  }

  req.db.select("*")
    .from("users")
    .where("email", "=", userEmail)
    .then((users) => {
      if (users.length !== 0) {
        errorResponse(res, 409,
          "User already exists!"
        );
        return;
      }

      // Insert user into database
      const saltRounds = 10;
      const passwordHash = bcrypt.hashSync(userPassword, saltRounds);
      req.db.from("users")
        .insert({
          "email": userEmail,
          "password": passwordHash
        })
        .then(() => {
          res.status(201)
            .json({
              "success": true,
              "message": "User created"
            });
        })
        .catch((err) => {
          console.error(err);
        });
    })
    .catch((err) => {
      console.error(err);
    });
});

module.exports = router;
