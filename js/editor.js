(function() {
    // Configuration
    const REPO_OWNER = 'lys20001205';
    const REPO_NAME = 'PortFWeb';
    const FILE_PATH = 'index.html';
    const UPLOAD_DIR = 'assets/uploads/';

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
        `;
        document.head.appendChild(styleElement);
    }

    window.toggleEditor = function() {
        isEditing = !isEditing;
        const body = document.body;

        if (isEditing) {
            injectStyles();
            body.classList.add('editing-mode');
            enableEditing();
            showUI();
        } else {
            body.classList.remove('editing-mode');
            disableEditing();
            hideUI();
            hideImageToolbar();
        }
    };

    function enableEditing() {
        // Text Elements
        const textSelectors = '.slide h1, .slide h2, .slide h3, .slide h4, .slide h5, .slide h6, .slide p, .slide span, .slide li, .slide a, .meta-value, .meta-label';
        const elements = document.querySelectorAll(textSelectors);
        elements.forEach(el => {
            el.contentEditable = "true";
            el.classList.add('editable-active');
        });

        // Image placeholders
        const placeholders = document.querySelectorAll('.img-placeholder');
        placeholders.forEach(el => {
            el.classList.add('editable-img');
            el.onclick = function(e) {
                if(!isEditing) return;
                // If in drag mode (content), don't reopen toolbar
                if(isDragMode) return;

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

        if(isDragMode) toggleDragMode();
    }

    function showUI() {
        if (!document.getElementById('editor-ui')) {
            editorUI = document.createElement('div');
            editorUI.id = 'editor-ui';
            editorUI.innerHTML = `
                <span style="color:white; align-self:center; margin-right:10px;">Editing Mode</span>
                <button onclick="saveToGitHub()" class="save-btn" title="Save page HTML to GitHub">Save Page</button>
                <button onclick="downloadBackup()" class="download-btn" title="Download local copy">Backup</button>
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
    }

    function createImageToolbar() {
        if (document.getElementById('image-toolbar')) return;

        imageToolbar = document.createElement('div');
        imageToolbar.id = 'image-toolbar';
        imageToolbar.innerHTML = `
            <h3 id="toolbar-header">Image Editor</h3>

            <div class="control-group">
                <button onclick="document.getElementById('img-upload-input').click()">Select Local Image</button>
                <input type="file" id="img-upload-input" accept="image/*">
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

    window.openImageToolbar = function(el) {
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

    window.closeImageToolbar = function() {
        document.getElementById('image-toolbar').style.display = 'none';
        if(isDragMode) toggleDragMode();
        currentEditingImage = null;
    }

    // --- Content Drag Logic (Image) ---

    window.toggleDragMode = function() {
        if(!currentEditingImage) return;

        isDragMode = !isDragMode;
        const btn = document.getElementById('btn-drag-toggle');

        if(isDragMode) {
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

        const reader = new FileReader();
        reader.onload = function(evt) {
            if (currentEditingImage) {
                currentEditingImage.style.backgroundImage = `url('${evt.target.result}')`;
                currentEditingImage.style.backgroundSize = 'cover';
                currentEditingImage.style.backgroundPosition = 'center';

                document.getElementById('img-scale').value = 100;
                document.getElementById('val-scale').innerText = 'Cover';

                document.getElementById('btn-upload-img').style.display = 'inline-block';
                showStatus("Preview loaded. Adjust and click Upload.", "status-loading");
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
        if(ui) ui.remove();

        const toolbar = document.getElementById('image-toolbar');
        if(toolbar) toolbar.remove();

        const styles = document.getElementById('editor-styles');
        if(styles) styles.remove();

        const htmlContent = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;

        injectStyles();
        if (ui) document.body.appendChild(ui);
        if (toolbar) document.body.appendChild(toolbar);

        showUI();
        enableEditing();
        document.body.classList.add('editing-mode');

        if(toolbar) toolbar.style.display = 'none';

        return htmlContent;
    }

    window.downloadBackup = function() {
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

    window.uploadImageToGitHub = async function() {
        if (!pendingFile || !currentEditingImage) return;

        const token = getGitHubToken();
        if (!token) return;

        const btn = document.getElementById('btn-upload-img');
        btn.disabled = true;
        btn.innerText = 'Uploading...';
        showStatus("Uploading to GitHub...", "status-loading");

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
                    message: `Upload image ${fileName}`,
                    content: contentBase64
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(`${response.status} ${errData.message || response.statusText}`);
            }

            const data = await response.json();
            const rawUrl = data.content.download_url;

            currentEditingImage.style.backgroundImage = `url('${rawUrl}')`;

            showStatus("Success! URL updated.", "status-success");
            alert("Image uploaded successfully! \n\nThe background-image URL has been updated to the GitHub version.\n\nIMPORTANT: Click 'Save Page' in the main menu to persist this change to your website.");

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

    window.saveToGitHub = async function() {
        const token = getGitHubToken();
        if (!token) return;

        const btn = document.querySelector('#editor-ui .save-btn');
        const originalText = btn.innerText;
        btn.innerText = 'Saving...';
        btn.disabled = true;

        try {
            const content = getCleanHTML();

            const getResp = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
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

            const putResp = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: 'Update content via Web Editor',
                    content: utf8_to_b64(content),
                    sha: sha
                })
            });

            if (!putResp.ok) {
                throw new Error(`Failed to upload: ${putResp.statusText}`);
            }

            alert('Successfully saved to GitHub! Render will redeploy your site in a few minutes.');

        } catch (e) {
            console.error(e);
            alert('Error: ' + e.message);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    };

})();
