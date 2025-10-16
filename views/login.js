// views/login.js
// Tela de login sem sidebar carregada.
// Comportamentos:
// - Aguarda DOMContentLoaded
// - Garante que exista #login-container (cria somente se faltar)
// - Se criou o container automaticamente, não exibe aviso repetido e injeta botões mock funcionais
// - Usa referências diretas aos botões criados (não depende de getElementById após innerHTML)
// - Ao logar com sucesso, chama Layout.initSidebar() e redireciona para /dashboard

window.LoginView = (function () {
  async function init() {
    // Aguarda DOM estar pronto para evitar execução prematura
    if (document.readyState === 'loading') {
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }

    let container = document.getElementById('login-container');
    let createdAutomatically = false;

    if (!container) {
      // Criar container fallback de forma silenciosa (sem warning repetido)
      createdAutomatically = true;
      container = document.createElement('div');
      container.id = 'login-container';
      // Estilos mínimos para visibilidade durante testes
      container.style.maxWidth = '480px';
      container.style.margin = '36px auto';
      container.style.padding = '16px';
      container.style.boxShadow = '0 6px 20px rgba(0,0,0,0.06)';
      container.style.background = '#fff';
      container.style.borderRadius = '8px';
      // inserir no body como fallback
      document.body.appendChild(container);
    }

    // montar o form principal
    const form = document.createElement('form');
    form.className = 'login-form';
    form.innerHTML = `
      <label style="display:block;margin-bottom:12px">
        <div style="font-size:13px;margin-bottom:6px">Email</div>
        <input type="email" name="email" class="input" required style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #e6e9ee;border-radius:6px">
      </label>
      <label style="display:block;margin-bottom:12px">
        <div style="font-size:13px;margin-bottom:6px">Senha</div>
        <input type="password" name="senha" class="input" required style="width:100%;box-sizing:border-box;padding:10px;border:1px solid #e6e9ee;border-radius:6px">
      </label>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button type="submit" class="btn">Entrar</button>
      </div>
    `;

    // área de mock (criada como elementos reais para evitar problemas com getElementById)
    let mockArea = null;
    let mockUserBtn = null;
    let mockAdminBtn = null;
    let mockFailBtn = null;

    if (createdAutomatically) {
      mockArea = document.createElement('div');
      mockArea.style.marginTop = '14px';
      mockArea.style.display = 'flex';
      mockArea.style.flexDirection = 'column';
      mockArea.style.gap = '8px';

      const mockInfo = document.createElement('div');
      mockInfo.style.fontSize = '13px';
      mockInfo.style.color = '#666';
      mockInfo.textContent = 'Ambiente de testes: botões mock';

      const mockBtnsWrap = document.createElement('div');
      mockBtnsWrap.style.display = 'flex';
      mockBtnsWrap.style.gap = '8px';
      mockBtnsWrap.style.flexWrap = 'wrap';

      mockUserBtn = document.createElement('button');
      mockUserBtn.type = 'button';
      mockUserBtn.className = 'btn ghost';
      mockUserBtn.textContent = 'Entrar (mock user)';

      mockAdminBtn = document.createElement('button');
      mockAdminBtn.type = 'button';
      mockAdminBtn.className = 'btn ghost';
      mockAdminBtn.textContent = 'Entrar (mock admin)';

      mockFailBtn = document.createElement('button');
      mockFailBtn.type = 'button';
      mockFailBtn.className = 'btn ghost';
      mockFailBtn.textContent = 'Mock falha';

      mockBtnsWrap.appendChild(mockUserBtn);
      mockBtnsWrap.appendChild(mockAdminBtn);
      mockBtnsWrap.appendChild(mockFailBtn);

      mockArea.appendChild(mockInfo);
      mockArea.appendChild(mockBtnsWrap);
    }

    // anexar ao container
    container.innerHTML = '';
    container.appendChild(form);
    if (createdAutomatically && mockArea) container.appendChild(mockArea);

    // fallback helper para criar sessão mock quando AuthService não existir
    function fallbackCreateSession(role = 'user') {
      return {
        user: { email: role === 'admin' ? 'admin@mock' : 'user@mock', role, adminMaster: role === 'admin' },
        token: 'mock-token-' + Math.random().toString(36).slice(2, 10)
      };
    }

    // função para inicializar sessão (com Layout) de maneira centralizada
    async function finalizeLogin(session) {
      if (!session || !session.user) {
        DomUtils.toast('Erro ao autenticar');
        return;
      }
      // inicializa sidebar somente após login, se disponível
      if (window.Layout && typeof window.Layout.initSidebar === 'function') {
        try { window.Layout.initSidebar(); } catch (e) { console.error('Erro ao inicializar sidebar:', e); }
      }
      window.sessionAdmin = session;
      // redireciona para dashboard
      location.hash = '/dashboard';
    }

    // submit do form principal (tentativa real de login)
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
          // fallback: criar sessão mock (não exibir warning repetido)
          console.info('AuthService.login não encontrado. Usando sessão mock para desenvolvimento.');
          session = fallbackCreateSession(email === 'admin' ? 'admin' : 'user');
        }
        await finalizeLogin(session);
      } catch (err) {
        DomUtils.toast(err?.message || 'Falha ao autenticar');
        console.error(err);
      }
    });

    // ligar botões mock criados diretamente (evita dependência de IDs no DOM)
    if (createdAutomatically && mockUserBtn && mockAdminBtn && mockFailBtn) {
      mockUserBtn.addEventListener('click', async () => {
        try {
          let session = null;
          if (window.AuthService && typeof window.AuthService.mockLogin === 'function') {
            session = await AuthService.mockLogin({ role: 'user' });
          } else {
            session = fallbackCreateSession('user');
          }
          await finalizeLogin(session);
        } catch (err) {
          DomUtils.toast('Erro no mock login'); console.error(err);
        }
      });

      mockAdminBtn.addEventListener('click', async () => {
        try {
          let session = null;
          if (window.AuthService && typeof window.AuthService.mockLogin === 'function') {
            session = await AuthService.mockLogin({ role: 'admin' });
          } else {
            session = fallbackCreateSession('admin');
          }
          await finalizeLogin(session);
        } catch (err) {
          DomUtils.toast('Erro no mock admin login'); console.error(err);
        }
      });

      mockFailBtn.addEventListener('click', () => {
        DomUtils.toast('Mock: falha simulada');
        console.warn('Mock fail button clicked');
      });
    }

    // foco no primeiro campo para melhor UX
    const firstInput = form.querySelector('input[name="email"]');
    if (firstInput) firstInput.focus();
  }

  return { init };
})();
