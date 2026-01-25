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
                transform: translate(-50%, -50%);
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
            #image-toolbar h3 { margin: 0 0 10px 0; font-size: 18px; text-align: center; color: white; }
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
            <h3>Image Editor</h3>

            <div class="control-group">
                <button onclick="document.getElementById('img-upload-input').click()">Select Local Image</button>
                <input type="file" id="img-upload-input" accept="image/*">
            </div>

            <div class="control-group">
                <label>Zoom (Size) <span id="val-scale">Cover</span></label>
                <input type="range" id="img-scale" min="10" max="200" value="100">
            </div>

            <div class="control-group">
                <label>Position X <span id="val-pos-x">50%</span></label>
                <input type="range" id="img-pos-x" min="0" max="100" value="50">
            </div>

            <div class="control-group">
                <label>Position Y <span id="val-pos-y">50%</span></label>
                <input type="range" id="img-pos-y" min="0" max="100" value="50">
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
        document.getElementById('img-pos-x').addEventListener('input', updateImageStyle);
        document.getElementById('img-pos-y').addEventListener('input', updateImageStyle);
    }

    window.openImageToolbar = function(el) {
        currentEditingImage = el;
        pendingFile = null;

        const toolbar = document.getElementById('image-toolbar');
        toolbar.style.display = 'flex';

        document.getElementById('img-status-msg').innerText = '';
        document.getElementById('img-status-msg').className = 'status-msg';
        document.getElementById('btn-upload-img').style.display = 'none'; // Hide upload until file selected

        // Parse current styles to set slider values
        // Size
        let size = el.style.backgroundSize;
        if (!size || size === 'cover') {
            document.getElementById('img-scale').value = 100; // Treat cover as 100 roughly
            document.getElementById('val-scale').innerText = 'Cover';
        } else {
            let num = parseInt(size);
            if (!isNaN(num)) {
                document.getElementById('img-scale').value = num;
                document.getElementById('val-scale').innerText = num + '%';
            }
        }

        // Position
        let pos = el.style.backgroundPosition || '50% 50%';
        let parts = pos.split(' ');
        let x = 50, y = 50;
        if (parts.length >= 1) x = parseInt(parts[0]) || 50;
        if (parts.length >= 2) y = parseInt(parts[1]) || 50;

        document.getElementById('img-pos-x').value = x;
        document.getElementById('val-pos-x').innerText = x + '%';
        document.getElementById('img-pos-y').value = y;
        document.getElementById('val-pos-y').innerText = y + '%';
    }

    window.closeImageToolbar = function() {
        document.getElementById('image-toolbar').style.display = 'none';
        currentEditingImage = null;
    }

    function handleFileSelect(e) {
        if (!e.target.files || !e.target.files[0]) return;

        const file = e.target.files[0];
        pendingFile = file;

        const reader = new FileReader();
        reader.onload = function(evt) {
            if (currentEditingImage) {
                currentEditingImage.style.backgroundImage = `url('${evt.target.result}')`;
                // Reset to cover/center for new image
                currentEditingImage.style.backgroundSize = 'cover';
                currentEditingImage.style.backgroundPosition = 'center';

                // Update sliders
                document.getElementById('img-scale').value = 100;
                document.getElementById('val-scale').innerText = 'Cover';
                document.getElementById('img-pos-x').value = 50;
                document.getElementById('val-pos-x').innerText = '50%';
                document.getElementById('img-pos-y').value = 50;
                document.getElementById('val-pos-y').innerText = '50%';

                // Show Upload Button
                document.getElementById('btn-upload-img').style.display = 'inline-block';
                showStatus("Preview loaded. Adjust and click Upload.", "status-loading");
            }
        };
        reader.readAsDataURL(file);
    }

    function updateImageStyle() {
        if (!currentEditingImage) return;

        const scale = document.getElementById('img-scale').value;
        const posX = document.getElementById('img-pos-x').value;
        const posY = document.getElementById('img-pos-y').value;

        // Visual feedback
        document.getElementById('val-scale').innerText = scale + '%';
        document.getElementById('val-pos-x').innerText = posX + '%';
        document.getElementById('val-pos-y').innerText = posY + '%';

        currentEditingImage.style.backgroundSize = `${scale}%`;
        currentEditingImage.style.backgroundPosition = `${posX}% ${posY}%`;
    }

    function showStatus(msg, type) {
        const el = document.getElementById('img-status-msg');
        el.innerText = msg;
        el.className = 'status-msg ' + (type || '');
    }

    // --- Core Functions ---

    function getCleanHTML() {
        // Temporarily disable editing to clean up DOM
        disableEditing();
        document.body.classList.remove('editing-mode');

        // Remove UI elements so they aren't saved
        const ui = document.getElementById('editor-ui');
        if(ui) ui.remove();

        const toolbar = document.getElementById('image-toolbar');
        if(toolbar) toolbar.remove();

        const styles = document.getElementById('editor-styles');
        if(styles) styles.remove();

        // Get HTML
        const htmlContent = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;

        // Restore UI state
        injectStyles();
        if (ui) document.body.appendChild(ui);
        if (toolbar) document.body.appendChild(toolbar);

        showUI();
        enableEditing();
        document.body.classList.add('editing-mode');

        // If toolbar was open, might need to re-open or let it close.
        // For simplicity, we let it stay closed or re-init in hidden state
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

    // Convert File to Base64 for API
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                // Remove prefix "data:*/*;base64,"
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
            // Use download_url or raw URL
            // data.content.download_url gives the raw link
            const rawUrl = data.content.download_url;

            // Update CSS with new URL
            currentEditingImage.style.backgroundImage = `url('${rawUrl}')`;

            showStatus("Success! URL updated.", "status-success");
            alert("Image uploaded successfully! \n\nThe background-image URL has been updated to the GitHub version.\n\nIMPORTANT: Click 'Save Page' in the main menu to persist this change to your website.");

            // Clear pending
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

            // 1. Get current SHA
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

            // 2. Upload new content
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
