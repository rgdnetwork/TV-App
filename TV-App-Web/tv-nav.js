(function () {
    'use strict';

    const ITEM_SELECTOR = '.nav-item, .channel-card';
    const FOCUSABLE_SELECTOR =
        '.nav-item, .channel-card, button:not([disabled]), input:not([disabled]), [tabindex]';

    let openModal = null;
    let focusBeforeModal = null;

    function ensureTabIndex() {
        document.querySelectorAll(ITEM_SELECTOR).forEach(function (el) {
            if (!el.hasAttribute('tabindex')) {
                el.setAttribute('tabindex', '0');
            }
        });
    }

    function activeModal() {
        return document.querySelector('.modal.active');
    }

    function visible(el) {
        if (!el || el.disabled) return false;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        const style = window.getComputedStyle(el);
        return style.visibility !== 'hidden' && style.display !== 'none';
    }

    function candidates() {
        const scope = activeModal() || document;
        return Array.from(scope.querySelectorAll(FOCUSABLE_SELECTOR)).filter(visible);
    }

    function focusDefault() {
        const list = candidates();
        if (!list.length) return;
        const preferred = document.querySelector('.nav-item.active') || list[0];
        preferred.focus();
    }

    function moveFocus(active, key) {
        const ar = active.getBoundingClientRect();
        const ax = ar.left + ar.width / 2;
        const ay = ar.top + ar.height / 2;
        let best = null;
        let bestScore = Infinity;

        candidates().forEach(function (el) {
            if (el === active) return;
            const r = el.getBoundingClientRect();
            const cx = r.left + r.width / 2;
            const cy = r.top + r.height / 2;
            const dx = cx - ax;
            const dy = cy - ay;
            let primary;
            let secondary;

            if (key === 'ArrowRight') {
                if (dx <= 4) return;
                primary = dx;
                secondary = Math.abs(dy);
            } else if (key === 'ArrowLeft') {
                if (dx >= -4) return;
                primary = -dx;
                secondary = Math.abs(dy);
            } else if (key === 'ArrowDown') {
                if (dy <= 4) return;
                primary = dy;
                secondary = Math.abs(dx);
            } else {
                if (dy >= -4) return;
                primary = -dy;
                secondary = Math.abs(dx);
            }

            const score = primary + secondary * 3;
            if (score < bestScore) {
                bestScore = score;
                best = el;
            }
        });

        if (best) {
            best.focus();
        }
    }

    function isTextInput(el) {
        if (!el) return false;
        const tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA';
    }

    function syncModalVisibility() {
        document.querySelectorAll('.modal').forEach(function (modal) {
            modal.setAttribute('aria-hidden', modal.classList.contains('active') ? 'false' : 'true');
        });
    }

    function syncModalState() {
        const modal = activeModal();

        if (modal && modal !== openModal) {
            if (!modal.contains(document.activeElement)) {
                focusBeforeModal = document.activeElement;
            }
            openModal = modal;
            const target =
                modal.querySelector('input:not([type="hidden"])') ||
                modal.querySelector('.modal-close') ||
                candidates()[0];
            if (target) {
                window.setTimeout(function () {
                    target.focus();
                }, 50);
            }
        } else if (!modal && openModal) {
            openModal = null;
            if (focusBeforeModal && document.contains(focusBeforeModal)) {
                focusBeforeModal.focus({ preventScroll: true });
            }
            focusBeforeModal = null;
        }

        syncModalVisibility();
    }

    function trapFocus(event) {
        const modal = activeModal();
        if (!modal) return false;

        const list = candidates();
        if (!list.length) return false;

        const first = list[0];
        const last = list[list.length - 1];
        const active = document.activeElement;

        if (!modal.contains(active)) {
            event.preventDefault();
            first.focus();
            return true;
        }

        if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
            return true;
        }

        if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
            return true;
        }

        return false;
    }

    document.addEventListener('keydown', function (event) {
        const key = event.key;
        const active = document.activeElement;
        const modal = activeModal();

        if (key === 'Escape' && modal) {
            event.preventDefault();
            const closeButton = modal.querySelector('.modal-close');
            if (closeButton) {
                closeButton.click();
            } else {
                modal.classList.remove('active');
            }
            return;
        }

        if (key === 'Tab' && modal) {
            trapFocus(event);
            return;
        }

        if (key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight') {
            if (
                isTextInput(active) &&
                active.tagName === 'INPUT' &&
                (key === 'ArrowLeft' || key === 'ArrowRight')
            ) {
                return;
            }

            const list = candidates();
            if (!active || list.indexOf(active) === -1) {
                if (list.length) {
                    event.preventDefault();
                    focusDefault();
                }
                return;
            }

            event.preventDefault();
            moveFocus(active, key);
            return;
        }

        if (
            key === 'Enter' ||
            key === ' ' ||
            key === 'Spacebar' ||
            event.keyCode === 13 ||
            event.keyCode === 23
        ) {
            if (
                active &&
                (active.classList.contains('channel-card') || active.classList.contains('nav-item'))
            ) {
                event.preventDefault();
                active.click();
            }
        }
    });

    document.addEventListener('click', function (event) {
        const item = event.target.closest(ITEM_SELECTOR);
        if (item && typeof item.focus === 'function') {
            item.focus({ preventScroll: true });
        }
    });

    const observer = new MutationObserver(function () {
        ensureTabIndex();
        syncModalState();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
    });

    ensureTabIndex();
    syncModalVisibility();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', focusDefault);
    } else {
        focusDefault();
    }
})();
