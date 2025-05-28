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
        // Opprett handlekurv-tabell hvis den ikke eksisterer
        createHandlekurvTable();
    }
});

// Opprett handlekurv-tabell
function createHandlekurvTable() {
    const sql = `
        CREATE TABLE IF NOT EXISTS handlekurv (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bruker_id INTEGER NOT NULL,
            tskjorte_id INTEGER NOT NULL,
            antall INTEGER DEFAULT 1,
            opprettet DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (bruker_id) REFERENCES brukere (id),
            FOREIGN KEY (tskjorte_id) REFERENCES tskjorter (id),
            UNIQUE(bruker_id, tskjorte_id)
        )
    `;
    
    db.run(sql, (err) => {
        if (err) {
            console.error('Feil ved opprettelse av handlekurv-tabell:', err.message);
        } else {
            console.log('Handlekurv-tabell klar.');
        }
    });
}

// Hjelpefunksjon for å finne bruker-ID
function findUserId(brukernavn, callback) {
    const sql = `SELECT id FROM brukere WHERE brukernavn = ?`;
    db.get(sql, [brukernavn], callback);
}

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

// ========== HANDLEKURV-ENDEPUNKTER ==========

// Legg til produkt i handlekurv
app.post('/legg-til-handlekurv/:tskjorteId', (req, res) => {
    const tskjorteId = req.params.tskjorteId;
    const { brukernavn } = req.body;

    if (!brukernavn) {
        return res.status(400).json({ error: "Brukernavn må oppgis" });
    }

    findUserId(brukernavn, (err, userRow) => {
        if (err) {
            return res.status(500).json({ error: "Feil ved henting av bruker" });
        }
        if (!userRow) {
            return res.status(404).json({ error: "Bruker ikke funnet" });
        }

        // Sjekk om produktet allerede er i handlekurven
        const checkSql = `SELECT id, antall FROM handlekurv WHERE bruker_id = ? AND tskjorte_id = ?`;
        db.get(checkSql, [userRow.id, tskjorteId], (err, existing) => {
            if (err) {
                return res.status(500).json({ error: "Feil ved sjekking av handlekurv" });
            }

            if (existing) {
                // Øk antallet
                const updateSql = `UPDATE handlekurv SET antall = antall + 1 WHERE id = ?`;
                db.run(updateSql, [existing.id], (err) => {
                    if (err) {
                        return res.status(500).json({ error: "Feil ved oppdatering av handlekurv" });
                    }
                    res.json({ success: true, message: "Antall økt i handlekurv" });
                });
            } else {
                // Legg til nytt produkt
                const insertSql = `INSERT INTO handlekurv (bruker_id, tskjorte_id, antall) VALUES (?, ?, 1)`;
                db.run(insertSql, [userRow.id, tskjorteId], (err) => {
                    if (err) {
                        return res.status(500).json({ error: "Feil ved tillegging til handlekurv" });
                    }
                    res.json({ success: true, message: "Produkt lagt til i handlekurv" });
                });
            }
        });
    });
});

// Hent handlekurv for innlogget bruker
app.get('/handlekurv', (req, res) => {
    const brukernavn = req.query.brukernavn;

    if (!brukernavn) {
        return res.status(400).json({ error: "Brukernavn må oppgis" });
    }

    const sql = `
        SELECT 
            t.*,
            h.antall,
            h.id as handlekurv_id
        FROM handlekurv h
        JOIN brukere b ON h.bruker_id = b.id
        JOIN tskjorter t ON h.tskjorte_id = t.id
        WHERE b.brukernavn = ?
        ORDER BY h.opprettet DESC
    `;

    db.all(sql, [brukernavn], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Feil ved henting av handlekurv" });
        }
        res.json(rows);
    });
});

// Endre antall i handlekurv
app.put('/endre-antall/:tskjorteId', (req, res) => {
    const tskjorteId = req.params.tskjorteId;
    const { antall, brukernavn } = req.body;

    if (!brukernavn || !antall) {
        return res.status(400).json({ error: "Brukernavn og antall må oppgis" });
    }

    findUserId(brukernavn, (err, userRow) => {
        if (err || !userRow) {
            return res.status(404).json({ error: "Bruker ikke funnet" });
        }

        if (antall <= 0) {
            // Fjern produktet hvis antall er 0 eller mindre
            const deleteSql = `DELETE FROM handlekurv WHERE bruker_id = ? AND tskjorte_id = ?`;
            db.run(deleteSql, [userRow.id, tskjorteId], (err) => {
                if (err) {
                    return res.status(500).json({ error: "Feil ved fjerning fra handlekurv" });
                }
                res.json({ success: true, message: "Produkt fjernet fra handlekurv" });
            });
        } else {
            // Oppdater antallet
            const updateSql = `UPDATE handlekurv SET antall = ? WHERE bruker_id = ? AND tskjorte_id = ?`;
            db.run(updateSql, [antall, userRow.id, tskjorteId], (err) => {
                if (err) {
                    return res.status(500).json({ error: "Feil ved oppdatering av antall" });
                }
                res.json({ success: true, message: "Antall oppdatert" });
            });
        }
    });
});

// Fjern produkt fra handlekurv
app.delete('/fjern-fra-handlekurv/:tskjorteId', (req, res) => {
    const tskjorteId = req.params.tskjorteId;
    const { brukernavn } = req.body;

    if (!brukernavn) {
        return res.status(400).json({ error: "Brukernavn må oppgis" });
    }

    findUserId(brukernavn, (err, userRow) => {
        if (err || !userRow) {
            return res.status(404).json({ error: "Bruker ikke funnet" });
        }

        const deleteSql = `DELETE FROM handlekurv WHERE bruker_id = ? AND tskjorte_id = ?`;
        db.run(deleteSql, [userRow.id, tskjorteId], (err) => {
            if (err) {
                return res.status(500).json({ error: "Feil ved fjerning fra handlekurv" });
            }
            res.json({ success: true, message: "Produkt fjernet fra handlekurv" });
        });
    });
});

// Kjøp alt i handlekurv
app.post('/kjop-alt', (req, res) => {
    const { brukernavn } = req.body;

    if (!brukernavn) {
        return res.status(400).json({ error: "Brukernavn må oppgis" });
    }

    findUserId(brukernavn, (err, userRow) => {
        if (err || !userRow) {
            return res.status(404).json({ error: "Bruker ikke funnet" });
        }

        // Hent alt fra handlekurven
        const getHandlekurvSql = `SELECT tskjorte_id, antall FROM handlekurv WHERE bruker_id = ?`;
        db.all(getHandlekurvSql, [userRow.id], (err, handlekurvItems) => {
            if (err) {
                return res.status(500).json({ error: "Feil ved henting av handlekurv" });
            }

            if (handlekurvItems.length === 0) {
                return res.status(400).json({ error: "Handlekurven er tom" });
            }

            // Start transaksjon
            db.serialize(() => {
                db.run("BEGIN TRANSACTION");

                let completed = 0;
                let hasError = false;

                handlekurvItems.forEach((item) => {
                    // Legg til kjøp for hvert antall
                    for (let i = 0; i < item.antall; i++) {
                        const insertKjopSql = `INSERT INTO kjop (bruker_id, tskjorteID) VALUES (?, ?)`;
                        db.run(insertKjopSql, [userRow.id, item.tskjorte_id], (err) => {
                            if (err && !hasError) {
                                hasError = true;
                                db.run("ROLLBACK");
                                return res.status(500).json({ error: "Feil ved registrering av kjøp" });
                            }

                            completed++;
                            const totalOperations = handlekurvItems.reduce((sum, item) => sum + item.antall, 0);

                            if (completed === totalOperations && !hasError) {
                                // Tøm handlekurven
                                const clearHandlekurvSql = `DELETE FROM handlekurv WHERE bruker_id = ?`;
                                db.run(clearHandlekurvSql, [userRow.id], (err) => {
                                    if (err) {
                                        db.run("ROLLBACK");
                                        return res.status(500).json({ error: "Feil ved tømming av handlekurv" });
                                    }

                                    db.run("COMMIT");
                                    res.json({ 
                                        success: true, 
                                        message: "Alle produkter kjøpt!",
                                        antallKjopt: totalOperations
                                    });
                                });
                            }
                        });
                    }
                });
            });
        });
    });
});

// Tøm handlekurv
app.delete('/tom-handlekurv', (req, res) => {
    const { brukernavn } = req.body;

    if (!brukernavn) {
        return res.status(400).json({ error: "Brukernavn må oppgis" });
    }

    findUserId(brukernavn, (err, userRow) => {
        if (err || !userRow) {
            return res.status(404).json({ error: "Bruker ikke funnet" });
        }

        const deleteSql = `DELETE FROM handlekurv WHERE bruker_id = ?`;
        db.run(deleteSql, [userRow.id], (err) => {
            if (err) {
                return res.status(500).json({ error: "Feil ved tømming av handlekurv" });
            }
            res.json({ success: true, message: "Handlekurv tømt" });
        });
    });
});

// ========== EKSISTERENDE ENDEPUNKTER ==========

// Direkte kjøp (beholdt for bakoverkompatibilitet)
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