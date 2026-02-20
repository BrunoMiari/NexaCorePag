import { db, doc, getDoc, setDoc, updateDoc, collection, addDoc, getDocs, query, orderBy, limit, increment, onSnapshot } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    // --- Data Persistence (Firestore + localStorage fallback) ---
    let reviews = [];
    let isAdmin = sessionStorage.getItem('nexa_admin') === 'true';

    // --- Analytics Tracking ---
    async function trackVisit() {
        const statsRef = doc(db, 'analytics', 'stats');
        const now = new Date();
        const today = now.toLocaleDateString('es-ES').replace(/\//g, '-');

        try {
            // Increment total visits
            await setDoc(statsRef, {
                totalVisits: increment(1),
                lastVisit: now.toISOString(),
                [`dailyVisits.${today}`]: increment(1)
            }, { merge: true });

            // Track unique visitor based on a session flag
            if (!sessionStorage.getItem('nexa_visited')) {
                await updateDoc(statsRef, {
                    uniqueVisitors: increment(1)
                });
                sessionStorage.setItem('nexa_visited', 'true');
            }
        } catch (error) {
            console.warn("NexaCore: Error tracking visit (Firebase not configured?)", error);
            // Fallback to localStorage if Firebase fails/not configured
            let stats = JSON.parse(localStorage.getItem('nexa_stats')) || { totalVisits: 0, uniqueVisitors: 0, dailyVisits: {} };
            stats.totalVisits++;
            if (!sessionStorage.getItem('nexa_visited')) {
                stats.uniqueVisitors++;
                sessionStorage.setItem('nexa_visited', 'true');
            }
            stats.dailyVisits[today] = (stats.dailyVisits[today] || 0) + 1;
            localStorage.setItem('nexa_stats', JSON.stringify(stats));
        }
    }

    trackVisit();

    // --- Reviews Synchronization ---
    const reviewsRef = collection(db, 'reviews');
    const reviewsQuery = query(reviewsRef, orderBy('date', 'desc'));

    onSnapshot(reviewsQuery, (snapshot) => {
        reviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderReviews();
    }, (error) => {
        console.warn("NexaCore: Error loading reviews from Firestore", error);
        // Fallback
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

        // For marquee effect on homepage, duplicate reviews for a seamless loop
        if (!isOpinionesPage && displayReviews.length > 0) {
            reviewsContainer.classList.add('marquee-track');
            displayReviews = [...displayReviews, ...displayReviews];
        } else {
            reviewsContainer.classList.remove('marquee-track');
        }

        displayReviews.forEach((rev, index) => {
            const card = document.createElement('div');
            card.className = 'review-card revealed';

            let stars = '⭐'.repeat(rev.rating);

            card.innerHTML = `
                <div class="stars">${stars}</div>
                <p>"${rev.comment}"</p>
                <div class="review-author">
                    <strong>${rev.name}</strong>
                    <span>${rev.date}</span>
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
                await addDoc(reviewsRef, newReview);
                reviewForm.reset();
                alert('¡Gracias por tu reseña!');
            } catch (error) {
                console.error("Error adding review:", error);
                // Fallback to local
                reviews.unshift(newReview);
                localStorage.setItem('nexa_reviews', JSON.stringify(reviews));
                renderReviews();
            }
        });
    }

    window.deleteReview = async (index) => {
        if (confirm('¿Seguro que quieres borrar esta reseña?')) {
            const reviewToDelete = reviews[index];
            if (reviewToDelete.id) {
                try {
                    await deleteDoc(doc(db, 'reviews', reviewToDelete.id));
                } catch (error) {
                    console.error("Error deleting review:", error);
                }
            } else {
                reviews.splice(index, 1);
                localStorage.setItem('nexa_reviews', JSON.stringify(reviews));
                renderReviews();
            }
        }
    };

    // --- Admin Dashboard Logic ---
    if (adminLoginBtn) {
        adminLoginBtn.addEventListener('click', () => adminModal.style.display = 'block');
    }

    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('admin-user').value;
            const pass = document.getElementById('admin-pass').value;

            if (user === 'Bruno' && pass === 'Bruno2008') {
                isAdmin = true;
                sessionStorage.setItem('nexa_admin', 'true');
                adminModal.style.display = 'none';
                alert('Bienvenido, Bruno. Modo administrador activado.');
                renderReviews();
                showAdminPanel();
            } else {
                alert('Credenciales incorrectas.');
            }
        });
    }

    function showAdminPanel() {
        if (!isAdmin) return;

        let adminBadge = document.getElementById('admin-badge');
        if (!adminBadge) {
            // Create Toggle Badge
            adminBadge = document.createElement('div');
            adminBadge.id = 'admin-badge';
            adminBadge.style.cssText = `
                position: fixed;
                bottom: 20px;
                left: 20px;
                width: 45px;
                height: 45px;
                background: var(--secondary);
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 800;
                font-size: 1.2rem;
                cursor: pointer;
                z-index: 10000;
                box-shadow: 0 4px 15px rgba(0, 168, 232, 0.4);
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                border: 2px solid rgba(255, 255, 255, 0.2);
            `;
            adminBadge.innerText = 'A';

            // Create Menu
            const adminMenu = document.createElement('div');
            adminMenu.id = 'admin-menu';
            adminMenu.style.cssText = `
                position: fixed;
                bottom: 75px;
                left: 20px;
                background: var(--glass);
                backdrop-filter: blur(15px);
                border: 1px solid var(--glass-border);
                padding: 1rem;
                border-radius: 15px;
                z-index: 9999;
                display: none;
                flex-direction: column;
                gap: 8px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                min-width: 150px;
                transform-origin: bottom left;
                transform: scale(0.8);
                opacity: 0;
                transition: all 0.3s ease;
            `;

            adminMenu.innerHTML = `
                <div style="font-size: 0.65rem; color: var(--secondary); margin-bottom: 5px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Admin Central</div>
                <button class="btn btn-primary btn-small" onclick="window.location.href='admin_leads.html'" style="text-align: left; justify-content: flex-start; width: 100%;">📊 Leads</button>
                <button class="btn btn-secondary btn-small" onclick="window.location.href='admin_stats.html'" style="text-align: left; justify-content: flex-start; width: 100%;">📈 Analíticas</button>
                <button class="btn btn-secondary btn-small" onclick="window.location.href='admin_media.html'" style="background: var(--bg-light); border-color: var(--accent); text-align: left; justify-content: flex-start; width: 100%;">📸 Multimedia</button>
                <button class="btn btn-outline btn-small" style="border-color: rgba(255,77,77,0.3); color: #ff4d4d; text-align: left; justify-content: flex-start; width: 100%;" onclick="logoutAdmin()">🚪 Salir</button>
            `;

            document.body.appendChild(adminBadge);
            document.body.appendChild(adminMenu);

            // Toggle Logic
            adminBadge.onclick = () => {
                const isVisible = adminMenu.style.display === 'flex';
                if (isVisible) {
                    adminMenu.style.opacity = '0';
                    adminMenu.style.transform = 'scale(0.8)';
                    setTimeout(() => adminMenu.style.display = 'none', 300);
                    adminBadge.style.transform = 'rotate(0deg) scale(1)';
                } else {
                    adminMenu.style.display = 'flex';
                    setTimeout(() => {
                        adminMenu.style.opacity = '1';
                        adminMenu.style.transform = 'scale(1)';
                    }, 10);
                    adminBadge.style.transform = 'rotate(15deg) scale(1.1)';
                }
            };
        }
    }

    window.logoutAdmin = () => {
        sessionStorage.removeItem('nexa_admin');
        window.location.reload();
    };

    if (isAdmin) showAdminPanel();

    window.openEditModal = (index) => {
        const rev = reviews[index];
        const editIdx = document.getElementById('edit-index');
        const editNm = document.getElementById('edit-name');
        const editDt = document.getElementById('edit-date');
        const editRt = document.getElementById('edit-rating');

        if (editIdx && editNm && editDt && editRt) {
            editIdx.value = index;
            editNm.value = rev.name;
            editDt.value = rev.date;
            editRt.value = rev.rating;
            editModal.style.display = 'block';
        }
    };

    if (editReviewForm) {
        editReviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const index = document.getElementById('edit-index').value;
            const updatedReview = {
                name: document.getElementById('edit-name').value,
                date: document.getElementById('edit-date').value,
                rating: parseInt(document.getElementById('edit-rating').value)
            };

            const reviewToUpdate = reviews[index];
            if (reviewToUpdate.id) {
                try {
                    await updateDoc(doc(db, 'reviews', reviewToUpdate.id), updatedReview);
                    editModal.style.display = 'none';
                    alert('Reseña actualizada correctamente.');
                } catch (error) {
                    console.error("Error updating review:", error);
                }
            } else {
                reviews[index] = { ...reviews[index], ...updatedReview };
                editModal.style.display = 'none';
                localStorage.setItem('nexa_reviews', JSON.stringify(reviews));
                renderReviews();
                alert('Reseña actualizada localmente.');
            }
        });
    }

    // --- Modal Toggles ---
    const closeBtn = document.querySelector('.close');
    const closeEditBtn = document.querySelector('.close-edit');
    if (closeBtn) closeBtn.onclick = () => adminModal.style.display = 'none';
    if (closeEditBtn) closeEditBtn.onclick = () => editModal.style.display = 'none';

    window.onclick = (e) => {
        if (adminModal && e.target == adminModal) adminModal.style.display = 'none';
        if (editModal && e.target == editModal) editModal.style.display = 'none';
    };

    // --- FAQ Logic ---
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', () => {
                item.classList.toggle('active');
            });
        }
    });

    // --- Contact Form ---
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const lead = {
                name: document.getElementById('name')?.value || 'N/A',
                email: document.getElementById('email')?.value || 'N/A',
                message: document.getElementById('message')?.value || 'N/A',
                date: new Date().toLocaleString('es-ES'),
                timestamp: Date.now()
            };

            try {
                await addDoc(collection(db, 'leads'), lead);
                alert('¡Solicitud enviada! Un experto de NexaCore se pondrá en contacto contigo pronto.');
                contactForm.reset();
            } catch (error) {
                console.warn("Error sending lead to Firebase", error);
                // Local fallback
                let leads = JSON.parse(localStorage.getItem('nexa_leads')) || [];
                leads.push(lead);
                localStorage.setItem('nexa_leads', JSON.stringify(leads));
                alert('¡Solicitud enviada! (Guardada localmente)');
                contactForm.reset();
            }
        });
    }

    // --- Initial Render ---
    renderReviews();

    // --- Animations ---
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // --- Dynamic Media Loader ---
    async function loadDynamicMedia() {
        const configRef = doc(db, 'config', 'media');
        let media;

        try {
            const snap = await getDoc(configRef);
            if (snap.exists()) {
                media = snap.data();
            }
        } catch (error) {
            console.warn("Error loading media from Firebase", error);
        }

        if (!media) {
            const legacyData = localStorage.getItem('nexa_media');
            if (legacyData) media = JSON.parse(legacyData);
        }

        if (!media) return;

        // Function to update video/poster
        const updateVideo = (videoEl, srcEl, videoUrl, posterUrl, fit = 'cover', pos = '50% 50%', zoom = 1) => {
            if (!videoEl) return;

            videoEl.style.width = (100 * zoom) + '%';
            videoEl.style.height = (100 * zoom) + '%';
            videoEl.style.objectFit = fit;
            videoEl.style.objectPosition = pos;

            if (videoUrl) {
                if (srcEl) {
                    srcEl.src = videoUrl;
                } else {
                    videoEl.src = videoUrl;
                }
                videoEl.load();
                videoEl.play().catch(() => { });
            } else if (posterUrl) {
                if (srcEl) srcEl.src = "";
                videoEl.src = "";
                videoEl.pause();
                videoEl.load();
            }

            if (posterUrl) videoEl.poster = posterUrl;
        };

        // Hero Video
        const heroVideo = document.getElementById('hero-video-el');
        const heroSrc = document.getElementById('hero-video-src');
        updateVideo(heroVideo, heroSrc, media.heroVideo, media.heroPoster,
            media.heroVideoFit || media.heroPosterFit,
            media.heroVideoPos || media.heroPosterPos,
            media.heroVideoZoom || media.heroPosterZoom || 1);

        // Demo Video
        const demoVideo = document.getElementById('demo-video-el');
        const demoSrc = document.getElementById('demo-video-src');
        updateVideo(demoVideo, demoSrc, media.demoVideo, media.demoPoster,
            media.demoVideoFit || media.demoPosterFit,
            media.demoVideoPos || media.demoPosterPos,
            media.demoVideoZoom || media.demoPosterZoom || 1);

        // Shop Images
        for (let i = 1; i <= 3; i++) {
            const shopDiv = document.getElementById(`shop-img-${i}`);
            const fit = media[`shop${i}Fit`] || 'cover';
            const pos = media[`shop${i}Pos`] || '50% 50%';
            const zoom = media[`shop${i}Zoom`] || 1;
            if (shopDiv && media[`shop${i}`]) {
                shopDiv.innerHTML = `<img src="${media[`shop${i}`]}" alt="Product" style="width:${100 * zoom}%; height:${100 * zoom}%; object-fit: ${fit}; object-position: ${pos}; border-radius:inherit;">`;
                shopDiv.style.background = 'none';
                shopDiv.style.display = 'flex';
                shopDiv.style.alignItems = 'center';
                shopDiv.style.justifyContent = 'center';
                shopDiv.style.overflow = 'hidden';
            }
        }
    }

    // Initialize media on load
    loadDynamicMedia();
    window.refreshMedia = loadDynamicMedia;
});
