// views/clientes.js
// Controller da view Clientes com listagem e modal completo de cadastro de novo cliente.
// Responsabilidades:
// - Renderizar lista/filters (mantido)
// - Abrir modal "Novo Cliente" com formulário completo
// - Validar em tempo real: campos obrigatórios, telefone, soma de pontos === telas,
//   unicidade de usuário para apps exclusivos, dataDeVencimento obrigatória e futura
// - Calcular dataDeVencimento padrão com base no plano selecionado (validadeEmMeses),
//   preservando dia do mês e ajustando para 1º do mês seguinte quando dia não existir
// - Persistir via ClienteService.createWithAssinaturaAndPontos (mock transaction) e tratar rollback
// - Registrar atividades no MockDB através da service usada internamente

window.ClientesView = (function () {
  const containerId = 'clients-container';

  async function init() {
    if (!window.sessionAdmin) { location.hash = '/login'; return; }
    const container = document.getElementById(containerId);
    const filter = document.getElementById('filter-clients');
    const sort = document.getElementById('sort-clients');
    const btnNew = document.getElementById('btn-new-client');

    async function render() {
      DomUtils.clearChildren(container);
      const rows = await ClienteService.list();
      let list = rows;
      const todayIso = new Date().toISOString();
      const f = filter.value;
      if (f === '<=3') {
        list = list.filter(r => r.assinatura && daysDiff(r.assinatura.dataDeVencimento, todayIso) <= 3 && daysDiff(r.assinatura.dataDeVencimento, todayIso) >= 0);
      } else if (f === '<30') {
        list = list.filter(r => r.assinatura && daysDiff(todayIso, r.assinatura.dataDeVencimento) > 0 && daysDiff(todayIso, r.assinatura.dataDeVencimento) < 30);
      } else if (f === 'vencidos') {
        list = list.filter(r => r.assinatura && new Date(r.assinatura.dataDeVencimento) < new Date());
      }

      if (sort.value === 'vencimento') {
        list.sort((a, b) => {
          const av = a.assinatura ? new Date(a.assinatura.dataDeVencimento).getTime() : Infinity;
          const bv = b.assinatura ? new Date(b.assinatura.dataDeVencimento).getTime() : Infinity;
          return av - bv;
        });
      } else {
        list.sort((a, b) => a.nome.localeCompare(b.nome));
      }

      const table = document.createElement('table');
      table.innerHTML = `<thead><tr><th>Nome</th><th>Plano</th><th>Vencimento</th><th>Progresso</th><th>Ações</th></tr></thead>`;
      const tbody = document.createElement('tbody');

      const allPontos = await MockDB.getAll('pontosDeAcesso');

      for (const r of list) {
        const tr = document.createElement('tr');
        const nomeTd = document.createElement('td'); nomeTd.textContent = r.nome;
        const planoTd = document.createElement('td'); planoTd.textContent = r.plano ? r.plano.nome : '-';
        const vencTd = document.createElement('td'); vencTd.textContent = r.assinatura ? DomUtils.formatDateISO(r.assinatura.dataDeVencimento) : '-';

        const progTd = document.createElement('td');
        const pontos = allPontos.filter(p => p.cliente === r.id);
        const somaPontos = pontos.reduce((s, x) => s + Number(x.pontosSimultaneos || 0), 0);
        const telas = r.assinatura ? Number(r.assinatura.telas || 0) : 0;
        const percent = telas ? Math.min(100, Math.round((somaPontos / telas) * 100)) : 0;
        progTd.innerHTML = `<div>${somaPontos} / ${telas}</div><div class="progress-bar"><div class="progress" style="width:${percent}%"></div></div>`;

        const actionsTd = document.createElement('td');
        const btnEdit = DomUtils.createEl('button', { class: 'btn ghost', text: 'Editar' });
        btnEdit.addEventListener('click', () => DomUtils.toast(`Abrir edição de ${r.nome} (implementar form completo)`));
        const btnBlock = DomUtils.createEl('button', { class: 'btn ghost', text: r.bloqueado ? 'Desbloquear' : 'Bloquear' });
        btnBlock.addEventListener('click', async () => {
          if (r.bloqueado && !window.sessionAdmin.adminMaster) { DomUtils.toast('Apenas Admin Master pode desbloquear'); return; }
          await MockDB.update('clientes', r.id, { bloqueado: !r.bloqueado });
          DomUtils.toast(r.bloqueado ? 'Cliente desbloqueado' : 'Cliente bloqueado');
          await render();
        });
        const btnWhats = DomUtils.createEl('button', { class: 'btn ghost', text: 'WhatsApp' });
        btnWhats.addEventListener('click', () => {
          const telefone = r.telefone.replace(/\D/g, '');
          const nomePrimeiro = r.nome.split(' ')[0];
          const msg = encodeURIComponent(`Olá ${nomePrimeiro}, seu acesso está vencendo, para renovar`);
          window.open(`https://wa.me/${telefone}?text=${msg}`, '_blank');
        });
        const btnRenew = DomUtils.createEl('button', { class: 'btn ghost', text: 'Renovar' });
        btnRenew.addEventListener('click', async () => {
          if (!r.assinatura) { DomUtils.toast('Sem assinatura'); return; }
          try {
            const novoIso = AssinaturaService.renew(r.assinatura, r.plano.validadeEmMeses);
            await MockDB.update('assinaturas', r.assinatura.id, { dataDeVencimento: novoIso });
            await MockDB.insert('atividades', { adminId: window.sessionAdmin?.adminId || null, action: 'renew', detalhe: `assinatura ${r.assinatura.id}` });
            DomUtils.toast('Assinatura renovada');
            await render();
          } catch (err) { DomUtils.toast('Erro ao renovar'); }
        });

        actionsTd.appendChild(btnEdit);
        actionsTd.appendChild(btnBlock);
        actionsTd.appendChild(btnWhats);
        actionsTd.appendChild(btnRenew);

        if (window.sessionAdmin && window.sessionAdmin.adminMaster) {
          const btnDel = DomUtils.createEl('button', { class: 'btn', text: 'Excluir' });
          btnDel.addEventListener('click', async () => {
            if (!confirm('Confirma exclusão do cliente?')) return;
            try { await MockDB.remove('clientes', r.id); DomUtils.toast('Cliente excluído'); await render(); }
            catch (e) { DomUtils.toast('Erro ao excluir'); }
          });
          actionsTd.appendChild(btnDel);
        }

        tr.appendChild(nomeTd); tr.appendChild(planoTd); tr.appendChild(vencTd); tr.appendChild(progTd); tr.appendChild(actionsTd);
        tbody.appendChild(tr);
      }

      table.appendChild(tbody);
      container.appendChild(table);
    }

    function daysDiff(aIso, bIso) {
      const a = new Date(aIso), b = new Date(bIso);
      const diff = Math.ceil((a - b) / (1000 * 60 * 60 * 24));
      return diff;
    }

    filter.addEventListener('change', render);
    sort.addEventListener('change', render);
    btnNew.addEventListener('click', () => openNewClientModal());

    await render();
  }

  // -------------------------
  // Modal: Novo Cliente
  // -------------------------
  async function openNewClientModal() {
    // Fetch reference data
    const [planos, servidores, apps] = await Promise.all([PlanoService.list(), ServidorService.list(), AppService.list()]);
    // attempt to get server-side date from Supabase in production (fallback to local)
    let serverNow = new Date();
    // If SupabaseService provided a server time getter, use it here (not implemented in mock)
    // fallback to local time
    const today = serverNow;

    // modal overlay
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
    box.style.width = '880px';
    box.style.maxHeight = '85vh';
    box.style.overflow = 'auto';
    box.style.padding = '18px';

    const title = document.createElement('h3'); title.textContent = 'Novo Cliente';
    box.appendChild(title);

    // Form container
    const form = document.createElement('div');
    form.className = 'form-grid';

    // Left column: cliente fields
    const left = document.createElement('div');
    left.style.minWidth = '420px';

    // Nome
    const nomeLabel = document.createElement('label'); nomeLabel.textContent = 'Nome *';
    const inputNome = DomUtils.createEl('input', { class: 'input' });
    inputNome.type = 'text';
    const errNome = DomUtils.createEl('small', { class: 'error hidden', text: '' });
    left.appendChild(nomeLabel); left.appendChild(inputNome); left.appendChild(errNome);

    // Telefone
    const telLabel = document.createElement('label'); telLabel.textContent = 'Telefone *';
    const inputTel = DomUtils.createEl('input', { class: 'input' });
    inputTel.type = 'tel';
    const errTel = DomUtils.createEl('small', { class: 'error hidden', text: '' });
    left.appendChild(telLabel); left.appendChild(inputTel); left.appendChild(errTel);

    // Email
    const emailLabel = document.createElement('label'); emailLabel.textContent = 'Email';
    const inputEmail = DomUtils.createEl('input', { class: 'input' });
    inputEmail.type = 'email';
    const errEmail = DomUtils.createEl('small', { class: 'error hidden', text: '' });
    left.appendChild(emailLabel); left.appendChild(inputEmail); left.appendChild(errEmail);

    // Plano select
    const planoLabel = document.createElement('label'); planoLabel.textContent = 'Plano *';
    const selectPlano = document.createElement('select'); selectPlano.className = 'input';
    selectPlano.innerHTML = `<option value="">Selecione um plano</option>` + planos.map(p => `<option value="${p.id}" data-validade="${p.validadeEmMeses}">${p.nome} (${p.validadeEmMeses} meses)</option>`).join('');
    const errPlano = DomUtils.createEl('small', { class: 'error hidden', text: '' });
    left.appendChild(planoLabel); left.appendChild(selectPlano); left.appendChild(errPlano);

    // Data de vencimento (obrigatória)
    const vencLabel = document.createElement('label'); vencLabel.textContent = 'Data de Vencimento *';
    const inputVenc = DomUtils.createEl('input', { class: 'input' });
    inputVenc.type = 'date';
    const errVenc = DomUtils.createEl('small', { class: 'error hidden', text: '' });
    left.appendChild(vencLabel); left.appendChild(inputVenc); left.appendChild(errVenc);

    // Telas
    const telasLabel = document.createElement('label'); telasLabel.textContent = 'Telas *';
    const inputTelas = DomUtils.createEl('input', { class: 'input' });
    inputTelas.type = 'number'; inputTelas.min = 1; inputTelas.value = 1;
    const errTelas = DomUtils.createEl('small', { class: 'error hidden', text: '' });
    left.appendChild(telasLabel); left.appendChild(inputTelas); left.appendChild(errTelas);

    // Servidor 1
    const s1Label = document.createElement('label'); s1Label.textContent = 'Servidor 1 *';
    const selectS1 = document.createElement('select'); selectS1.className = 'input';
    selectS1.innerHTML = `<option value="">Selecione servidor 1</option>` + servidores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
    const errS1 = DomUtils.createEl('small', { class: 'error hidden', text: '' });
    left.appendChild(s1Label); left.appendChild(selectS1); left.appendChild(errS1);

    // Servidor 2
    const s2Label = document.createElement('label'); s2Label.textContent = 'Servidor 2 (opcional)';
    const selectS2 = document.createElement('select'); selectS2.className = 'input';
    selectS2.innerHTML = `<option value="">Selecione um segundo servidor (opcional)</option>` + servidores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
    const errS2 = DomUtils.createEl('small', { class: 'error hidden', text: '' });
    left.appendChild(s2Label); left.appendChild(selectS2); left.appendChild(errS2);

    form.appendChild(left);

    // Right column: pontos dinâmicos e resumo
    const right = document.createElement('div');
    right.style.minWidth = '320px';

    const pontosTitle = document.createElement('strong'); pontosTitle.textContent = 'Pontos de Acesso';
    right.appendChild(pontosTitle);

    const pontosContainer = document.createElement('div');
    pontosContainer.style.marginTop = '8px';
    right.appendChild(pontosContainer);

    const btnAddPonto = DomUtils.createEl('button', { class: 'btn ghost', text: 'Adicionar Ponto de Acesso' });
    btnAddPonto.style.marginTop = '8px';
    right.appendChild(btnAddPonto);

    const resumo = document.createElement('div'); resumo.style.marginTop = '12px';
    resumo.innerHTML = `<div>Soma pontos: <span id="somaPontos">0</span> / Telas: <span id="telasIndicator">${inputTelas.value}</span></div>`;
    right.appendChild(resumo);

    form.appendChild(right);
    box.appendChild(form);

    // Footer actions
    const footer = document.createElement('div');
    footer.style.display = 'flex';
    footer.style.justifyContent = 'flex-end';
    footer.style.gap = '8px';
    footer.style.marginTop = '12px';

    const btnCancel = DomUtils.createEl('button', { class: 'btn ghost', text: 'Cancelar' });
    const btnSave = DomUtils.createEl('button', { class: 'btn', text: 'Salvar' });
    btnSave.disabled = true;

    footer.appendChild(btnCancel); footer.appendChild(btnSave);
    box.appendChild(footer);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // state: pontos array
    const pontosState = [];

    // util: update soma e toggle salvar
    function updateResumoAndValidate() {
      const soma = pontosState.reduce((s, p) => s + Number(p.pontosSimultaneos || 0), 0);
      document.getElementById('somaPontos').textContent = soma;
      document.getElementById('telasIndicator').textContent = inputTelas.value || '0';
      validateForm();
    }

    // Validation functions
    function validateForm() {
      let valid = true;
      // nome
      if (!inputNome.value.trim()) { errNome.textContent = 'Nome obrigatório'; errNome.classList.remove('hidden'); valid = false; } else { errNome.classList.add('hidden'); }
      // telefone numeric
      const telVal = inputTel.value.replace(/\D/g, '');
      if (!telVal) { errTel.textContent = 'Telefone obrigatório'; errTel.classList.remove('hidden'); valid = false; } else { errTel.classList.add('hidden'); }
      // plano
      if (!selectPlano.value) { errPlano.textContent = 'Plano obrigatório'; errPlano.classList.remove('hidden'); valid = false; } else { errPlano.classList.add('hidden'); }
      // servidores
      if (!selectS1.value) { errS1.textContent = 'Servidor 1 obrigatório'; errS1.classList.remove('hidden'); valid = false; } else { errS1.classList.add('hidden'); }
      // telas
      const telasVal = Number(inputTelas.value);
      if (!telasVal || telasVal < 1) { errTelas.textContent = 'Telas deve ser >= 1'; errTelas.classList.remove('hidden'); valid = false; } else { errTelas.classList.add('hidden'); }
      // data de vencimento: obrigatório e futuro (maior que hoje)
      const vencVal = inputVenc.value;
      if (!vencVal) { errVenc.textContent = 'Data de vencimento obrigatória'; errVenc.classList.remove('hidden'); valid = false; } else {
        const chosen = new Date(vencVal + 'T00:00:00');
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (chosen <= startOfToday) { errVenc.textContent = 'Data deve ser maior que hoje'; errVenc.classList.remove('hidden'); valid = false; } else { errVenc.classList.add('hidden'); }
      }
      // pontos: sum == telas and each ponto valid
      const soma = pontosState.reduce((s, p) => s + Number(p.pontosSimultaneos || 0), 0);
      if (soma !== Number(inputTelas.value)) {
        // show summary error near tela or pontos
        errTelas.textContent = 'Soma de pontos deve ser igual a telas'; errTelas.classList.remove('hidden');
        valid = false;
      } else {
        // only clear telas error if other telas validations pass
        if (Number(inputTelas.value) >= 1) { errTelas.classList.add('hidden'); }
      }
      // validate each ponto internal rules
      for (const p of pontosState) {
        if (!p.app) { DomUtils.toast('App obrigatório em cada ponto'); valid = false; break; }
        if (!p.usuario) { DomUtils.toast('Usuário obrigatório em cada ponto'); valid = false; break; }
        if (!p.senha) { DomUtils.toast('Senha obrigatória em cada ponto'); valid = false; break; }
        if (!p.pontosSimultaneos || Number(p.pontosSimultaneos) < 1) { DomUtils.toast('Pontos simultâneos deve ser >=1 em cada ponto'); valid = false; break; }
      }
      // validate uniqueness for exclusive apps local-only
      // For each ponto with app.multiplosAcessos === false, usuario must be unique across pontosState
      const appsMap = {};
      apps.forEach(a => appsMap[a.id] = a);
      for (let i = 0; i < pontosState.length; i++) {
        const pi = pontosState[i];
        const appMeta = appsMap[pi.app];
        if (!appMeta) continue;
        if (!appMeta.multiplosAcessos) {
          // check duplicates in pontosState
          const dup = pontosState.some((p, idx) => idx !== i && p.usuario === pi.usuario && p.app === pi.app);
          if (dup) {
            DomUtils.toast(`Usuário ${pi.usuario} já usado em outro ponto exclusivo localmente`); valid = false; break;
          }
        }
      }
      btnSave.disabled = !valid;
      return valid;
    }

    // helper: create ponto block UI with bindings to pontosState item
    function createPontoBlock(pontoObj) {
      const block = document.createElement('div');
      block.className = 'ponto-block card';
      block.style.marginBottom = '8px';
      // server selector (1 or 2)
      const serverSelLabel = document.createElement('label'); serverSelLabel.textContent = 'Servidor';
      const serverSel = document.createElement('select'); serverSel.className = 'input';
      // options: server1 and server2 currently selected in main form; but ponto can be any server chosen from available servers
      serverSel.innerHTML = `<option value="">Selecione servidor</option>` + servidores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
      if (pontoObj.servidor) serverSel.value = pontoObj.servidor;
      block.appendChild(serverSelLabel); block.appendChild(serverSel);

      // app selector (filtered by server)
      const appLabel = document.createElement('label'); appLabel.textContent = 'App';
      const appSel = document.createElement('select'); appSel.className = 'input';
      function populateAppOptions(serverId) {
        const filtered = apps.filter(a => Number(a.servidor) === Number(serverId));
        appSel.innerHTML = `<option value="">Selecione App</option>` + filtered.map(a => `<option value="${a.id}" data-multi="${a.multiplosAcessos}">${a.nome} (${a.multiplosAcessos ? 'multi' : 'exclusivo'})</option>`).join('');
      }
      if (pontoObj.servidor) populateAppOptions(pontoObj.servidor);
      if (pontoObj.app) appSel.value = pontoObj.app;
      block.appendChild(appLabel); block.appendChild(appSel);

      // pontosSimultaneos
      const pontosLabel = document.createElement('label'); pontosLabel.textContent = 'Pontos simultâneos';
      const pontosInp = DomUtils.createEl('input', { class: 'input' });
      pontosInp.type = 'number'; pontosInp.min = 1; pontosInp.value = pontoObj.pontosSimultaneos || 1;
      block.appendChild(pontosLabel); block.appendChild(pontosInp);

      // usuario
      const userLabel = document.createElement('label'); userLabel.textContent = 'Usuário';
      const userInp = DomUtils.createEl('input', { class: 'input' });
      userInp.type = 'text'; userInp.value = pontoObj.usuario || '';
      block.appendChild(userLabel); block.appendChild(userInp);

      // senha
      const passLabel = document.createElement('label'); passLabel.textContent = 'Senha';
      const passInp = DomUtils.createEl('input', { class: 'input' });
      passInp.type = 'text'; passInp.value = pontoObj.senha || '';
      block.appendChild(passLabel); block.appendChild(passInp);

      // remove
      const removeBtn = DomUtils.createEl('button', { class: 'btn ghost', text: 'Remover' });
      removeBtn.style.marginTop = '8px';
      removeBtn.addEventListener('click', () => {
        const idx = pontosState.indexOf(pontoObj);
        if (idx >= 0) {
          pontosState.splice(idx, 1);
          pontosContainer.removeChild(block);
          updateResumoAndValidate();
        }
      });
      block.appendChild(removeBtn);

      // events: serverSel change -> repopulate apps
      serverSel.addEventListener('change', () => {
        pontoObj.servidor = Number(serverSel.value) || null;
        populateAppOptions(pontoObj.servidor);
        // clear app selection when server changes
        pontoObj.app = null; appSel.value = '';
        updateResumoAndValidate();
      });

      // app change
      appSel.addEventListener('change', () => {
        pontoObj.app = Number(appSel.value) || null;
        updateResumoAndValidate();
      });

      pontosInp.addEventListener('input', () => {
        pontoObj.pontosSimultaneos = Number(pontosInp.value) || 0;
        updateResumoAndValidate();
      });

      userInp.addEventListener('input', () => {
        pontoObj.usuario = userInp.value.trim();
        updateResumoAndValidate();
      });

      passInp.addEventListener('input', () => {
        pontoObj.senha = passInp.value;
        updateResumoAndValidate();
      });

      return block;
    }

    // add initial ponto if desired? start empty; user adds
    btnAddPonto.addEventListener('click', () => {
      const pontoObj = { servidor: selectS1.value ? Number(selectS1.value) : null, app: null, pontosSimultaneos: 1, usuario: '', senha: '' };
      pontosState.push(pontoObj);
      const block = createPontoBlock(pontoObj);
      pontosContainer.appendChild(block);
      updateResumoAndValidate();
    });

    // When plano changes, compute default vencimento
    selectPlano.addEventListener('change', () => {
      const selected = selectPlano.selectedOptions[0];
      if (!selected || !selected.dataset) return;
      const validade = Number(selected.dataset.validade) || 0;
      if (validade > 0) {
        // compute vencimento based on 'today' (server date preferred)
        const computed = computeVencimentoByMonths(today, validade);
        // set inputVenc to ISO yyyy-mm-dd
        inputVenc.value = computed.toISOString().split('T')[0];
      }
      validateForm();
    });

    // If user edits venc manually, validate it
    inputVenc.addEventListener('change', () => { validateForm(); });

    // If telas changes, update resumo
    inputTelas.addEventListener('input', () => { updateResumoAndValidate(); });

    // Cancel handler
    btnCancel.addEventListener('click', () => {
      if (confirm('Fechar sem salvar?')) document.body.removeChild(overlay);
    });

    // Save handler: build payloads and call createWithAssinaturaAndPontos
    btnSave.addEventListener('click', async () => {
      if (!validateForm()) { DomUtils.toast('Corrija os erros antes de salvar'); return; }
      // build cliente payload
      const clientePayload = {
        nome: inputNome.value.trim(),
        telefone: inputTel.value.trim(),
        email: inputEmail.value.trim() || null,
        plano: Number(selectPlano.value),
        servidor1: selectS1.value ? Number(selectS1.value) : null,
        servidor2: selectS2.value ? Number(selectS2.value) : null,
        bloqueado: false
      };
      // assinatura payload
      const assinaturaPayload = {
        plano: Number(selectPlano.value),
        dataDeVencimento: inputVenc.value,
        dataDePagamento: null,
        formaDePagamento: null,
        telas: Number(inputTelas.value),
        valor: 0
      };
      // pontos payloads
      const pontosPayloads = pontosState.map(p => ({
        servidor: p.servidor,
        app: p.app,
        pontosSimultaneos: Number(p.pontosSimultaneos),
        usuario: p.usuario,
        senha: p.senha
      }));

      // Additional server-side unique validation for exclusive apps (mock: local only)
      try {
        // check global duplicates in mock for exclusive apps (optional)
        for (const p of pontosPayloads) {
          const appMeta = apps.find(a => a.id === p.app);
          if (!appMeta) throw new Error('App inválido em ponto');
          if (!appMeta.multiplosAcessos) {
            // check global existence in MockDB
            const pontosGlobais = await MockDB.getAll('pontosDeAcesso');
            const found = pontosGlobais.find(pg => pg.app === p.app && pg.usuario === p.usuario);
            if (found) throw new Error(`Usuário ${p.usuario} já usado globalmente em app exclusivo`);
          }
        }
      } catch (err) {
        DomUtils.toast(err.message || 'Erro de validação de credenciais');
        return;
      }

      // Try create transaction (mock)
      try {
        btnSave.disabled = true;
        const created = await ClienteService.createWithAssinaturaAndPontos(clientePayload, assinaturaPayload, pontosPayloads);
        DomUtils.toast('Cliente criado com sucesso');
        document.body.removeChild(overlay);
        // re-render list
        await init();
      } catch (err) {
        DomUtils.toast(err.message || 'Erro ao criar cliente. Operação revertida');
        btnSave.disabled = false;
        console.error(err);
      }
    });

    // initial summary
    updateResumoAndValidate();

    // helpers
    function computeVencimentoByMonths(dateRef, monthsToAdd) {
      // preserve day, try same day in target month; if not exists, set to 1st of next month
      const origDay = dateRef.getDate();
      const target = new Date(dateRef);
      target.setMonth(target.getMonth() + monthsToAdd);
      const year = target.getFullYear(); const month = target.getMonth();
      const tryDate = new Date(year, month, origDay);
      if (tryDate.getMonth() !== month) {
        // day doesn't exist, return 1st of next month
        return new Date(year, month + 1, 1);
      }
      return tryDate;
    }
  }

  return { init };
})();
