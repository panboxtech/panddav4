// views/login.js
// Tela de login sem sidebar carregada.
// Comportamentos:
// - Aguarda DOMContentLoaded
// - Se #login-container não existir, cria um container e injeta um formulário + botões mock funcional
// - Ao logar com sucesso, chama Layout.initSidebar() e redireciona para /dashboard
// - Se AuthService.mockLogin não existir, cria fallback de mock de sessão para testes

window.LoginView = (function () {
  async function init() {
    if (document.readyState === 'loading') {
      await new Promise(res => document.addEventListener('DOMContentLoaded', res, { once: true }));
    }

    let container = document.getElementById('login-container');
    const createdAutomatically = !container;

    if (!container) {
      console.warn('LoginView: elemento #login-container não encontrado. Criando container automaticamente. Para corrigir permanentemente, adicione <div id="login-container"></div> ao template de login.');
      container = document.createElement('div');
      container.id = 'login-container';
      // estilos mínimos para ficar visível
      container.style.maxWidth = '420px';
      container.style.margin = '36px auto';
      container.style.padding = '16px';
      container.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)';
      container.style.background = '#fff';
      container.style.borderRadius = '8px';
      document.body.appendChild(container);
    }

    // Monta o formulário principal (sempre)
    const form = document.createElement('form');
    form.className = 'login-form';
    form.innerHTML = `
      <label style="display:block;margin-bottom:10px">
        <div style="font-size:13px;margin-bottom:6px">Email</div>
        <input type="email" name="email" class="input" required style="width:100%;box-sizing:border-box;padding:8px">
      </label>
      <label style="display:block;margin-bottom:10px">
        <div style="font-size:13px;margin-bottom:6px">Senha</div>
        <input type="password" name="senha" class="input" required style="width:100%;box-sizing:border-box;padding:8px">
      </label>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button type="submit" class="btn">Entrar</button>
      </div>
    `;

    // Se criamos o container automaticamente, adicionamos também botões de mock para facilitar testes
    const mockArea = document.createElement('div');
    mockArea.style.marginTop = '12px';
    if (createdAutomatically) {
      mockArea.innerHTML = `
        <div style="font-size:13px;color:#666;margin-bottom:8px">Ambiente de testes: botões mock</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" id="mock-user-btn" class="btn ghost">Entrar (mock user)</button>
          <button type="button" id="mock-admin-btn" class="btn ghost">Entrar (mock admin)</button>
          <button type="button" id="mock-fail-btn" class="btn ghost">Mock falha</button>
        </div>
      `;
    }

    // anexar no container
    container.innerHTML = '';
    container.appendChild(form);
    if (createdAutomatically) container.appendChild(mockArea);

    // helper: fallback de mock session caso AuthService.mockLogin não exista
    function fallbackCreateSession(role = 'user') {
      const session = {
        user: { email: role === 'admin' ? 'admin@mock' : 'user@mock', role },
        token: 'mock-token-' + Math.random().toString(36).slice(2, 10)
      };
      return session;
    }

    // handler submit padrão (real)
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const fd = new FormData(form);
      const email = fd.get('email');
      const senha = fd.get('senha');

      try {
        let session = null;
        if (window.AuthService && typeof window.AuthService.login === 'function') {
          session = await AuthService.login({ email, senha });
        } else {
          // fallback: simulate a successful login for any credentials (development convenience)
          console.warn('AuthService.login não encontrado. Usando mock fallback de sessão.');
          session = fallbackCreateSession(email === 'admin' ? 'admin' : 'user');
        }

        if (session && session.user) {
          if (window.Layout && typeof window.Layout.initSidebar === 'function') {
            try { window.Layout.initSidebar(); } catch (e) { console.error('Erro ao inicializar sidebar:', e); }
          }
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

    // somente se mockArea foi criado, ligar os botões mock
    if (createdAutomatically) {
      const mockUserBtn = document.getElementById('mock-user-btn');
      const mockAdminBtn = document.getElementById('mock-admin-btn');
      const mockFailBtn = document.getElementById('mock-fail-btn');

      if (mockUserBtn) {
        mockUserBtn.addEventListener('click', async () => {
          try {
            let session = null;
            if (window.AuthService && typeof window.AuthService.mockLogin === 'function') {
              session = await AuthService.mockLogin({ role: 'user' });
            } else {
              session = fallbackCreateSession('user');
            }
            if (session && session.user) {
              if (window.Layout && typeof window.Layout.initSidebar === 'function') {
                try { window.Layout.initSidebar(); } catch (e) { console.error('Erro ao inicializar sidebar:', e); }
              }
              window.sessionAdmin = session;
              location.hash = '/dashboard';
            }
          } catch (err) {
            DomUtils.toast('Erro mock login'); console.error(err);
          }
        });
      }

      if (mockAdminBtn) {
        mockAdminBtn.addEventListener('click', async () => {
          try {
            let session = null;
            if (window.AuthService && typeof window.AuthService.mockLogin === 'function') {
              session = await AuthService.mockLogin({ role: 'admin' });
            } else {
              session = fallbackCreateSession('admin');
            }
            if (session && session.user) {
              if (window.Layout && typeof window.Layout.initSidebar === 'function') {
                try { window.Layout.initSidebar(); } catch (e) { console.error('Erro ao inicializar sidebar:', e); }
              }
              window.sessionAdmin = session;
              location.hash = '/dashboard';
            }
          } catch (err) {
            DomUtils.toast('Erro mock admin login'); console.error(err);
          }
        });
      }

      if (mockFailBtn) {
        mockFailBtn.addEventListener('click', () => {
          DomUtils.toast('Mock: falha simulada'); console.warn('Mock fail button clicked');
        });
      }
    }
  }

  return { init };
})();
