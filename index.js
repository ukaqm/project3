let express = require("express");

let app = express();

let path = require("path");

const knex = require("knex")({
    client: "pg",
    connection: {
        host: "cougar-cruiser.postgres.database.azure.com",
        user: "admin403",
        password: "nq4yML^boKwZQCwG",
        database: "cougar_cruiser",
        port: 5432
    }
});

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
    const [hours, minutes] = timeString.split(':');
    let formattedTime;

    try {
        const parsedHours = parseInt(hours, 10);
        const period = parsedHours >= 12 ? 'PM' : 'AM';
        const formattedHours = parsedHours % 12 || 12; // Convert 0 to 12 for 12-hour format
        formattedTime = `${formattedHours}:${minutes} ${period}`;
    } catch (error) {
        formattedTime = 'Invalid Time';
    }

    return formattedTime;
}



//Changed port to specify what environment our application will be running on
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => res.render("index"));

app.get("/login", (req, res) =>
    res.render("login"))

app.get("/rides", (req, res) => {
    knex.select(
        'r.ride_id',
        'r.start_state',
        'r.start_city',
        'r.start_zip',
        'r.student_driver',
        'r.time_leaving',
        'r.date_leaving',
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
        .having('r.max_students', '>', knex.raw('COUNT(sr.student_id)')).then(rides => {
            const formattedRides = rides.map(ride => ({
                ...ride,
                formattedDateLeaving: formatDate(ride.date_leaving),
                formattedTimeLeaving: formatTime(ride.time_leaving)
            }));
            console.log(formattedRides);
            res.render("rideDetails", { allRides: formattedRides });
        })

}
)

app.listen(port, () => console.log("Server is running"))