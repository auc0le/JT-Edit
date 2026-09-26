/* ===== JT-Edit UI glue =====
 * Binds the chrome (palette swatches, status bar, legends, tooltips, dialogs)
 * to the editor state that app.js owns. app.js is loaded first and registers its
 * own DOMContentLoaded handler before this one, so every element and global it
 * creates exists by the time this runs.
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
                e.stopPropagation();
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
            zoom.textContent = px > 0 ? `${px} px` : '– px';
        }
        if (meta && typeof totalFrames !== 'undefined') {
            const d = parseInt($('delay_id').value, 10);
            if (!Number.isNaN(d) && d >= 20) {
                const fps = 1000 / d;
                meta.textContent = `≈ ${fps.toFixed(fps < 10 ? 1 : 0)} fps · ${((d * totalFrames) / 1000).toFixed(2)} s loop`;
            } else {
                meta.textContent = 'delay must be 20 ms or more';
            }
        }
        syncDepthUI();
        if (window.JTEdit.timeline) window.JTEdit.timeline.refresh();
    }

    /* Typed zoom values are clamped to the input's range when the field is left */
    function initZoomClamp() {
        const input = $('pixelSizeInput');
        if (!input) return;
        input.addEventListener('change', () => {
            const min = parseInt(input.min, 10) || 1;
            const max = parseInt(input.max, 10) || 100;
            const v = parseInt(input.value, 10);
            const clamped = Number.isNaN(v) ? min : Math.max(min, Math.min(max, v));
            if (String(clamped) !== input.value) {
                input.value = String(clamped);
                input.dispatchEvent(new Event('input'));
            }
        });
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

    /* Tool buttons and help-mode toggles: keep aria-pressed in step with app.js's classes */
    function initPressedState(ids, className) {
        const els = ids.map($).filter(Boolean);
        const update = () => els.forEach(t => t.setAttribute('aria-pressed', t.classList.contains(className) ? 'true' : 'false'));
        els.forEach(t => new MutationObserver(update).observe(t, { attributes: true, attributeFilter: ['class'] }));
        update();
    }

    /* ---------- Tooltips: one floating element, positioned in JS so overflow
       containers, selects and the window edge cannot clip it ---------- */
    function initTooltips() {
        const layer = document.createElement('div');
        layer.id = 'tooltipLayer';
        layer.className = 'tooltip-layer';
        layer.setAttribute('role', 'tooltip');
        layer.hidden = true;
        document.body.appendChild(layer);

        let timer = 0;
        let current = null;

        function place(el) {
            const text = el.getAttribute('data-tooltip');
            if (!text) return;
            layer.textContent = text;
            layer.hidden = false;
            const r = el.getBoundingClientRect();
            const t = layer.getBoundingClientRect();
            const gap = 8, margin = 8;
            let x, y;
            if (el.classList.contains('tooltip--right')) {
                x = r.right + gap; y = r.top + r.height / 2 - t.height / 2;
            } else if (el.classList.contains('tooltip--left')) {
                x = r.left - gap - t.width; y = r.top + r.height / 2 - t.height / 2;
            } else if (el.classList.contains('tooltip--below')) {
                x = r.left + r.width / 2 - t.width / 2; y = r.bottom + gap;
            } else {
                x = r.left + r.width / 2 - t.width / 2; y = r.top - gap - t.height;
                if (y < margin) y = r.bottom + gap;   // no room above: flip below
            }
            x = Math.max(margin, Math.min(window.innerWidth - t.width - margin, x));
            y = Math.max(margin, Math.min(window.innerHeight - t.height - margin, y));
            layer.style.left = `${Math.round(x)}px`;
            layer.style.top = `${Math.round(y)}px`;
        }

        function show(el, delay) {
            hide();
            current = el;
            timer = setTimeout(() => { if (current === el) place(el); }, delay);
        }

        function hide() {
            clearTimeout(timer);
            timer = 0;
            current = null;
            layer.hidden = true;
        }

        const target = (e) => e.target && e.target.closest ? e.target.closest('[data-tooltip]') : null;
        document.addEventListener('mouseover', (e) => {
            const el = target(e);
            if (!el) return;
            if (el !== current) show(el, 350);
        });
        document.addEventListener('mouseout', (e) => {
            const el = target(e);
            if (el && el === current && !(e.relatedTarget && el.contains(e.relatedTarget))) hide();
        });
        document.addEventListener('focusin', (e) => {
            const el = target(e);
            if (el && el.matches(':focus-visible')) show(el, 100);
        });
        document.addEventListener('focusout', hide);
        document.addEventListener('pointerdown', hide, true);
        document.addEventListener('keydown', hide, true);
        window.addEventListener('scroll', hide, true);
        window.addEventListener('resize', hide);
    }

    /* ---------- Modal dialogs: focus stays inside while one is open ---------- */
    function initFocusTrap() {
        const focusable = 'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            const modal = document.querySelector('.modal--open .modal__content');
            if (!modal) return;
            const items = Array.from(modal.querySelectorAll(focusable)).filter(el => el.offsetParent !== null);
            if (!items.length) return;
            const first = items[0], last = items[items.length - 1];
            const active = document.activeElement;
            if (!modal.contains(active)) { e.preventDefault(); first.focus(); return; }
            if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
        });
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
        initZoomClamp();
        initDebugToggleState();
        initPressedState(['paintTool', 'selectRectTool'], 'active');
        initPressedState(['staticModeToggle', 'animationModeToggle'], 'btn--primary');
        initTooltips();
        initFocusTrap();

        const depth = $('colorFormatDropdown');
        if (depth) depth.addEventListener('change', syncDepthUI);
        const delay = $('delay_id');
        if (delay) delay.addEventListener('input', refreshStatus);
        const pixelSize = $('pixelSizeInput');
        if (pixelSize) pixelSize.addEventListener('input', refreshStatus);

        refreshStatus();
    });
})();
