// Minimal router: loads view templates and invokes controllers
window.AppRouter = (function(){
  const routes = {
    '/': { view: 'views/view-login.html', controller: 'LoginView' },
    '/login': { view: 'views/view-login.html', controller: 'LoginView' },
    '/clientes': { view: 'views/view-clientes.html', controller: 'ClientesView' },
    '/planos': { view: 'views/view-planos.html', controller: 'PlanosView' },
    '/servidores': { view: 'views/view-servidores.html', controller: 'ServidoresView' },
    '/apps': { view: 'views/view-apps.html', controller: 'AppsView' },
    '/assinaturas': { view: 'views/view-assinaturas.html', controller: 'AssinaturasView' },
    '/admin': { view: 'views/view-admin.html', controller: 'AdminView' }
  };

  async function loadView(path){
    const route = routes[path] || routes['/login'];
    // fetch template from DOM (templates in /views are included inline as strings above in index)
    // For simplicity, read <template> content from server via fetch, but in this implementation views are in separate files.
    const res = await fetch(route.view);
    const html = await res.text();
    return { html, controller: route.controller };
  }

  async function navigateTo(path){
    const { html, controller } = await loadView(path);
    const viewRoot = document.getElementById('view-root');
    viewRoot.innerHTML = html;
    // set session info
    const sessionEmail = document.getElementById('session-email');
    if(sessionEmail) sessionEmail.textContent = window.sessionAdmin ? (window.sessionAdmin.email || '') : '';
    const ctrl = window[controller];
    if(ctrl && typeof ctrl.init === 'function') await ctrl.init();
  }

  function start(){
    window.addEventListener('hashchange', ()=> navigateTo(location.hash.replace('#','') || '/'));
    const initial = location.hash.replace('#','') || '/';
    navigateTo(initial);
  }

  return { start, navigateTo };
})();
