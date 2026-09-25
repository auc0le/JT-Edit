/* ===== JT-Edit timeline =====
 * Frame thumbnails for animation mode: click to select, drag to reorder.
 * Rendering is driven by app.js: drawPixels() -> JTEdit.ui.afterDraw() -> refresh().
 *
 * Reads (script globals from app.js): pixelArrayFrames, currentFrameIndex, totalFrames, currentMode.
 * Calls (globals from app.js): selectFrame(index), moveFrame(from, to).
 */
(function () {
    'use strict';

    window.JTEdit = window.JTEdit || {};

    const THUMB_HEIGHT = 48;   // CSS px
    const DRAG_THRESHOLD = 6;  // px before a press becomes a drag

    let strip = null;
    let raf = 0;
    let drag = null;           // { from, startX, startY, active, el, over, after }

    const $ = (id) => document.getElementById(id);

    /* ---------- rendering ---------- */

    function frameSignature(frame) {
        // Cheap change detection so untouched thumbnails are not repainted
        let h = frame.length + ':' + (frame[0] ? frame[0].length : 0);
        for (let r = 0; r < frame.length; r++) {
            const row = frame[r];
            for (let c = 0; c < row.length; c++) h += row[c][1] + row[c][3] + row[c][5];
        }
        return h;
    }

    function paint(canvas, frame) {
        const rows = frame.length;
        const cols = rows ? frame[0].length : 0;
        if (!rows || !cols) return;
        const scale = 3;
        if (canvas.width !== cols * scale || canvas.height !== rows * scale) {
            canvas.width = cols * scale;
            canvas.height = rows * scale;
            canvas.style.height = THUMB_HEIGHT + 'px';
            canvas.style.width = Math.round(THUMB_HEIGHT * cols / rows) + 'px';
        }
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        for (let r = 0; r < rows; r++) {
            const row = frame[r];
            for (let c = 0; c < cols; c++) {
                const colour = row[c];
                if (colour === '#000000' || colour === '#000') continue;
                ctx.fillStyle = colour;
                ctx.fillRect(c * scale, r * scale, scale, scale);
            }
        }
    }

    function buildThumb(index) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'frame-thumb';
        btn.setAttribute('role', 'option');
        btn.dataset.index = String(index);
        const canvas = document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        const num = document.createElement('span');
        num.className = 'frame-thumb__num';
        num.setAttribute('aria-hidden', 'true');
        btn.appendChild(canvas);
        btn.appendChild(num);
        return btn;
    }

    function render() {
        raf = 0;
        if (!strip || typeof pixelArrayFrames === 'undefined') return;
        if (typeof currentMode !== 'undefined' && currentMode !== 'animation') {
            strip.innerHTML = '';
            return;
        }
        const frames = pixelArrayFrames;
        const count = frames.length;

        // Reconcile the number of thumbnails
        while (strip.children.length > count) strip.removeChild(strip.lastChild);
        while (strip.children.length < count) strip.appendChild(buildThumb(strip.children.length));

        for (let i = 0; i < count; i++) {
            const btn = strip.children[i];
            const frame = frames[i];
            if (!frame || !frame.length) continue;
            btn.dataset.index = String(i);
            const sig = frameSignature(frame);
            if (btn.dataset.sig !== sig) {
                paint(btn.firstChild, frame);
                btn.dataset.sig = sig;
            }
            const current = i === currentFrameIndex;
            btn.classList.toggle('is-current', current);
            btn.setAttribute('aria-selected', current ? 'true' : 'false');
            btn.setAttribute('aria-label', `Frame ${i + 1} of ${count}${current ? ', current' : ''}`);
            btn.lastChild.textContent = String(i + 1);
        }

        // Keep the current thumbnail in view
        const cur = strip.children[currentFrameIndex];
        if (cur && cur.scrollIntoView && !drag) {
            cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }

    function refresh() {
        if (raf) return;
        raf = requestAnimationFrame(render);
    }

    /* ---------- pointer interaction: click selects, drag reorders ---------- */

    function thumbFromEvent(e) {
        const t = e.target.closest ? e.target.closest('.frame-thumb') : null;
        return t && strip.contains(t) ? t : null;
    }

    function clearDropMarks() {
        strip.querySelectorAll('.drop-before, .drop-after').forEach((el) => {
            el.classList.remove('drop-before', 'drop-after');
        });
    }

    function onPointerDown(e) {
        if (e.button !== 0) return;
        const thumb = thumbFromEvent(e);
        if (!thumb) return;
        drag = { from: Number(thumb.dataset.index), startX: e.clientX, startY: e.clientY, active: false, el: thumb, over: -1, after: false };
        thumb.setPointerCapture && thumb.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
        if (!drag) return;
        if (!drag.active) {
            if (Math.abs(e.clientX - drag.startX) < DRAG_THRESHOLD && Math.abs(e.clientY - drag.startY) < DRAG_THRESHOLD) return;
            drag.active = true;
            drag.el.classList.add('is-dragging');
            strip.setAttribute('aria-busy', 'true');
        }
        // Find the insertion point from the pointer's x position
        clearDropMarks();
        const thumbs = Array.from(strip.children);
        let over = -1, after = false;
        for (let i = 0; i < thumbs.length; i++) {
            const r = thumbs[i].getBoundingClientRect();
            if (e.clientX < r.left + r.width / 2) { over = i; after = false; break; }
            over = i; after = true;
        }
        drag.over = over;
        drag.after = after;
        if (over >= 0 && over !== drag.from) {
            thumbs[over].classList.add(after ? 'drop-after' : 'drop-before');
        }
    }

    function onPointerUp(e) {
        if (!drag) return;
        const d = drag;
        drag = null;
        clearDropMarks();
        d.el.classList.remove('is-dragging');
        strip.removeAttribute('aria-busy');
        d.el.releasePointerCapture && d.el.releasePointerCapture(e.pointerId);

        if (!d.active) {
            // Plain click: select the frame
            if (typeof selectFrame === 'function') selectFrame(d.from);
            return;
        }
        if (d.over < 0) return;
        let to = d.after ? d.over + 1 : d.over;
        if (to > d.from) to--;               // account for the removal of the dragged frame
        if (to !== d.from && typeof moveFrame === 'function') moveFrame(d.from, to);
    }

    function onPointerCancel() {
        if (!drag) return;
        clearDropMarks();
        drag.el.classList.remove('is-dragging');
        strip.removeAttribute('aria-busy');
        drag = null;
    }

    function onKeyDown(e) {
        // Alt+←/→ moves the focused frame; plain arrows are the global prev/next shortcuts
        const thumb = thumbFromEvent(e);
        if (!thumb || !e.altKey) return;
        const from = Number(thumb.dataset.index);
        if (e.key === 'ArrowLeft' && from > 0) { e.preventDefault(); moveFrame(from, from - 1); focusThumb(from - 1); }
        if (e.key === 'ArrowRight' && from < totalFrames - 1) { e.preventDefault(); moveFrame(from, from + 1); focusThumb(from + 1); }
    }

    function focusThumb(index) {
        requestAnimationFrame(() => { const t = strip.children[index]; if (t) t.focus(); });
    }

    window.JTEdit.timeline = { refresh, render };

    document.addEventListener('DOMContentLoaded', () => {
        strip = $('frameStrip');
        if (!strip) return;
        strip.addEventListener('pointerdown', onPointerDown);
        strip.addEventListener('pointermove', onPointerMove);
        strip.addEventListener('pointerup', onPointerUp);
        strip.addEventListener('pointercancel', onPointerCancel);
        strip.addEventListener('keydown', onKeyDown);
        strip.addEventListener('dragstart', (e) => e.preventDefault());

        const add = $('frameAddButton');
        const plus = $('plusButton');
        if (add && plus) add.addEventListener('click', () => plus.click());

        const mode = $('modeDropdown');
        if (mode) mode.addEventListener('change', refresh);

        refresh();
    });
})();
