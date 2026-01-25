document.addEventListener('DOMContentLoaded', () => {
    initGalleryZoom();
});

function initGalleryZoom() {
    const container = document.body;
    let activeItem = null;

    // Use event delegation for dynamic items (editor mode)
    container.addEventListener('click', (e) => {
        // If we are currently zoomed, any click should close it (unless it's on the item itself? No, even then better to close usually, or toggle)
        if (activeItem) {
            deactivateZoom(activeItem);
            activeItem = null;
            return;
        }

        const item = e.target.closest('.gallery-zoom-item');
        if (!item) return;

        // Don't zoom if we are editing text inside or doing something else
        if (item.getAttribute('contenteditable') === 'true') return;

        // Toggle Zoom
        if (item.classList.contains('zoomed')) {
            deactivateZoom(item);
            activeItem = null;
        } else {
            activateZoom(item);
            activeItem = item;
            e.stopPropagation(); // Prevent immediate closing by document listener if we had one
        }
    });

    // Handle ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && activeItem) {
            deactivateZoom(activeItem);
            activeItem = null;
        }
    });
}

function activateZoom(element) {
    const rect = element.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;

    // Target dimensions (85% of viewport)
    const targetW = winW * 0.85;
    const targetH = winH * 0.85;

    // Calculate scale to fit
    const scaleX = targetW / rect.width;
    const scaleY = targetH / rect.height;
    const scale = Math.min(scaleX, scaleY); // Fit within both dimensions

    // Calculate translation to center
    // Current center
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Window center
    const wcX = winW / 2;
    const wcY = winH / 2;

    // Delta
    const tx = wcX - cx;
    const ty = wcY - cy;

    // Apply variables
    element.style.setProperty('--zoom-scale', scale);
    element.style.setProperty('--zoom-tx', `${tx}px`);
    element.style.setProperty('--zoom-ty', `${ty}px`);

    element.classList.add('zoomed');
}

function deactivateZoom(element) {
    element.classList.remove('zoomed');
    // Optional: wait for transition to finish before removing vars? 
    // Not strictly necessary if variables default to identity in CSS.
}
