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
                
                targetPixels[y][x] = this.rgbToHex(r, g, b);
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
        
        // Calculate centered positioning for non-matching ratios
        let centeredSize, offsetX = 0, offsetY = 0;
        
        if (!aspectRatioMatch) {
            // Use minimum scale to fit entirely within target
            const minScale = Math.min(scaleX, scaleY);
            centeredSize = {
                width: Math.round(sourceWidth * minScale),
                height: Math.round(sourceHeight * minScale)
            };
            
            offsetX = Math.floor((targetWidth - centeredSize.width) / 2);
            offsetY = Math.floor((targetHeight - centeredSize.height) / 2);
        }
        
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
    
    scalePixelArray(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight, options = {}) {
        const algorithm = options.algorithm || this.defaultAlgorithm;
        const backgroundColor = options.backgroundColor || this.defaultBackgroundColor;
        const positioning = options.positioning || 'center'; // 'center', 'top-left', 'stretch'
        
        const scaler = this.strategy.getAlgorithm(algorithm);
        const info = this.calculateScaleInfo(sourceWidth, sourceHeight, targetWidth, targetHeight);
        
        let scaledPixels;
        
        if (positioning === 'stretch' || info.aspectRatioMatch) {
            // Direct scaling to target size
            scaledPixels = scaler.scale(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight);
        } else {
            // Scale to fit, then center
            const { centeredSize } = info;
            scaledPixels = scaler.scale(
                sourcePixels, 
                sourceWidth, 
                sourceHeight, 
                centeredSize.width, 
                centeredSize.height
            );
            
            // Create final canvas with background
            const finalPixels = Array(targetHeight).fill(null).map(() => 
                Array(targetWidth).fill(backgroundColor)
            );
            
            // Copy scaled pixels to center
            const startY = positioning === 'top-left' ? 0 : info.offsetY;
            const startX = positioning === 'top-left' ? 0 : info.offsetX;
            
            for (let y = 0; y < centeredSize.height; y++) {
                for (let x = 0; x < centeredSize.width; x++) {
                    const targetY = startY + y;
                    const targetX = startX + x;
                    
                    if (targetY >= 0 && targetY < targetHeight && 
                        targetX >= 0 && targetX < targetWidth) {
                        finalPixels[targetY][targetX] = scaledPixels[y][x];
                    }
                }
            }
            
            scaledPixels = finalPixels;
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
    
    generatePreview(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight, algorithm = 'nearest') {
        // Generate a smaller preview for performance
        const previewScale = 0.5;
        const previewWidth = Math.max(1, Math.round(targetWidth * previewScale));
        const previewHeight = Math.max(1, Math.round(targetHeight * previewScale));
        
        const result = this.scalePixelArray(
            sourcePixels,
            sourceWidth,
            sourceHeight,
            previewWidth,
            previewHeight,
            { algorithm }
        );
        
        return {
            pixels: result.pixels,
            width: previewWidth,
            height: previewHeight,
            info: result.info
        };
    }
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
        this.dialog.innerHTML = `
            <div class="modal__content scaling-dialog__content">
                <div class="modal__header">
                    <h2 class="modal__title">Scale Canvas</h2>
                    <button class="btn btn--icon-sm" id="closeScalingDialog" aria-label="Close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal__body">
                    <div class="scaling-options">
                        <div class="option-group">
                            <label for="scalingAlgorithm">Scaling Algorithm:</label>
                            <select id="scalingAlgorithm" class="control-input">
                                <option value="nearest">Nearest Neighbor (Pixel Art)</option>
                                <option value="epx">EPX (Enhanced Pixel Art)</option>
                                <option value="bilinear">Bilinear (Smooth)</option>
                            </select>
                        </div>
                        
                        <div class="option-group">
                            <label for="scalingPosition">Positioning:</label>
                            <select id="scalingPosition" class="control-input">
                                <option value="center">Center</option>
                                <option value="top-left">Top-Left</option>
                                <option value="stretch">Stretch to Fit</option>
                            </select>
                        </div>
                        
                        <div class="option-group">
                            <label for="scalingBackground">Background Color:</label>
                            <input type="color" id="scalingBackground" value="#000000" class="control-input">
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
                    <button id="cancelScaling" class="btn btn--secondary">Cancel</button>
                    <button id="applyScaling" class="btn btn--primary">Apply Scaling</button>
                </div>
            </div>
        `;
        
        this.container.appendChild(this.dialog);
        this.bindEvents();
    }
    
    bindEvents() {
        const algorithmSelect = this.dialog.querySelector('#scalingAlgorithm');
        const positionSelect = this.dialog.querySelector('#scalingPosition');
        const backgroundInput = this.dialog.querySelector('#scalingBackground');
        const applyBtn = this.dialog.querySelector('#applyScaling');
        const cancelBtn = this.dialog.querySelector('#cancelScaling');
        const closeBtn = this.dialog.querySelector('#closeScalingDialog');
        
        algorithmSelect.addEventListener('change', () => this.updatePreview());
        positionSelect.addEventListener('change', () => this.updatePreview());
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
    }
    
    show(sourcePixels, sourceWidth, sourceHeight, targetWidth, targetHeight) {
        this.sourcePixels = sourcePixels;
        this.sourceWidth = sourceWidth;
        this.sourceHeight = sourceHeight;
        this.targetWidth = targetWidth;
        this.targetHeight = targetHeight;
        
        this.dialog.classList.add('modal--open');
        this.updatePreview();
        this.renderBeforePreview();
    }
    
    hide() {
        this.dialog.classList.remove('modal--open');
    }
    
    updatePreview() {
        const algorithm = this.dialog.querySelector('#scalingAlgorithm').value;
        const position = this.dialog.querySelector('#scalingPosition').value;
        const backgroundColor = this.dialog.querySelector('#scalingBackground').value;
        
        const preview = this.scaler.generatePreview(
            this.sourcePixels,
            this.sourceWidth,
            this.sourceHeight,
            this.targetWidth,
            this.targetHeight,
            algorithm
        );
        
        this.currentPreview = {
            algorithm,
            positioning: position,
            backgroundColor
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
            `${this.sourceWidth} × ${this.sourceHeight}`;
    }
    
    renderAfterPreview(preview) {
        const canvas = this.dialog.querySelector('#afterCanvas');
        const ctx = canvas.getContext('2d');
        
        const scale = Math.min(200 / preview.width, 200 / preview.height);
        canvas.width = preview.width * scale;
        canvas.height = preview.height * scale;
        
        this.renderPixelsToCanvas(ctx, preview.pixels, scale);
        
        this.dialog.querySelector('#afterInfo').textContent = 
            `${this.targetWidth} × ${this.targetHeight}`;
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