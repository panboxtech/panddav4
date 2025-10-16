// views/login.js
// Tela de login sem sidebar carregada.
// Proteção: aguarda DOMContentLoaded e garante que exista um elemento #login-container.
// Se não existir, cria o container automaticamente e escreve um aviso no console para correção no template.

window.LoginView = (function () {
  async function init() {
    // Aguarda DOM pronto caso o script seja executado antes do carregamento do DOM
    if (document.readyState === 'loading') {
      await new Promise(res => document.addEventListener('DOMContentLoaded', res, { once: true }));
    }

    let container = document.getElementById('login-container');

    if (!container) {
      // Aviso ao desenvolvedor: o template idealmente deve conter <div id="login-container"></div>
      console.warn('LoginView: elemento #login-container não encontrado. Criando container automaticamente. Para corrigir permanentemente, adicione <div id="login-container"></div> ao template de login.');

      // Criar container para evitar erro e garantir que a tela de login seja exibida
      container = document.createElement('div');
      container.id = 'login-container';
      // Inserir no corpo como fallback; você pode mover para posição adequada no template
      document.body.appendChild(container);
    }

    // Monta o formulário de login
    const form = document.createElement('form');
    form.className = 'login-form';
    form.innerHTML = `
      <label style="display:block;margin-bottom:8px">
        <div style="font-size:13px;margin-bottom:4px">Email</div>
        <input type="email" name="email" class="input" required style="width:100%;box-sizing:border-box">
      </label>
      <label style="display:block;margin-bottom:8px">
        <div style="font-size:13px;margin-bottom:4px">Senha</div>
        <input type="password" name="senha" class="input" required style="width:100%;box-sizing:border-box">
      </label>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button type="submit" class="btn">Entrar</button>
      </div>
    `;

    // Limpa e anexa o formulário
    container.innerHTML = '';
    container.appendChild(form);

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const fd = new FormData(form);
      const email = fd.get('email');
      const senha = fd.get('senha');

      try {
        // Chame aqui seu serviço de autenticação
        const session = await AuthService.login({ email, senha });
        if (session && session.user) {
          // Inicializa a sidebar somente após login, se disponível
          if (window.Layout && typeof window.Layout.initSidebar === 'function') {
            try { window.Layout.initSidebar(); } catch (e) { console.error('Erro ao inicializar sidebar:', e); }
          }
          // Define sessão global e redireciona
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
