/* GET|POST /api/ai -> Gemini newsroom assistant */
const { runHandler } = require("../lib/serverless");
const { handleAi } = require("../../server.js");

exports.handler = (event) => runHandler((req, url, res) => handleAi(req, res), event);
