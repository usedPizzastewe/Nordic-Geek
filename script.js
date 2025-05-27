document.addEventListener("DOMContentLoaded", function() {
    // Logg en velkommen melding når dokumentet er lastet
    console.log("Velkommen til Nordic Geeks!");
});

// Hent t-skjorter fra API-et og vis dem
fetch("http://localhost:3000/kjop/tskjorter")
.then(response => {
    // Hvis svaret ikke er OK, kast en feil
    if (!response.ok) {
        throw new Error("Nettverksfeil");
    }
    // Returner JSON-data hvis forespørselen er vellykket
    return response.json();
})
.then(data => {
    // Vis t-skjortene ved å bruke visTskjorter-funksjonen
    visTskjorter(data);
})
.catch(error => {
    // Logg feilen hvis det oppstår en feil ved henting av t-skjorter
    console.error("Feil under henting av t-skjorter:", error);
});

// Funksjon for å vise t-skjorter på siden
function visTskjorter(tskjorter) {
    const container = document.getElementById("tskjorte-container");

    // Sjekk om containeren finnes i HTML
    if (!container) {
        console.warn("Fant ikke tskjorte-container i HTML");
        return;
    }

    // Gå gjennom hver t-skjorte og legg dem til i containeren
    tskjorter.forEach(tskjorte => {
        const div = document.createElement("div");
        div.classList.add("tskjorte");
        console.log("Hei");

        // Generer HTML for hver t-skjorte
        div.innerHTML = `
            <h3>${tskjorte.navn}</h3>
            <img src=${tskjorte.bilde} alt="${tskjorte.navn}" class="tskjorte-bilde" />
            <p>Pris: ${tskjorte.pris} kr</p>
            <p>Farge: ${tskjorte.farge}</p>
            <p>Størrelse: ${tskjorte.størrelse}</p>
            <p>Design: ${tskjorte.design}</p>
        `;

        // Legg til t-skjorten i containeren
        container.appendChild(div);
    });
}

// Når dokumentet er lastet, vis brukernavn hvis innlogget
document.addEventListener("DOMContentLoaded", function () {
    const brukerDiv = document.getElementById("brukernavn-visning");
    const lagretBruker = localStorage.getItem("innloggetBruker");

    // Sjekk om det er en lagret bruker
    if (brukerDiv) {
        if (lagretBruker) {
            try {
                const bruker = JSON.parse(lagretBruker);
                // Vis brukernavnet til den som er logget inn
                brukerDiv.textContent = `Logget inn som: ${bruker.brukernavn}`;
            } catch (e) {
                // Hvis det oppstår en feil, vis "Ingen konto"
                console.error("Kunne ikke lese bruker fra localStorage");
                brukerDiv.textContent = "Ingen konto";
            }
        } else {
            // Hvis ingen bruker er lagret, vis "Ingen konto"
            brukerDiv.textContent = "Ingen konto";
        }
    }
});

// innlogging via skjema
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", function (e) {
        e.preventDefault();

        // Hent brukernavn og passord fra skjemaet
        const brukernavn = document.getElementById("username").value;
        const passord = document.getElementById("password").value;

        // Send innloggingsforespørsel til serveren
        fetch("http://localhost:3000/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ brukernavn, passord })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                // Hvis innlogging funker, lagre brukernavn i localStorage og gå/naviger til hovedsiden
                localStorage.setItem("innloggetBruker", data.brukernavn);
                window.location.href = "index.html"; // Gå til hovedsiden
            } else {
                // Vis feilmelding hvis innlogging feilet
                document.getElementById("loginError").textContent = data.error || "Innlogging feilet";
            }
        })
        .catch(err => {
            // Logg feilen hvis/når det oppstår en feil ved innlogging
            console.error("Innloggingsfeil:", err);
            document.getElementById("loginError").textContent = "En feil oppsto ved innlogging";
        });
    });
}

// Når dokumentet er lastet, vis innlogget bruker og logg ut knapp
document.addEventListener("DOMContentLoaded", function () {
    const visning = document.getElementById("brukernavn-visning");
    const logoutButton = document.getElementById("logoutButton");
    const bruker = localStorage.getItem("innloggetBruker");

    // Sjekk om man er logget inn, og vis brukernavn
    if (visning) {
        visning.textContent = bruker ? `Logget inn som: ${bruker}` : "Ingen konto";
    }

    // Vis logg ut knapp når man er logget inn
    if (logoutButton) {
        logoutButton.style.display = bruker ? "block" : "none";

        // klikk på logg ut knapp
        logoutButton.addEventListener("click", () => {
            localStorage.removeItem("innloggetBruker");
            window.location.href = "login.html";
        });
    }
});

// Hente dine kjøpte t-skjorter
function hentKjopteTskjorter() {
    const lagretBruker = localStorage.getItem("innloggetBruker");
    if (!lagretBruker) {
        console.warn("Ingen bruker er logget inn.");
        return;
    }

    const brukernavn = lagretBruker.replace(/"/g, ""); // Fjerner eventuelle anførselstegn fra brukernavnet

    // Hent kjøpte t-skjorter for den innlogga brukeren
    fetch(`http://localhost:3000/minside/${brukernavn}`)
        .then(response => response.json())
        .then(data => {
            visKjopteTskjorter(data);
        })
        .catch(error => {
            // Logg feilen hvis det kommer en feil i henting av kjøpte t-skjorter
            console.error("Feil ved henting av kjøpte t-skjorter:", error);
        });
}

// Vis kjøpte t-skjorter på min side
function visKjopteTskjorter(tskjorter) {
    const container = document.getElementById("solgte-tskjorter");
    if (!container) {
        console.warn("Fant ikke 'solgte-tskjorter' container");
        return;
    }

    container.innerHTML = "";

    if (tskjorter.length === 0) {
        container.innerHTML = "<p>Du har ikke kjøpt noen t-skjorter ennå.</p>";
        return;
    }

    // Vis t-skjorter som brukeren har kjøpt
    tskjorter.forEach(tskjorte => {
        const div = document.createElement("div");
        div.classList.add("tskjorte");
        div.innerHTML = `
            <h3>${tskjorte.navn}</h3>
            <img src="${tskjorte.bilde}" alt="${tskjorte.navn}" class="tskjorte-bilde" />
            <p>Pris: ${tskjorte.pris} kr</p>
            <p>Farge: ${tskjorte.farge}</p>
            <p>Størrelse: ${tskjorte.størrelse}</p>
            <p>Design: ${tskjorte.design}</p>
        `;
        container.appendChild(div);
    });
}

// Hvis vi er på minside.html, hent kjøpte t-skjorter
if (window.location.pathname.includes("minside.html")) {
    hentKjopteTskjorter();
}