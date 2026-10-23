// Native modal dialogs provide focus containment and make the background inert.
(function () {
    'use strict';

    var activeBox = null;
    var opener = null;
    var previousOverflow = '';

    function close() {
        if (!activeBox) {
            return;
        }
        activeBox.classList.remove('is-open');
        activeBox.close();
        activeBox = null;
        document.body.style.overflow = previousOverflow;
        if (opener && opener.isConnected) {
            opener.focus();
        }
        opener = null;
    }

    document.addEventListener('click', function (event) {
        var item = event.target.closest('.gallery__item');
        if (item) {
            if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
                return;
            }
            var gallery = item.closest('.gallery');
            var box = gallery && gallery.querySelector('.lightbox');
            if (!box || typeof box.showModal !== 'function') {
                return;
            }
            event.preventDefault();
            close();
            var img = box.querySelector('img');
            if (!img) {
                img = document.createElement('img');
                box.appendChild(img);
            }
            img.src = item.getAttribute('href');
            var thumb = item.querySelector('img');
            img.alt = (thumb && thumb.alt) || '';
            opener = item;
            activeBox = box;
            previousOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            box.classList.add('is-open');
            box.oncancel = function (cancelEvent) {
                cancelEvent.preventDefault();
                close();
            };
            box.showModal();
            box.querySelector('.lightbox__close').focus();
            return;
        }
        if (activeBox && (event.target === activeBox || event.target.closest('.lightbox__close'))) {
            close();
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && activeBox) {
            event.preventDefault();
            event.stopImmediatePropagation();
            close();
        }
    }, true);
})();
