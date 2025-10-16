// views/assinaturas.js
// Controller responsável por listar assinaturas, aplicar filtros, renovar assinaturas e registrar atividades.
// Exports: window.AssinaturasView with init().

window.AssinaturasView = (function () {
  // helper para criar linha de assinatura
  function createAssinaturaLi(s, clientesMap, planosMap) {
    const li = document.createElement('li');
    li.className = 'assinatura-item';
    const cliente = clientesMap[s.cliente] || { nome: `#${s.cliente}` };
    const plano = planosMap[s.plano] || { nome: `${s.plano}`, validadeEmMeses: 1 };

    const vencStr = DomUtils.formatDateISO(s.dataDeVencimento);
    li.textContent = `Assinatura ${s.id} — Cliente: ${cliente.nome} — Plano: ${plano.nome} — Venc: ${vencStr} — Telas: ${s.telas}`;

    // Botões de ação
    const btnRow = document.createElement('div');
    btnRow.style.marginTop = '8px';
    btnRow.className = 'row';

    const btnRenovar = DomUtils.createEl('button', { class: 'btn ghost', text: 'Renovar' });
    btnRenovar.addEventListener('click', async () => {
      try {
        const novaIso = AssinaturaService.renew(s, plano.validadeEmMeses);
        await MockDB.update('assinaturas', s.id, { dataDeVencimento: novaIso });
        await MockDB.insert('atividades', {
          adminId: window.sessionAdmin?.adminId || null,
          action: 'renovar_assinatura',
          detalhe: `assinatura ${s.id} renovada para ${novaIso}`
        });
        DomUtils.toast('Assinatura renovada');
        await window.AssinaturasView.init();
      } catch (err) {
        DomUtils.toast('Erro ao renovar assinatura');
        console.error(err);
      }
    });

    const btnDetalhes = DomUtils.createEl('button', { class: 'btn ghost', text: 'Ver Detalhes' });
    btnDetalhes.addEventListener('click', async () => {
      // Carrega pontos do cliente e exibe em modal simples
      try {
        const pontos = await MockDB.getAll('pontosDeAcesso');
        const pontosCliente = pontos.filter(p => p.cliente === s.cliente);
        openDetalhesModal(cliente, s, pontosCliente);
      } catch (err) {
        DomUtils.toast('Erro ao carregar detalhes');
      }
    });

    const btnExcluir = DomUtils.createEl('button', { class: 'btn', text: 'Excluir' });
    btnExcluir.addEventListener('click', async () => {
      if (!window.sessionAdmin?.adminMaster) {
        DomUtils.toast('Apenas Admin Master pode excluir assinaturas');
        return;
      }
      if (!confirm('Confirma exclusão da assinatura?')) return;
      try {
        await MockDB.remove('assinaturas', s.id);
        await MockDB.insert('atividades', {
          adminId: window.sessionAdmin?.adminId || null,
          action: 'excluir_assinatura',
          detalhe: `assinatura ${s.id} removida`
        });
        DomUtils.toast('Assinatura excluída');
        await window.AssinaturasView.init();
      } catch (err) {
        DomUtils.toast('Erro ao excluir assinatura');
      }
    });

    btnRow.appendChild(btnRenovar);
    btnRow.appendChild(btnDetalhes);
    btnRow.appendChild(btnExcluir);
    li.appendChild(btnRow);
    return li;
  }

  function openDetalhesModal(cliente, assinatura, pontosList) {
    // Modal simples de leitura (não persistente); criado com createElement e textContent
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
    box.style.width = '520px';
    box.style.maxHeight = '70vh';
    box.style.overflow = 'auto';

    const h = document.createElement('h3');
    h.textContent = `Detalhes - ${cliente.nome}`;
    box.appendChild(h);

    const pAss = document.createElement('p');
    pAss.textContent = `Assinatura ${assinatura.id} — Vencimento: ${DomUtils.formatDateISO(assinatura.dataDeVencimento)} — Telas: ${assinatura.telas}`;
    box.appendChild(pAss);

    const pTitle = document.createElement('strong');
    pTitle.textContent = 'Pontos de Acesso';
    box.appendChild(pTitle);

    if (!pontosList.length) {
      const none = document.createElement('div');
      none.textContent = 'Nenhum ponto de acesso cadastrado para este cliente.';
      box.appendChild(none);
    } else {
      const ul = document.createElement('ul');
      pontosList.forEach(pt => {
        const li = document.createElement('li');
        li.textContent = `ID:${pt.id} — App:${pt.app} — Servidor:${pt.servidor} — Pontos:${pt.pontosSimultaneos} — Usuário:${pt.usuario}`;
        ul.appendChild(li);
      });
      box.appendChild(ul);
    }

    const closeBtn = DomUtils.createEl('button', { class: 'btn', text: 'Fechar' });
    closeBtn.style.marginTop = '10px';
    closeBtn.addEventListener('click', () => document.body.removeChild(overlay));
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  // interface init
  async function init() {
    const root = document.getElementById('assinaturas-root');
    if (!root) return;
    DomUtils.clearChildren(root);

    // Header com filtros
    const header = document.createElement('div');
    header.className = 'row';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    const left = document.createElement('div');
    const filterSelect = document.createElement('select');
    filterSelect.id = 'filter-assinaturas';
    filterSelect.innerHTML = `
      <option value="all">Todos</option>
      <option value="vencendo<=3">Vencendo <=3 dias</option>
      <option value="vencidos<30">Vencidos &lt;30 dias</option>
      <option value="vencidos">Todos vencidos</option>
    `;
    left.appendChild(filterSelect);

    const sortSelect = document.createElement('select');
    sortSelect.id = 'sort-assinaturas';
    sortSelect.style.marginLeft = '8px';
    sortSelect.innerHTML = `
      <option value="vencimento">Ordenar por vencimento</option>
      <option value="cliente">Ordenar por cliente</option>
    `;
    left.appendChild(sortSelect);

    header.appendChild(left);

    const right = document.createElement('div');
    const btnRefresh = DomUtils.createEl('button', { class: 'btn ghost', text: 'Atualizar' });
    btnRefresh.addEventListener('click', () => init());
    right.appendChild(btnRefresh);

    header.appendChild(right);
    root.appendChild(header);

    // Lista
    const ul = document.createElement('ul');
    ul.style.marginTop = '12px';
    root.appendChild(ul);

    try {
      const [assinaturas, clientes, planos] = await Promise.all([
        MockDB.getAll('assinaturas'),
        MockDB.getAll('clientes'),
        MockDB.getAll('planos')
      ]);

      // mapas para lookup rápido
      const clientesMap = {};
      clientes.forEach(c => (clientesMap[c.id] = c));
      const planosMap = {};
      planos.forEach(p => (planosMap[p.id] = p));

      // aplicar filtro
      let lista = assinaturas.slice();
      const filtro = filterSelect.value;
      const hoje = new Date();
      if (filtro === 'vencendo<=3') {
        lista = lista.filter(a => {
          const diff = Math.ceil((new Date(a.dataDeVencimento) - hoje) / (1000 * 60 * 60 * 24));
          return diff >= 0 && diff <= 3;
        });
      } else if (filtro === 'vencidos<30') {
        lista = lista.filter(a => {
          const diff = Math.ceil((hoje - new Date(a.dataDeVencimento)) / (1000 * 60 * 60 * 24));
          return diff > 0 && diff < 30;
        });
      } else if (filtro === 'vencidos') {
        lista = lista.filter(a => new Date(a.dataDeVencimento) < hoje);
      }

      // ordenar
      if (sortSelect.value === 'vencimento') {
        lista.sort((a, b) => new Date(a.dataDeVencimento) - new Date(b.dataDeVencimento));
      } else {
        lista.sort((a, b) => {
          const ca = (clientesMap[a.cliente]?.nome || '').toLowerCase();
          const cb = (clientesMap[b.cliente]?.nome || '').toLowerCase();
          return ca.localeCompare(cb);
        });
      }

      // renderiza cada item
      ul.innerHTML = '';
      if (!lista.length) {
        const empty = document.createElement('div');
        empty.textContent = 'Nenhuma assinatura encontrada.';
        ul.appendChild(empty);
      } else {
        for (const s of lista) {
          const li = createAssinaturaLi(s, clientesMap, planosMap);
          ul.appendChild(li);
        }
      }

      // eventos de filtro/sort
      filterSelect.onchange = () => init();
      sortSelect.onchange = () => init();
    } catch (err) {
      DomUtils.toast('Erro ao carregar assinaturas');
      console.error(err);
    }
  }

  return { init };
})();
