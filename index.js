let express = require("express");

let app = express();

let path = require("path");

//Changed port to specify what environment our application will be running on
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true}));

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => res.render("index"));

app.get("/login", (req, res) =>
    res.render("login"))

app.listen(port, () => console.log("Server is running"))