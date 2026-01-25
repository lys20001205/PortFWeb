/* ============================================
   Portfolio Animations - Jules-inspired
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    initScrollAnimations();
    initNavbar();
    initProjectCards();
    initSmoothScroll();
});

/* ============================================
   Scroll-triggered Animations
   ============================================ */
function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -100px 0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');

                // Stagger children if applicable
                if (entry.target.classList.contains('stagger-children')) {
                    const children = entry.target.children;
                    Array.from(children).forEach((child, index) => {
                        setTimeout(() => {
                            child.style.opacity = '1';
                            child.style.transform = 'translateY(0)';
                        }, index * 100);
                    });
                }
            }
        });
    }, observerOptions);

    // Observe all animated elements
    const animatedElements = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .stagger-children');
    animatedElements.forEach(el => observer.observe(el));
}

/* ============================================
   Navbar Scroll Effect
   ============================================ */
function initNavbar() {
    const nav = document.querySelector('.nav');
    if (!nav) return;

    let lastScrollY = window.scrollY;
    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                if (window.scrollY > 100) {
                    nav.classList.add('nav-scrolled');
                } else {
                    nav.classList.remove('nav-scrolled');
                }

                // Hide/show on scroll direction
                if (window.scrollY > lastScrollY && window.scrollY > 200) {
                    nav.style.transform = 'translateY(-100%)';
                } else {
                    nav.style.transform = 'translateY(0)';
                }

                lastScrollY = window.scrollY;
                ticking = false;
            });
            ticking = true;
        }
    });
}

/* ============================================
   Project Cards - 3D Tilt Effect
   ============================================ */
function initProjectCards() {
    const cards = document.querySelectorAll('.project-card');

    cards.forEach(card => {
        card.addEventListener('mousemove', handleCardTilt);
        card.addEventListener('mouseleave', resetCardTilt);
        card.addEventListener('mouseenter', handleCardEnter);
    });
}

function handleCardTilt(e) {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
}

function resetCardTilt(e) {
    const card = e.currentTarget;
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
}

function handleCardEnter(e) {
    const card = e.currentTarget;
    card.style.transition = 'transform 0.15s ease-out';

    setTimeout(() => {
        card.style.transition = 'none';
    }, 150);
}

/* ============================================
   Smooth Scroll for Anchor Links
   ============================================ */
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);

            if (target) {
                const offsetTop = target.offsetTop - 80; // Account for fixed nav

                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/* ============================================
   Cursor Glow Effect (optional enhancement)
   ============================================ */
function initCursorGlow() {
    const glow = document.createElement('div');
    glow.classList.add('cursor-glow');
    document.body.appendChild(glow);

    document.addEventListener('mousemove', (e) => {
        glow.style.left = e.clientX + 'px';
        glow.style.top = e.clientY + 'px';
    });
}

/* ============================================
   Page Transition Helper
   ============================================ */
function navigateWithTransition(url) {
    document.body.classList.add('page-transitioning');

    setTimeout(() => {
        window.location.href = url;
    }, 300);
}

// Expose for use in HTML
window.navigateWithTransition = navigateWithTransition;
