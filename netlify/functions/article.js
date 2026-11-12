/* GET /api/article?url=... -> full readable article text */
const { runHandler } = require("../lib/serverless");
const { handleArticle } = require("../../server.js");

exports.handler = (event) => runHandler((req, url, res) => handleArticle(res, url), event);
