// js/layout.js
// Responsável pelo comportamento da sidebar e pelo controle de exibição removida na tela de login.
// Regras implementadas:
// - A sidebar não é inicializada nem renderizada na tela de login.
// - Após login, initSidebar() deve ser chamado para montar a sidebar.
// - Em mobile (breakpoint), a sidebar pode ser aberta/fechada via botão.
// - Ao abrir em mobile, clique fora da sidebar fecha ela; botão alterna estado.
// - A sidebar mantém estado ARIA para acessibilidade.

const Layout = (function () {
  // breakpoint que consideramos mobile
  const MOBILE_MAX = 860;

  // referências DOM
  let sidebarEl = null;
  let sidebarToggleBtn = null;
  let overlayEl = null;
  let mounted = false;

  function isMobile() {
    return window.matchMedia && window.matchMedia(`(max-width: ${MOBILE_MAX}px)`).matches;
  }

  // cria o DOM da sidebar (chamado apenas após login)
  function initSidebar(options = {}) {
    if (mounted) return;
    mounted = true;

    // container root (assume body existe)
    const root = document.body;

    // sidebar wrapper
    sidebarEl = document.createElement('aside');
    sidebarEl.className = 'app-sidebar';
    sidebarEl.setAttribute('aria-hidden', 'true');
    sidebarEl.setAttribute('role', 'navigation');

    // header (logo + close button for mobile)
    const header = document.createElement('div');
    header.className = 'sidebar-header';
    header.innerHTML = `<div class="sidebar-logo">App</div><button class="sidebar-close-btn" aria-label="Fechar menu" title="Fechar menu">✕</button>`;
    sidebarEl.appendChild(header);

    // menu (placeholder — seu código pode popular dinamicamente)
    const menu = document.createElement('nav');
    menu.className = 'sidebar-menu';
    menu.innerHTML = `
      <ul>
        <li><a href="#/dashboard">Dashboard</a></li>
        <li><a href="#/clientes">Clientes</a></li>
        <li><a href="#/planos">Planos</a></li>
        <li><a href="#/servidores">Servidores</a></li>
        <li><a href="#/config">Configurações</a></li>
      </ul>
    `;
    sidebarEl.appendChild(menu);

    // append to body
    root.appendChild(sidebarEl);

    // create toggle button in header/topbar (if your layout has topbar, you can append to it)
    sidebarToggleBtn = document.createElement('button');
    sidebarToggleBtn.className = 'sidebar-toggle-btn';
    sidebarToggleBtn.setAttribute('aria-label', 'Abrir menu');
    sidebarToggleBtn.innerHTML = '☰';
    // try to attach to an element with id "topbar-actions" if exists, else to body
    const topActions = document.getElementById('topbar-actions');
    if (topActions) topActions.prepend(sidebarToggleBtn); else document.body.prepend(sidebarToggleBtn);

    // overlay used only on mobile when sidebar open
    overlayEl = document.createElement('div');
    overlayEl.className = 'sidebar-overlay hidden';
    root.appendChild(overlayEl);

    // event handlers
    sidebarToggleBtn.addEventListener('click', toggleSidebar);
    overlayEl.addEventListener('click', hideSidebar);

    // close button inside sidebar
    const closeBtn = sidebarEl.querySelector('.sidebar-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', hideSidebar);

    // handle link click: on mobile, close sidebar when a link inside menu is clicked
    sidebarEl.addEventListener('click', (ev) => {
      const a = ev.target.closest('a');
      if (a && isMobile()) hideSidebar();
    });

    // handle escape key to close sidebar if open
    window.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') hideSidebar();
    });

    // responsive adjustments on resize
    window.addEventListener('resize', () => {
      if (!sidebarEl) return;
      if (!isMobile()) {
        // ensure sidebar visible on desktop (no overlay)
        sidebarEl.classList.remove('collapsed');
        sidebarEl.setAttribute('aria-hidden', 'false');
        overlayEl.classList.add('hidden');
        sidebarToggleBtn.classList.remove('active');
      } else {
        // on mobile keep collapsed by default
        sidebarEl.classList.add('collapsed');
        sidebarEl.setAttribute('aria-hidden', 'true');
        overlayEl.classList.add('hidden');
        sidebarToggleBtn.classList.remove('active');
      }
    });

    // initial state depending on viewport
    if (isMobile()) {
      sidebarEl.classList.add('collapsed');
      sidebarEl.setAttribute('aria-hidden', 'true');
    } else {
      sidebarEl.classList.remove('collapsed');
      sidebarEl.setAttribute('aria-hidden', 'false');
    }
  }

  function showSidebar() {
    if (!mounted) return;
    if (isMobile()) {
      sidebarEl.classList.remove('collapsed');
      overlayEl.classList.remove('hidden');
      sidebarEl.setAttribute('aria-hidden', 'false');
      sidebarToggleBtn.classList.add('active');
      // trap focus optionally (not implemented here)
    } else {
      sidebarEl.classList.remove('collapsed');
      overlayEl.classList.add('hidden');
      sidebarEl.setAttribute('aria-hidden', 'false');
      sidebarToggleBtn.classList.add('active');
    }
  }

  function hideSidebar() {
    if (!mounted) return;
    if (isMobile()) {
      sidebarEl.classList.add('collapsed');
      overlayEl.classList.add('hidden');
      sidebarEl.setAttribute('aria-hidden', 'true');
      sidebarToggleBtn.classList.remove('active');
    } else {
      // on desktop we keep it visible (do nothing) - but keep API
      sidebarEl.classList.remove('collapsed');
      overlayEl.classList.add('hidden');
      sidebarEl.setAttribute('aria-hidden', 'false');
      sidebarToggleBtn.classList.remove('active');
    }
  }

  function toggleSidebar() {
    if (!mounted) return;
    if (sidebarEl.classList.contains('collapsed')) showSidebar(); else hideSidebar();
  }

  // exposed API
  return {
    initSidebar, // call after successful login
    showSidebar,
    hideSidebar,
    toggleSidebar,
    isMounted: () => mounted
  };
})();
