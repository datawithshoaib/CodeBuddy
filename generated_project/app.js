// app.js - Markdown Note Taker core functionality
// This script sets up the editor, preview rendering, theming, export, storage, and shortcuts.

(() => {
    // ----- DOM References -----
    const editor = document.getElementById('editor');
    const preview = document.getElementById('preview');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const toolbar = document.querySelector('.toolbar');

    // ----- Helper Functions -----
    const wrapSelection = (startTag, endTag = startTag) => {
        const { selectionStart, selectionEnd, value } = editor;
        const selectedText = value.slice(selectionStart, selectionEnd);
        const before = value.slice(0, selectionStart);
        const after = value.slice(selectionEnd);
        const newText = before + startTag + selectedText + endTag + after;
        editor.value = newText;
        // Restore selection around the newly wrapped text
        const newPos = selectionStart + startTag.length + selectedText.length + endTag.length;
        editor.selectionStart = editor.selectionEnd = newPos;
        editor.focus();
        triggerInput(); // ensure render & storage update
    };

    const insertAtCursor = (text) => {
        const { selectionStart, selectionEnd, value } = editor;
        const before = value.slice(0, selectionStart);
        const after = value.slice(selectionEnd);
        const newText = before + text + after;
        editor.value = newText;
        const cursorPos = selectionStart + text.length;
        editor.selectionStart = editor.selectionEnd = cursorPos;
        editor.focus();
        triggerInput();
    };

    // ----- Rendering -----
    function renderMarkdown() {
        const raw = editor.value;
        // marked is loaded globally via CDN
        const html = typeof marked !== 'undefined' ? marked.parse(raw) : raw;
        preview.innerHTML = html;
        // Apply syntax highlighting if hljs is available
        if (typeof hljs !== 'undefined' && typeof hljs.highlightAll === 'function') {
            hljs.highlightAll();
        }
    }

    // ----- Theme Management -----
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('mdnt-theme', theme);
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme') || 'light';
        const next = current === 'light' ? 'dark' : 'light';
        setTheme(next);
    }

    function loadThemeFromStorage() {
        const stored = localStorage.getItem('mdnt-theme');
        if (stored) {
            document.documentElement.setAttribute('data-theme', stored);
        } else {
            // default to light
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }

    // ----- Export -----
    function exportNote() {
        const blob = new Blob([editor.value], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'note.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ----- Clear -----
    function clearEditor() {
        editor.value = '';
        localStorage.removeItem('mdnt-note');
        renderMarkdown();
    }

    // ----- Local Storage -----
    const STORAGE_KEY = 'mdnt-note';
    let saveTimeout = null;
    const debounceDelay = 300; // ms

    function saveNoteDebounced() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            localStorage.setItem(STORAGE_KEY, editor.value);
        }, debounceDelay);
    }

    function loadNoteFromStorage() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            editor.value = saved;
        }
    }

    // Helper to trigger input programmatically (used after toolbar actions)
    function triggerInput() {
        const event = new Event('input', { bubbles: true });
        editor.dispatchEvent(event);
    }

    // ----- Toolbar Actions -----
    const toolbarActions = {
        bold: () => wrapSelection('**', '**'),
        italic: () => wrapSelection('_', '_'),
        code: () => wrapSelection('`', '`'),
        heading: () => {
            // Insert '# ' at the beginning of the current line
            const { selectionStart, value } = editor;
            const beforeCursor = value.slice(0, selectionStart);
            const lineStart = beforeCursor.lastIndexOf('\n') + 1; // start index of line
            const afterLineStart = value.slice(lineStart);
            // If line already starts with '#', do nothing
            if (afterLineStart.startsWith('#')) return;
            const newValue = value.slice(0, lineStart) + '# ' + afterLineStart;
            editor.value = newValue;
            // Move cursor after inserted '# '
            const newPos = selectionStart + 2;
            editor.selectionStart = editor.selectionEnd = newPos;
            editor.focus();
            triggerInput();
        },
        export: exportNote,
        clear: clearEditor,
    };

    // ----- Keyboard Shortcuts -----
    function handleKeydown(e) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
        if (!ctrlKey) return;
        switch (e.key.toLowerCase()) {
            case 'b': // Bold
                e.preventDefault();
                toolbarActions.bold();
                break;
            case 'i': // Italic
                e.preventDefault();
                toolbarActions.italic();
                break;
            case 'k': // Export
                e.preventDefault();
                exportNote();
                break;
            case 'l': // Clear
                e.preventDefault();
                clearEditor();
                break;
            default:
                break;
        }
    }

    // ----- Event Listeners -----
    function setupEventListeners() {
        editor.addEventListener('input', () => {
            renderMarkdown();
            saveNoteDebounced();
        });

        themeToggleBtn.addEventListener('click', toggleTheme);

        // Toolbar button clicks
        toolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            const action = btn.getAttribute('data-action');
            const fn = toolbarActions[action];
            if (typeof fn === 'function') {
                e.preventDefault();
                fn();
            }
        });

        document.addEventListener('keydown', handleKeydown);
    }

    // ----- Initialization -----
    function init() {
        loadThemeFromStorage();
        loadNoteFromStorage();
        renderMarkdown();
        setupEventListeners();
    }

    // Expose globally as required by spec
    window.renderMarkdown = renderMarkdown;
    window.toggleTheme = toggleTheme;
    window.exportNote = exportNote;
    window.clearEditor = clearEditor;

    // Run init after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
