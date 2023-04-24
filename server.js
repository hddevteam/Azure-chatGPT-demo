/* eslint-disable no-unused-vars */
const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();

const apiRouter = require("./api");

app.use(bodyParser.json());
app.use(express.static("public"));
app.use("/api", apiRouter);

const server = app.listen(process.env.PORT || 3000, () => console.log("Server is running"));
const close = () => server.close();
module.exports = { app, close };