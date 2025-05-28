// Nordic Geek - Hovedscript
// Enkel versjon med handlekurv

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

// API-kall
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
        throw error;
    }
}

// Handlekurv localStorage funksjoner
function leggTilIHandlekurv(tskjorteId) {
    const handlekurv = JSON.parse(localStorage.getItem('handlekurv') || '[]');
    if (!handlekurv.includes(tskjorteId)) {
        handlekurv.push(tskjorteId);
        localStorage.setItem('handlekurv', JSON.stringify(handlekurv));
        oppdaterHandlekurvTeller();
    }
}

function fjernFraHandlekurvFunc(tskjorteId) {
    let handlekurv = JSON.parse(localStorage.getItem('handlekurv') || '[]');
    handlekurv = handlekurv.filter(id => id !== tskjorteId);
    localStorage.setItem('handlekurv', JSON.stringify(handlekurv));
    oppdaterHandlekurvTeller();
}

function tømHandlekurv() {
    localStorage.removeItem('handlekurv');
    oppdaterHandlekurvTeller();
}

function hentHandlekurv() {
    return JSON.parse(localStorage.getItem('handlekurv') || '[]');
}

function oppdaterHandlekurvTeller() {
    const handlekurv = hentHandlekurv();
    const teller = document.querySelector('.handlekurv-teller');
    if (teller) {
        teller.textContent = handlekurv.length;
        teller.style.display = handlekurv.length > 0 ? 'inline' : 'none';
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
            ${currentUser ? 
                `<button class="legg-til-handlekurv-btn" onclick="leggTilHandlekurv(${tskjorte.id})">
                    🛒 Legg til i handlekurv
                </button>` : 
                '<div style="margin-top: 15px; padding: 10px; background: rgba(231, 76, 60, 0.1); border-radius: 8px; text-align: center; color: #e74c3c;"><a href="login.html" style="color: #e74c3c; text-decoration: none; font-weight: 500;">Logg inn for å handle</a></div>'
            }
        </div>
    `).join('');
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Handlekurv-funksjoner
function leggTilHandlekurv(tskjorteId) {
    if (!currentUser) {
        showMessage('Du må logge inn for å legge produkter i handlekurven', 'error');
        return;
    }
    
    leggTilIHandlekurv(tskjorteId);
    showMessage('Produktet er lagt til i handlekurven!', 'success');
    
    // Oppdater knappen midlertidig
    const tskjorteElement = document.querySelector(`[data-id="${tskjorteId}"]`);
    if (tskjorteElement) {
        const btn = tskjorteElement.querySelector('.legg-til-handlekurv-btn');
        if (btn) {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✓ Lagt til';
            btn.style.background = '#27ae60';
            btn.disabled = true;
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                btn.disabled = false;
            }, 2000);
        }
    }
}

async function hentHandlekurvProdukter() {
    if (!currentUser) {
        showMessage('Du må logge inn for å se handlekurven', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
        return;
    }
    
    const container = document.getElementById('solgte-tskjorter');
    if (!container) return;
    
    try {
        showLoading(container);
        
        const handlekurv = hentHandlekurv();
        
        if (handlekurv.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <h3>Handlekurven er tom</h3>
                    <p>Du har ikke lagt til noen produkter ennå.</p>
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
        
        // Hent produktinfo
        const tskjorter = await apiCall('/kjop/tskjorter');
        const handlekurvProdukter = handlekurv.map(id => tskjorter.find(t => t.id === id)).filter(p => p);
        
        visHandlekurv(handlekurvProdukter);
    } catch (error) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e74c3c;">
                <h3>Kunne ikke laste handlekurven</h3>
                <p>${error.message}</p>
                <button onclick="hentHandlekurvProdukter()" style="
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
        showMessage('Kunne ikke laste handlekurv: ' + error.message, 'error');
    }
}

function visHandlekurv(handlekurvProdukter) {
    const container = document.getElementById('solgte-tskjorter');
    if (!container) return;
    
    const totalSum = handlekurvProdukter.reduce((sum, produkt) => sum + parseInt(produkt.pris), 0);
    
    container.innerHTML = `
        <!-- Sammendrag øverst -->
        <div style="
            margin-bottom: 40px; 
            padding: 30px; 
            background: rgba(255, 255, 255, 0.95); 
            backdrop-filter: blur(20px); 
            border: 1px solid rgba(255, 255, 255, 0.2); 
            border-radius: 16px; 
            text-align: center;
            box-shadow: var(--shadow-soft);
            position: sticky;
            top: 120px;
            z-index: 100;
        ">
            <h3 style="margin: 0 0 15px 0; color: var(--text-primary);">Handlekurv sammendrag</h3>
            <p style="font-size: 1.1rem; margin: 10px 0;">
                <strong>Antall produkter:</strong> ${handlekurvProdukter.length} stk
            </p>
            <p style="font-size: 1.3rem; margin: 15px 0; color: var(--text-primary);">
                <strong>Totalt: ${totalSum} kr</strong>
            </p>
            <button onclick="kjopAlt()" style="
                padding: 16px 32px;
                font-size: 1.2rem;
                font-weight: 600;
                background: var(--primary-gradient);
                color: white;
                border: none;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                margin: 10px;
            " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-hover)';" 
               onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
                🛒 Kjøp alt (${totalSum} kr)
            </button>
        </div>
        
        <!-- Produktliste -->
        <div class="produkt-grid" style="margin-bottom: 40px;">
            ${handlekurvProdukter.map(tskjorte => `
                <div class="tskjorte">
                    <h3>${escapeHtml(tskjorte.navn)}</h3>
                    <img src="${escapeHtml(tskjorte.bilde)}" 
                         alt="${escapeHtml(tskjorte.navn)}" 
                         class="tskjorte-bilde"
                         onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY1Ii/+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkluZ2VuIGJpbGRlPC90ZXh0Pjwvc3ZnPg=='" />
                    <p><strong>Pris:</strong> ${tskjorte.pris} kr</p>
                    <p><strong>Farge:</strong> ${escapeHtml(tskjorte.farge)}</p>
                    <p><strong>Størrelse:</strong> ${escapeHtml(tskjorte.størrelse)}</p>
                    <button onclick="fjernFraHandlekurvKnapp(${tskjorte.id})" style="
                        width: 100%;
                        padding: 8px;
                        margin-top: 10px;
                        background: rgba(231, 76, 60, 0.1);
                        color: #e74c3c;
                        border: 1px solid rgba(231, 76, 60, 0.3);
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.9rem;
                        transition: all 0.2s ease;
                    " onmouseover="this.style.background='#e74c3c'; this.style.color='white';" 
                       onmouseout="this.style.background='rgba(231, 76, 60, 0.1)'; this.style.color='#e74c3c';">
                        Fjern
                    </button>
                </div>
            `).join('')}
        </div>
    `;
}

function fjernFraHandlekurvKnapp(tskjorteId) {
    fjernFraHandlekurvFunc(tskjorteId);
    showMessage('Produktet er fjernet fra handlekurven', 'success');
    hentHandlekurvProdukter();
}

async function kjopAlt() {
    const handlekurv = hentHandlekurv();
    if (handlekurv.length === 0) {
        showMessage('Handlekurven er tom', 'info');
        return;
    }
    
    // Hent produktinfo for å vise hva som ble "kjøpt"
    try {
        const tskjorter = await apiCall('/kjop/tskjorter');
        const handlekurvProdukter = handlekurv.map(id => tskjorter.find(t => t.id === id)).filter(p => p);
        const totalSum = handlekurvProdukter.reduce((sum, produkt) => sum + parseInt(produkt.pris), 0);
        
        // Vis hva som ble kjøpt
        const produktNavn = handlekurvProdukter.map(p => p.navn).join(', ');
        showMessage(`Kjøpt: ${produktNavn} - Totalt: ${totalSum} kr`, 'success');
        
        // Tøm handlekurven
        tømHandlekurv();
        hentHandlekurvProdukter();
        
    } catch (error) {
        showMessage('Handlekurven er tømt!', 'success');
        tømHandlekurv();
        hentHandlekurvProdukter();
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
        
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
        
        if (!brukernavn || !passord) {
            errorDiv.textContent = 'Både brukernavn og passord må fylles ut';
            errorDiv.style.display = 'block';
            return;
        }
        
        try {
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

// Hovedinitialisering
function initializePage() {
    console.log('Nordic Geek - Initialiserer side...');
    
    currentUser = getCurrentUser();
    updateUserDisplay();
    oppdaterHandlekurvTeller();
    
    setupLogin();
    setupLogout();
    
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    switch (currentPage) {
        case 'index.html':
        case '':
            hentTskjorter();
            break;
        case 'handlekurv.html':
            if (currentUser) {
                hentHandlekurvProdukter();
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

// CSS
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

.legg-til-handlekurv-btn {
    width: 100%;
    padding: 12px;
    margin-top: 15px;
    background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 1rem;
}

.legg-til-handlekurv-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(52, 152, 219, 0.3);
}

.legg-til-handlekurv-btn:disabled {
    opacity: 0.8;
    cursor: default;
}

.handlekurv-teller {
    background: #e74c3c;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    margin-left: 8px;
    position: relative;
    top: -2px;
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = additionalCSS;
document.head.appendChild(styleSheet);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}

window.addEventListener('error', (e) => {
    console.error('Uventet feil:', e.error);
    showMessage('En uventet feil oppstod. Prøv å laste siden på nytt.', 'error');
});

console.log('Velkommen til Nordic Geek!');