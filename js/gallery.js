document.addEventListener('DOMContentLoaded', () => {
    initGalleryLightbox();
});

function initGalleryLightbox() {
    const container = document.body;
    let lightbox = document.getElementById('lightbox');

    // Create lightbox if it doesn't exist
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <img id="lightbox-img" src="" alt="Full size render">
                <button class="lightbox-close">&times;</button>
            </div>
        `;
        document.body.appendChild(lightbox);

        // Close on background click
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox || e.target.classList.contains('lightbox-close')) {
                closeLightbox();
            }
        });
    }

    const lightboxImg = document.getElementById('lightbox-img');

    // Use event delegation for dynamic items
    container.addEventListener('click', (e) => {
        const item = e.target.closest('.gallery-zoom-item');
        if (!item) return;

        // Don't open if editing text
        if (item.getAttribute('contenteditable') === 'true') return;

        // Extract image URL from background-image
        const style = window.getComputedStyle(item);
        const bgImage = style.backgroundImage;

        // Extract url(...) content
        // Computed style format is usually: url("http://...")
        const urlMatch = bgImage.match(/url\((['"]?)(.*?)\1\)/);

        if (urlMatch && urlMatch[2]) {
            const imageUrl = urlMatch[2];
            lightboxImg.src = imageUrl;
            openLightbox();
        }
    });

    // Handle ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeLightbox();
        }
    });
}

function openLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.add('visible');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
}

function closeLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (lightbox) {
        lightbox.classList.remove('visible');
        document.body.style.overflow = ''; // Restore scrolling

        // Optional: clear src after animation to prevent flashing old image next open
        setTimeout(() => {
            const img = document.getElementById('lightbox-img');
            if (img) img.src = '';
        }, 300);
    }
}
