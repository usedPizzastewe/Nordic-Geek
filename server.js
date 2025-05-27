const express = require('express'); // Lager server
const sqlite3 = require('sqlite3').verbose(); // Database
const bodyParser = require('body-parser'); // Leser data
const bcrypt = require('bcrypt'); // For kryptering
const saltRounds = 10; // Krypteringsnivå

const app = express(); // Starter appen
const cors = require('cors');
app.use(cors()); // Tillat frontend
const port = 3000; // Port

app.use(express.json()); // Bruk JSON
app.use(express.urlencoded({ extended: true })); // Bruk skjema

// Skriv ut alt som skjer
app.use((req, res, next) => {
    console.log(`Mottatt ${req.method} forespørsel til ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    next();
});

// Koble til databasen
let db = new sqlite3.Database('./nordicgeeks.db', (err) => {
    if (err) {
        console.error('Feil ved tilkobling til databasen:', err.message);
    } else {
        console.log('Tilkoblet til SQLite-database.');
    }
});

app.get('/', (req, res) => {
    res.send('Velkommen til Nordic Geeks API!'); // Enkel test
});

app.get('/kjop/tskjorter', (req, res) => {
    const sql = `SELECT * FROM tskjorter`; // Hent alle t-skjorter
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows); // Send tilbake t-skjorter
    });
});

// Legg til ny bruker
app.post('/bruker', async (req, res) => {
    const { brukernavn, passord, email } = req.body;

    if (!brukernavn || !passord || !email) {
        return res.status(400).json({ error: "Alle felt må fylles ut" });
    }

    try {
        const hashedPassword = await bcrypt.hash(passord, saltRounds); // Krypter passord
        const sql = `INSERT INTO brukere (brukernavn, passord, email) VALUES (?, ?, ?)`;
        db.run(sql, [brukernavn, hashedPassword, email], function(err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID }); // Send tilbake ID
        });
    } catch (error) {
        res.status(500).json({ error: "Noe gikk galt med kryptering" });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Serveren kjører på http://localhost:${port}`);
});

// Logg inn
app.post('/login', (req, res) => {
    const { brukernavn, passord } = req.body;

    if (!brukernavn || !passord) {
        return res.status(400).json({ error: "Brukernavn og passord må fylles ut" });
    }

    const sql = `SELECT * FROM brukere WHERE brukernavn = ?`;
    db.get(sql, [brukernavn], async (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!row) {
            return res.status(401).json({ error: "Feil brukernavn eller passord" });
        }

        try {
            const match = await bcrypt.compare(passord, row.passord); // Sjekk passord
            if (match) {
                res.json({ success: true, brukernavn: row.brukernavn }); // Innlogging OK
            } else {
                res.status(401).json({ error: "Feil brukernavn eller passord" });
            }
        } catch (error) {
            res.status(500).json({ error: "Noe gikk galt ved sjekking av passord" });
        }
    });
});

// Hent kjøpte t-skjorter for ein bruker
app.get('/minside/:brukernavn', (req, res) => {
    const brukernavn = req.params.brukernavn;

    const sql = `
        SELECT tskjorter.*
        FROM kjop
        JOIN brukere ON kjop.bruker_id = brukere.id
        JOIN tskjorter ON kjop.tskjorteID = tskjorter.id
        WHERE brukere.brukernavn = ?
    `;

    db.all(sql, [brukernavn], (err, rows) => {
        if (err) {
            console.error("Feil ved henting av kjøpte t-skjorter:", err);
            return res.status(500).json({ error: "Noe gikk galt på serveren." });
        }

        res.json(rows); // Send kjøpte t-skjorter
    });
});