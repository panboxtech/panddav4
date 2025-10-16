// views/login.js
// Tela de login sem sidebar carregada.
// Ao efetuar login com sucesso, deve chamar Layout.initSidebar() para montar a sidebar.

window.LoginView = (function () {
  async function init() {
    const container = document.getElementById('login-container');
    // render form (assume DOM has container)
    // NOTE: do not call Layout.initSidebar() here; call only after login success.

    const form = document.createElement('form');
    form.className = 'login-form';
    form.innerHTML = `
      <label>Email<input type="email" name="email" class="input" required></label>
      <label>Senha<input type="password" name="senha" class="input" required></label>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button type="submit" class="btn">Entrar</button>
      </div>
    `;
    container.innerHTML = '';
    container.appendChild(form);

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const fd = new FormData(form);
      const email = fd.get('email');
      const senha = fd.get('senha');

      try {
        // chamar AuthService.login ou equivalente
        const session = await AuthService.login({ email, senha });
        // se login OK: inicializar sidebar e redirecionar
        if (session && session.user) {
          // inicializa sidebar apenas após login
          if (window.Layout && typeof window.Layout.initSidebar === 'function') {
            window.Layout.initSidebar();
          }
          // set session global e redireciona para rota principal
          window.sessionAdmin = session;
          location.hash = '/dashboard';
        } else {
          DomUtils.toast('Erro ao autenticar');
        }
      } catch (err) {
        DomUtils.toast(err.message || 'Falha ao autenticar');
        console.error(err);
      }
    });
  }

  return { init };
})();
