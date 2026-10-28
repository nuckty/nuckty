for (const example of document.querySelectorAll('[data-example]')) {
    const tabs = [...example.querySelectorAll('[role="tab"]')];

    function select(tab) {
        for (const item of tabs) {
            const active = item === tab;
            item.setAttribute('aria-selected', String(active));
            item.tabIndex = active ? 0 : -1;
        }

        for (const panel of example.querySelectorAll('[data-panel]')) {
            panel.hidden = panel.dataset.panel !== tab.dataset.view;
        }
    }

    for (const tab of tabs) {
        tab.addEventListener('click', () => { select(tab); });
        tab.addEventListener('keydown', (event) => {
            const index = tabs.indexOf(tab);
            const next = event.key === 'ArrowRight' ? tabs[(index + 1) % tabs.length] : event.key === 'ArrowLeft' ? tabs[(index + tabs.length - 1) % tabs.length] : event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1) : null;

            if (next) {
                event.preventDefault();
                select(next);
                next.focus();
            }
        });
    }
    example.querySelector('[role="tablist"]').hidden = false;
}
