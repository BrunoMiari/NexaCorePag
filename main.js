// Configuración integrada de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDWPVO1Fl9kU0BSwnGfb_rJVnoxPhQLdLI",
    authDomain: "nexacore-733c9.firebaseapp.com",
    projectId: "nexacore-733c9",
    storageBucket: "nexacore-733c9.firebasestorage.app",
    messagingSenderId: "695132076215",
    appId: "1:695132076215:web:ccc891cfa18e3a859d3532",
    measurementId: "G-31E16WZNVM"
};

// Inicializar Firebase (Versión Compat)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const storage = firebase.storage();

document.addEventListener('DOMContentLoaded', async () => {
    // --- Data Persistence ---
    let reviews = [];
    let isAdmin = sessionStorage.getItem('nexa_admin') === 'true';

    // --- Analytics Tracking ---
    async function trackVisit() {
        const statsRef = db.collection('analytics').doc('stats');
        const now = new Date();
        const today = now.toLocaleDateString('es-ES').replace(/\//g, '-');

        try {
            await statsRef.set({
                totalVisits: firebase.firestore.FieldValue.increment(1),
                lastVisit: now.toISOString(),
                [`dailyVisits.${today}`]: firebase.firestore.FieldValue.increment(1)
            }, { merge: true });

            if (!localStorage.getItem('nexa_visited')) {
                await statsRef.set({ uniqueVisitors: firebase.firestore.FieldValue.increment(1) }, { merge: true });
                localStorage.setItem('nexa_visited', 'true');
            }
        } catch (error) {
            console.warn("NexaCore: Firebase offline, using local stats");
            let stats = JSON.parse(localStorage.getItem('nexa_stats')) || { totalVisits: 0, uniqueVisitors: 0, dailyVisits: {} };
            stats.totalVisits++;
            stats.dailyVisits[today] = (stats.dailyVisits[today] || 0) + 1;
            localStorage.setItem('nexa_stats', JSON.stringify(stats));
        }
    }

    trackVisit();

    // --- Reviews Synchronization ---
    db.collection('reviews').orderBy('timestamp', 'desc').onSnapshot((snapshot) => {
        reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderReviews();
    }, (error) => {
        console.warn("NexaCore: Error loading reviews", error);
        reviews = JSON.parse(localStorage.getItem('nexa_reviews')) || [];
        renderReviews();
    });

    // --- Selectors ---
    const reviewsContainer = document.getElementById('reviews-container');
    const reviewForm = document.getElementById('review-form');
    const adminModal = document.getElementById('admin-modal');
    const editModal = document.getElementById('edit-modal');
    const adminLoginBtn = document.getElementById('admin-login-btn');
    const adminLoginForm = document.getElementById('admin-login-form');
    const editReviewForm = document.getElementById('edit-review-form');

    // --- Render Functions ---
    function renderReviews() {
        if (!reviewsContainer) return;
        reviewsContainer.innerHTML = '';

        const isOpinionesPage = window.location.pathname.includes('opiniones.html');
        let displayReviews = isOpinionesPage ? reviews : reviews.slice(0, 5);

        if (!isOpinionesPage && displayReviews.length > 0) {
            reviewsContainer.classList.add('marquee-track');
            displayReviews = [...displayReviews, ...displayReviews];
        }

        displayReviews.forEach((rev, index) => {
            const card = document.createElement('div');
            card.className = 'review-card revealed';
            let stars = '⭐'.repeat(rev.rating || 5);

            card.innerHTML = `
                <div class="stars">${stars}</div>
                <p>"${rev.comment || ''}"</p>
                <div class="review-author">
                    <strong>${rev.name || 'Anónimo'}</strong>
                    <span>${rev.date || ''}</span>
                </div>
                ${isAdmin ? `
                <div class="admin-controls">
                    <button class="btn btn-small btn-outline" onclick="openEditModal(${index % reviews.length})">Editar</button>
                    <button class="btn btn-small btn-outline" style="border-color: #ff4d4d; color: #ff4d4d;" onclick="deleteReview(${index % reviews.length})">Borrar</button>
                </div>` : ''}
            `;
            reviewsContainer.appendChild(card);
        });
    }

    // --- Review Actions ---
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newReview = {
                name: document.getElementById('rev-name').value,
                rating: parseInt(document.getElementById('rev-rating').value),
                comment: document.getElementById('rev-comment').value,
                date: new Date().toLocaleString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
                timestamp: Date.now()
            };

            try {
                await db.collection('reviews').add(newReview);
                reviewForm.reset();
                alert('¡Gracias por tu reseña!');
            } catch (error) {
                reviews.unshift(newReview);
                localStorage.setItem('nexa_reviews', JSON.stringify(reviews));
                renderReviews();
            }
        });
    }

    window.deleteReview = async (index) => {
        if (confirm('¿Borrar reseña?')) {
            const rev = reviews[index];
            if (rev.id) await db.collection('reviews').doc(rev.id).delete();
            else {
                reviews.splice(index, 1);
                localStorage.setItem('nexa_reviews', JSON.stringify(reviews));
                renderReviews();
            }
        }
    };

    // --- Admin Login ---
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('admin-user').value;
            const pass = document.getElementById('admin-pass').value;

            if (user === 'Bruno' && pass === 'Bruno2008') {
                isAdmin = true;
                sessionStorage.setItem('nexa_admin', 'true');
                adminModal.style.display = 'none';
                alert('Bienvenido, Bruno.');
                renderReviews();
                showAdminPanel();
                window.location.href = 'admin_stats.html';
            } else {
                alert('Credenciales incorrectas.');
            }
        });
    }

    function showAdminPanel() {
        if (!isAdmin || document.getElementById('admin-badge')) return;

        const badge = document.createElement('div');
        badge.id = 'admin-badge';
        badge.innerHTML = 'A';
        badge.style.cssText = `position:fixed; bottom:20px; left:20px; width:45px; height:45px; background:var(--secondary); color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:800; cursor:pointer; z-index:10000;`;
        
        const menu = document.createElement('div');
        menu.id = 'admin-menu';
        menu.style.cssText = `position:fixed; bottom:75px; left:20px; background:var(--glass); backdrop-filter:blur(15px); padding:1rem; border-radius:15px; z-index:9999; display:none; flex-direction:column; gap:8px; border:1px solid var(--glass-border);`;
        menu.innerHTML = `
            <button class="btn btn-primary btn-small" onclick="window.location.href='admin_leads.html'">📊 Leads</button>
            <button class="btn btn-secondary btn-small" onclick="window.location.href='admin_stats.html'">📈 Analíticas</button>
            <button class="btn btn-outline btn-small" onclick="logoutAdmin()">🚪 Salir</button>
        `;

        badge.onclick = () => {
            const isVisible = menu.style.display === 'flex';
            menu.style.display = isVisible ? 'none' : 'flex';
        };

        document.body.appendChild(badge);
        document.body.appendChild(menu);
    }

    window.logoutAdmin = () => {
        sessionStorage.removeItem('nexa_admin');
        window.location.reload();
    };

    if (isAdmin) showAdminPanel();

    // --- Contact Form ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button[type="submit"]');
            btn.innerText = 'Enviando...';
            
            const lead = {
                name: document.getElementById('name')?.value || 'N/A',
                email: document.getElementById('email')?.value || 'N/A',
                subject: document.getElementById('subject')?.value || 'General',
                message: document.getElementById('message')?.value || 'N/A',
                date: new Date().toLocaleString('es-ES'),
                timestamp: Date.now()
            };

            try {
                await db.collection('leads').add(lead);
                alert('¡Solicitud enviada!');
                contactForm.reset();
            } catch (error) {
                console.warn("Saving lead locally");
                let leads = JSON.parse(localStorage.getItem('nexa_leads')) || [];
                leads.push(lead);
                localStorage.setItem('nexa_leads', JSON.stringify(leads));
            } finally {
                btn.innerText = 'Enviar Mensaje';
            }
        });
    }

    // --- Animations & Media ---
    async function loadDynamicMedia() {
        try {
            const snap = await db.collection('config').doc('media').get();
            if (snap.exists) {
                const media = snap.data();
                const video = document.getElementById('hero-video-el');
                if (video && media.heroVideo) {
                    video.src = media.heroVideo;
                    video.load();
                }
            }
        } catch (e) {}
    }
    loadDynamicMedia();
});
