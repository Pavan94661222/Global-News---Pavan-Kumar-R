/* GET /api/news -> RapidAPI "Real-Time News Data" backup feed */
const { runHandler } = require("../lib/serverless");
const { handleBackupNews } = require("../../server.js");

exports.handler = (event) => runHandler((req, url, res) => handleBackupNews(res, url), event);
