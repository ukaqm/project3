let express = require("express");

let app = express();

let path = require("path");

app.get("/", (req, res) => res.sendFile(path.join(__dirname + "/index.html")));

app.get("/login", (req, res))