(function() {
    // Configuration
    const REPO_OWNER = 'lys20001205';
    const REPO_NAME = 'PortFWeb';
    const FILE_PATH = 'index.html';

    // State
    let isEditing = false;
    let editorUI = null;
    let styleElement = null;

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
                content: 'CLICK TO REPLACE BG';
                position: absolute;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                background: black;
                color: white;
                padding: 5px;
                font-size: 12px;
                pointer-events: none;
                display: none;
                z-index: 10;
            }
            .editable-img:hover::after {
                display: block;
            }
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
            #editor-ui button {
                background: #3b82f6;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                font-size: 14px;
            }
            #editor-ui button.save-btn {
                background: #10b981;
            }
            #editor-ui button.download-btn {
                background: #6b7280;
            }
            #editor-ui button:hover {
                opacity: 0.9;
            }
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
                const currentBg = el.style.backgroundImage ? el.style.backgroundImage.slice(5, -2).replace(/['"]/g, "") : "";
                const url = prompt("Enter image URL (or 'none' to clear):", currentBg);
                if (url !== null) {
                    if(url === 'none' || url === '') {
                        el.style.backgroundImage = '';
                    } else {
                        el.style.backgroundImage = `url('${url}')`;
                        el.style.backgroundSize = 'cover';
                        el.style.backgroundPosition = 'center';
                    }
                }
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
                <button onclick="saveToGitHub()" class="save-btn" title="Save directly to GitHub">Save to GitHub</button>
                <button onclick="downloadBackup()" class="download-btn" title="Download local copy">Download Backup</button>
                <button onclick="toggleEditor()">Exit</button>
            `;
            document.body.appendChild(editorUI);
        }
        document.getElementById('editor-ui').style.display = 'flex';
    }

    function hideUI() {
        const ui = document.getElementById('editor-ui');
        if (ui) {
            ui.style.display = 'none';
        }
    }

    function getCleanHTML() {
        // Temporarily disable editing to clean up DOM
        disableEditing();
        document.body.classList.remove('editing-mode');

        // Remove UI elements so they aren't saved
        const ui = document.getElementById('editor-ui');
        if(ui) ui.remove();

        const styles = document.getElementById('editor-styles');
        if(styles) styles.remove();

        // Get HTML
        const htmlContent = "<!DOCTYPE html>\n" + document.documentElement.outerHTML;

        // Restore UI state
        injectStyles();
        if (ui) document.body.appendChild(ui); // Re-add UI
        showUI();
        enableEditing();
        document.body.classList.add('editing-mode');

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

    window.saveToGitHub = async function() {
        let token = localStorage.getItem('github_pat');
        if (!token) {
            token = prompt("Please enter your GitHub Personal Access Token (PAT) with 'repo' scope access. It will be saved locally.");
            if (token) {
                localStorage.setItem('github_pat', token);
            } else {
                return; // User cancelled
            }
        }

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
