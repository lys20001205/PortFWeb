(function () {
    // Configuration
    const REPO_OWNER = 'lys20001205';
    const REPO_NAME = 'PortFWeb';
    const UPLOAD_DIR = 'assets/uploads/';

    // Dynamically detect current file path from URL
    function getCurrentFilePath() {
        let path = window.location.pathname;
        // Remove leading slash
        if (path.startsWith('/')) path = path.substring(1);
        // Handle root/empty path
        if (!path || path === '' || path.endsWith('/')) path = 'index.html';
        // Decode URL encoding
        path = decodeURIComponent(path);
        return path;
    }

    // State
    let isEditing = false;
    let editorUI = null;
    let imageToolbar = null;
    let styleElement = null;

    // Image Editing State
    let currentEditingImage = null;
    let pendingFile = null;
    let isDragMode = false;

    // Drag State (Image Content)
    let dragStartX = 0;
    let dragStartY = 0;
    let initialPosX = 50;
    let initialPosY = 50;

    // Drag State (Toolbar Window)
    let toolbarDragStartX = 0;
    let toolbarDragStartY = 0;
    let toolbarInitialLeft = 0;
    let toolbarInitialTop = 0;
    let isToolbarDragging = false;

    function injectStyles() {
        if (document.getElementById('editor-styles')) return;

        styleElement = document.createElement('style');
        styleElement.id = 'editor-styles';
        styleElement.innerHTML = `
            .editable-active {
                outline: 2px dashed #3b82f6;
                cursor: text;
            }
            .editable-active:hover {
                background: rgba(59, 130, 246, 0.1);
            }
            .editable-img {
                cursor: pointer;
                position: relative;
            }
            .editable-img:hover {
                outline: 4px solid #ef4444;
            }
            .editable-img::after {
                content: 'EDIT IMAGE';
                position: absolute;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                background: black;
                color: white;
                padding: 5px 10px;
                font-size: 12px;
                border-radius: 4px;
                pointer-events: none;
                display: none;
                z-index: 10;
            }
            .editable-img:hover::after {
                display: block;
            }
            .editable-img.drag-active {
                cursor: move !important;
                outline: 4px dashed #10b981;
            }
            .editable-img.drag-active::after {
                content: 'DRAG TO MOVE';
                background: #10b981;
            }

            /* Main Editor UI */
            #editor-ui {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: #1f2937;
                padding: 10px 20px;
                border-radius: 8px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
                display: flex;
                gap: 10px;
                z-index: 9999;
                border: 1px solid #374151;
                font-family: sans-serif;
            }
            #editor-ui button, #image-toolbar button {
                background: #3b82f6;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                font-size: 14px;
            }
            #editor-ui button.save-btn { background: #10b981; }
            #editor-ui button.download-btn { background: #6b7280; }
            #editor-ui button:hover, #image-toolbar button:hover { opacity: 0.9; }

            /* Image Toolbar */
            #image-toolbar {
                position: fixed;
                top: 50%;
                left: 50%;
                /* We remove transform translate here so we can control top/left explicitly for dragging.
                   Instead, we set initial margins or rely on JS to center it first. */
                background: #111827;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
                display: none;
                flex-direction: column;
                gap: 15px;
                z-index: 10000;
                border: 1px solid #4b5563;
                width: 320px;
                color: white;
                font-family: sans-serif;
            }
            #image-toolbar h3 {
                margin: 0 0 10px 0;
                font-size: 18px;
                text-align: center;
                color: white;
                cursor: grab; /* Indicates draggable */
                user-select: none;
                background: #1f2937;
                margin: -20px -20px 10px -20px; /* Stretch to edges */
                padding: 15px;
                border-radius: 12px 12px 0 0;
                border-bottom: 1px solid #374151;
            }
            #image-toolbar h3:active { cursor: grabbing; }

            #image-toolbar .control-group { display: flex; flex-direction: column; gap: 5px; }
            #image-toolbar label { font-size: 12px; color: #9ca3af; display: flex; justify-content: space-between; }
            #image-toolbar input[type="range"] { width: 100%; cursor: pointer; }
            #image-toolbar .actions { display: flex; gap: 10px; justify-content: center; margin-top: 10px; flex-wrap: wrap;}
            #image-toolbar .status-msg { font-size: 12px; text-align: center; margin-top: 5px; min-height: 1.5em; word-break: break-word;}

            .status-error { color: #ef4444; }
            .status-success { color: #10b981; }
            .status-loading { color: #3b82f6; }

            /* File Input Hidden */
            #img-upload-input { display: none; }

            /* Asset Browser */
            #asset-browser {
                max-height: 200px;
                overflow-y: auto;
                background: #1f2937;
                border: 1px solid #374151;
                border-radius: 6px;
                padding: 8px;
                display: none;
            }
            #asset-browser.visible { display: block; }
            .asset-item {
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px;
                border-radius: 4px;
                cursor: pointer;
                transition: background 0.2s;
            }
            .asset-item:hover { background: #374151; }
            .asset-item img, .asset-item video {
                width: 50px;
                height: 50px;
                object-fit: cover;
                border-radius: 4px;
                border: 1px solid #4b5563;
            }
            .asset-item span {
                font-size: 11px;
                color: #9ca3af;
                word-break: break-all;
                word-break: break-all;
                flex: 1;
            }
            .add-entry-trigger {
                display: none; /* Hidden by default */
                background: #10b981;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                font-weight: bold;
                cursor: pointer;
                margin: 20px auto;
                width: fit-content;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
            }
            #debug-overlay {
                position: fixed;
                top: 10px;
                left: 10px;
                background: rgba(0, 0, 0, 0.8);
                color: #0f0;
                font-family: monospace;
                padding: 5px 10px;
                border-radius: 4px;
                z-index: 99999;
                pointer-events: none;
                font-size: 12px;
                display: none;
                border: 1px solid #0f0;
            }
            .primary-add-btn {
                display: block; /* Always visible */
                background: #3b82f6; /* Blue to distinguish */
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                font-weight: bold;
                cursor: pointer;
                margin: 20px auto;
                width: fit-content;
                box-shadow: 0 4px 6px rgba(0,0,0,0.3);
                transition: background 0.2s;
            }
            .primary-add-btn:hover {
                background: #2563eb;
            }
            .editing-mode .add-entry-trigger {
                display: block; /* Visible in edit mode */
            }
            .add-entry-trigger:hover {
                background: #059669;
            }
        `;
        document.head.appendChild(styleElement);
    }

    window.toggleEditor = function () {
        isEditing = !isEditing;
        const body = document.body;

        if (isEditing) {
            injectStyles();
            body.classList.add('editing-mode');
            enableEditing();

            showUI();
            debugAction('Editor Enabled');
        } else {
            body.classList.remove('editing-mode');
            disableEditing();
            hideUI();
            hideImageToolbar();
        }
    };

    function enableEditing() {
        // Text Elements - expanded selectors for new page structure
        const textSelectors = '.slide h1, .slide h2, .slide h3, .slide h4, .slide h5, .slide h6, .slide p, .slide span, .slide li, .slide a, .meta-value, .meta-label, section h1, section h2, section h3, section h4, section p, section span, section li, .hero h1, .hero p, .hero-description, .hero-badge span, .about-content h2, .about-content p, .project-card h3, .project-card p, .section-header h2, .section-header p, .footer h2, .footer p, .skill-tag, .nav-logo';
        const elements = document.querySelectorAll(textSelectors);
        elements.forEach(el => {
            el.contentEditable = "true";
            el.classList.add('editable-active');
        });

        // Image placeholders
        const placeholders = document.querySelectorAll('.img-placeholder');
        placeholders.forEach(el => {
            el.classList.add('editable-img');
            el.onclick = function (e) {
                if (!isEditing) return;
                // If in drag mode (content), don't reopen toolbar
                if (isDragMode) return;

                e.preventDefault(); // Prevent parent link navigation
                e.stopPropagation();
                openImageToolbar(el);
            };
        });
    }

    function disableEditing() {
        const textSelectors = '[contenteditable="true"]';
        const elements = document.querySelectorAll(textSelectors);
        elements.forEach(el => {
            el.removeAttribute('contenteditable');
            el.classList.remove('editable-active');
        });

        const placeholders = document.querySelectorAll('.img-placeholder');
        placeholders.forEach(el => {
            el.classList.remove('editable-img');
            el.onclick = null;
        });

        if (isDragMode) toggleDragMode();
    }

    function showUI() {
        if (!document.getElementById('editor-ui')) {
            editorUI = document.createElement('div');
            editorUI.id = 'editor-ui';
            editorUI.innerHTML = `
                <span style="color:white; align-self:center; margin-right:10px;">Editing Mode</span>
                <button onclick="saveToGitHub()" class="save-btn" title="Save page HTML to GitHub">Save Page</button>
                <button onclick="downloadBackup()" class="download-btn" title="Download local copy">Backup</button>
                <button onclick="clearCredentials()" style="background:#ef4444;" title="Clear saved GitHub token">Clear Token</button>
                <button onclick="toggleEditor()">Exit</button>
            `;
            document.body.appendChild(editorUI);
        }
        document.getElementById('editor-ui').style.display = 'flex';
        createImageToolbar();
    }

    function hideUI() {
        const ui = document.getElementById('editor-ui');
        if (ui) ui.style.display = 'none';
        debugAction('UI Hidden');
    }

    function debugAction(action) {
        // Only show debug output if we are in editing mode
        if (!isEditing) {
            const existingOverlay = document.getElementById('debug-overlay');
            if (existingOverlay) existingOverlay.style.display = 'none';
            return;
        }

        let overlay = document.getElementById('debug-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'debug-overlay';
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'block';
        const time = new Date().toLocaleTimeString();
        overlay.innerText = `[${time}] User Action: ${action}`;

        // Optional: fade out logic could go here, but keeping it simple/persistent for now
    }

    function createImageToolbar() {
        if (document.getElementById('image-toolbar')) return;

        imageToolbar = document.createElement('div');
        imageToolbar.id = 'image-toolbar';
        imageToolbar.innerHTML = `
            <h3 id="toolbar-header">Media Editor</h3>

            <div class="control-group">
                <button onclick="document.getElementById('img-upload-input').click()">Select Image / Video / GIF</button>
                <input type="file" id="img-upload-input" accept="image/*,video/*,.gif">
            </div>

            <div class="control-group">
                <button id="btn-browse-assets" onclick="fetchGitHubAssets()" style="background:#6366f1;">Browse GitHub Assets</button>
                <div id="asset-browser"></div>
            </div>

            <div class="control-group">
                <label>Zoom (Size) <span id="val-scale">Cover</span></label>
                <input type="range" id="img-scale" min="10" max="200" value="100">
            </div>

            <div class="control-group" style="text-align:center;">
                <button id="btn-drag-toggle" onclick="toggleDragMode()" style="background:#8b5cf6; width:100%;">Enable Drag Move</button>
                <p style="font-size:10px; color:#6b7280; margin-top:4px;">(Click to drag image)</p>
            </div>

            <div class="status-msg" id="img-status-msg"></div>

            <div class="actions">
                <button id="btn-upload-img" onclick="uploadImageToGitHub()" style="background:#10b981; display:none;">Upload & Save URL</button>
                <button onclick="closeImageToolbar()" style="background:#6b7280;">Done</button>
            </div>
        `;
        document.body.appendChild(imageToolbar);

        // Event Listeners
        document.getElementById('img-upload-input').addEventListener('change', handleFileSelect);
        document.getElementById('img-scale').addEventListener('input', updateImageStyle);

        // Toolbar Drag Listener
        document.getElementById('toolbar-header').addEventListener('mousedown', onToolbarDragStart);
    }

    // --- Toolbar Drag Logic ---
    function onToolbarDragStart(e) {
        e.preventDefault();
        isToolbarDragging = true;

        toolbarDragStartX = e.clientX;
        toolbarDragStartY = e.clientY;

        const toolbar = document.getElementById('image-toolbar');
        const rect = toolbar.getBoundingClientRect();

        // We set styles to fixed left/top based on current rect to ensure smooth pickup
        toolbar.style.left = rect.left + 'px';
        toolbar.style.top = rect.top + 'px';
        toolbar.style.transform = 'none'; // Clear any centering transform

        toolbarInitialLeft = rect.left;
        toolbarInitialTop = rect.top;

        window.addEventListener('mousemove', onToolbarDragMove);
        window.addEventListener('mouseup', onToolbarDragEnd);
    }

    function onToolbarDragMove(e) {
        if (!isToolbarDragging) return;
        e.preventDefault();

        const deltaX = e.clientX - toolbarDragStartX;
        const deltaY = e.clientY - toolbarDragStartY;

        const toolbar = document.getElementById('image-toolbar');
        toolbar.style.left = (toolbarInitialLeft + deltaX) + 'px';
        toolbar.style.top = (toolbarInitialTop + deltaY) + 'px';
    }

    function onToolbarDragEnd(e) {
        isToolbarDragging = false;
        window.removeEventListener('mousemove', onToolbarDragMove);
        window.removeEventListener('mouseup', onToolbarDragEnd);
    }

    // --- End Toolbar Drag Logic ---

    window.openImageToolbar = function (el) {
        currentEditingImage = el;
        pendingFile = null;

        const toolbar = document.getElementById('image-toolbar');
        toolbar.style.display = 'flex';

        // Center it initially if it hasn't been moved manually yet
        // If left/top are empty strings, it means it's first open
        if (!toolbar.style.left) {
            toolbar.style.left = '50%';
            toolbar.style.top = '50%';
            toolbar.style.transform = 'translate(-50%, -50%)';
        }

        document.getElementById('img-status-msg').innerText = '';
        document.getElementById('img-status-msg').className = 'status-msg';
        document.getElementById('btn-upload-img').style.display = 'none';

        if (isDragMode) toggleDragMode();

        // Parse current styles
        let size = el.style.backgroundSize;
        if (!size || size === 'cover') {
            document.getElementById('img-scale').value = 100;
            document.getElementById('val-scale').innerText = 'Cover';
        } else {
            let num = parseInt(size);
            if (!isNaN(num)) {
                document.getElementById('img-scale').value = num;
                document.getElementById('val-scale').innerText = num + '%';
            }
        }
    }

    window.closeImageToolbar = function () {
        document.getElementById('image-toolbar').style.display = 'none';
        if (isDragMode) toggleDragMode();
        currentEditingImage = null;
    }

    // --- Content Drag Logic (Image) ---

    window.toggleDragMode = function () {
        if (!currentEditingImage) return;

        isDragMode = !isDragMode;
        const btn = document.getElementById('btn-drag-toggle');

        if (isDragMode) {
            btn.innerText = "Confirm Position";
            btn.style.background = "#10b981"; // Green
            currentEditingImage.classList.add('drag-active');

            let pos = currentEditingImage.style.backgroundPosition || '50% 50%';
            let parts = pos.split(' ');
            initialPosX = parseFloat(parts[0]) || 50;
            initialPosY = parseFloat(parts[1]) || 50;

            currentEditingImage.addEventListener('mousedown', onDragStart);
        } else {
            btn.innerText = "Enable Drag Move";
            btn.style.background = "#8b5cf6"; // Purple
            currentEditingImage.classList.remove('drag-active');
            currentEditingImage.removeEventListener('mousedown', onDragStart);
        }
    };

    function onDragStart(e) {
        if (!isDragMode) return;
        e.preventDefault();

        dragStartX = e.clientX;
        dragStartY = e.clientY;

        let pos = currentEditingImage.style.backgroundPosition || '50% 50%';
        let parts = pos.split(' ');
        initialPosX = parseFloat(parts[0]) || 50;
        initialPosY = parseFloat(parts[1]) || 50;

        window.addEventListener('mousemove', onDragMove);
        window.addEventListener('mouseup', onDragEnd);
    }

    function onDragMove(e) {
        if (!isDragMode) return;
        e.preventDefault();

        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;

        const rect = currentEditingImage.getBoundingClientRect();
        const percentChangeX = (deltaX / rect.width) * 100 * -1;
        const percentChangeY = (deltaY / rect.height) * 100 * -1;

        let newX = initialPosX + percentChangeX;
        let newY = initialPosY + percentChangeY;

        currentEditingImage.style.backgroundPosition = `${newX.toFixed(1)}% ${newY.toFixed(1)}%`;
    }

    function onDragEnd(e) {
        window.removeEventListener('mousemove', onDragMove);
        window.removeEventListener('mouseup', onDragEnd);

        let pos = currentEditingImage.style.backgroundPosition || '50% 50%';
        let parts = pos.split(' ');
        initialPosX = parseFloat(parts[0]) || 50;
        initialPosY = parseFloat(parts[1]) || 50;
    }

    // --- End Content Drag Logic ---


    function handleFileSelect(e) {
        if (!e.target.files || !e.target.files[0]) return;

        const file = e.target.files[0];
        pendingFile = file;

        const isVideo = file.type.startsWith('video/');

        const reader = new FileReader();
        reader.onload = function (evt) {
            if (currentEditingImage) {
                // Clear any existing video element
                const existingVideo = currentEditingImage.querySelector('video.media-preview');
                if (existingVideo) {
                    existingVideo.remove();
                }

                // Remove placeholder icon/text children (they shouldn't remain after upload)
                Array.from(currentEditingImage.children).forEach(child => {
                    if (!child.classList.contains('media-preview')) {
                        child.remove();
                    }
                });

                if (isVideo) {
                    // For videos, create a video element
                    currentEditingImage.style.backgroundImage = '';

                    const video = document.createElement('video');
                    video.className = 'media-preview';
                    video.src = evt.target.result;
                    video.autoplay = true;
                    video.loop = true;
                    video.muted = true;
                    video.playsInline = true;
                    video.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:1;';

                    currentEditingImage.appendChild(video);
                    currentEditingImage.dataset.mediaType = 'video';
                } else {
                    // For images/GIFs, use background-image
                    currentEditingImage.style.backgroundImage = `url('${evt.target.result}')`;
                    currentEditingImage.style.backgroundSize = 'cover';
                    currentEditingImage.style.backgroundPosition = 'center';
                    currentEditingImage.dataset.mediaType = 'image';
                }

                document.getElementById('img-scale').value = 100;
                document.getElementById('val-scale').innerText = 'Cover';

                document.getElementById('btn-upload-img').style.display = 'inline-block';
                const mediaType = isVideo ? 'Video' : 'Image';
                showStatus(`${mediaType} preview loaded. Adjust and click Upload.`, "status-loading");
            }
        };
        reader.readAsDataURL(file);
    }

    function updateImageStyle() {
        if (!currentEditingImage) return;

        const scale = document.getElementById('img-scale').value;
        const currentPos = currentEditingImage.style.backgroundPosition || '50% 50%';

        document.getElementById('val-scale').innerText = scale + '%';

        currentEditingImage.style.backgroundSize = `${scale}%`;
        currentEditingImage.style.backgroundPosition = currentPos;
    }

    function showStatus(msg, type) {
        const el = document.getElementById('img-status-msg');
        el.innerText = msg;
        el.className = 'status-msg ' + (type || '');
    }

    // --- Core Functions ---

    function getCleanHTML() {
        disableEditing();
        document.body.classList.remove('editing-mode');

        const ui = document.getElementById('editor-ui');
        if (ui) ui.remove();

        const toolbar = document.getElementById('image-toolbar');
        if (toolbar) toolbar.remove();

        const styles = document.getElementById('editor-styles');
        if (styles) styles.remove();

        const htmlContent = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;

        injectStyles();
        if (ui) document.body.appendChild(ui);
        if (toolbar) document.body.appendChild(toolbar);

        showUI();
        enableEditing();
        document.body.classList.add('editing-mode');

        if (toolbar) toolbar.style.display = 'none';

        return htmlContent;
    }

    window.downloadBackup = function () {
        const htmlContent = getCleanHTML();
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'index.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    window.clearCredentials = function () {
        localStorage.removeItem('github_pat');
        alert('GitHub token cleared! You will be prompted for a new token on the next save/upload operation.');
    };

    // --- Dynamic Entry Management ---

    window.addDevDiaryEntry = function () {
        debugAction('Add Dev Diary Entry Clicked');
        const listContainer = document.getElementById('dev-diary-list'); // Standalone
        const logContainer = document.getElementById('dev-log-container'); // System Purge

        const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        if (listContainer) {
            // --- Standalone Dev Diary Logic ---
            const div = document.createElement('div');
            div.innerHTML = `
                 <article class="relative flex flex-col items-center md:justify-between md:flex-row gap-8 group">
                    <!-- Timeline Dot -->
                    <div class="absolute left-0 md:left-1/2 w-4 h-4 bg-zinc-900 border-2 border-zinc-700 rounded-full transform -translate-x-1.5 md:-translate-x-2 mt-6 z-10"></div>
    
                    <!-- Date/Title -->
                    <div class="w-full md:w-5/12 text-left md:text-right md:pr-8">
                        <span class="text-blue-500 font-mono text-sm font-bold editable-active" contenteditable="true">${date.toUpperCase()}</span>
                        <h3 class="text-2xl font-bold text-white mt-1 editable-active" contenteditable="true">New Entry Title</h3>
                        <p class="text-gray-400 mt-2 text-sm leading-relaxed editable-active" contenteditable="true">
                            Description of the work done...
                        </p>
                    </div>
    
                    <!-- Content -->
                    <div class="w-full md:w-5/12 md:pl-8">
                        <div class="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden shadow-xl img-placeholder h-48 md:h-64 editable-img" onclick="openImageToolbar(this)">
                            <div class="text-center">
                                <i class="fas fa-image text-4xl mb-2 text-zinc-600"></i>
                                <span class="block text-xs text-zinc-500 editable-active" contenteditable="true">Placeholder</span>
                            </div>
                        </div>
                    </div>
                </article>
            `;

            if (listContainer.firstChild) {
                listContainer.insertBefore(div.firstElementChild, listContainer.firstChild);
            } else {
                listContainer.appendChild(div.firstElementChild);
            }

            // Ensure visibility
            const newEntry = listContainer.firstElementChild;
            newEntry.style.opacity = '1';

            const newImg = newEntry.querySelector('.editable-img');
            if (newImg) {
                newImg.onclick = function (e) {
                    if (!isEditing) return;
                    if (isDragMode) return;
                    e.preventDefault();
                    e.stopPropagation();
                    openImageToolbar(newImg);
                };
            }
        }
        else if (logContainer) {
            debugAction('Creating System Purge Entry');
            // --- System Purge Dev Log Logic ---

            // Ensure container is open and has enough space
            // We keep it at a reasonable height (600px) so the "Hide" button remains visible
            // and the content scrolls within the box.
            const currentHeight = parseInt(logContainer.style.maxHeight) || 0;
            if (currentHeight < 600) {
                logContainer.style.maxHeight = '600px';
            }
            logContainer.style.opacity = '1';

            // Update toggle button state to match "Open"
            const btn = document.getElementById('dev-log-toggle');
            if (btn) {
                const icon = btn.querySelector('i');
                const text = btn.querySelector('span');
                if (text) text.innerText = 'Hide Dev Log';
                if (icon) icon.className = 'fas fa-chevron-up';
                btn.style.background = 'var(--system-purge-accent)';
                btn.style.color = 'white';
            }

            const div = document.createElement('div');
            div.innerHTML = `
                <div class="dev-log-entry fade-in visible" style="
                    border-left: 2px solid var(--border-subtle);
                    padding-left: 32px;
                    margin-bottom: 64px;
                    position: relative;
                    opacity: 1;
                ">
                    <!-- Timeline Dot -->
                    <div style="
                        position: absolute;
                        left: -11px;
                        top: 0;
                        width: 20px;
                        height: 20px;
                        background: var(--system-purge-accent);
                        border-radius: 50%;
                        border: 4px solid var(--bg-tertiary);
                    "></div>

                    <div style="margin-bottom: 16px;">
                        <span class="editable-active" contenteditable="true" style="color: var(--system-purge-accent); font-family: var(--font-mono); font-size: 0.875rem;">${date}</span>
                        <h3 class="editable-active" contenteditable="true" style="font-size: 1.5rem; margin-top: 8px;">New Entry Title</h3>
                    </div>

                    <p class="editable-active" contenteditable="true" style="color: var(--text-secondary); line-height: 1.8; margin-bottom: 24px;">
                        Description of the work done...
                    </p>

                    <div class="img-placeholder editable-img" onclick="openImageToolbar(this)" style="
                        aspect-ratio: 16/9;
                        background: var(--bg-card);
                        border: 2px dashed var(--border-medium);
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: var(--text-muted);
                        margin-bottom: 24px;
                        cursor: pointer;
                    ">
                        <i class="fas fa-image" style="margin-right: 8px;"></i>
                        <span class="editable-active" contenteditable="true">Placeholder Image</span>
                    </div>
                </div>
            `;

            // Insert after the "Add Button" (which is the first child in my new structure)
            // or just prepend to container (if button is first, new entry goes after it?)
            // Usually logs are newest first. 
            // My HTML update put the button as the *first* child of container.
            // So we want to insert 'after' the button.

            // Capture the node before insertion logic moves it
            const newNode = div.firstElementChild;
            const firstEntry = logContainer.querySelector('.dev-log-entry');

            if (firstEntry) {
                logContainer.insertBefore(newNode, firstEntry);
            } else {
                // No entries? append
                logContainer.appendChild(newNode);
            }

            // Scroll to top of container
            logContainer.scrollTop = 0;

            // Force main window to scroll to the new entry to ensure visibility
            setTimeout(() => {
                newNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
                debugAction('Entry Added & Scrolled');
            }, 100);

            const newImg = newNode.querySelector('.editable-img');
            if (newImg) {
                newImg.onclick = function (e) {
                    if (!isEditing) return;
                    if (isDragMode) return;
                    e.preventDefault();
                    e.stopPropagation();
                    openImageToolbar(newImg);
                };
            }

            // Enable editing on new elements immediately since we know we are in edit mode
            const editables = newNode.querySelectorAll('[contenteditable]');
            editables.forEach(el => el.classList.add('editable-active'));
            if (newImg) newImg.classList.add('editable-img');
        }
    };

    window.addGalleryEntry = function () {
        const container = document.getElementById('gallery-grid');
        if (!container) return;

        const div = document.createElement('div');
        div.innerHTML = `
            <div class="scale-in img-placeholder editable-img gallery-zoom-item" style="
                aspect-ratio: 1;
                background: var(--bg-tertiary);
                border-radius: 12px;
                border: 1px solid var(--border-subtle);
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--text-muted);
            ">
                <span class="editable-active" contenteditable="true">New Render</span>
            </div>
        `;

        // Append to end of grid
        container.appendChild(div.firstElementChild);

        // Ensure visibility
        const newImg = container.lastElementChild;
        if (newImg) {
            newImg.addEventListener('animationend', () => {
                newImg.classList.remove('scale-in');
            });

            newImg.onclick = function (e) {
                if (!isEditing) return;
                if (isDragMode) return;
                e.preventDefault();
                e.stopPropagation();
                openImageToolbar(newImg);
            };
        }
    };

    // --- GitHub Integration ---

    function utf8_to_b64(str) {
        return window.btoa(unescape(encodeURIComponent(str)));
    }

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                let encoded = reader.result.toString().replace(/^data:(.*,)?/, '');
                if ((encoded.length % 4) > 0) {
                    encoded += '='.repeat(4 - (encoded.length % 4));
                }
                resolve(encoded);
            };
            reader.onerror = error => reject(error);
        });
    }

    function getGitHubToken() {
        let token = localStorage.getItem('github_pat');
        if (!token) {
            token = prompt("Please enter your GitHub Personal Access Token (PAT) with 'repo' scope access. It will be saved locally.");
            if (token) {
                localStorage.setItem('github_pat', token);
            }
        }
        return token;
    }

    window.uploadImageToGitHub = async function () {
        debugAction('Upload Image Initiated');
        if (!pendingFile || !currentEditingImage) return;

        const token = getGitHubToken();
        if (!token) return;

        const btn = document.getElementById('btn-upload-img');
        btn.disabled = true;
        btn.innerText = 'Uploading...';
        showStatus("Uploading to GitHub...", "status-loading");

        const isVideo = pendingFile.type.startsWith('video/');

        try {
            const fileName = Date.now() + '_' + pendingFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const path = UPLOAD_DIR + fileName;
            const contentBase64 = await fileToBase64(pendingFile);

            const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `Upload media ${fileName}`,
                    content: contentBase64
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(`${response.status} ${errData.message || response.statusText}`);
            }

            const data = await response.json();
            const rawUrl = data.content.download_url;

            if (isVideo) {
                // Update the video element src
                const videoEl = currentEditingImage.querySelector('video.media-preview');
                if (videoEl) {
                    videoEl.src = rawUrl;
                }
            } else {
                // Update background-image for images/GIFs
                currentEditingImage.style.backgroundImage = `url('${rawUrl}')`;
            }

            const mediaType = isVideo ? 'Video' : 'Image';
            showStatus("Success! URL updated.", "status-success");
            alert(`${mediaType} uploaded successfully! \n\nThe URL has been updated to the GitHub version.\n\nIMPORTANT: Click 'Save Page' in the main menu to persist this change to your website.`);

            pendingFile = null;
            btn.style.display = 'none';

        } catch (e) {
            console.error(e);
            showStatus(`Error: ${e.message}`, "status-error");
            alert(`Upload Failed:\n${e.message}\n\nCheck console for details.`);
        } finally {
            btn.disabled = false;
            btn.innerText = 'Upload & Save URL';
        }
    };

    window.fetchGitHubAssets = async function () {
        const token = getGitHubToken();
        if (!token) return;

        const btn = document.getElementById('btn-browse-assets');
        const browser = document.getElementById('asset-browser');

        // Toggle visibility
        if (browser.classList.contains('visible')) {
            browser.classList.remove('visible');
            browser.innerHTML = '';
            return;
        }

        btn.disabled = true;
        btn.innerText = 'Loading...';
        showStatus("Fetching assets from GitHub...", "status-loading");

        try {
            const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${UPLOAD_DIR}`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('No assets uploaded yet. Upload some images first!');
                }
                throw new Error(`Failed to fetch assets: ${response.statusText}`);
            }

            const files = await response.json();

            if (!Array.isArray(files) || files.length === 0) {
                throw new Error('No assets found in the uploads folder.');
            }

            // Filter for media files only
            const mediaFiles = files.filter(f => {
                const ext = f.name.toLowerCase().split('.').pop();
                return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov'].includes(ext);
            });

            if (mediaFiles.length === 0) {
                throw new Error('No media files found.');
            }

            // Build asset list HTML
            browser.innerHTML = mediaFiles.map(file => {
                const ext = file.name.toLowerCase().split('.').pop();
                const isVideo = ['mp4', 'webm', 'mov'].includes(ext);
                const previewTag = isVideo
                    ? `<video src="${file.download_url}" muted></video>`
                    : `<img src="${file.download_url}" alt="${file.name}">`;

                return `
                    <div class="asset-item" onclick="applyGitHubAsset('${file.download_url}', ${isVideo})">
                        ${previewTag}
                        <span>${file.name}</span>
                    </div>
                `;
            }).join('');

            browser.classList.add('visible');
            showStatus(`Found ${mediaFiles.length} asset(s). Click to apply.`, "status-success");

        } catch (e) {
            console.error(e);
            showStatus(`Error: ${e.message}`, "status-error");
            browser.innerHTML = '';
            browser.classList.remove('visible');
        } finally {
            btn.disabled = false;
            btn.innerText = 'Browse GitHub Assets';
        }
    };

    window.applyGitHubAsset = function (url, isVideo) {
        if (!currentEditingImage) return;

        // Remove placeholder children
        Array.from(currentEditingImage.children).forEach(child => {
            if (!child.classList.contains('media-preview')) {
                child.remove();
            }
        });

        // Remove existing video if any
        const existingVideo = currentEditingImage.querySelector('video.media-preview');
        if (existingVideo) {
            existingVideo.remove();
        }

        if (isVideo) {
            currentEditingImage.style.backgroundImage = '';

            const video = document.createElement('video');
            video.className = 'media-preview';
            video.src = url;
            video.autoplay = true;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            video.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:1;';

            currentEditingImage.appendChild(video);
            currentEditingImage.dataset.mediaType = 'video';
        } else {
            currentEditingImage.style.backgroundImage = `url('${url}')`;
            currentEditingImage.style.backgroundSize = 'cover';
            currentEditingImage.style.backgroundPosition = 'center';
            currentEditingImage.dataset.mediaType = 'image';
        }

        // Reset scale
        document.getElementById('img-scale').value = 100;
        document.getElementById('val-scale').innerText = 'Cover';

        // Hide asset browser
        const browser = document.getElementById('asset-browser');
        browser.classList.remove('visible');
        browser.innerHTML = '';

        // Clear pending file since we're using an existing asset
        pendingFile = null;
        document.getElementById('btn-upload-img').style.display = 'none';

        const mediaType = isVideo ? 'Video' : 'Image';
        showStatus(`${mediaType} applied! Adjust position/zoom, then click Done.`, "status-success");
    };

    window.saveToGitHub = async function () {
        debugAction('Save to GitHub Initiated');
        const token = getGitHubToken();
        if (!token) return;

        const btn = document.querySelector('#editor-ui .save-btn');
        const originalText = btn.innerText;
        btn.innerText = 'Saving...';
        btn.disabled = true;

        // Dynamically get the current file path
        const filePath = getCurrentFilePath();
        console.log('Saving to file:', filePath);

        try {
            const content = getCleanHTML();

            const getResp = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!getResp.ok) {
                if (getResp.status === 401 || getResp.status === 403) {
                    alert("Authentication failed. Please check your token.");
                    localStorage.removeItem('github_pat');
                }
                throw new Error(`Failed to fetch file info: ${getResp.statusText}`);
            }

            const getData = await getResp.json();
            const sha = getData.sha;

            const putResp = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `Update ${filePath} via Web Editor`,
                    content: utf8_to_b64(content),
                    sha: sha
                })
            });

            if (!putResp.ok) {
                let errorMsg = putResp.statusText;
                try {
                    const errorData = await putResp.json();
                    if (errorData.message) {
                        errorMsg = `${errorData.message} (${putResp.status})`;
                        if (errorData.errors) {
                            errorMsg += '\nDetails: ' + JSON.stringify(errorData.errors);
                        }
                    }
                } catch (jsonErr) {
                    // ignore json parse error, stick to statusText
                }
                throw new Error(`Failed to upload: ${errorMsg}`);
            }

            alert(`Successfully saved ${filePath} to GitHub! Your site will redeploy in a few minutes.`);

        } catch (e) {
            console.error(e);
            alert('Error: ' + e.message);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    };

    // Initialize styles immediately (to hide .add-entry-trigger by default)
    injectStyles();

})();
