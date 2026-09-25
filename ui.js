/* ===== JT-Edit UI glue =====
 * Binds the new chrome (palette swatches, status bar, legends) to the
 * editor state that app.js owns. app.js is loaded first and registers its
 * own DOMContentLoaded handler before this one, so every element and
 * global it creates exists by the time this runs.
 *
 * Contract with app.js:
 *   - drawPixels() calls window.JTEdit.ui.afterDraw() when it finishes.
 *   - Globals read here: pixelWidth, pixelHeight, colorFormat, rtmouseBtnColor,
 *     selectedColor, currentMode, totalFrames, delays (script-global bindings).
 *   - Globals called here: updateColorPreviews().
 */
(function () {
    'use strict';

    window.JTEdit = window.JTEdit || {};

    const COLOUR_NAMES = {
        '#000000': 'Black', '#FFFFFF': 'White', '#FF0000': 'Red', '#00FF00': 'Green',
        '#0000FF': 'Blue', '#FFFF00': 'Yellow', '#FF00FF': 'Magenta', '#00FFFF': 'Cyan'
    };

    const $ = (id) => document.getElementById(id);

    /** "rgb(255, 0, 0)" or "#ff0000" -> "#FF0000" */
    function toHex(cssColor) {
        if (!cssColor) return '';
        const c = cssColor.trim();
        if (c[0] === '#') {
            return c.length === 4
                ? ('#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]).toUpperCase()
                : c.toUpperCase();
        }
        const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
        if (!m) return c.toUpperCase();
        return '#' + [m[1], m[2], m[3]].map(n => Number(n).toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    function colourName(hex) {
        return COLOUR_NAMES[hex] || hex;
    }

    /* ---------- 3-bit palette swatches <-> #customColorPicker ---------- */
    function initPalette() {
        const select = $('customColorPicker');
        const grid = $('palette3bit');
        if (!select || !grid) return;

        grid.querySelectorAll('.swatch').forEach((swatch) => {
            const colour = swatch.dataset.color;
            // Left click: foreground, through the select so app.js runs its change handler
            swatch.addEventListener('click', () => {
                select.value = colour;
                select.dispatchEvent(new Event('change'));
            });
            // Right click: background
            swatch.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                rtmouseBtnColor = colour;
                updateColorPreviews();
            });
        });
    }

    function markActiveSwatch(fgHex) {
        const grid = $('palette3bit');
        if (!grid) return;
        grid.querySelectorAll('.swatch').forEach((swatch) => {
            const on = swatch.dataset.color.toUpperCase() === fgHex;
            swatch.classList.toggle('is-active', on);
            swatch.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
    }

    /* Foreground/background previews are the single source of truth for the
       current colours (app.js writes their inline background on every change). */
    function syncFromPreviews() {
        const fg = $('foregroundColorPreview');
        const bg = $('backgroundColorPreview');
        if (!fg || !bg) return;
        const fgHex = toHex(fg.style.backgroundColor);
        const bgHex = toHex(bg.style.backgroundColor);

        markActiveSwatch(fgHex);

        const fgDot = $('fgLegendDot'), bgDot = $('bgLegendDot');
        const fgName = $('fgLegendName'), bgName = $('bgLegendName');
        if (fgDot) fgDot.style.background = fgHex;
        if (bgDot) bgDot.style.background = bgHex;
        if (fgName) fgName.textContent = colourName(fgHex);
        if (bgName) bgName.textContent = colourName(bgHex);
        fg.setAttribute('aria-label', `Foreground colour ${colourName(fgHex)}. Left click paints with it. Activate to change.`);
        bg.setAttribute('aria-label', `Background colour ${colourName(bgHex)}. Right click paints with it. Activate to change.`);
    }

    function observePreviews() {
        const observer = new MutationObserver(syncFromPreviews);
        ['foregroundColorPreview', 'backgroundColorPreview'].forEach((id) => {
            const el = $(id);
            if (el) observer.observe(el, { attributes: true, attributeFilter: ['style'] });
        });
        syncFromPreviews();
    }

    /* Colour depth: show the swatch grid in 3-bit, the colour input in 24-bit */
    function syncDepthUI() {
        const depth = $('colorFormatDropdown') ? $('colorFormatDropdown').value : '3bit';
        const grid = $('palette3bit');
        const hint = $('colourHint');
        const statusDepth = $('statusDepth');
        if (grid) grid.hidden = depth === '24bit';
        // In 3-bit mode the palette already shows every colour; recents only matter in 24-bit
        const recent = $('recentColorsGrid');
        if (recent) recent.hidden = depth !== '24bit';
        if (hint) hint.textContent = depth === '24bit' ? '16.7M colours · 24-bit' : '8 colours · 3-bit';
        if (statusDepth) statusDepth.textContent = depth === '24bit' ? '24-bit' : '3-bit';
    }

    /* Keyboard activation for the two preview "buttons" (they are divs in app.js) */
    function keyboardActivate(id) {
        const el = $(id);
        if (!el) return;
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                el.click();
            }
        });
    }

    /* ---------- Status bar ---------- */
    function initCursorReadout() {
        const canvas = $('pixelCanvas');
        const out = $('cursorPos');
        if (!canvas || !out) return;
        canvas.addEventListener('mousemove', (e) => {
            const p = e.target.closest ? e.target.closest('.pixel') : null;
            if (!p) return;
            out.textContent = `x ${p.dataset.col} · y ${p.dataset.row}`;
        });
        canvas.addEventListener('mouseleave', () => { out.textContent = 'x – · y –'; });
    }

    function refreshStatus() {
        const size = $('statusSize');
        const zoom = $('statusZoom');
        const meta = $('timelineMeta');
        if (size && typeof pixelHeight !== 'undefined') size.textContent = `${pixelHeight} × ${pixelWidth}`;
        if (zoom) {
            const px = parseInt($('pixelSizeInput').value, 10);
            if (px) zoom.textContent = `${px} px`;
        }
        if (meta && typeof totalFrames !== 'undefined') {
            const d = parseInt($('delay_id').value, 10) || 0;
            const fps = d ? (1000 / d) : 0;
            meta.textContent = d ? `≈ ${fps.toFixed(fps < 10 ? 1 : 0)} fps · ${((d * totalFrames) / 1000).toFixed(2)} s loop` : '';
        }
        syncDepthUI();
        if (window.JTEdit.timeline) window.JTEdit.timeline.refresh();
    }

    function initDebugToggleState() {
        const btn = $('debugToggle');
        const pre = $('textDisplay');
        if (!btn || !pre) return;
        const update = () => {
            const on = pre.style.display !== 'none';
            btn.classList.toggle('is-on', on);
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        };
        new MutationObserver(update).observe(pre, { attributes: true, attributeFilter: ['style'] });
        update();
    }

    /* Tool buttons: keep aria-pressed in step with app.js's .active class */
    function initToolPressedState() {
        const tools = ['paintTool', 'selectRectTool'].map($).filter(Boolean);
        const update = () => tools.forEach(t => t.setAttribute('aria-pressed', t.classList.contains('active') ? 'true' : 'false'));
        tools.forEach(t => new MutationObserver(update).observe(t, { attributes: true, attributeFilter: ['class'] }));
        update();
    }

    /* Public hook called by app.js after every redraw */
    window.JTEdit.ui = {
        afterDraw: refreshStatus,
        toHex,
        colourName
    };

    document.addEventListener('DOMContentLoaded', () => {
        initPalette();
        observePreviews();
        keyboardActivate('foregroundColorPreview');
        keyboardActivate('backgroundColorPreview');
        initCursorReadout();
        initDebugToggleState();
        initToolPressedState();

        const depth = $('colorFormatDropdown');
        if (depth) depth.addEventListener('change', syncDepthUI);
        const delay = $('delay_id');
        if (delay) delay.addEventListener('input', refreshStatus);
        const pixelSize = $('pixelSizeInput');
        if (pixelSize) pixelSize.addEventListener('input', refreshStatus);

        refreshStatus();
    });
})();
