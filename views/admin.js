// views/admin.js
// Controller responsável por gerenciar admins: listar, criar, editar (promover/rebaixar adminMaster) e excluir.
// Exports: window.AdminView with init().

window.AdminView = (function () {
  function createAdminLi(admin) {
    const li = document.createElement('li');
    li.className = 'admin-item';
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.alignItems = 'center';

    const left = document.createElement('div');
    left.textContent = `${admin.email} — Cadastrado: ${DomUtils.formatDateISO(admin.dataDeCadastro)} — Master: ${admin.adminMaster}`;

    const actions = document.createElement('div');

    const btnToggle = DomUtils.createEl('button', { class: 'btn ghost', text: admin.adminMaster ? 'Rebaixar' : 'Promover' });
    btnToggle.addEventListener('click', async () => {
      if (!window.sessionAdmin?.adminMaster) {
        DomUtils.toast('Apenas Admin Master pode alterar permissões');
        return;
      }
      // impedir auto-demotion do próprio usuário sem confirmação
      if (admin.id === window.sessionAdmin?.adminId && admin.adminMaster) {
        if (!confirm('Você está prestes a remover seu próprio privilégio de Master. Continuar?')) return;
      }
      try {
        await MockDB.update('admins', admin.id, { adminMaster: !admin.adminMaster });
        await MockDB.insert('atividades', {
          adminId: window.sessionAdmin?.adminId || null,
          action: 'alterar_permissao_admin',
          detalhe: `admin ${admin.id} set adminMaster=${!admin.adminMaster}`
        });
        DomUtils.toast('Permissão alterada');
        await window.AdminView.init();
      } catch (err) {
        DomUtils.toast('Erro ao alterar permissão');
        console.error(err);
      }
    });

    const btnEditPass = DomUtils.createEl('button', { class: 'btn ghost', text: 'Alterar Senha' });
    btnEditPass.addEventListener('click', async () => {
      // modal para alterar senha (mock)
      openChangePasswordModal(admin);
    });

    const btnExcluir = DomUtils.createEl('button', { class: 'btn', text: 'Excluir' });
    btnExcluir.addEventListener('click', async () => {
      if (!window.sessionAdmin?.adminMaster) {
        DomUtils.toast('Apenas Admin Master pode excluir admins');
        return;
      }
      if (admin.id === window.sessionAdmin?.adminId) {
        DomUtils.toast('Você não pode excluir seu próprio usuário');
        return;
      }
      if (!confirm(`Confirma exclusão do admin ${admin.email}?`)) return;
      try {
        await MockDB.remove('admins', admin.id);
        await MockDB.insert('atividades', {
          adminId: window.sessionAdmin?.adminId || null,
          action: 'excluir_admin',
          detalhe: `admin ${admin.id} excluido`
        });
        DomUtils.toast('Admin excluído');
        await window.AdminView.init();
      } catch (err) {
        DomUtils.toast('Erro ao excluir admin');
        console.error(err);
      }
    });

    actions.appendChild(btnToggle);
    actions.appendChild(btnEditPass);
    actions.appendChild(btnExcluir);

    li.appendChild(left);
    li.appendChild(actions);
    return li;
  }

  function openNewAdminModal(onCreated) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.background = 'rgba(0,0,0,0.4)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    const box = document.createElement('div');
    box.className = 'card';
    box.style.width = '420px';

    const h = document.createElement('h3');
    h.textContent = 'Novo Admin';
    box.appendChild(h);

    const inputEmail = DomUtils.createEl('input', { class: 'input', attrs: { placeholder: 'Email' } });
    inputEmail.type = 'email';
    inputEmail.style.marginTop = '8px';
    box.appendChild(inputEmail);
    const errEmail = DomUtils.createEl('small', { class: 'error hidden', text: '' });
    box.appendChild(errEmail);

    const inputSenha = DomUtils.createEl('input', { class: 'input', attrs: { placeholder: 'Senha (mock)' } });
    inputSenha.type = 'password';
    inputSenha.style.marginTop = '8px';
    box.appendChild(inputSenha);
    const errSenha = DomUtils.createEl('small', { class: 'error hidden', text: '' });
    box.appendChild(errSenha);

    const chkMasterWrap = document.createElement('div');
    chkMasterWrap.style.marginTop = '8px';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.id = 'new-admin-master';
    const lbl = document.createElement('label');
    lbl.setAttribute('for', 'new-admin-master');
    lbl.textContent = ' Admin Master';
    chkMasterWrap.appendChild(chk);
    chkMasterWrap.appendChild(lbl);
    box.appendChild(chkMasterWrap);

    const actions = document.createElement('div');
    actions.style.marginTop = '12px';
    actions.style.textAlign = 'right';

    const btnCancel = DomUtils.createEl('button', { class: 'btn ghost', text: 'Cancelar' });
    btnCancel.addEventListener('click', () => document.body.removeChild(overlay));

    const btnCreate = DomUtils.createEl('button', { class: 'btn', text: 'Criar' });
    btnCreate.addEventListener('click', async () => {
      errEmail.classList.add('hidden'); errSenha.classList.add('hidden');
      const email = inputEmail.value.trim();
      const senha = inputSenha.value.trim();
      const adminMaster = chk.checked;
      if (!email) { errEmail.textContent = 'Email obrigatório'; errEmail.classList.remove('hidden'); return; }
      if (!senha) { errSenha.textContent = 'Senha obrigatória'; errSenha.classList.remove('hidden'); return; }
      try {
        const created = await MockDB.insert('admins', { email, senha, adminMaster });
        await MockDB.insert('atividades', {
          adminId: window.sessionAdmin?.adminId || null,
          action: 'criar_admin',
          detalhe: `admin ${created.id} criado`
        });
        DomUtils.toast('Admin criado (mock)');
        document.body.removeChild(overlay);
        if (typeof onCreated === 'function') onCreated(created);
      } catch (err) {
        DomUtils.toast('Erro ao criar admin');
        console.error(err);
      }
    });

    actions.appendChild(btnCancel);
    actions.appendChild(btnCreate);
    box.appendChild(actions);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  function openChangePasswordModal(admin) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.right = '0';
    overlay.style.bottom = '0';
    overlay.style.background = 'rgba(0,0,0,0.4)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';

    const box = document.createElement('div');
    box.className = 'card';
    box.style.width = '420px';

    const h = document.createElement('h3');
    h.textContent = `Alterar senha - ${admin.email}`;
    box.appendChild(h);

    const inputSenha = DomUtils.createEl('input', { class: 'input', attrs: { placeholder: 'Nova senha (mock)' } });
    inputSenha.type = 'password';
    inputSenha.style.marginTop = '8px';
    box.appendChild(inputSenha);

    const err = DomUtils.createEl('small', { class: 'error hidden', text: '' });
    box.appendChild(err);

    const actions = document.createElement('div');
    actions.style.marginTop = '12px';
    actions.style.textAlign = 'right';

    const btnCancel = DomUtils.createEl('button', { class: 'btn ghost', text: 'Cancelar' });
    btnCancel.addEventListener('click', () => document.body.removeChild(overlay));

    const btnSave = DomUtils.createEl('button', { class: 'btn', text: 'Salvar' });
    btnSave.addEventListener('click', async () => {
      err.classList.add('hidden');
      const senha = inputSenha.value.trim();
      if (!senha) { err.textContent = 'Senha obrigatória'; err.classList.remove('hidden'); return; }
      try {
        await MockDB.update('admins', admin.id, { senha });
        await MockDB.insert('atividades', {
          adminId: window.sessionAdmin?.adminId || null,
          action: 'alterar_senha_admin',
          detalhe: `admin ${admin.id} senha alterada`
        });
        DomUtils.toast('Senha alterada (mock)');
        document.body.removeChild(overlay);
        await window.AdminView.init();
      } catch (err2) {
        DomUtils.toast('Erro ao alterar senha');
        console.error(err2);
      }
    });

    actions.appendChild(btnCancel);
    actions.appendChild(btnSave);
    box.appendChild(actions);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  async function init() {
    const root = document.getElementById('admin-root');
    if (!root) return;
    DomUtils.clearChildren(root);

    const header = document.createElement('div');
    header.className = 'row';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const title = document.createElement('strong');
    title.textContent = 'Administradores';
    header.appendChild(title);

    const actions = document.createElement('div');
    const btnNew = DomUtils.createEl('button', { class: 'btn', text: 'Novo Admin' });
    btnNew.addEventListener('click', () => openNewAdminModal(async () => await init()));
    actions.appendChild(btnNew);

    header.appendChild(actions);
    root.appendChild(header);

    try {
      const admins = await MockDB.getAll('admins');
      const ul = document.createElement('ul');
      ul.style.marginTop = '12px';
      if (!admins.length) {
        const none = document.createElement('div');
        none.textContent = 'Nenhum admin cadastrado.';
        ul.appendChild(none);
      } else {
        for (const a of admins) {
          const li = createAdminLi(a);
          ul.appendChild(li);
        }
      }
      root.appendChild(ul);
    } catch (err) {
      DomUtils.toast('Erro ao carregar administradores');
      console.error(err);
    }
  }

  return { init };
})();
