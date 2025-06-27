/* ===== JT-EDIT KEYBOARD SHORTCUTS MODULE ===== */

/**
 * KeyboardShortcuts class
 * Follows Single Responsibility Principle - manages keyboard shortcuts only
 */
class KeyboardShortcuts {
    constructor() {
        this.shortcuts = new Map();
        this.enabled = true;
        this.init();
    }

    init() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    handleKeyDown(event) {
        if (!this.enabled) return;

        // Build shortcut key string
        const key = this.buildKey(event);
        
        // Check if shortcut exists
        if (this.shortcuts.has(key)) {
            const handler = this.shortcuts.get(key);
            if (handler) {
                event.preventDefault();
                handler(event);
            }
        }
    }

    buildKey(event) {
        const parts = [];
        if (event.ctrlKey || event.metaKey) parts.push('ctrl');
        if (event.altKey) parts.push('alt');
        if (event.shiftKey) parts.push('shift');
        
        // Get the key
        let key = event.key.toLowerCase();
        
        // Normalize special keys
        const keyMap = {
            ' ': 'space',
            'arrowup': 'up',
            'arrowdown': 'down',
            'arrowleft': 'left',
            'arrowright': 'right',
            'delete': 'delete',
            'backspace': 'backspace',
            'enter': 'enter',
            'escape': 'escape'
        };
        
        if (keyMap[key]) {
            key = keyMap[key];
        }
        
        parts.push(key);
        return parts.join('+');
    }

    register(shortcut, handler) {
        this.shortcuts.set(shortcut.toLowerCase(), handler);
    }

    unregister(shortcut) {
        this.shortcuts.delete(shortcut.toLowerCase());
    }

    enable() {
        this.enabled = true;
    }

    disable() {
        this.enabled = false;
    }
}

// Initialize keyboard shortcuts when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    const shortcuts = new KeyboardShortcuts();
    
    // Animation shortcuts
    shortcuts.register('space', () => {
        const playPauseBtn = document.getElementById('playPauseButton');
        if (playPauseBtn && !playPauseBtn.disabled) {
            playPauseBtn.click();
        }
    });
    
    // Animation mode: Arrow keys for frame navigation
    shortcuts.register('left', () => {
        const mode = document.getElementById('modeDropdown')?.value;
        if (mode === 'animation') {
            const backBtn = document.getElementById('backButton');
            if (backBtn && !backBtn.disabled) {
                backBtn.click();
            }
        }
    });
    
    shortcuts.register('right', () => {
        const mode = document.getElementById('modeDropdown')?.value;
        if (mode === 'animation') {
            const forwardBtn = document.getElementById('forwardButton');
            if (forwardBtn && !forwardBtn.disabled) {
                forwardBtn.click();
            }
        }
    });
    
    // Static mode: Shift + Arrow keys for pixel shifting
    shortcuts.register('shift+up', () => {
        const mode = document.getElementById('modeDropdown')?.value;
        if (mode === 'static') {
            const upBtn = document.getElementById('upButton');
            if (upBtn && !upBtn.disabled) {
                upBtn.click();
            }
        }
    });
    
    shortcuts.register('shift+down', () => {
        const mode = document.getElementById('modeDropdown')?.value;
        if (mode === 'static') {
            const downBtn = document.getElementById('downButton');
            if (downBtn && !downBtn.disabled) {
                downBtn.click();
            }
        }
    });
    
    shortcuts.register('shift+left', () => {
        const mode = document.getElementById('modeDropdown')?.value;
        if (mode === 'static') {
            const leftBtn = document.getElementById('leftButton');
            if (leftBtn && !leftBtn.disabled) {
                leftBtn.click();
            }
        }
    });
    
    shortcuts.register('shift+right', () => {
        const mode = document.getElementById('modeDropdown')?.value;
        if (mode === 'static') {
            const rightBtn = document.getElementById('rightButton');
            if (rightBtn && !rightBtn.disabled) {
                rightBtn.click();
            }
        }
    });
    
    // Frame management shortcuts
    shortcuts.register('ctrl+n', () => {
        const plusBtn = document.getElementById('plusButton');
        if (plusBtn && !plusBtn.disabled) {
            plusBtn.click();
        }
    });
    
    shortcuts.register('ctrl+d', () => {
        const cloneBtn = document.getElementById('cloneFrameButton');
        if (cloneBtn && !cloneBtn.disabled) {
            cloneBtn.click();
        }
    });
    
    shortcuts.register('delete', () => {
        const minusBtn = document.getElementById('minusButton');
        if (minusBtn && !minusBtn.disabled) {
            minusBtn.click();
        }
    });
    
    // File shortcuts
    shortcuts.register('ctrl+o', () => {
        if (window.openFileInput) {
            window.openFileInput();
        }
    });
    
    shortcuts.register('ctrl+s', () => {
        if (window.saveToFile) {
            window.saveToFile();
        }
    });
    
    // Animation control shortcuts
    shortcuts.register('escape', () => {
        const mode = document.getElementById('modeDropdown')?.value;
        if (mode === 'animation') {
            const playPauseBtn = document.getElementById('playPauseButton');
            if (playPauseBtn && playPauseBtn.querySelector('i').classList.contains('fa-pause')) {
                playPauseBtn.click(); // Stop animation
            }
        }
    });
    
    // Zoom shortcuts
    shortcuts.register('+', () => {
        const zoomInBtn = document.getElementById('zoomInButton');
        if (zoomInBtn && !zoomInBtn.disabled) {
            zoomInBtn.click();
        }
    });
    
    shortcuts.register('=', () => {
        const zoomInBtn = document.getElementById('zoomInButton');
        if (zoomInBtn && !zoomInBtn.disabled) {
            zoomInBtn.click();
        }
    });
    
    shortcuts.register('-', () => {
        const zoomOutBtn = document.getElementById('zoomOutButton');
        if (zoomOutBtn && !zoomOutBtn.disabled) {
            zoomOutBtn.click();
        }
    });
    
    shortcuts.register('f', () => {
        const fitBtn = document.getElementById('fitToScreenButton');
        if (fitBtn && !fitBtn.disabled) {
            fitBtn.click();
        }
    });
    
    shortcuts.register('g', () => {
        const gridToggle = document.getElementById('gridToggle');
        if (gridToggle) {
            gridToggle.checked = !gridToggle.checked;
            gridToggle.dispatchEvent(new Event('change'));
        }
    });
    
    // Mode switching
    shortcuts.register('ctrl+m', () => {
        const modeDropdown = document.getElementById('modeDropdown');
        if (modeDropdown) {
            const currentValue = modeDropdown.value;
            modeDropdown.value = currentValue === 'static' ? 'animation' : 'static';
            modeDropdown.dispatchEvent(new Event('change'));
        }
    });
    
    // Color format switching
    shortcuts.register('ctrl+shift+c', () => {
        const colorFormatDropdown = document.getElementById('colorFormatDropdown');
        if (colorFormatDropdown) {
            const currentValue = colorFormatDropdown.value;
            colorFormatDropdown.value = currentValue === '3bit' ? '24bit' : '3bit';
            colorFormatDropdown.dispatchEvent(new Event('change'));
        }
    });
    
    // Swap foreground/background colors
    shortcuts.register('x', () => {
        const swapBtn = document.getElementById('swapColorsButton');
        if (swapBtn && !swapBtn.disabled) {
            swapBtn.click();
        }
    });
    
    // Paint bucket tools
    shortcuts.register('shift+f', () => {
        const paintBucketBtn = document.getElementById('paintBucketButton');
        if (paintBucketBtn && !paintBucketBtn.disabled) {
            paintBucketBtn.click();
        }
    });
    
    shortcuts.register('shift+b', () => {
        const rmbPaintBucketBtn = document.getElementById('RMBpaintBucketButton');
        if (rmbPaintBucketBtn && !rmbPaintBucketBtn.disabled) {
            rmbPaintBucketBtn.click();
        }
    });
    
    // Auto scale toggle
    shortcuts.register('ctrl+shift+a', () => {
        const autoScaleToggle = document.getElementById('autoScaleToggle');
        if (autoScaleToggle) {
            autoScaleToggle.checked = !autoScaleToggle.checked;
            autoScaleToggle.dispatchEvent(new Event('change'));
        }
    });
    
    // Quick canvas size shortcuts (1-5 for common sizes)
    shortcuts.register('1', () => {
        const sizeDropdown = document.getElementById('sizeDropdown');
        if (sizeDropdown && sizeDropdown.value !== '16x32') {
            sizeDropdown.value = '16x32';
            sizeDropdown.dispatchEvent(new Event('change'));
        }
    });
    
    shortcuts.register('2', () => {
        const sizeDropdown = document.getElementById('sizeDropdown');
        if (sizeDropdown && sizeDropdown.value !== '16x64') {
            sizeDropdown.value = '16x64';
            sizeDropdown.dispatchEvent(new Event('change'));
        }
    });
    
    shortcuts.register('3', () => {
        const sizeDropdown = document.getElementById('sizeDropdown');
        if (sizeDropdown && sizeDropdown.value !== '16x96') {
            sizeDropdown.value = '16x96';
            sizeDropdown.dispatchEvent(new Event('change'));
        }
    });
    
    shortcuts.register('4', () => {
        const sizeDropdown = document.getElementById('sizeDropdown');
        if (sizeDropdown && sizeDropdown.value !== '16x128') {
            sizeDropdown.value = '16x128';
            sizeDropdown.dispatchEvent(new Event('change'));
        }
    });
    
    shortcuts.register('5', () => {
        const sizeDropdown = document.getElementById('sizeDropdown');
        if (sizeDropdown && sizeDropdown.value !== '32x128') {
            sizeDropdown.value = '32x128';
            sizeDropdown.dispatchEvent(new Event('change'));
        }
    });
    
    // Help shortcut
    shortcuts.register('f1', () => {
        const helpBtn = document.getElementById('helpButton');
        if (helpBtn && !helpBtn.disabled) {
            helpBtn.click();
        }
    });
    
    shortcuts.register('?', () => {
        const helpBtn = document.getElementById('helpButton');
        if (helpBtn && !helpBtn.disabled) {
            helpBtn.click();
        }
    });
    
    // New feature shortcuts
    
    // Tool selection shortcuts
    shortcuts.register('p', () => {
        const paintTool = document.getElementById('paintTool');
        if (paintTool && !paintTool.disabled) {
            paintTool.click();
        }
    });
    
    shortcuts.register('r', () => {
        const selectRectTool = document.getElementById('selectRectTool');
        if (selectRectTool && !selectRectTool.disabled) {
            selectRectTool.click();
        }
    });
    
    
    
    // History shortcuts
    shortcuts.register('ctrl+z', () => {
        const undoBtn = document.getElementById('undoButton');
        if (undoBtn && !undoBtn.disabled) {
            undoBtn.click();
        }
    });
    
    shortcuts.register('ctrl+y', () => {
        const redoBtn = document.getElementById('redoButton');
        if (redoBtn && !redoBtn.disabled) {
            redoBtn.click();
        }
    });
    
    shortcuts.register('ctrl+shift+z', () => {
        const redoBtn = document.getElementById('redoButton');
        if (redoBtn && !redoBtn.disabled) {
            redoBtn.click();
        }
    });
    
    // Selection shortcuts
    shortcuts.register('ctrl+a', () => {
        // Select all - need to access the selection manager from global scope
        if (window.JTEdit && window.JTEdit.currentSelectionManager) {
            window.JTEdit.currentSelectionManager.selectAll(
                parseInt(document.getElementById('sizeDropdown').value.split('x')[0]),
                parseInt(document.getElementById('sizeDropdown').value.split('x')[1])
            );
        }
    });
    
    shortcuts.register('escape', () => {
        // Clear selection or cancel current tool operation
        if (window.JTEdit && window.JTEdit.currentSelectionManager) {
            window.JTEdit.currentSelectionManager.clear();
        }
    });
    
    // Copy/Cut/Paste shortcuts
    shortcuts.register('ctrl+c', () => {
        if (window.JTEdit && window.JTEdit.currentSelectionManager) {
            const pixelArray = window.pixelArrayFrames[window.currentFrameIndex];
            window.JTEdit.currentSelectionManager.copy(pixelArray);
        }
    });
    
    shortcuts.register('ctrl+x', () => {
        if (window.JTEdit && window.JTEdit.currentSelectionManager) {
            const pixelArray = window.pixelArrayFrames[window.currentFrameIndex];
            const backgroundColor = window.rtmouseBtnColor || '#000000';
            window.JTEdit.currentSelectionManager.cut(pixelArray, backgroundColor);
        }
    });
    
    shortcuts.register('ctrl+v', () => {
        if (window.JTEdit && window.JTEdit.currentSelectionManager) {
            const pixelArray = window.pixelArrayFrames[window.currentFrameIndex];
            // Paste at center of canvas by default
            const centerRow = Math.floor(window.pixelHeight / 2);
            const centerCol = Math.floor(window.pixelWidth / 2);
            window.JTEdit.currentSelectionManager.paste(pixelArray, centerRow, centerCol);
        }
    });
    
    // Disable shortcuts when typing in input fields
    const inputs = ['input', 'textarea', 'select'];
    document.addEventListener('focusin', (e) => {
        if (inputs.includes(e.target.tagName.toLowerCase())) {
            shortcuts.disable();
        }
    });
    
    document.addEventListener('focusout', (e) => {
        if (inputs.includes(e.target.tagName.toLowerCase())) {
            shortcuts.enable();
        }
    });
    
    // Export for potential use in other modules
    window.JTEdit = window.JTEdit || {};
    window.JTEdit.shortcuts = shortcuts;
});