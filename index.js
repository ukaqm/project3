let express = require("express");
let session = require('express-session');
let app = express();

app.use(session({
    secret: 'asd;lfkja;ldfkjlk123389akjdhla987897akjh78111ih',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }
}));



let path = require("path");

let knex = require("knex")({
    client: "pg",
    connection: {
        host: "cougar-cruiser.postgres.database.azure.com",
        user: "admin403",
        password: "nq4yML^boKwZQCwG",
        database: "cougar_cruiser",
        port: 5432
    },
    debug: true
});

let bcrypt = require('bcrypt');
let saltRounds = 10;

function formatDate(dateString) {
    // Parse the date string into a JavaScript Date object
    const date = new Date(dateString);

    // Check if the parsed date is valid
    if (isNaN(date.getTime())) {
        return 'Invalid Date';
    }

    // Format the date
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}

function formatTime(timeString) {
    try {
        const [hours, minutes, seconds] = timeString.split(':');
        const parsedHours = parseInt(hours, 10);
        const parsedMinutes = parseInt(minutes, 10);

        if (isNaN(parsedHours) || isNaN(parsedMinutes)) {
            throw new Error('Invalid Time');
        }

        const period = parsedHours >= 12 ? 'PM' : 'AM';
        const formattedHours = parsedHours % 12 || 12;
        const formattedMinutes = minutes.padStart(2, '0');

        console.log(`Parsed Hours: ${parsedHours}`);
        console.log(`Parsed Minutes: ${parsedMinutes}`);

        return `${formattedHours}:${formattedMinutes} ${period}`;
    } catch (error) {
        return `Invalid Time: ${timeString}`;
    }
}

function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next(); // User is authenticated, proceed to the next function
    }
    // User is not authenticated
    res.redirect('/login');
}





//Changed port to specify what environment our application will be running on
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => res.render("index"));

app.get("/login", (req, res) =>
    res.render("login"));

app.post("/login", (req, res) => {
    // Extract the username and plain text password from the request
    const { username, password } = req.body;

    // Retrieve the user's hashed password from the database
    knex.select('*').from('security').where({ username })
        .then(users => {
            if (users.length === 0) {
                res.status(401).json({ error: 'Invalid username or password' });
                return;
            }

            let user = users[0];
            let hash = users[0].password;

            // Compare the provided password with the stored hash
            bcrypt.compare(password, hash, (err, result) => {
                if (err) {
                    res.status(500).json({ error: 'Error verifying password' });
                    return;
                }

                if (result) {
                    // Login successful
                    req.session.user = { username: user.username, id: user.student_id };
                    res.redirect('/rides');

                } else {
                    // Passwords do not match
                    res.status(401).json({ error: 'Invalid username or password' });
                }
            });
        })
        .catch(error => {
            console.error('Error during login:', error);
            res.status(500).json({ error: error.message || error });
        });
});


app.get("/rides", isAuthenticated, (req, res) => {
    knex.select(
        'r.ride_id',
        'r.start_state',
        'r.start_city',
        'r.start_zip',
        'r.student_driver',
        'r.date_leaving',
        'r.time_leaving',
        'r.end_city',
        'r.end_state',
        'r.end_zip',
        'r.max_students',
        knex.raw('COUNT(sr.student_id) AS current_students'),
        knex.raw('(r.max_students - COUNT(sr.student_id) - 1) AS spots_remaining')
    )
        .from('ride as r')
        .leftJoin('student_ride as sr', 'r.ride_id', 'sr.ride_id')
        .groupBy('r.ride_id')
        .having('r.max_students', '>', knex.raw('COUNT(sr.student_id)'))
        .andHaving(knex.raw('(r.max_students - COUNT(sr.student_id) - 1)'), '>', 0)
        .then(rides => {
            const formattedRides = rides.map(ride => ({
                ...ride,
                formattedDateLeaving: formatDate(ride.date_leaving),
                formattedTimeLeaving: formatTime(ride.time_leaving)
            }));
            console.log(formattedRides);
            res.render("rideDetails", { allRides: formattedRides });
        })

}
);

app.get("/newRide", (req, res) =>
    res.render("addRide"));

app.post("/newRide", (req, res) => {
    knex("ride").insert(req.body).then(rides => {
        res.redirect("/");
    })
}
);

app.get("/signup", (req, res) =>
    res.render("signUp"));


app.post("/signup", (req, res) => {

    // Extract the plain text password from the request
    const plainTextPassword = req.body.password;

    // Hash the password
    bcrypt.hash(plainTextPassword, saltRounds, (err, hash) => {
        if (err) {
            res.status(500).json({ error: 'Error hashing password' });
            return;
        }

        // Start a transaction
        knex.transaction(trx => {
            // insert into the Student table
            return trx.insert({
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                city: req.body.city,
                state: req.body.state,
                zip: req.body.zip,
                email: req.body.email,
                phone_number: req.body.phone_number
            })
                .into('student')
                .returning('student_id')
                .then(studentIds => {
                    // insert into the Security table
                    console.log('Inserted student ID:', studentIds[0]);

                    return trx('security').insert({
                        username: req.body.username,
                        password: hash,
                        student_id: studentIds[0].student_id  // Use the returned student_id
                    });
                })
        })
            .then(() => {

                res.redirect("/"); // Redirect if the transaction is successful
            })
            .catch(error => {
                res.status(500).json({ error }); // Handle errors
            });
    });
});


app.listen(port, () => console.log("Server is running"))