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
    let fullRefresh = true;    // repaint every thumbnail on the next render
    let drag = null;           // { from, startX, startY, active, el, target, pointerId }

    const $ = (id) => document.getElementById(id);

    /* ---------- rendering ---------- */

    function frameSignature(frame) {
        // Full colour strings: a change anywhere in a frame must repaint its thumbnail
        let h = frame.length + ':' + (frame[0] ? frame[0].length : 0) + ':';
        for (let r = 0; r < frame.length; r++) h += frame[r].join('');
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

    function isPlaying() {
        const icon = document.querySelector('#playPauseButton i');
        return !!(icon && icon.classList.contains('fa-pause'));
    }

    function render() {
        raf = 0;
        if (!strip || typeof pixelArrayFrames === 'undefined') return;
        if (typeof currentMode !== 'undefined' && currentMode !== 'animation') {
            strip.innerHTML = '';
            fullRefresh = true;
            return;
        }
        const frames = pixelArrayFrames;
        const count = frames.length;
        const full = fullRefresh;
        fullRefresh = false;

        // Reconcile the number of thumbnails
        while (strip.children.length > count) strip.removeChild(strip.lastChild);
        while (strip.children.length < count) strip.appendChild(buildThumb(strip.children.length));

        for (let i = 0; i < count; i++) {
            const btn = strip.children[i];
            const frame = frames[i];
            if (!frame || !frame.length) continue;
            btn.dataset.index = String(i);
            const current = i === currentFrameIndex;
            // Only the current frame can change between renders unless something
            // replaced the frame arrays (resize, load, reorder) or asked for a full refresh
            if (full || current || btn._frame !== frame) {
                const sig = frameSignature(frame);
                if (btn.dataset.sig !== sig) {
                    paint(btn.firstChild, frame);
                    btn.dataset.sig = sig;
                }
                btn._frame = frame;
            }
            btn.classList.toggle('is-current', current);
            btn.setAttribute('aria-selected', current ? 'true' : 'false');
            btn.setAttribute('aria-label', `Frame ${i + 1} of ${count}${current ? ', current' : ''}`);
            btn.lastChild.textContent = String(i + 1);
        }

        // Keep the current thumbnail in view, but never pull the strip out from
        // under the pointer during playback or a drag
        const cur = strip.children[currentFrameIndex];
        if (cur && cur.scrollIntoView && !drag && !isPlaying()) {
            cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }

    function refresh() {
        if (raf) return;
        raf = requestAnimationFrame(render);
    }

    function invalidate() {
        fullRefresh = true;
        refresh();
    }

    /* ---------- pointer interaction: click selects, drag reorders ---------- */

    function thumbFromEvent(e) {
        const t = e.target && e.target.closest ? e.target.closest('.frame-thumb') : null;
        return t && strip.contains(t) ? t : null;
    }

    function clearDropMarks() {
        strip.querySelectorAll('.drop-before, .drop-after').forEach((el) => {
            el.classList.remove('drop-before', 'drop-after');
        });
    }

    // Insertion index (0..count) for a pointer x position
    function insertionIndexAt(x) {
        const thumbs = Array.from(strip.children);
        for (let i = 0; i < thumbs.length; i++) {
            const r = thumbs[i].getBoundingClientRect();
            if (x < r.left + r.width / 2) return i;
        }
        return thumbs.length;
    }

    function onPointerDown(e) {
        if (e.button !== 0) return;
        const thumb = thumbFromEvent(e);
        if (!thumb) return;
        drag = { from: Number(thumb.dataset.index), startX: e.clientX, startY: e.clientY, active: false, el: thumb, target: -1, pointerId: e.pointerId };
        if (thumb.setPointerCapture) {
            try { thumb.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        }
    }

    function onPointerMove(e) {
        if (!drag) return;
        if (!drag.active) {
            if (Math.abs(e.clientX - drag.startX) < DRAG_THRESHOLD && Math.abs(e.clientY - drag.startY) < DRAG_THRESHOLD) return;
            drag.active = true;
            drag.el.classList.add('is-dragging');
            strip.setAttribute('aria-busy', 'true');
        }
        clearDropMarks();
        const thumbs = Array.from(strip.children);
        const insertAt = insertionIndexAt(e.clientX);
        // Inserting right before or right after the dragged frame is a no-op: no marker
        if (insertAt === drag.from || insertAt === drag.from + 1) {
            drag.target = -1;
            return;
        }
        drag.target = insertAt;
        if (insertAt < thumbs.length) {
            thumbs[insertAt].classList.add('drop-before');
        } else if (thumbs.length) {
            thumbs[thumbs.length - 1].classList.add('drop-after');
        }
    }

    function finishDrag(commit, e) {
        if (!drag) return;
        const d = drag;
        drag = null;
        clearDropMarks();
        d.el.classList.remove('is-dragging');
        strip.removeAttribute('aria-busy');
        if (d.el.releasePointerCapture && d.pointerId !== undefined) {
            try { d.el.releasePointerCapture(d.pointerId); } catch (err) { /* ignore */ }
        }
        if (!commit) return;

        if (!d.active) {
            // Plain click: select the frame
            if (typeof selectFrame === 'function') selectFrame(d.from);
            return;
        }
        // Only a release over the strip reorders; releasing elsewhere cancels
        const r = strip.getBoundingClientRect();
        if (!e || e.clientX < r.left || e.clientX > r.right || e.clientY < r.top - 24 || e.clientY > r.bottom + 24) return;
        if (d.target < 0) return;
        let to = d.target;
        if (to > d.from) to--;               // account for the removal of the dragged frame
        if (to !== d.from && typeof moveFrame === 'function') moveFrame(d.from, to);
    }

    function onPointerUp(e) { finishDrag(true, e); }
    function onPointerCancel() { finishDrag(false); }

    function onKeyDown(e) {
        const thumb = thumbFromEvent(e);
        if (!thumb) return;
        const from = Number(thumb.dataset.index);
        if (e.key === 'Enter' || e.key === ' ') {
            // Activate = select (Space must not reach the global play/pause shortcut)
            e.preventDefault();
            e.stopPropagation();
            if (typeof selectFrame === 'function') selectFrame(from);
            return;
        }
        if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
            // Alt+arrows move the focused frame; always swallow the key so the
            // browser's Back/Forward navigation never fires at the ends
            e.preventDefault();
            e.stopPropagation();
            const to = e.key === 'ArrowLeft' ? from - 1 : from + 1;
            if (to >= 0 && to < totalFrames && typeof moveFrame === 'function') {
                moveFrame(from, to);
                focusThumb(to);
            }
        }
    }

    function focusThumb(index) {
        requestAnimationFrame(() => { const t = strip.children[index]; if (t) t.focus(); });
    }

    window.JTEdit.timeline = { refresh, render, invalidate };

    document.addEventListener('DOMContentLoaded', () => {
        strip = $('frameStrip');
        if (!strip) return;
        strip.addEventListener('pointerdown', onPointerDown);
        strip.addEventListener('pointermove', onPointerMove);
        strip.addEventListener('pointerup', onPointerUp);
        strip.addEventListener('pointercancel', onPointerCancel);
        strip.addEventListener('lostpointercapture', () => { if (drag && drag.active) finishDrag(false); });
        strip.addEventListener('keydown', onKeyDown);
        strip.addEventListener('dragstart', (e) => e.preventDefault());
        // A release that never reaches the strip (capture lost, window blur) ends the drag
        document.addEventListener('pointerup', (e) => { if (drag && !strip.contains(e.target)) finishDrag(false); });
        window.addEventListener('blur', () => finishDrag(false));
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drag) finishDrag(false); }, true);

        const add = $('frameAddButton');
        const plus = $('plusButton');
        if (add && plus) add.addEventListener('click', () => plus.click());

        const mode = $('modeDropdown');
        if (mode) mode.addEventListener('change', invalidate);

        invalidate();
    });
})();
