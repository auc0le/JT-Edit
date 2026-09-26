/* ===== JT-EDIT SCALING MODULE - SMART CANVAS SCALING ===== */

/**
 * Abstract Scaling Algorithm Interface
 * Interface Segregation Principle: Specific scaling contracts
 */
class IScalingAlgorithm {
    scale(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight) {
        throw new Error('Scale method must be implemented');
    }
}

/**
 * Nearest Neighbor Scaling - Preserves pixel art characteristics
 * Single Responsibility: Pixel-perfect scaling algorithm
 */
class NearestNeighborScaler extends IScalingAlgorithm {
    scale(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight) {
        const targetPixels = Array(targetHeight).fill(null).map(() => Array(targetWidth).fill('#000000'));
        
        const scaleX = sourceWidth / targetWidth;
        const scaleY = sourceHeight / targetHeight;
        
        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                const sourceX = Math.floor(x * scaleX);
                const sourceY = Math.floor(y * scaleY);
                
                if (sourceY < sourceHeight && sourceX < sourceWidth) {
                    targetPixels[y][x] = sourcePixels[sourceY][sourceX];
                }
            }
        }
        
        return targetPixels;
    }
}

/**
 * EPX (Eagle/AdvMAME) Scaling - Enhanced pixel art scaling
 * Preserves sharp edges while reducing pixelation
 */
class EPXScaler extends IScalingAlgorithm {
    scale(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight) {
        // For now, use 2x scaling then resize for other factors
        const scale2x = this.scale2x(sourcePixels, sourceWidth, sourceHeight);
        
        if (targetWidth === sourceWidth * 2 && targetHeight === sourceHeight * 2) {
            return scale2x;
        }
        
        // Use nearest neighbor for other scales
        const nnScaler = new NearestNeighborScaler();
        return nnScaler.scale(scale2x, sourceWidth * 2, sourceHeight * 2, targetWidth, targetHeight);
    }
    
    scale2x(sourcePixels, sourceWidth, sourceHeight) {
        const targetPixels = Array(sourceHeight * 2).fill(null).map(() => Array(sourceWidth * 2).fill('#000000'));
        
        for (let y = 0; y < sourceHeight; y++) {
            for (let x = 0; x < sourceWidth; x++) {
                const c = sourcePixels[y][x];
                
                // Get neighboring pixels
                const a = (y > 0) ? sourcePixels[y - 1][x] : c; // top
                const b = (x < sourceWidth - 1) ? sourcePixels[y][x + 1] : c; // right
                const d = (x > 0) ? sourcePixels[y][x - 1] : c; // left
                const g = (y < sourceHeight - 1) ? sourcePixels[y + 1][x] : c; // bottom
                
                // EPX algorithm
                const destY = y * 2;
                const destX = x * 2;
                
                if (d === a && d !== g && a !== b) {
                    targetPixels[destY][destX] = a;
                } else {
                    targetPixels[destY][destX] = c;
                }
                
                if (a === b && a !== d && b !== g) {
                    targetPixels[destY][destX + 1] = b;
                } else {
                    targetPixels[destY][destX + 1] = c;
                }
                
                if (d === g && d !== a && g !== b) {
                    targetPixels[destY + 1][destX] = d;
                } else {
                    targetPixels[destY + 1][destX] = c;
                }
                
                if (g === b && g !== d && b !== a) {
                    targetPixels[destY + 1][destX + 1] = g;
                } else {
                    targetPixels[destY + 1][destX + 1] = c;
                }
            }
        }
        
        return targetPixels;
    }
}

/**
 * Bilinear Scaling - Smooth scaling with interpolation
 * Better for photographic content
 * Note: Creates interpolated colors, respects current color mode for quantization
 */
class BilinearScaler extends IScalingAlgorithm {
    scale(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight) {
        const targetPixels = Array(targetHeight).fill(null).map(() => Array(targetWidth).fill('#000000'));
        
        const scaleX = (sourceWidth - 1) / targetWidth;
        const scaleY = (sourceHeight - 1) / targetHeight;
        
        for (let y = 0; y < targetHeight; y++) {
            for (let x = 0; x < targetWidth; x++) {
                const gx = x * scaleX;
                const gy = y * scaleY;
                
                const gxi = Math.floor(gx);
                const gyi = Math.floor(gy);
                
                const c00 = this.hexToRgb(sourcePixels[gyi] ? sourcePixels[gyi][gxi] || '#000000' : '#000000');
                const c10 = this.hexToRgb(sourcePixels[gyi] ? sourcePixels[gyi][gxi + 1] || c00 : '#000000');
                const c01 = this.hexToRgb(sourcePixels[gyi + 1] ? sourcePixels[gyi + 1][gxi] || c00 : '#000000');
                const c11 = this.hexToRgb(sourcePixels[gyi + 1] ? sourcePixels[gyi + 1][gxi + 1] || c00 : '#000000');
                
                const wx = gx - gxi;
                const wy = gy - gyi;
                
                const r = Math.round(
                    c00.r * (1 - wx) * (1 - wy) +
                    c10.r * wx * (1 - wy) +
                    c01.r * (1 - wx) * wy +
                    c11.r * wx * wy
                );
                
                const g = Math.round(
                    c00.g * (1 - wx) * (1 - wy) +
                    c10.g * wx * (1 - wy) +
                    c01.g * (1 - wx) * wy +
                    c11.g * wx * wy
                );
                
                const b = Math.round(
                    c00.b * (1 - wx) * (1 - wy) +
                    c10.b * wx * (1 - wy) +
                    c01.b * (1 - wx) * wy +
                    c11.b * wx * wy
                );
                
                const hexColor = this.rgbToHex(r, g, b);
                // Only quantize to 3-bit if the application is in 3-bit mode
                targetPixels[y][x] = (isThreeBitMode()) ? this.quantizeToThreeBit(hexColor) : hexColor;
            }
        }
        
        return targetPixels;
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
    
    rgbToHex(r, g, b) {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
    
    quantizeToThreeBit(hexColor) {
        // Convert hex to RGB
        const rgb = this.hexToRgb(hexColor);
        
        // Define the 8 allowed colors in 3-bit color space
        const colors = [
            [255, 0, 0],   // Red
            [0, 255, 0],   // Green
            [0, 0, 255],   // Blue
            [255, 255, 0], // Yellow
            [255, 0, 255], // Magenta
            [0, 255, 255], // Cyan
            [255, 255, 255], // White
            [0, 0, 0]      // Black
        ];
        
        // Find the nearest color using Euclidean distance
        const nearestColor = colors.reduce((nearest, color) => {
            const distance = Math.sqrt(
                Math.pow(rgb.r - color[0], 2) +
                Math.pow(rgb.g - color[1], 2) +
                Math.pow(rgb.b - color[2], 2)
            );
            
            return distance < nearest.distance ? {
                color,
                distance
            } : nearest;
        }, {
            color: null,
            distance: Infinity
        }).color;
        
        return this.rgbToHex(...nearestColor);
    }
}

/**
 * Scaling Strategy - Strategy Pattern
 * Open/Closed Principle: Can add new algorithms without modifying existing code
 */
class ScalingStrategy {
    constructor() {
        this.algorithms = {
            'nearest': new NearestNeighborScaler(),
            'epx': new EPXScaler(),
            'bilinear': new BilinearScaler()
        };
    }
    
    getAlgorithm(type) {
        return this.algorithms[type] || this.algorithms['nearest'];
    }
    
    addAlgorithm(name, algorithm) {
        this.algorithms[name] = algorithm;
    }
}

/**
 * Canvas Scaler - Main scaling coordinator
 * Single Responsibility: Coordinates scaling operations
 */
class CanvasScaler {
    constructor(options = {}) {
        this.strategy = new ScalingStrategy();
        this.defaultAlgorithm = options.defaultAlgorithm || 'nearest';
        this.defaultBackgroundColor = options.defaultBackgroundColor || '#000000';
        this.onProgress = options.onProgress || null;
    }
    
    calculateScaleInfo(sourceWidth, sourceHeight, targetWidth, targetHeight) {
        const scaleX = targetWidth / sourceWidth;
        const scaleY = targetHeight / sourceHeight;
        
        // Determine if aspect ratios match
        const sourceRatio = sourceWidth / sourceHeight;
        const targetRatio = targetWidth / targetHeight;
        const aspectRatioMatch = Math.abs(sourceRatio - targetRatio) < 0.01;
        
        // Size of the source scaled to fit entirely inside the target (also needed
        // when the ratios match: the positioned branches always use it)
        const minScale = Math.min(scaleX, scaleY);
        const centeredSize = {
            width: Math.max(1, Math.round(sourceWidth * minScale)),
            height: Math.max(1, Math.round(sourceHeight * minScale))
        };
        const offsetX = Math.floor((targetWidth - centeredSize.width) / 2);
        const offsetY = Math.floor((targetHeight - centeredSize.height) / 2);
        
        return {
            scaleX,
            scaleY,
            aspectRatioMatch,
            centeredSize,
            offsetX,
            offsetY,
            scaling: scaleX > 1 ? 'upscaling' : 'downscaling'
        };
    }
    
    calculatePositionOffsets(positioning, sourceWidth, sourceHeight, targetWidth, targetHeight, scaledWidth, scaledHeight) {
        let offsetX = 0;
        let offsetY = 0;
        
        // Handle the case where we're scaling down (cropping)
        const isDownscaling = sourceWidth > targetWidth || sourceHeight > targetHeight;
        
        if (isDownscaling) {
            // For downscaling, we need to determine which part of the source to keep
            const scaleX = targetWidth / sourceWidth;
            const scaleY = targetHeight / sourceHeight;
            const scale = Math.max(scaleX, scaleY); // Use max to fill the target
            
            const scaledW = Math.round(sourceWidth * scale);
            const scaledH = Math.round(sourceHeight * scale);
            
            // Calculate crop offsets based on position
            if (positioning.horizontal === 'left') {
                offsetX = 0;
            } else if (positioning.horizontal === 'middle') {
                offsetX = Math.floor((scaledW - targetWidth) / 2);
            } else if (positioning.horizontal === 'right') {
                offsetX = scaledW - targetWidth;
            }
            
            if (positioning.vertical === 'top') {
                offsetY = 0;
            } else if (positioning.vertical === 'center') {
                offsetY = Math.floor((scaledH - targetHeight) / 2);
            } else if (positioning.vertical === 'bottom') {
                offsetY = scaledH - targetHeight;
            }
            
            return { offsetX: -offsetX, offsetY: -offsetY, cropMode: true };
        } else {
            // For upscaling, position the smaller image within the larger canvas
            if (positioning.horizontal === 'left') {
                offsetX = 0;
            } else if (positioning.horizontal === 'middle') {
                offsetX = Math.floor((targetWidth - scaledWidth) / 2);
            } else if (positioning.horizontal === 'right') {
                offsetX = targetWidth - scaledWidth;
            }
            
            if (positioning.vertical === 'top') {
                offsetY = 0;
            } else if (positioning.vertical === 'center') {
                offsetY = Math.floor((targetHeight - scaledHeight) / 2);
            } else if (positioning.vertical === 'bottom') {
                offsetY = targetHeight - scaledHeight;
            }
            
            return { offsetX, offsetY, cropMode: false };
        }
    }
    
    scalePixelArray(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight, options = {}) {
        const algorithm = options.algorithm || this.defaultAlgorithm;
        const rawBackground = options.backgroundColor || this.defaultBackgroundColor;
        const backgroundColor = isThreeBitMode() ? quantizeHexToThreeBit(rawBackground) : rawBackground;
        const positioning = options.positioning || { vertical: 'center', horizontal: 'middle' };
        
        const scaler = this.strategy.getAlgorithm(algorithm);
        const info = this.calculateScaleInfo(sourceWidth, sourceHeight, targetWidth, targetHeight);
        
        let scaledPixels;
        
        if (positioning === 'stretch') {
            // Direct scaling to target size
            scaledPixels = scaler.scale(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight);
        } else {
            // Handle positioned scaling
            const isDownscaling = sourceWidth > targetWidth || sourceHeight > targetHeight;
            
            if (isDownscaling) {
                // For downscaling with cropping
                const scaleX = targetWidth / sourceWidth;
                const scaleY = targetHeight / sourceHeight;
                const scale = Math.max(scaleX, scaleY); // Use max to fill the target
                
                const scaledW = Math.round(sourceWidth * scale);
                const scaledH = Math.round(sourceHeight * scale);
                
                // First scale the image
                const tempScaled = scaler.scale(sourcePixels, sourceWidth, sourceHeight, scaledW, scaledH);
                
                // Calculate crop offsets
                const { offsetX, offsetY } = this.calculatePositionOffsets(
                    positioning, sourceWidth, sourceHeight, targetWidth, targetHeight, scaledW, scaledH
                );
                
                // Create final cropped image
                scaledPixels = Array(targetHeight).fill(null).map(() => Array(targetWidth).fill(backgroundColor));
                
                const startX = -offsetX;
                const startY = -offsetY;
                
                for (let y = 0; y < targetHeight; y++) {
                    for (let x = 0; x < targetWidth; x++) {
                        const sourceY = startY + y;
                        const sourceX = startX + x;
                        
                        if (sourceY >= 0 && sourceY < scaledH && sourceX >= 0 && sourceX < scaledW) {
                            scaledPixels[y][x] = tempScaled[sourceY][sourceX];
                        }
                    }
                }
            } else {
                // For upscaling with positioning
                const { centeredSize } = info;
                const tempScaled = scaler.scale(
                    sourcePixels, 
                    sourceWidth, 
                    sourceHeight, 
                    centeredSize.width, 
                    centeredSize.height
                );
                
                // Create final canvas with background
                scaledPixels = Array(targetHeight).fill(null).map(() => 
                    Array(targetWidth).fill(backgroundColor)
                );
                
                // Calculate position offsets
                const { offsetX, offsetY } = this.calculatePositionOffsets(
                    positioning, sourceWidth, sourceHeight, targetWidth, targetHeight, 
                    centeredSize.width, centeredSize.height
                );
                
                // Copy scaled pixels to position
                for (let y = 0; y < centeredSize.height; y++) {
                    for (let x = 0; x < centeredSize.width; x++) {
                        const targetY = offsetY + y;
                        const targetX = offsetX + x;
                        
                        if (targetY >= 0 && targetY < targetHeight && 
                            targetX >= 0 && targetX < targetWidth) {
                            scaledPixels[targetY][targetX] = tempScaled[y][x];
                        }
                    }
                }
            }
        }
        
        return {
            pixels: scaledPixels,
            info
        };
    }
    
    scaleFrames(pixelArrayFrames, sourceWidth, sourceHeight, targetWidth, targetHeight, options = {}) {
        const scaledFrames = [];
        const totalFrames = pixelArrayFrames.length;
        
        for (let i = 0; i < totalFrames; i++) {
            if (this.onProgress) {
                this.onProgress({
                    current: i + 1,
                    total: totalFrames,
                    percentage: Math.round((i + 1) / totalFrames * 100)
                });
            }
            
            const result = this.scalePixelArray(
                pixelArrayFrames[i],
                sourceWidth,
                sourceHeight,
                targetWidth,
                targetHeight,
                options
            );
            
            scaledFrames.push(result.pixels);
        }
        
        return scaledFrames;
    }
    
    generatePreview(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight, algorithm = 'nearest', options = {}) {
        // Preview at the real target size so it shows exactly what Apply will do
        // (panels are small; the preview canvas scales the result down)
        const previewScale = 1;
        const previewWidth = Math.max(1, Math.round(targetWidth * previewScale));
        const previewHeight = Math.max(1, Math.round(targetHeight * previewScale));
        
        const result = this.scalePixelArray(
            sourcePixels,
            sourceWidth,
            sourceHeight,
            previewWidth,
            previewHeight,
            { 
                algorithm,
                positioning: options.positioning || { vertical: 'center', horizontal: 'middle' },
                backgroundColor: options.backgroundColor || this.defaultBackgroundColor
            }
        );
        
        return {
            pixels: result.pixels,
            width: previewWidth,
            height: previewHeight,
            info: result.info
        };
    }
}

// colorFormat is a script-global `let` in app.js (not a window property)
function isThreeBitMode() {
    return typeof colorFormat !== 'undefined' && colorFormat === '3bit';
}

// Nearest of the 8 panel colours for a '#RRGGBB' value
function quantizeHexToThreeBit(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '');
    if (!m) return '#000000';
    const q = v => (parseInt(v, 16) >= 128 ? 'FF' : '00');
    return '#' + q(m[1]) + q(m[2]) + q(m[3]);
}

/**
 * Scaling Preview Dialog - UI for scaling preview
 * Single Responsibility: Manages scaling preview interface
 */
class ScalingPreviewDialog {
    constructor(container, onApply, onCancel) {
        this.container = container;
        this.onApply = onApply;
        this.onCancel = onCancel;
        this.scaler = new CanvasScaler();
        this.currentPreview = null;
        this.createDialog();
    }
    
    createDialog() {
        this.dialog = document.createElement('div');
        this.dialog.className = 'scaling-dialog modal';
        this.dialog.setAttribute('role', 'dialog');
        this.dialog.setAttribute('aria-modal', 'true');
        this.dialog.setAttribute('aria-labelledby', 'scalingDialogTitle');
        this.dialog.innerHTML = `
            <div class="modal__content scaling-dialog__content">
                <div class="modal__header">
                    <div>
                        <h2 class="modal__title" id="scalingDialogTitle">Resize canvas</h2>
                        <p class="modal__subtitle">Change the panel size and choose how the existing pixels are mapped.</p>
                    </div>
                    <button class="btn btn--icon-sm" id="closeScalingDialog" aria-label="Close">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                </div>
                <div class="modal__body">
                    <div class="scaling-options">
                        <div class="option-group">
                            <label for="scalingTargetSize">New size</label>
                            <select id="scalingTargetSize" class="control-input"></select>
                        </div>
                        <div class="option-group">
                            <label for="scalingAlgorithm">Method</label>
                            <select id="scalingAlgorithm" class="control-input">
                                <option value="nearest">Nearest neighbour (crisp)</option>
                                <option value="epx">EPX (smooth diagonals)</option>
                                <option value="bilinear">Bilinear (blend, 24-bit)</option>
                            </select>
                        </div>
                        
                        <div class="option-group">
                            <label for="scalingResizeMode">Fit</label>
                            <select id="scalingResizeMode" class="control-input">
                                <option value="stretch" selected>Stretch to fill</option>
                                <option value="keep-size">Keep aspect ratio (anchor)</option>
                            </select>
                        </div>
                        
                        <div class="option-group">
                            <label for="scalingBackground">Fill new area</label>
                            <input type="color" id="scalingBackground" value="#000000" class="control-input">
                        </div>
                    </div>
                    
                    <div class="position-controls" style="display: none;">
                        <div class="option-group position-group" id="verticalPositionGroup">
                            <label for="scalingVerticalPosition">Vertical anchor</label>
                            <select id="scalingVerticalPosition" class="control-input">
                                <option value="top">Top</option>
                                <option value="center" selected>Center</option>
                                <option value="bottom">Bottom</option>
                            </select>
                        </div>
                        
                        <div class="option-group position-group" id="horizontalPositionGroup">
                            <label for="scalingHorizontalPosition">Horizontal anchor</label>
                            <select id="scalingHorizontalPosition" class="control-input">
                                <option value="left">Left</option>
                                <option value="middle" selected>Middle</option>
                                <option value="right">Right</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="preview-section">
                        <div class="preview-comparison">
                            <div class="preview-before">
                                <h4>Before</h4>
                                <canvas class="preview-canvas" id="beforeCanvas"></canvas>
                                <div class="preview-info" id="beforeInfo"></div>
                            </div>
                            <div class="preview-after">
                                <h4>After</h4>
                                <canvas class="preview-canvas" id="afterCanvas"></canvas>
                                <div class="preview-info" id="afterInfo"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal__footer">
                    <span class="footer-note" id="scalingNote">Resizing replaces the canvas and clears the undo history.</span>
                    <button id="cancelScaling" class="btn btn--secondary">Cancel</button>
                    <button id="applyScaling" class="btn btn--primary">Resize</button>
                </div>
            </div>
        `;
        
        this.container.appendChild(this.dialog);
        this.bindEvents();
    }
    
    bindEvents() {
        const algorithmSelect = this.dialog.querySelector('#scalingAlgorithm');
        const resizeModeSelect = this.dialog.querySelector('#scalingResizeMode');
        const verticalPositionSelect = this.dialog.querySelector('#scalingVerticalPosition');
        const horizontalPositionSelect = this.dialog.querySelector('#scalingHorizontalPosition');
        const backgroundInput = this.dialog.querySelector('#scalingBackground');
        const targetSizeSelect = this.dialog.querySelector('#scalingTargetSize');
        const applyBtn = this.dialog.querySelector('#applyScaling');

        // Target size chosen inside the dialog
        targetSizeSelect.addEventListener('change', () => {
            const [h, w] = targetSizeSelect.value.split('x').map(Number);
            this.targetWidth = w;
            this.targetHeight = h;
            this.updatePreview();
        });
        const cancelBtn = this.dialog.querySelector('#cancelScaling');
        const closeBtn = this.dialog.querySelector('#closeScalingDialog');
        
        // Event handlers for preview updates
        algorithmSelect.addEventListener('change', () => this.updatePreview());
        resizeModeSelect.addEventListener('change', () => {
            this.updatePositionVisibility();
            this.updatePreview();
        });
        verticalPositionSelect.addEventListener('change', () => this.updatePreview());
        horizontalPositionSelect.addEventListener('change', () => this.updatePreview());
        backgroundInput.addEventListener('change', () => this.updatePreview());
        
        applyBtn.addEventListener('click', () => this.handleApply());
        cancelBtn.addEventListener('click', () => this.handleCancel());
        closeBtn.addEventListener('click', () => this.handleCancel());
        
        // Close on outside click
        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) {
                this.handleCancel();
            }
        });

        // Escape cancels while the dialog is open
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.dialog.classList.contains('modal--open')) {
                e.preventDefault();
                this.handleCancel();
            }
        });
    }
    
    updatePositionVisibility() {
        const resizeMode = this.dialog.querySelector('#scalingResizeMode').value;
        const positionControls = this.dialog.querySelector('.position-controls');
        
        if (resizeMode === 'stretch') {
            positionControls.style.display = 'none';
        } else {
            positionControls.style.display = 'flex';
        }
    }
    
    show(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight) {
        this.sourcePixels = sourcePixels;
        this.sourceWidth = sourceWidth;
        this.sourceHeight = sourceHeight;
        this.targetWidth = targetWidth;
        this.targetHeight = targetHeight;
        this.populateTargetSizes();
        
        this.dialog.classList.add('modal--open');
        this.updatePositionVisibility();
        this.updatePreview();
        this.renderBeforePreview();
        this.returnFocusTo = document.activeElement;
        const first = this.dialog.querySelector('#scalingTargetSize');
        if (first) first.focus();
    }
    
    hide() {
        this.dialog.classList.remove('modal--open');
        if (this.returnFocusTo && this.returnFocusTo.focus) {
            this.returnFocusTo.focus();
        }
        this.returnFocusTo = null;
    }

    // Mirror the panel-size presets from the main size dropdown into the dialog
    populateTargetSizes() {
        const select = this.dialog.querySelector('#scalingTargetSize');
        const source = document.getElementById('sizeDropdown');
        select.innerHTML = '';
        const presets = source
            ? Array.from(source.options).map(o => ({ value: o.value, label: o.textContent.trim() }))
            : [{ value: `${this.targetHeight}x${this.targetWidth}`, label: `${this.targetHeight} × ${this.targetWidth}` }];
        presets.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.value;
            opt.textContent = p.label;
            select.appendChild(opt);
        });
        select.value = `${this.targetHeight}x${this.targetWidth}`;
    }
    
    updatePreview() {
        // A failed preview must not leave the previous (different-size) result behind
        this.currentPreview = null;
        const applyBtn = this.dialog.querySelector('#applyScaling');
        const note = this.dialog.querySelector('#scalingNote');
        const algorithm = this.dialog.querySelector('#scalingAlgorithm').value;
        const resizeMode = this.dialog.querySelector('#scalingResizeMode').value;
        const verticalPosition = this.dialog.querySelector('#scalingVerticalPosition').value;
        const horizontalPosition = this.dialog.querySelector('#scalingHorizontalPosition').value;
        const backgroundColor = this.dialog.querySelector('#scalingBackground').value;
        
        // Determine positioning value based on resize mode
        let positioning;
        if (resizeMode === 'stretch') {
            positioning = 'stretch';
        } else {
            // Combine vertical and horizontal positions
            positioning = {
                vertical: verticalPosition,
                horizontal: horizontalPosition
            };
        }
        
        let preview;
        try {
            preview = this.scaler.generatePreview(
                this.sourcePixels,
                this.sourceWidth,
                this.sourceHeight,
                this.targetWidth,
                this.targetHeight,
                algorithm,
                {
                    positioning: positioning,
                    backgroundColor: backgroundColor
                }
            );
        } catch (err) {
            console.error('Preview failed:', err);
            applyBtn.disabled = true;
            if (note) note.textContent = 'This combination cannot be previewed. Choose another method or fit.';
            return;
        }
        applyBtn.disabled = false;
        if (note) note.textContent = 'Resizing replaces the canvas and clears the undo history.';
        
        this.currentPreview = {
            algorithm,
            positioning: positioning,
            backgroundColor,
            targetWidth: this.targetWidth,
            targetHeight: this.targetHeight
        };
        
        this.renderAfterPreview(preview);
        this.updateInfo(preview.info);
    }
    
    renderBeforePreview() {
        const canvas = this.dialog.querySelector('#beforeCanvas');
        const ctx = canvas.getContext('2d');
        
        const scale = Math.min(200 / this.sourceWidth, 200 / this.sourceHeight);
        canvas.width = this.sourceWidth * scale;
        canvas.height = this.sourceHeight * scale;
        
        this.renderPixelsToCanvas(ctx, this.sourcePixels, scale);
        
        this.dialog.querySelector('#beforeInfo').textContent = 
            `${this.sourceHeight} × ${this.sourceWidth}`;
    }
    
    renderAfterPreview(preview) {
        const canvas = this.dialog.querySelector('#afterCanvas');
        const ctx = canvas.getContext('2d');
        
        const scale = Math.min(200 / preview.width, 200 / preview.height);
        canvas.width = preview.width * scale;
        canvas.height = preview.height * scale;
        
        this.renderPixelsToCanvas(ctx, preview.pixels, scale);
        
        this.dialog.querySelector('#afterInfo').textContent = 
            `${this.targetHeight} × ${this.targetWidth}`;
    }
    
    renderPixelsToCanvas(ctx, pixels, scale) {
        for (let y = 0; y < pixels.length; y++) {
            for (let x = 0; x < pixels[y].length; x++) {
                ctx.fillStyle = pixels[y][x];
                ctx.fillRect(x * scale, y * scale, scale, scale);
            }
        }
    }
    
    updateInfo(info) {
        const scaleText = info.scaling === 'upscaling' ? 'Upscaling' : 'Downscaling';
        const ratioText = info.aspectRatioMatch ? 'Aspect ratio preserved' : 'Aspect ratio changed';
        
        // Could add more detailed info display here
    }
    
    handleApply() {
        if (this.onApply && this.currentPreview) {
            this.onApply(this.currentPreview);
        }
        this.hide();
    }
    
    handleCancel() {
        if (this.onCancel) {
            this.onCancel();
        }
        this.hide();
    }
    
    destroy() {
        if (this.dialog && this.dialog.parentElement) {
            this.dialog.parentElement.removeChild(this.dialog);
        }
    }
}

// Export for use in main app
window.JTEdit = window.JTEdit || {};
window.JTEdit.Scaling = {
    CanvasScaler,
    ScalingPreviewDialog,
    ScalingStrategy
};
