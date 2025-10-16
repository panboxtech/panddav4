// views/clientes.js
// Controller da view Clientes com modal de Novo Cliente atualizado
// - Seções expansíveis (accordion)
// - Removidos botões Próximo / Voltar e toda lógica de wizard
// - Mantém validações, soma por servidor, lista resumida, edição de pontos, e persistência mock

window.ClientesView = (function () {
  const containerId = 'clients-container';

  async function init() {
    if (!window.sessionAdmin) { location.hash = '/login'; return; }
    const container = document.getElementById(containerId);
    const filter = document.getElementById('filter-clients');
    const sort = document.getElementById('sort-clients');
    const btnNew = document.getElementById('btn-new-client');

    async function renderList() {
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
        const serversCount = r.servidor2 ? 2 : 1;
        const percent = telas ? Math.min(100, Math.round((somaPontos / (telas * serversCount)) * 100)) : 0;
        progTd.innerHTML = `<div>Total pontos: ${somaPontos} — Telas por servidor: ${telas}</div><div class="progress-bar"><div class="progress" style="width:${percent}%"></div></div>`;

        const actionsTd = document.createElement('td');
        const btnEdit = DomUtils.createEl('button', { class: 'btn ghost', text: 'Editar' });
        btnEdit.addEventListener('click', () => DomUtils.toast(`Abrir edição de ${r.nome} (implementar form completo)`));
        const btnBlock = DomUtils.createEl('button', { class: 'btn ghost', text: r.bloqueado ? 'Desbloquear' : 'Bloquear' });
        btnBlock.addEventListener('click', async () => {
          if (r.bloqueado && !window.sessionAdmin.adminMaster) { DomUtils.toast('Apenas Admin Master pode desbloquear'); return; }
          await MockDB.update('clientes', r.id, { bloqueado: !r.bloqueado });
          DomUtils.toast(r.bloqueado ? 'Cliente desbloqueado' : 'Cliente bloqueado');
          await renderList();
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
            await renderList();
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
            try { await MockDB.remove('clientes', r.id); DomUtils.toast('Cliente excluído'); await renderList(); }
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

    filter.addEventListener('change', renderList);
    sort.addEventListener('change', renderList);
    btnNew.addEventListener('click', () => openNewClientModal());

    await renderList();
  }

  // -------------------------
  // Modal: Novo Cliente (accordion; sem wizard nav)
  // -------------------------
  async function openNewClientModal() {
    const [planos, servidores, apps] = await Promise.all([PlanoService.list(), ServidorService.list(), AppService.list()]);
    let serverNow = new Date();
    const today = serverNow;

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
    box.style.width = '960px';
    box.style.maxHeight = '90vh';
    box.style.overflow = 'auto';
    box.style.padding = '18px';

    const title = document.createElement('h3'); title.textContent = 'Novo Cliente';
    box.appendChild(title);

    // Section Cliente
    const sectionCliente = document.createElement('div'); sectionCliente.className = 'section expanded';
    const headerCliente = document.createElement('div'); headerCliente.className = 'section-header';
    headerCliente.innerHTML = `<h4>Dados do Cliente</h4><button class="section-toggle-btn">Minimizar</button>`;
    sectionCliente.appendChild(headerCliente);
    const bodyCliente = document.createElement('div'); bodyCliente.className = 'section-body';
    sectionCliente.appendChild(bodyCliente);

    // Section Pontos
    const sectionPontos = document.createElement('div'); sectionPontos.className = 'section expanded';
    const headerPontos = document.createElement('div'); headerPontos.className = 'section-header';
    headerPontos.innerHTML = `<h4>Gerenciar Pontos de Acesso</h4><button class="section-toggle-btn">Minimizar</button>`;
    sectionPontos.appendChild(headerPontos);
    const bodyPontos = document.createElement('div'); bodyPontos.className = 'section-body';
    sectionPontos.appendChild(bodyPontos);

    // CLIENTE FIELDS
    const leftCol = document.createElement('div');
    leftCol.style.display = 'grid';
    leftCol.style.gap = '8px';

    const nomeLabel = document.createElement('label'); nomeLabel.textContent = 'Nome *';
    const inputNome = DomUtils.createEl('input', { class: 'input' }); inputNome.type = 'text';
    const errNome = DomUtils.createEl('small', { class: 'error hidden', text: '' });

    const telLabel = document.createElement('label'); telLabel.textContent = 'Telefone *';
    const inputTel = DomUtils.createEl('input', { class: 'input' }); inputTel.type = 'tel';
    const errTel = DomUtils.createEl('small', { class: 'error hidden', text: '' });

    const emailLabel = document.createElement('label'); emailLabel.textContent = 'Email';
    const inputEmail = DomUtils.createEl('input', { class: 'input' }); inputEmail.type = 'email';
    const errEmail = DomUtils.createEl('small', { class: 'error hidden', text: '' });

    const planoLabel = document.createElement('label'); planoLabel.textContent = 'Plano *';
    const selectPlano = document.createElement('select'); selectPlano.className = 'input';
    selectPlano.innerHTML = `<option value="">Selecione um plano</option>` + planos.map(p => `<option value="${p.id}" data-validade="${p.validadeEmMeses}">${p.nome} (${p.validadeEmMeses} meses)</option>`).join('');
    const errPlano = DomUtils.createEl('small', { class: 'error hidden', text: '' });

    const vencLabel = document.createElement('label'); vencLabel.textContent = 'Data de Vencimento *';
    const inputVenc = DomUtils.createEl('input', { class: 'input' }); inputVenc.type = 'date';
    const errVenc = DomUtils.createEl('small', { class: 'error hidden', text: '' });

    const telasLabel = document.createElement('label'); telasLabel.textContent = 'Telas por servidor *';
    const inputTelas = DomUtils.createEl('input', { class: 'input' }); inputTelas.type = 'number'; inputTelas.min = 1; inputTelas.value = 1;
    const errTelas = DomUtils.createEl('small', { class: 'error hidden', text: '' });

    const s1Label = document.createElement('label'); s1Label.textContent = 'Servidor 1 *';
    const selectS1 = document.createElement('select'); selectS1.className = 'input';
    selectS1.innerHTML = `<option value="">Selecione servidor 1</option>` + servidores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
    const errS1 = DomUtils.createEl('small', { class: 'error hidden', text: '' });

    const s2Label = document.createElement('label'); s2Label.textContent = 'Servidor 2 (opcional)';
    const selectS2 = document.createElement('select'); selectS2.className = 'input';
    selectS2.innerHTML = `<option value="">Selecione um segundo servidor (opcional)</option>` + servidores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
    const errS2 = DomUtils.createEl('small', { class: 'error hidden', text: '' });

    leftCol.appendChild(nomeLabel); leftCol.appendChild(inputNome); leftCol.appendChild(errNome);
    leftCol.appendChild(telLabel); leftCol.appendChild(inputTel); leftCol.appendChild(errTel);
    leftCol.appendChild(emailLabel); leftCol.appendChild(inputEmail); leftCol.appendChild(errEmail);
    leftCol.appendChild(planoLabel); leftCol.appendChild(selectPlano); leftCol.appendChild(errPlano);
    leftCol.appendChild(vencLabel); leftCol.appendChild(inputVenc); leftCol.appendChild(errVenc);
    leftCol.appendChild(telasLabel); leftCol.appendChild(inputTelas); leftCol.appendChild(errTelas);
    leftCol.appendChild(s1Label); leftCol.appendChild(selectS1); leftCol.appendChild(errS1);
    leftCol.appendChild(s2Label); leftCol.appendChild(selectS2); leftCol.appendChild(errS2);

    bodyCliente.appendChild(leftCol);

    // PONTOS FIELDS
    const rightCol = document.createElement('div');
    rightCol.style.display = 'grid';
    rightCol.style.gap = '8px';

    const pontosTitle = document.createElement('strong'); pontosTitle.textContent = 'Gerenciar Pontos de Acesso';
    rightCol.appendChild(pontosTitle);

    const pontoForm = document.createElement('div'); pontoForm.style.display='grid'; pontoForm.style.gap='6px'; pontoForm.style.border='1px solid #e6e9ee'; pontoForm.style.padding='8px'; pontoForm.style.borderRadius='6px';

    const pfServidorLabel = document.createElement('label'); pfServidorLabel.textContent = 'Servidor do ponto *';
    const pfServidorSel = document.createElement('select'); pfServidorSel.className = 'input';
    pfServidorSel.innerHTML = `<option value="">Selecione servidor</option>` + servidores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');

    const pfAppLabel = document.createElement('label'); pfAppLabel.textContent = 'App *';
    const pfAppSel = document.createElement('select'); pfAppSel.className = 'input';
    pfAppSel.innerHTML = `<option value="">Selecione servidor primeiro</option>`;

    const pfPontosLabel = document.createElement('label'); pfPontosLabel.textContent = 'Pontos simultâneos *';
    const pfPontosInp = DomUtils.createEl('input', { class: 'input' }); pfPontosInp.type = 'number'; pfPontosInp.min = 1; pfPontosInp.value = 1;

    const pfUserLabel = document.createElement('label'); pfUserLabel.textContent = 'Usuário *';
    const pfUserInp = DomUtils.createEl('input', { class: 'input' }); pfUserInp.type = 'text';

    const pfPassLabel = document.createElement('label'); pfPassLabel.textContent = 'Senha *';
    const pfPassInp = DomUtils.createEl('input', { class: 'input' }); pfPassInp.type = 'text';

    const pfActions = document.createElement('div'); pfActions.style.display='flex'; pfActions.style.gap='8px'; pfActions.style.justifyContent='flex-end';
    const pfAddBtn = DomUtils.createEl('button', { class: 'btn', text: 'Adicionar ponto' });
    const pfCancelEditBtn = DomUtils.createEl('button', { class: 'btn ghost', text: 'Cancelar edição' }); pfCancelEditBtn.style.display='none';
    pfActions.appendChild(pfCancelEditBtn); pfActions.appendChild(pfAddBtn);

    pontoForm.appendChild(pfServidorLabel); pontoForm.appendChild(pfServidorSel);
    pontoForm.appendChild(pfAppLabel); pontoForm.appendChild(pfAppSel);
    pontoForm.appendChild(pfPontosLabel); pontoForm.appendChild(pfPontosInp);
    pontoForm.appendChild(pfUserLabel); pontoForm.appendChild(pfUserInp);
    pontoForm.appendChild(pfPassLabel); pontoForm.appendChild(pfPassInp);
    pontoForm.appendChild(pfActions);

    rightCol.appendChild(pontoForm);

    const listaWrapper = document.createElement('div');
    const listaTitle = document.createElement('strong'); listaTitle.textContent = 'Pontos adicionados';
    const pontosListEl = document.createElement('div');
    listaWrapper.appendChild(listaTitle); listaWrapper.appendChild(pontosListEl);
    rightCol.appendChild(listaWrapper);

    const totaisWrapper = document.createElement('div'); totaisWrapper.innerHTML = `<div class="totals"><strong>Totais por servidor</strong></div>`;
    const totaisContent = document.createElement('div'); totaisContent.style.marginTop='6px';
    totaisWrapper.appendChild(totaisContent);
    rightCol.appendChild(totaisWrapper);

    bodyPontos.appendChild(rightCol);

    // assemble sections
    box.appendChild(sectionCliente);
    box.appendChild(sectionPontos);

    // footer
    const footer = document.createElement('div'); footer.style.display='flex'; footer.style.justifyContent='flex-end'; footer.style.gap='8px'; footer.style.marginTop='12px';
    const cancelBtn = DomUtils.createEl('button', { class: 'btn ghost', text: 'Cancelar' });
    const saveBtn = DomUtils.createEl('button', { class: 'btn', text: 'Salvar Cliente' });
    saveBtn.disabled = true;
    footer.appendChild(cancelBtn); footer.appendChild(saveBtn);
    box.appendChild(footer);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // state
    const pontosState = [];
    let editingIndex = -1;

    // helpers
    function getSelectedServerIds() {
      const s1 = selectS1.value ? Number(selectS1.value) : null;
      const s2 = selectS2.value ? Number(selectS2.value) : null;
      const arr = [];
      if (s1) arr.push(s1);
      if (s2) arr.push(s2);
      return arr;
    }

    function populatePfApps(serverId) {
      const filtered = apps.filter(a => Number(a.servidor) === Number(serverId));
      if (!filtered.length) {
        pfAppSel.innerHTML = `<option value="">Nenhum app para este servidor</option>`;
      } else {
        pfAppSel.innerHTML = `<option value="">Selecione app</option>` + filtered.map(a => `<option value="${a.id}" data-multi="${a.multiplosAcessos}">${a.nome} (${a.multiplosAcessos ? 'multi' : 'exclusivo'})</option>`).join('');
      }
      handleAppChangeLock();
    }

    selectPlano.addEventListener('change', () => {
      const selected = selectPlano.selectedOptions[0];
      if (!selected) return;
      const validade = Number(selected.dataset.validade) || 0;
      if (validade > 0) {
        const computed = computeVencimentoByMonths(today, validade);
        inputVenc.value = computed.toISOString().split('T')[0];
      }
      validateAll();
    });

    // accordion toggle functions
    function setSectionState(sectionEl, expanded) {
      if (expanded) { sectionEl.classList.remove('collapsed'); sectionEl.classList.add('expanded'); sectionEl.querySelector('.section-toggle-btn').textContent = 'Minimizar'; }
      else { sectionEl.classList.remove('expanded'); sectionEl.classList.add('collapsed'); sectionEl.querySelector('.section-toggle-btn').textContent = 'Expandir'; }
    }
    headerCliente.querySelector('.section-toggle-btn').addEventListener('click', () => {
      const expanded = sectionCliente.classList.contains('expanded');
      setSectionState(sectionCliente, !expanded);
    });
    headerPontos.querySelector('.section-toggle-btn').addEventListener('click', () => {
      const expanded = sectionPontos.classList.contains('expanded');
      setSectionState(sectionPontos, !expanded);
    });

    // server and app logic (same as before)
    selectS1.addEventListener('change', () => { adjustPfServidorAvailability(); resetPontoForm(); renderPontosList(); validateAll(); updatePfServidorOptionsLock(); });
    selectS2.addEventListener('change', () => { adjustPfServidorAvailability(); resetPontoForm(); renderPontosList(); validateAll(); updatePfServidorOptionsLock(); });

    function adjustPfServidorAvailability() {
      const serverIds = getSelectedServerIds();
      if (serverIds.length === 1) {
        pfServidorSel.innerHTML = `<option value="${serverIds[0]}">${(servidores.find(s=>s.id===serverIds[0])||{nome:'#'}).nome}</option>`;
        pfServidorSel.value = serverIds[0];
        pfServidorSel.disabled = true;
      } else if (serverIds.length === 2) {
        const s1 = Number(selectS1.value);
        const s2 = Number(selectS2.value);
        pfServidorSel.disabled = false;
        pfServidorSel.innerHTML = `<option value="${s1}">${(servidores.find(s=>s.id===s1)||{nome:'#'}).nome} (Servidor 1)</option><option value="${s2}">${(servidores.find(s=>s.id===s2)||{nome:'#'}).nome} (Servidor 2)</option>`;
        const totals = computeTotals(); const telasVal = Number(inputTelas.value) || 0;
        if ((totals[s1] || 0) < telasVal) pfServidorSel.value = s1; else pfServidorSel.value = s2;
        updatePfServidorOptionsLock();
      } else {
        pfServidorSel.disabled = false;
        pfServidorSel.innerHTML = `<option value="">Selecione servidor</option>` + servidores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
      }
      populatePfApps(pfServidorSel.value);
    }

    function updatePfServidorOptionsLock() {
      const serverIds = getSelectedServerIds();
      if (serverIds.length !== 2) return;
      const s1 = Number(selectS1.value);
      const s2 = Number(selectS2.value);
      const totals = computeTotals();
      const telasVal = Number(inputTelas.value) || 0;
      const s1full = (totals[s1] || 0) >= telasVal;
      const s2full = (totals[s2] || 0) >= telasVal;
      pfServidorSel.innerHTML = `<option value="${s1}" ${s1full ? 'disabled' : ''}>${(servidores.find(s=>s.id===s1)||{nome:'#'}).nome} ${s1full? ' - ESGOTADO':''}</option>
                                 <option value="${s2}" ${s2full ? 'disabled' : ''}>${(servidores.find(s=>s.id===s2)||{nome:'#'}).nome} ${s2full? ' - ESGOTADO':''}</option>`;
      const current = Number(pfServidorSel.value);
      if (current && ((current === s1 && s1full) || (current === s2 && s2full))) {
        if (!s1full && s1) pfServidorSel.value = s1;
        else if (!s2full && s2) pfServidorSel.value = s2;
      }
      populatePfApps(pfServidorSel.value);
    }

    pfServidorSel.addEventListener('change', () => { populatePfApps(pfServidorSel.value); });

    pfAppSel.addEventListener('change', handleAppChangeLock);
    function handleAppChangeLock() {
      const appId = pfAppSel.value ? Number(pfAppSel.value) : null;
      if (!appId) { pfPontosInp.disabled = false; pfPontosInp.min = 1; return; }
      const appMeta = apps.find(a => a.id === appId);
      if (appMeta && appMeta.multiplosAcessos === false) { pfPontosInp.value = 1; pfPontosInp.disabled = true; pfPontosInp.min = 1; }
      else { pfPontosInp.disabled = false; pfPontosInp.min = 1; }
    }

    // add/update ponto
    pfAddBtn.addEventListener('click', async () => {
      const servidor = pfServidorSel.value ? Number(pfServidorSel.value) : null;
      const appId = pfAppSel.value ? Number(pfAppSel.value) : null;
      const pontosNum = Number(pfPontosInp.value) || 0;
      const usuario = pfUserInp.value.trim();
      const senha = pfPassInp.value;

      if (!servidor) { DomUtils.toast('Selecione servidor para o ponto'); return; }
      if (!appId) { DomUtils.toast('Selecione app para o ponto'); return; }
      if (!pontosNum || pontosNum < 1) { DomUtils.toast('Pontos simultâneos deve ser >=1'); return; }
      if (!usuario) { DomUtils.toast('Usuário obrigatório'); return; }
      if (!senha) { DomUtils.toast('Senha obrigatória'); return; }

      const appMeta = apps.find(a => a.id === appId);
      if (!appMeta) { DomUtils.toast('App inválido'); return; }

      if (!appMeta.multiplosAcessos) {
        const duplicateLocal = pontosState.some((p, idx) => p.app === appId && p.usuario === usuario && idx !== editingIndex);
        if (duplicateLocal) { DomUtils.toast(`Usuário ${usuario} já usado em outro ponto exclusivo (local)`); return; }
      }

      const serversSelected = getSelectedServerIds();
      if (!serversSelected.includes(servidor)) { DomUtils.toast('Servidor do ponto deve ser um dos servidores selecionados no cliente'); return; }

      const pros = computeTotalsIfApplied({ servidor, pontosSimultaneos: pontosNum }, editingIndex);
      const telasVal = Number(inputTelas.value) || 0;
      for (const sid of serversSelected) {
        if ((pros[sid] || 0) > telasVal) { DomUtils.toast(`A operação excede o limite de ${telasVal} telas para o servidor ${(servidores.find(s=>s.id===sid)||{nome:'#'}).nome}`); return; }
      }

      if (editingIndex >= 0) {
        pontosState[editingIndex] = { servidor, app: appId, pontosSimultaneos: pontosNum, usuario, senha };
        editingIndex = -1; pfAddBtn.textContent = 'Adicionar ponto'; pfCancelEditBtn.style.display = 'none';
      } else {
        pontosState.push({ servidor, app: appId, pontosSimultaneos: pontosNum, usuario, senha });
      }

      resetPontoForm();
      renderPontosList();
      updatePfServidorOptionsLock();
      validateAll();
      pfAppSel.focus();
    });

    pfCancelEditBtn.addEventListener('click', () => { editingIndex = -1; pfAddBtn.textContent = 'Adicionar ponto'; pfCancelEditBtn.style.display = 'none'; resetPontoForm(); });

    function resetPontoForm() {
      const serverIds = getSelectedServerIds();
      if (serverIds.length === 1) { pfServidorSel.value = serverIds[0]; pfServidorSel.disabled = true; }
      else if (serverIds.length === 2) {
        const s1 = Number(selectS1.value); const totals = computeTotals(); const telasVal = Number(inputTelas.value) || 0;
        if ((totals[s1] || 0) < telasVal) pfServidorSel.value = s1; else pfServidorSel.value = Number(selectS2.value);
        pfServidorSel.disabled = false; updatePfServidorOptionsLock();
      } else { pfServidorSel.value = ''; pfServidorSel.disabled = false; pfServidorSel.innerHTML = `<option value="">Selecione servidor</option>` + servidores.map(s => `<option value="${s.id}">${s.nome}</option>`).join(''); }
      populatePfApps(pfServidorSel.value);
      pfAppSel.value = ''; pfPontosInp.value = 1; pfPontosInp.disabled = false; pfUserInp.value = ''; pfPassInp.value = '';
    }

    function renderPontosList() {
      DomUtils.clearChildren(pontosListEl);
      if (!pontosState.length) { const empty = document.createElement('div'); empty.textContent = 'Nenhum ponto adicionado.'; pontosListEl.appendChild(empty); }
      else {
        const table = document.createElement('table'); table.style.width='100%';
        table.innerHTML = `<thead><tr><th>Servidor</th><th>App</th><th>Pontos</th><th>Usuário</th><th>Senha</th><th>Ações</th></tr></thead>`;
        const tbody = document.createElement('tbody');
        pontosState.forEach((p, idx) => {
          const tr = document.createElement('tr');
          const sname = (servidores.find(s=>s.id===p.servidor)||{nome:'#'}).nome;
          const aname = (apps.find(a=>a.id===p.app)||{nome:'#'}).nome;
          tr.innerHTML = `<td>${sname}</td><td>${aname}</td><td>${p.pontosSimultaneos}</td><td>${p.usuario}</td><td>${maskPassword(p.senha)}</td>`;
          const actionsTd = document.createElement('td');
          const btnEdit = DomUtils.createEl('button', { class: 'btn ghost', text: 'Editar' });
          btnEdit.addEventListener('click', () => {
            editingIndex = idx; pfServidorSel.value = p.servidor; populatePfApps(pfServidorSel.value); pfAppSel.value = p.app; handleAppChangeLock();
            pfPontosInp.value = p.pontosSimultaneos; pfUserInp.value = p.usuario; pfPassInp.value = p.senha; pfAddBtn.textContent = 'Atualizar ponto'; pfCancelEditBtn.style.display='inline-block';
          });
          const btnRemove = DomUtils.createEl('button', { class: 'btn', text: 'Remover' });
          btnRemove.addEventListener('click', () => {
            if (!confirm('Remover ponto?')) return;
            pontosState.splice(idx,1);
            if (editingIndex === idx) { editingIndex = -1; pfAddBtn.textContent='Adicionar ponto'; pfCancelEditBtn.style.display='none'; resetPontoForm(); }
            else if (editingIndex > idx) editingIndex--;
            updatePfServidorOptionsLock(); renderPontosList(); validateAll();
          });
          actionsTd.appendChild(btnEdit); actionsTd.appendChild(btnRemove);
          tr.appendChild(actionsTd); tbody.appendChild(tr);
        });
        table.appendChild(tbody); pontosListEl.appendChild(table);
      }
      renderTotaisPorServidor();
    }

    function computeTotals() {
      const totals = {}; pontosState.forEach(p=>{ if (!p.servidor) return; totals[p.servidor] = (totals[p.servidor]||0) + Number(p.pontosSimultaneos||0); }); return totals;
    }
    function computeTotalsIfApplied(candidate, editingIndexLocal) {
      const totals = computeTotals();
      if (editingIndexLocal >= 0) { const ex = pontosState[editingIndexLocal]; if (ex && ex.servidor) totals[ex.servidor] = (totals[ex.servidor]||0) - Number(ex.pontosSimultaneos||0); }
      if (candidate && candidate.servidor) totals[candidate.servidor] = (totals[candidate.servidor]||0) + Number(candidate.pontosSimultaneos||0);
      return totals;
    }
    function renderTotaisPorServidor() {
      DomUtils.clearChildren(totaisContent);
      const totals = computeTotals(); const telasVal = Number(inputTelas.value) || 0;
      const s1id = selectS1.value ? Number(selectS1.value) : null; const s2id = selectS2.value ? Number(selectS2.value) : null;
      const s1sum = s1id ? (totals[s1id] || 0) : 0; const s2sum = s2id ? (totals[s2id] || 0) : 0;
      const div = document.createElement('div'); div.innerHTML = `<div>Servidor 1 (${s1id ? (servidores.find(s=>s.id===s1id).nome) : '-'}) : ${s1sum} / ${telasVal}</div>`; if (s2id) div.innerHTML += `<div>Servidor 2 (${servidores.find(s=>s.id===s2id).nome}) : ${s2sum} / ${telasVal}</div>`;
      totaisContent.appendChild(div);
    }

    async function validateClientStep() {
      let ok = true;
      if (!inputNome.value.trim()) { errNome.textContent='Nome obrigatório'; errNome.classList.remove('hidden'); ok=false; } else errNome.classList.add('hidden');
      const telVal = inputTel.value.replace(/\D/g,''); if (!telVal) { errTel.textContent='Telefone obrigatório'; errTel.classList.remove('hidden'); ok=false; } else errTel.classList.add('hidden');
      if (!selectPlano.value) { errPlano.textContent='Plano obrigatório'; errPlano.classList.remove('hidden'); ok=false; } else errPlano.classList.add('hidden');
      if (!inputVenc.value) { errVenc.textContent='Data de vencimento obrigatória'; errVenc.classList.remove('hidden'); ok=false; } else { const chosen = new Date(inputVenc.value + 'T00:00:00'); const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()); if (chosen <= startOfToday) { errVenc.textContent='Data deve ser maior que hoje'; errVenc.classList.remove('hidden'); ok=false; } else errVenc.classList.add('hidden'); }
      if (!inputTelas.value || Number(inputTelas.value) < 1) { errTelas.textContent='Telas deve ser >=1'; errTelas.classList.remove('hidden'); ok=false; } else errTelas.classList.add('hidden');
      if (!selectS1.value) { errS1.textContent='Servidor 1 obrigatório'; errS1.classList.remove('hidden'); ok=false; } else errS1.classList.add('hidden');
      return ok;
    }

    async function validateAll() {
      let valid = true;
      const clientOk = await validateClientStep();
      if (!clientOk) valid = false;
      const totals = computeTotals(); const telasVal = Number(inputTelas.value) || 0; const sids = getSelectedServerIds();
      for (const sid of sids) { if ((totals[sid] || 0) !== telasVal) { errTelas.textContent = `Servidor: soma pontos deve ser exatamente ${telasVal}`; errTelas.classList.remove('hidden'); valid=false; } }
      for (let i=0;i<pontosState.length;i++){ const p=pontosState[i]; const appMeta = apps.find(a=>a.id===p.app); if (appMeta && !appMeta.multiplosAcessos) { const dup = pontosState.some((q,j)=>j!==i && q.app===p.app && q.usuario===p.usuario); if (dup) { DomUtils.toast(`Usuário ${p.usuario} duplicado em app exclusivo`); valid=false; break; } } }
      saveBtn.disabled = !valid; return valid;
    }

    function maskPassword(s){ if (!s) return ''; if (s.length<=2) return '*'.repeat(s.length); return s[0] + '*'.repeat(Math.max(0,s.length-2)) + s.slice(-1); }
    function computeVencimentoByMonths(dateRef, monthsToAdd){ const origDay = dateRef.getDate(); const target = new Date(dateRef); target.setMonth(target.getMonth() + monthsToAdd); const year = target.getFullYear(); const month = target.getMonth(); const tryDate = new Date(year, month, origDay); if (tryDate.getMonth() !== month) return new Date(year, month+1, 1); return tryDate; }

    // initial
    resetPontoForm(); renderPontosList(); validateAll(); updatePfServidorOptionsLock();

    // handlers
    cancelBtn.addEventListener('click', ()=>{ if (confirm('Fechar sem salvar?')) document.body.removeChild(overlay); });
    saveBtn.addEventListener('click', async ()=> {
      const ok = await validateAll(); if (!ok) { DomUtils.toast('Corrija os erros antes de salvar'); return; }
      try {
        for (const p of pontosState) {
          const appMeta = apps.find(a=>a.id===p.app);
          if (!appMeta) throw new Error('App inválido');
          if (!appMeta.multiplosAcessos) {
            const pontosGlobais = await MockDB.getAll('pontosDeAcesso');
            const found = pontosGlobais.find(pg => pg.app===p.app && pg.usuario===p.usuario);
            if (found) throw new Error(`Usuário ${p.usuario} já usado globalmente em app exclusivo`);
          }
        }
      } catch (err){ DomUtils.toast(err.message || 'Erro de validação global'); return; }

      const clientePayload = { nome: inputNome.value.trim(), telefone: inputTel.value.trim(), email: inputEmail.value.trim() || null, plano: Number(selectPlano.value), servidor1: selectS1.value ? Number(selectS1.value) : null, servidor2: selectS2.value ? Number(selectS2.value) : null, bloqueado:false };
      const assinaturaPayload = { plano: Number(selectPlano.value), dataDeVencimento: inputVenc.value, dataDePagamento:null, formaDePagamento:null, telas: Number(inputTelas.value), valor:0 };
      const pontosPayloads = pontosState.map(p=>({ servidor:p.servidor, app:p.app, pontosSimultaneos:Number(p.pontosSimultaneos), usuario:p.usuario, senha:p.senha }));

      try {
        saveBtn.disabled = true;
        await ClienteService.createWithAssinaturaAndPontos(clientePayload, assinaturaPayload, pontosPayloads);
        DomUtils.toast('Cliente criado com sucesso');
        document.body.removeChild(overlay);
        await init();
      } catch (err) {
        DomUtils.toast(err.message || 'Erro ao criar cliente. Operação revertida');
        saveBtn.disabled = false;
        console.error(err);
      }
    });
  }

  return { init };
})();
