var express = require("express");
var router = express.Router();

const yaml = require("yamljs");
const swaggerUI = require("swagger-ui-express");

const swaggerDocument = yaml.load("./docs/swagger.yaml");

/**
 * Display the swagger docs
 */
router.use("/", swaggerUI.serve);
// ensure UI is only served on a GET request
router.get("/", swaggerUI.setup(swaggerDocument));

module.exports = router;
