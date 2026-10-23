const ru = document.documentElement.lang === 'ru';
const themeButton = document.querySelector('.theme-toggle');

try {
    const theme = localStorage.getItem('nuckty-theme');

    if (theme === 'dark' || theme === 'light') {
        document.documentElement.dataset.theme = theme;
    }
} catch {
    // The controls also work when storage is unavailable.
}

function updateThemeControl() {
    const dark = document.documentElement.dataset.theme === 'dark';
    themeButton?.setAttribute('aria-pressed', String(dark));
    themeButton?.setAttribute('title', dark ? (ru ? 'Включить светлую тему' : 'Use light theme') : (ru ? 'Включить тёмную тему' : 'Use dark theme'));
}

updateThemeControl();
themeButton?.addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    updateThemeControl();

    try {
        localStorage.setItem('nuckty-theme', theme);
    } catch {
        // Persistence is optional.
    }
});
themeButton?.removeAttribute('hidden');

document.querySelector('.sidebar__fallback')?.setAttribute('hidden', '');

const menuToggle = document.querySelector('.menu-toggle');
const mainNavigation = document.querySelector('#main-nav');

function closeMenu(restoreFocus = false) {
    menuToggle?.setAttribute('aria-expanded', 'false');

    if (mainNavigation) {
        mainNavigation.dataset.open = 'false';
    }

    if (restoreFocus) {
        menuToggle?.focus();
    }
}

menuToggle?.addEventListener('click', () => {
    const open = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(open));
    mainNavigation.dataset.open = String(open);

    if (open) {
        mainNavigation.querySelector('a')?.focus();
    }
});
menuToggle?.removeAttribute('hidden');
document.querySelector('.header')?.setAttribute('data-navigation-ready', '');

const header = document.querySelector('.header');
const headerSize = new ResizeObserver(() => {
    document.documentElement.style.setProperty('--header-offset', `${header.getBoundingClientRect().height}px`);

    const footerBrand = document.querySelector('.footer__brand');
    const footerMade = document.querySelector('.footer__made');

    if (footerBrand && footerMade) {
        footerBrand.style.setProperty('--footer-brand-scale', '1');
        const scale = footerMade.getBoundingClientRect().width / footerBrand.getBoundingClientRect().width;
        footerBrand.style.setProperty('--footer-brand-scale', String(scale));
    }

    for (const pre of document.querySelectorAll('.article > pre, .article > .code-block > pre')) {
        const frame = pre.closest('.code-block') ?? pre;
        frame.style.setProperty('--code-offset', `${frame.parentElement.getBoundingClientRect().left}px`);
        frame.style.setProperty('--code-width', `${document.documentElement.clientWidth}px`);
    }

    for (const navigation of document.querySelectorAll('.page-navigation')) {
        navigation.style.setProperty('--navigation-offset', `${navigation.getBoundingClientRect().left}px`);
        navigation.style.setProperty('--navigation-width', `${document.documentElement.clientWidth}px`);
        const width = document.documentElement.clientWidth;
        const height = navigation.getBoundingClientRect().height;
        const middle = height / 2;
        const path = `M32 0H${width - 32}Q${width - 24} 0 ${width - 20} 8L${width - 4} ${middle - 8}Q${width} ${middle} ${width - 4} ${middle + 8}L${width - 20} ${height - 8}Q${width - 24} ${height} ${width - 32} ${height}H32Q24 ${height} 20 ${height - 8}L4 ${middle + 8}Q0 ${middle} 4 ${middle - 8}L20 8Q24 0 32 0Z`;
        const mask = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><path d="${path}"/></svg>`;
        navigation.style.setProperty('--navigation-mask', `url("data:image/svg+xml,${encodeURIComponent(mask)}")`);
    }
});
headerSize.observe(header);

document.addEventListener('click', (event) => {
    if (menuToggle?.getAttribute('aria-expanded') === 'true' && !mainNavigation.contains(event.target) && !menuToggle.contains(event.target)) {
        closeMenu();
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]')) {
        return;
    }

    if (menuToggle?.getAttribute('aria-expanded') === 'true') {
        event.preventDefault();
        closeMenu(true);
    }
});

for (const pre of document.querySelectorAll('.article pre, .code-window__code, .example__source pre')) {
    const code = pre.querySelector('code');

    if (!code) {
        continue;
    }

    const button = pre.querySelector('.article__code-copy') ?? document.createElement('button');
    button.className = 'code-copy';
    button.type = 'button';
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '1.5');
    icon.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const copyPath = 'M9 9h11v11H9zM15 9V4H4v11h5';
    path.setAttribute('d', copyPath);
    icon.append(path);
    button.replaceChildren(icon);
    button.setAttribute('aria-label', ru ? 'Скопировать пример кода' : 'Copy code example');
    button.title = button.getAttribute('aria-label');
    button.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(code.textContent);
            path.setAttribute('d', 'm5 12 4 4L19 6');
            button.title = ru ? 'Скопировано' : 'Copied';
        } catch {
            button.title = ru ? 'Выделите текст' : 'Select the text';
        }

        setTimeout(() => {
            path.setAttribute('d', copyPath);
            button.title = button.getAttribute('aria-label');
        }, 1600);
    });
    const frame = document.createElement('div');
    frame.className = 'code-block';
    pre.before(frame);
    frame.append(pre, button);
    pre.classList.add('has-copy');
}

const tocLinks = [...document.querySelectorAll('.toc a')];
const observer = new IntersectionObserver((entries) => {
    const visible = entries.find((entry) => entry.isIntersecting);

    if (!visible) {
        return;
    }

    for (const link of tocLinks) {
        if (decodeURIComponent(link.hash.slice(1)) === visible.target.id) {
            link.setAttribute('aria-current', 'location');
        } else {
            link.removeAttribute('aria-current');
        }
    }
}, { rootMargin: '-100px 0px -60% 0px' });

for (const heading of document.querySelectorAll('.article h2, .article h3')) {
    observer.observe(heading);
}

