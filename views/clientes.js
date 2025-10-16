// views/clientes.js
// Controller da view Clientes com listagem e modal completo de cadastro de novo cliente.
// Modificações importantes:
// - Telas é interpretado como "telas por servidor".
// - Pontos são gerenciados em uma lista resumida: preencher formulário de ponto → "Adicionar" → ponto vai para a lista; campos resetam.
// - Cada ponto na lista tem ações Editar / Remover.
// - Validações: soma de pontos por servidor === telas, unicidade local/global para apps exclusivos, dataDeVencimento obrigatória e futura.
// - Persistência via ClienteService.createWithAssinaturaAndPontos (mock transaction).

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
        // compute soma por servidor display (soma total x telas por servidor)
        const somaPontos = pontos.reduce((s, x) => s + Number(x.pontosSimultaneos || 0), 0);
        const telas = r.assinatura ? Number(r.assinatura.telas || 0) : 0;
        const percent = telas ? Math.min(100, Math.round((somaPontos / (telas * (r.servidor2 ? 2 : 1))) * 100)) : 0;
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
  // Modal: Novo Cliente (com fluxo de pontos por servidor e lista resumida)
  // -------------------------
  async function openNewClientModal() {
    const [planos, servidores, apps] = await Promise.all([PlanoService.list(), ServidorService.list(), AppService.list()]);
    // prefer server time via SupabaseService if available; fallback to local now
    let serverNow = new Date();
    const today = serverNow;

    // overlay and modal shell
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

    // form layout: columns
    const formGrid = document.createElement('div');
    formGrid.className = 'form-grid';
    formGrid.style.gridTemplateColumns = '1fr 420px';
    formGrid.style.gap = '16px';

    // left column: cliente fields + vencimento
    const leftCol = document.createElement('div');

    // Nome
    const nomeLabel = document.createElement('label'); nomeLabel.textContent = 'Nome *';
    const inputNome = DomUtils.createEl('input', { class: 'input' }); inputNome.type = 'text';
    const errNome = DomUtils.createEl('small', { class: 'error hidden', text: '' });
    leftCol.appendChild(nomeLabel); leftCol.appendChild(inputNome); leftCol.appendChild(errNome);

    // Telefone
    const telLabel = document.createElement('label'); telLabel.textContent = 'Telefone *';
    const inputTel = DomUtils.createEl('input', { class: 'input' }); inputTel.type = 'tel';
    const errTel = DomUtils.createEl('small', { class: 'error hidden', text: '' });
    leftCol.appendChild(telLabel); leftCol.appendChild(inputTel); leftCol.appendChild(errTel);

    // Email
    const emailLabel = document.createElement('label'); emailLabel.textContent = 'Email';
    const inputEmail = DomUtils.createEl('input', { class: 'input' }); inputEmail.type = 'email';
    const errEmail = DomUtils.createEl('small', { class: 'error hidden', text: '' });
    leftCol.appendChild(emailLabel); leftCol.appendChild(inputEmail); leftCol.appendChild(errEmail);

    // Plano select
    const planoLabel = document.createElement('label'); planoLabel.textContent = 'Plano *';
    const selectPlano = document.createElement('select'); selectPlano.className = 'input';
    selectPlano.innerHTML = `<option value="">Selecione um plano</option>` + planos.map(p => `<option value="${p.id}" data-validade="${p.validadeEmMeses}">${p.nome} (${p.validadeEmMeses} meses)</option>`).join('');
    const errPlano = DomUtils.createEl('small', { class: 'error hidden', text: '' });
    leftCol.appendChild(planoLabel); leftCol.appendChild(selectPlano); leftCol.appendChild(errPlano);

    // Data de vencimento
    const vencLabel = document.createElement('label'); vencLabel.textContent = 'Data de Vencimento *';
    const inputVenc = DomUtils.createEl('input', { class: 'input' }); inputVenc.type = 'date';
    const errVenc = DomUtils.createEl('small', { class: 'error hidden', text: '' });
    leftCol.appendChild(vencLabel); leftCol.appendChild(inputVenc); leftCol.appendChild(errVenc);

    // Telas (por servidor)
    const telasLabel = document.createElement('label'); telasLabel.textContent = 'Telas por servidor *';
    const inputTelas = DomUtils.createEl('input', { class: 'input' }); inputTelas.type = 'number'; inputTelas.min = 1; inputTelas.value = 1;
    const errTelas = DomUtils.createEl('small', { class: 'error hidden', text: '' });
    leftCol.appendChild(telasLabel); leftCol.appendChild(inputTelas); leftCol.appendChild(errTelas);

    // Servidor 1
    const s1Label = document.createElement('label'); s1Label.textContent = 'Servidor 1 *';
    const selectS1 = document.createElement('select'); selectS1.className = 'input';
    selectS1.innerHTML = `<option value="">Selecione servidor 1</option>` + servidores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
    const errS1 = DomUtils.createEl('small', { class: 'error hidden', text: '' });
    leftCol.appendChild(s1Label); leftCol.appendChild(selectS1); leftCol.appendChild(errS1);

    // Servidor 2 (opcional)
    const s2Label = document.createElement('label'); s2Label.textContent = 'Servidor 2 (opcional)';
    const selectS2 = document.createElement('select'); selectS2.className = 'input';
    selectS2.innerHTML = `<option value="">Selecione um segundo servidor (opcional)</option>` + servidores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
    const errS2 = DomUtils.createEl('small', { class: 'error hidden', text: '' });
    leftCol.appendChild(s2Label); leftCol.appendChild(selectS2); leftCol.appendChild(errS2);

    formGrid.appendChild(leftCol);

    // right column: gerenciamento de pontos (form de ponto + lista resumida + totais por servidor)
    const rightCol = document.createElement('div');

    const pontosTitle = document.createElement('strong'); pontosTitle.textContent = 'Gerenciar Pontos de Acesso';
    rightCol.appendChild(pontosTitle);

    // ponto form (small) used to add or edit a single point
    const pontoForm = document.createElement('div');
    pontoForm.style.border = '1px solid #e6e9ee';
    pontoForm.style.padding = '8px';
    pontoForm.style.borderRadius = '6px';
    pontoForm.style.marginTop = '8px';
    pontoForm.style.background = '#fff';

    // server selector in ponto (prefill with server1)
    const pfServidorLabel = document.createElement('label'); pfServidorLabel.textContent = 'Servidor do ponto *';
    const pfServidorSel = document.createElement('select'); pfServidorSel.className = 'input';
    pfServidorSel.innerHTML = `<option value="">Selecione servidor</option>` + servidores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
    pontoForm.appendChild(pfServidorLabel); pontoForm.appendChild(pfServidorSel);

    // app select (filtered by server)
    const pfAppLabel = document.createElement('label'); pfAppLabel.textContent = 'App *';
    const pfAppSel = document.createElement('select'); pfAppSel.className = 'input';
    pfAppSel.innerHTML = `<option value="">Selecione servidor primeiro</option>`;
    pontoForm.appendChild(pfAppLabel); pontoForm.appendChild(pfAppSel);

    // pontos simultaneos
    const pfPontosLabel = document.createElement('label'); pfPontosLabel.textContent = 'Pontos simultâneos *';
    const pfPontosInp = DomUtils.createEl('input', { class: 'input' }); pfPontosInp.type = 'number'; pfPontosInp.min = 1; pfPontosInp.value = 1;
    pontoForm.appendChild(pfPontosLabel); pontoForm.appendChild(pfPontosInp);

    // usuario
    const pfUserLabel = document.createElement('label'); pfUserLabel.textContent = 'Usuário *';
    const pfUserInp = DomUtils.createEl('input', { class: 'input' }); pfUserInp.type = 'text';
    pontoForm.appendChild(pfUserLabel); pontoForm.appendChild(pfUserInp);

    // senha
    const pfPassLabel = document.createElement('label'); pfPassLabel.textContent = 'Senha *';
    const pfPassInp = DomUtils.createEl('input', { class: 'input' }); pfPassInp.type = 'text';
    pontoForm.appendChild(pfPassLabel); pontoForm.appendChild(pfPassInp);

    // add/update button
    const pfActions = document.createElement('div'); pfActions.style.display = 'flex'; pfActions.style.justifyContent = 'flex-end'; pfActions.style.gap = '8px'; pfActions.style.marginTop = '8px';
    const pfAddBtn = DomUtils.createEl('button', { class: 'btn', text: 'Adicionar ponto' });
    const pfCancelEditBtn = DomUtils.createEl('button', { class: 'btn ghost', text: 'Cancelar edição' });
    pfCancelEditBtn.style.display = 'none';
    pfActions.appendChild(pfCancelEditBtn); pfActions.appendChild(pfAddBtn);
    pontoForm.appendChild(pfActions);

    rightCol.appendChild(pontoForm);

    // lista resumida de pontos adicionados
    const listaWrapper = document.createElement('div');
    listaWrapper.style.marginTop = '12px';
    const listaTitle = document.createElement('strong'); listaTitle.textContent = 'Pontos adicionados';
    listaWrapper.appendChild(listaTitle);
    const pontosListEl = document.createElement('div'); pontosListEl.style.marginTop = '8px';
    listaWrapper.appendChild(pontosListEl);

    // totais por servidor
    const totaisWrapper = document.createElement('div'); totaisWrapper.style.marginTop = '12px';
    totaisWrapper.innerHTML = `<div><strong>Totais por servidor</strong></div>`;
    const totaisContent = document.createElement('div'); totaisContent.style.marginTop = '6px';
    totaisWrapper.appendChild(totaisContent);

    rightCol.appendChild(listaWrapper);
    rightCol.appendChild(totaisWrapper);

    formGrid.appendChild(rightCol);
    box.appendChild(formGrid);

    // footer actions
    const footer = document.createElement('div'); footer.style.display = 'flex'; footer.style.justifyContent = 'flex-end'; footer.style.gap = '8px'; footer.style.marginTop = '12px';
    const cancelBtn = DomUtils.createEl('button', { class: 'btn ghost', text: 'Cancelar' });
    const saveBtn = DomUtils.createEl('button', { class: 'btn', text: 'Salvar Cliente' });
    saveBtn.disabled = true;
    footer.appendChild(cancelBtn); footer.appendChild(saveBtn);
    box.appendChild(footer);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // state
    const pontosState = []; // each: { id?:temp, servidor, app, pontosSimultaneos, usuario, senha }
    let editingIndex = -1; // -1 => adding; >=0 => editing that index

    // helpers: populate app options based on server selection for ponto form
    function populatePfApps(serverId) {
      const filtered = apps.filter(a => Number(a.servidor) === Number(serverId));
      if (!filtered.length) {
        pfAppSel.innerHTML = `<option value="">Nenhum app para este servidor</option>`;
      } else {
        pfAppSel.innerHTML = `<option value="">Selecione app</option>` + filtered.map(a => `<option value="${a.id}" data-multi="${a.multiplosAcessos}">${a.nome} (${a.multiplosAcessos ? 'multi' : 'exclusivo'})</option>`).join('');
      }
    }

    // compute default vencimento when plano chosen
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

    // ponto form server change
    pfServidorSel.addEventListener('change', () => {
      populatePfApps(pfServidorSel.value);
    });

    // add / update ponto
    pfAddBtn.addEventListener('click', async () => {
      // validate ponto fields
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

      // check app multiplosAcessos rule (local duplicates)
      const appMeta = apps.find(a => a.id === appId);
      if (!appMeta) { DomUtils.toast('App inválido'); return; }

      // If exclusive, ensure no duplicate usuario in pontosState for same app
      if (!appMeta.multiplosAcessos) {
        const duplicateLocal = pontosState.some((p, idx) => p.app === appId && p.usuario === usuario && idx !== editingIndex);
        if (duplicateLocal) { DomUtils.toast(`Usuário ${usuario} já usado em outro ponto exclusivo (local)`); return; }
      }

      // compute prospective totals per server if this add/update applied
      const pros = computeTotalsIfApplied({ servidor, pontosSimultaneos: pontosNum, editingIndex });

      // ensure no server exceeds telas per server
      const telasVal = Number(inputTelas.value) || 0;
      if (!telasVal || telasVal < 1) { DomUtils.toast('Defina telas >=1 antes de adicionar pontos'); return; }

      // only check servers that are selected (s1 mandatory, s2 optional)
      const serversSelected = [selectS1.value ? Number(selectS1.value) : null];
      if (selectS2.value) serversSelected.push(Number(selectS2.value));
      // If the ponto.server is not among selected servers, warn
      if (!serversSelected.includes(servidor)) { DomUtils.toast('Escolha um servidor válido (deve ser Servidor1 ou Servidor2)'); return; }

      // After applying, for each selected server, total must be <= telasVal (on add/edit); final save requires equality
      const exceed = serversSelected.some(sid => (pros[sid] || 0) > telasVal);
      if (exceed) { DomUtils.toast(`A operação excede o limite de ${telasVal} telas para um dos servidores`); return; }

      // If editing
      if (editingIndex >= 0) {
        // update state
        pontosState[editingIndex] = { servidor, app: appId, pontosSimultaneos: pontosNum, usuario, senha };
        editingIndex = -1;
        pfAddBtn.textContent = 'Adicionar ponto';
        pfCancelEditBtn.style.display = 'none';
      } else {
        // push new
        pontosState.push({ servidor, app: appId, pontosSimultaneos: pontosNum, usuario, senha });
      }

      resetPontoForm();
      renderPontosList();
      validateAll();
      // focus speed: put focus on app select
      pfAppSel.focus();
    });

    // cancel edit
    pfCancelEditBtn.addEventListener('click', () => {
      editingIndex = -1;
      pfAddBtn.textContent = 'Adicionar ponto';
      pfCancelEditBtn.style.display = 'none';
      resetPontoForm();
    });

    // reset ponto form
    function resetPontoForm() {
      // default servidor to selectS1 if set
      if (selectS1.value) pfServidorSel.value = selectS1.value;
      else pfServidorSel.value = '';
      populatePfApps(pfServidorSel.value);
      pfAppSel.value = '';
      pfPontosInp.value = 1;
      pfUserInp.value = '';
      pfPassInp.value = '';
    }

    // render pontos list (summary) with editar/remover
    function renderPontosList() {
      DomUtils.clearChildren(pontosListEl);
      if (!pontosState.length) {
        const empty = document.createElement('div'); empty.textContent = 'Nenhum ponto adicionado.';
        pontosListEl.appendChild(empty);
      } else {
        const table = document.createElement('table');
        table.style.width = '100%';
        table.innerHTML = `<thead><tr><th>Servidor</th><th>App</th><th>Pontos</th><th>Usuário</th><th>Senha</th><th>Ações</th></tr></thead>`;
        const tbody = document.createElement('tbody');
        pontosState.forEach((p, idx) => {
          const tr = document.createElement('tr');
          const sname = (servidores.find(s => s.id === p.servidor) || { nome: `#${p.servidor}` }).nome;
          const aname = (apps.find(a => a.id === p.app) || { nome: `#${p.app}` }).nome;
          tr.innerHTML = `<td>${sname}</td><td>${aname}</td><td>${p.pontosSimultaneos}</td><td>${p.usuario}</td><td>${maskPassword(p.senha)}</td>`;
          const actionsTd = document.createElement('td');
          const btnEdit = DomUtils.createEl('button', { class: 'btn ghost', text: 'Editar' });
          btnEdit.addEventListener('click', () => {
            // load into ponto form for editing
            editingIndex = idx;
            pfServidorSel.value = p.servidor;
            populatePfApps(pfServidorSel.value);
            pfAppSel.value = p.app;
            pfPontosInp.value = p.pontosSimultaneos;
            pfUserInp.value = p.usuario;
            pfPassInp.value = p.senha;
            pfAddBtn.textContent = 'Atualizar ponto';
            pfCancelEditBtn.style.display = 'inline-block';
          });
          const btnRemove = DomUtils.createEl('button', { class: 'btn', text: 'Remover' });
          btnRemove.addEventListener('click', () => {
            if (!confirm('Remover ponto?')) return;
            pontosState.splice(idx, 1);
            if (editingIndex === idx) {
              editingIndex = -1; pfAddBtn.textContent = 'Adicionar ponto'; pfCancelEditBtn.style.display = 'none'; resetPontoForm();
            } else if (editingIndex > idx) editingIndex--;
            renderPontosList();
            validateAll();
          });
          actionsTd.appendChild(btnEdit); actionsTd.appendChild(btnRemove);
          tr.appendChild(actionsTd);
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        pontosListEl.appendChild(table);
      }
      renderTotaisPorServidor();
    }

    // compute totals per server from pontosState
    function computeTotals() {
      const totals = {}; // serverId -> sum
      pontosState.forEach(p => {
        if (!p.servidor) return;
        totals[p.servidor] = (totals[p.servidor] || 0) + Number(p.pontosSimultaneos || 0);
      });
      return totals;
    }

    function computeTotalsIfApplied(candidate, editingIndexLocal) {
      const totals = computeTotals();
      if (editingIndexLocal >= 0) {
        // subtract existing editing item
        const ex = pontosState[editingIndexLocal];
        if (ex && ex.servidor) totals[ex.servidor] = (totals[ex.servidor] || 0) - Number(ex.pontosSimultaneos || 0);
      }
      // add candidate
      if (candidate && candidate.servidor) totals[candidate.servidor] = (totals[candidate.servidor] || 0) + Number(candidate.pontosSimultaneos || 0);
      return totals;
    }

    function renderTotaisPorServidor() {
      DomUtils.clearChildren(totaisContent);
      const totals = computeTotals();
      const telasVal = Number(inputTelas.value) || 0;
      const s1id = selectS1.value ? Number(selectS1.value) : null;
      const s2id = selectS2.value ? Number(selectS2.value) : null;
      const s1sum = s1id ? (totals[s1id] || 0) : 0;
      const s2sum = s2id ? (totals[s2id] || 0) : 0;
      const div = document.createElement('div');
      div.innerHTML = `<div>Servidor 1 (${s1id ? (servidores.find(s=>s.id===s1id).nome) : '-'}) : ${s1sum} / ${telasVal}</div>`;
      if (s2id) div.innerHTML += `<div>Servidor 2 (${servidores.find(s=>s.id===s2id).nome}) : ${s2sum} / ${telasVal}</div>`;
      totaisContent.appendChild(div);
    }

    // validate entire form (enables saveBtn only when all good)
    async function validateAll() {
      let valid = true;
      // basic client validations
      if (!inputNome.value.trim()) { errNome.textContent = 'Nome obrigatório'; errNome.classList.remove('hidden'); valid = false; } else { errNome.classList.add('hidden'); }
      const telVal = inputTel.value.replace(/\D/g, '');
      if (!telVal) { errTel.textContent = 'Telefone obrigatório'; errTel.classList.remove('hidden'); valid = false; } else { errTel.classList.add('hidden'); }
      if (!selectPlano.value) { errPlano.textContent = 'Plano obrigatório'; errPlano.classList.remove('hidden'); valid = false; } else { errPlano.classList.add('hidden'); }
      const telasVal = Number(inputTelas.value);
      if (!telasVal || telasVal < 1) { errTelas.textContent = 'Telas deve ser >=1'; errTelas.classList.remove('hidden'); valid = false; } else { errTelas.classList.add('hidden'); }

      if (!selectS1.value) { errS1.textContent = 'Servidor 1 obrigatório'; errS1.classList.remove('hidden'); valid = false; } else { errS1.classList.add('hidden'); }
      // vencimento mandatory and > today
      if (!inputVenc.value) { errVenc.textContent = 'Data de vencimento obrigatória'; errVenc.classList.remove('hidden'); valid = false; }
      else {
        const chosen = new Date(inputVenc.value + 'T00:00:00');
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (chosen <= startOfToday) { errVenc.textContent = 'Data deve ser maior que hoje'; errVenc.classList.remove('hidden'); valid = false; } else { errVenc.classList.add('hidden'); }
      }

      // pontos: ensure that for each selected server, sum == telasVal
      const totals = computeTotals();
      const s1id = selectS1.value ? Number(selectS1.value) : null;
      const s2id = selectS2.value ? Number(selectS2.value) : null;
      if (s1id) {
        if ((totals[s1id] || 0) !== telasVal) { errTelas.textContent = `Servidor 1: soma pontos deve ser exatamente ${telasVal}`; errTelas.classList.remove('hidden'); valid = false; }
      }
      if (s2id) {
        if ((totals[s2id] || 0) !== telasVal) { errTelas.textContent = `Servidor 2: soma pontos deve ser exatamente ${telasVal}`; errTelas.classList.remove('hidden'); valid = false; }
      }
      if (!s2id && s1id && (totals[s1id] || 0) !== telasVal) {
        // already handled above
      }

      // local uniqueness for exclusive apps (check among pontosState)
      for (let i = 0; i < pontosState.length; i++) {
        const p = pontosState[i];
        const appMeta = apps.find(a => a.id === p.app);
        if (appMeta && !appMeta.multiplosAcessos) {
          const duplicate = pontosState.some((q, j) => j !== i && q.app === p.app && q.usuario === p.usuario);
          if (duplicate) { DomUtils.toast(`Usuário ${p.usuario} duplicado em app exclusivo`); valid = false; break; }
        }
      }

      // global uniqueness for exclusive apps checked on save as final step

      saveBtn.disabled = !valid;
      return valid;
    }

    // mask password in list for readability
    function maskPassword(s) {
      if (!s) return '';
      if (s.length <= 2) return '*'.repeat(s.length);
      return s[0] + '*'.repeat(Math.max(0, s.length - 2)) + s.slice(-1);
    }

    // compute date preserving day with months addition, adjust to 1st next month if day missing
    function computeVencimentoByMonths(dateRef, monthsToAdd) {
      const origDay = dateRef.getDate();
      const target = new Date(dateRef);
      target.setMonth(target.getMonth() + monthsToAdd);
      const year = target.getFullYear(); const month = target.getMonth();
      const tryDate = new Date(year, month, origDay);
      if (tryDate.getMonth() !== month) {
        return new Date(year, month + 1, 1);
      }
      return tryDate;
    }

    // compute totals and render list initially
    resetPontoForm();
    renderPontosList();
    validateAll();

    // cancel modal
    cancelBtn.addEventListener('click', () => {
      if (confirm('Fechar sem salvar?')) document.body.removeChild(overlay);
    });

    // Save client flow: perform global uniqueness checks for exclusive apps, then call transactional create
    saveBtn.addEventListener('click', async () => {
      const ok = await validateAll();
      if (!ok) { DomUtils.toast('Corrija os erros antes de salvar'); return; }

      // final global uniqueness check for exclusive apps
      try {
        for (const p of pontosState) {
          const appMeta = apps.find(a => a.id === p.app);
          if (!appMeta) throw new Error('App inválido');
          if (!appMeta.multiplosAcessos) {
            const pontosGlobais = await MockDB.getAll('pontosDeAcesso');
            const found = pontosGlobais.find(pg => pg.app === p.app && pg.usuario === p.usuario);
            if (found) throw new Error(`Usuário ${p.usuario} já usado globalmente em app exclusivo`);
          }
        }
      } catch (err) {
        DomUtils.toast(err.message || 'Erro de validação global');
        return;
      }

      // build payloads
      const clientePayload = {
        nome: inputNome.value.trim(),
        telefone: inputTel.value.trim(),
        email: inputEmail.value.trim() || null,
        plano: Number(selectPlano.value),
        servidor1: selectS1.value ? Number(selectS1.value) : null,
        servidor2: selectS2.value ? Number(selectS2.value) : null,
        bloqueado: false
      };
      const assinaturaPayload = {
        plano: Number(selectPlano.value),
        dataDeVencimento: inputVenc.value,
        dataDePagamento: null,
        formaDePagamento: null,
        telas: Number(inputTelas.value),
        valor: 0
      };
      const pontosPayloads = pontosState.map(p => ({
        servidor: p.servidor,
        app: p.app,
        pontosSimultaneos: Number(p.pontosSimultaneos),
        usuario: p.usuario,
        senha: p.senha
      }));

      // call service (mock transaction)
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
