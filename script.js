// Nordic Geek - Hovedscript
// Forbedret versjon med bedre feilhåndtering og brukeropplevelse

// Globale variabler
const API_BASE_URL = 'http://localhost:3000';
let currentUser = null;

// Utility-funksjoner
function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 300px;
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => messageDiv.remove(), 300);
    }, 3000);
}

function showLoading(container) {
    if (container) {
        container.innerHTML = `
            <div class="loading-spinner" style="
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 40px;
                font-size: 1.1rem;
                color: #7f8c8d;
            ">
                <div style="
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #e74c3c;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-right: 15px;
                "></div>
                Laster...
            </div>
        `;
    }
}

// Brukerautentisering
function getCurrentUser() {
    try {
        const stored = localStorage.getItem('innloggetBruker');
        return stored ? JSON.parse(stored) : null;
    } catch (e) {
        console.error('Feil ved lesing av brukerdata:', e);
        localStorage.removeItem('innloggetBruker');
        return null;
    }
}

function setCurrentUser(user) {
    currentUser = user;
    if (user) {
        localStorage.setItem('innloggetBruker', JSON.stringify(user));
    } else {
        localStorage.removeItem('innloggetBruker');
    }
    updateUserDisplay();
}

function updateUserDisplay() {
    const brukerDiv = document.getElementById('brukernavn-visning');
    const logoutBtn = document.getElementById('logoutButton');
    
    if (brukerDiv) {
        if (currentUser) {
            const brukernavn = typeof currentUser === 'string' ? currentUser : currentUser.brukernavn;
            brukerDiv.textContent = `Logget inn som: ${brukernavn}`;
            brukerDiv.style.display = 'block';
        } else {
            brukerDiv.textContent = 'Ingen konto';
            brukerDiv.style.display = 'block';
        }
    }
    
    if (logoutBtn) {
        logoutBtn.style.display = currentUser ? 'block' : 'none';
    }
}

// API-kall med forbedret feilhåndtering
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`API-feil (${endpoint}):`, error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            throw new Error('Kan ikke koble til serveren. Sjekk at serveren kjører på port 3000.');
        }
        throw error;
    }
}

// T-skjorte-funksjoner
async function hentTskjorter() {
    const container = document.getElementById('tskjorte-container');
    if (!container) return;
    
    try {
        showLoading(container);
        const tskjorter = await apiCall('/kjop/tskjorter');
        visTskjorter(tskjorter);
    } catch (error) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                <h3>Kunne ikke laste t-skjorter</h3>
                <p>${error.message}</p>
                <button onclick="hentTskjorter()" style="
                    margin-top: 15px;
                    padding: 10px 20px;
                    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                ">Prøv igjen</button>
            </div>
        `;
        showMessage('Kunne ikke laste t-skjorter: ' + error.message, 'error');
    }
}

function visTskjorter(tskjorter) {
    const container = document.getElementById('tskjorte-container');
    if (!container) return;
    
    if (!tskjorter || tskjorter.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                <h3>Ingen t-skjorter tilgjengelig</h3>
                <p>Kom tilbake senere for nye produkter!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = tskjorter.map(tskjorte => `
        <div class="tskjorte" data-id="${tskjorte.id}">
            <h3>${escapeHtml(tskjorte.navn)}</h3>
            <img src="${escapeHtml(tskjorte.bilde)}" 
                 alt="${escapeHtml(tskjorte.navn)}" 
                 class="tskjorte-bilde"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkluZ2VuIGJpbGRlPC90ZXh0Pjwvc3ZnPg=='" />
            <p><strong>Pris:</strong> ${tskjorte.pris} kr</p>
            <p><strong>Farge:</strong> ${escapeHtml(tskjorte.farge)}</p>
            <p><strong>Størrelse:</strong> ${escapeHtml(tskjorte.størrelse)}</p>
            ${currentUser ? `<button class="kjop-btn" onclick="kjopTskjorte(${tskjorte.id})">Kjøp</button>` : 
                '<div style="margin-top: 15px; padding: 10px; background: rgba(231, 76, 60, 0.1); border-radius: 8px; text-align: center; color: #e74c3c;"><a href="login.html" style="color: #e74c3c; text-decoration: none; font-weight: 500;">Logg inn for å kjøpe</a></div>'}
        </div>
    `).join('');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Kjøpsfunksjonalitet
async function kjopTskjorte(tskjorteId) {
    if (!currentUser) {
        showMessage('Du må logge inn for å kjøpe t-skjorter', 'error');
        return;
    }
    
    try {
        const brukernavn = typeof currentUser === 'string' ? currentUser : currentUser.brukernavn;
        const response = await apiCall(`/kjop/${tskjorteId}`, {
            method: 'POST',
            body: JSON.stringify({ brukernavn })
        });
        
        if (response.success) {
            showMessage('T-skjorte kjøpt! Sjekk "Min side" for å se dine kjøp.', 'success');
            
            // Oppdater knappen til "Kjøpt"
            const tskjorteElement = document.querySelector(`[data-id="${tskjorteId}"]`);
            if (tskjorteElement) {
                const kjopBtn = tskjorteElement.querySelector('.kjop-btn');
                if (kjopBtn) {
                    kjopBtn.textContent = '✓ Kjøpt';
                    kjopBtn.style.background = '#27ae60';
                    kjopBtn.disabled = true;
                    kjopBtn.style.cursor = 'default';
                }
            }
        }
    } catch (error) {
        showMessage('Kunne ikke kjøpe t-skjorte: ' + error.message, 'error');
    }
}

// Innloggingsfunksjonalitet
function setupLogin() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const brukernavn = document.getElementById('username').value.trim();
        const passord = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        
        // Skjul tidligere feilmeldinger
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
        
        if (!brukernavn || !passord) {
            errorDiv.textContent = 'Både brukernavn og passord må fylles ut';
            errorDiv.style.display = 'block';
            return;
        }
        
        try {
            // Vis loading på knapp
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Logger inn...';
            submitBtn.disabled = true;
            
            const response = await apiCall('/login', {
                method: 'POST',
                body: JSON.stringify({ brukernavn, passord })
            });
            
            if (response.success) {
                setCurrentUser({ brukernavn: response.brukernavn });
                showMessage('Innlogging vellykket!', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            } else {
                throw new Error(response.error || 'Innlogging feilet');
            }
        } catch (error) {
            errorDiv.textContent = error.message;
            errorDiv.style.display = 'block';
            showMessage('Innlogging feilet: ' + error.message, 'error');
        } finally {
            // Tilbakestill knapp
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.textContent = 'Logg inn';
                submitBtn.disabled = false;
            }
        }
    });
}

// Utloggingsfunksjonalitet
function setupLogout() {
    const logoutBtn = document.getElementById('logoutButton');
    if (!logoutBtn) return;
    
    logoutBtn.addEventListener('click', () => {
        setCurrentUser(null);
        showMessage('Du er nå logget ut', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1000);
    });
}

// Hent brukerens kjøpte t-skjorter
async function hentKjopteTskjorter() {
    if (!currentUser) {
        showMessage('Du må logge inn for å se dine kjøp', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    const container = document.getElementById('solgte-tskjorter');
    if (!container) return;
    
    try {
        showLoading(container);
        const brukernavn = typeof currentUser === 'string' ? currentUser : currentUser.brukernavn;
        const tskjorter = await apiCall(`/minside/${encodeURIComponent(brukernavn)}`);
        visKjopteTskjorter(tskjorter);
    } catch (error) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                <h3>Kunne ikke laste dine kjøp</h3>
                <p>${error.message}</p>
                <button onclick="hentKjopteTskjorter()" style="
                    margin-top: 15px;
                    padding: 10px 20px;
                    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                ">Prøv igjen</button>
            </div>
        `;
        showMessage('Kunne ikke laste kjøpte t-skjorter: ' + error.message, 'error');
    }
}

function visKjopteTskjorter(tskjorter) {
    const container = document.getElementById('solgte-tskjorter');
    if (!container) return;
    
    if (!tskjorter || tskjorter.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                <h3>Ingen kjøp ennå</h3>
                <p>Du har ikke kjøpt noen t-skjorter ennå.</p>
                <a href="index.html" style="
                    display: inline-block; 
                    margin-top: 15px; 
                    padding: 12px 24px; 
                    background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%); 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 8px;
                    font-weight: 500;
                    transition: transform 0.2s ease;
                " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    Se våre produkter
                </a>
            </div>
        `;
        return;
    }
    
    container.innerHTML = tskjorter.map(tskjorte => `
        <div class="tskjorte">
            <h3>${escapeHtml(tskjorte.navn)}</h3>
            <img src="${escapeHtml(tskjorte.bilde)}" 
                 alt="${escapeHtml(tskjorte.navn)}" 
                 class="tskjorte-bilde"
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkluZ2VuIGJpbGRlPC90ZXh0Pjwvc3ZnPg=='" />
            <p><strong>Pris:</strong> ${tskjorte.pris} kr</p>
            <p><strong>Farge:</strong> ${escapeHtml(tskjorte.farge)}</p>
            <p><strong>Størrelse:</strong> ${escapeHtml(tskjorte.størrelse)}</p>
            <div style="
                margin-top: 15px; 
                padding: 12px; 
                background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%); 
                border: 1px solid #c3e6cb; 
                border-radius: 8px; 
                color: #155724;
                text-align: center;
                font-weight: 500;
            ">
                ✓ Kjøpt
            </div>
        </div>
    `).join('');
}

// Hovedinitialisering
function initializePage() {
    console.log('Nordic Geek - Initialiserer side...');
    
    // Sett opp bruker
    currentUser = getCurrentUser();
    updateUserDisplay();
    
    // Sett opp event listeners
    setupLogin();
    setupLogout();
    
    // Last innhold basert på side
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    switch (currentPage) {
        case 'index.html':
        case '':
            hentTskjorter();
            break;
        case 'minside.html':
            if (currentUser) {
                hentKjopteTskjorter();
            } else {
                showMessage('Du må logge inn for å se denne siden', 'error');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            }
            break;
        case 'login.html':
            if (currentUser) {
                showMessage('Du er allerede logget inn', 'info');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
            break;
    }
}

// CSS for animasjoner og meldinger
const additionalCSS = `
@keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.kjop-btn {
    width: 100%;
    padding: 12px;
    margin-top: 15px;
    background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 1rem;
}

.kjop-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(39, 174, 96, 0.3);
}

.kjop-btn:active:not(:disabled) {
    transform: translateY(0);
}

.kjop-btn:disabled {
    opacity: 0.8;
    cursor: default;
}

/* Responsiv forbedring */
@media (max-width: 768px) {
    .message {
        right: 10px !important;
        left: 10px !important;
        max-width: none !important;
    }
}
`;

// Legg til CSS
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);

// Start applikasjonen når DOM er klar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}

// Global error handler for uventede feil
window.addEventListener('error', (e) => {
    console.error('Uventet feil:', e.error);
    showMessage('En uventet feil oppstod. Prøv å laste siden på nytt.', 'error');
});

// Legg til velkommen melding
console.log('Velkommen til Nordic Geek!');