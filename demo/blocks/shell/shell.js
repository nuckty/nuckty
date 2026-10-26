const ru = document.documentElement.lang === 'ru';
const themeButton = document.querySelector('.theme-toggle');

const languageLinks = [...document.querySelectorAll('.language-link, .header__language')];
const currentUrl = new URL(location.href);
const incomingTheme = currentUrl.searchParams.get('theme');

if (incomingTheme === 'dark' || incomingTheme === 'light') {
    document.documentElement.dataset.theme = incomingTheme;
    currentUrl.searchParams.delete('theme');
    history.replaceState(history.state, '', currentUrl);
}

try {
    const theme = incomingTheme === 'dark' || incomingTheme === 'light' ? incomingTheme : localStorage.getItem('nuckty-theme');

    if (theme === 'dark' || theme === 'light') {
        document.documentElement.dataset.theme = theme;
        localStorage.setItem('nuckty-theme', theme);
    }
} catch {
    // The controls also work when storage is unavailable.
}

function updateThemeControl() {
    const dark = document.documentElement.dataset.theme === 'dark';

    for (const link of languageLinks) {
        const url = new URL(link.href);
        url.searchParams.set('theme', dark ? 'dark' : 'light');
        link.href = url.href;
    }

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

for (const pre of document.querySelectorAll('pre')) {
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
    const figure = pre.parentElement?.tagName === 'FIGURE' ? pre.parentElement : null;
    const frame = figure ?? document.createElement('div');
    frame.classList.add('code-block');

    if (!figure) {
        pre.before(frame);
        frame.append(pre);
    }

    frame.append(button);
    pre.classList.add('has-copy');
}
