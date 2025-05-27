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

// MANGLENDE KJØP-FUNKSJONALITET - LEGG TIL DENNE:
app.post('/kjop/:tskjorteId', (req, res) => {
    const tskjorteId = req.params.tskjorteId;
    const { brukernavn } = req.body;

    if (!brukernavn) {
        return res.status(400).json({ error: "Brukernavn må oppgis" });
    }

    // Først, finn bruker-ID basert på brukernavn
    const findUserSql = `SELECT id FROM brukere WHERE brukernavn = ?`;
    db.get(findUserSql, [brukernavn], (err, userRow) => {
        if (err) {
            console.error("Feil ved henting av bruker:", err);
            return res.status(500).json({ error: "Feil ved henting av bruker" });
        }

        if (!userRow) {
            return res.status(404).json({ error: "Bruker ikke funnet" });
        }

        // Sjekk om t-skjorten eksisterer
        const checkTshirtSql = `SELECT id FROM tskjorter WHERE id = ?`;
        db.get(checkTshirtSql, [tskjorteId], (err, tshirtRow) => {
            if (err) {
                console.error("Feil ved sjekking av t-skjorte:", err);
                return res.status(500).json({ error: "Feil ved sjekking av t-skjorte" });
            }

            if (!tshirtRow) {
                return res.status(404).json({ error: "T-skjorte ikke funnet" });
            }

            // Sjekk om brukeren allerede har kjøpt denne t-skjorten
            const checkPurchaseSql = `SELECT id FROM kjop WHERE bruker_id = ? AND tskjorteID = ?`;
            db.get(checkPurchaseSql, [userRow.id, tskjorteId], (err, existingPurchase) => {
                if (err) {
                    console.error("Feil ved sjekking av eksisterende kjøp:", err);
                    return res.status(500).json({ error: "Feil ved sjekking av kjøp" });
                }

                if (existingPurchase) {
                    return res.status(400).json({ error: "Du har allerede kjøpt denne t-skjorten" });
                }

                // Legg til kjøpet i databasen
                const insertPurchaseSql = `INSERT INTO kjop (bruker_id, tskjorteID) VALUES (?, ?)`;
                db.run(insertPurchaseSql, [userRow.id, tskjorteId], function(err) {
                    if (err) {
                        console.error("Feil ved registrering av kjøp:", err);
                        return res.status(500).json({ error: "Feil ved registrering av kjøp" });
                    }

                    console.log(`T-skjorte ${tskjorteId} kjøpt av bruker ${brukernavn} (ID: ${userRow.id})`);
                    res.json({ 
                        success: true, 
                        message: "T-skjorte kjøpt!", 
                        purchaseId: this.lastID 
                    });
                });
            });
        });
    });
});

// Hent kjøpte t-skjorter for en bruker
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

// Start server
app.listen(port, () => {
    console.log(`Serveren kjører på http://localhost:${port}`);
});