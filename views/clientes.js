window.ClientesView = (function(){
  async function init(){
    if(!window.sessionAdmin){ location.hash = '/login'; return; }
    const container = document.getElementById('clients-container');
    const filter = document.getElementById('filter-clients');
    const sort = document.getElementById('sort-clients');
    const btnNew = document.getElementById('btn-new-client');

    async function render(){
      DomUtils.clearChildren(container);
      const rows = await ClienteService.list();
      let list = rows;
      // apply filter
      const todayIso = new Date().toISOString();
      const f = filter.value;
      if(f === '<=3'){
        list = list.filter(r => {
          if(!r.assinatura) return false;
          const days = DomUtils.daysBetween(r.assinatura.dataDeVencimento, new Date().toISOString());
          return days <= 3 && days >=0;
        });
      }else if(f === '<30'){
        list = list.filter(r => {
          if(!r.assinatura) return false;
          const days = DomUtils.daysBetween(new Date().toISOString(), r.assinatura.dataDeVencimento);
          return days > 0 && days < 30;
        });
      }else if(f === 'vencidos'){
        list = list.filter(r => r.assinatura && new Date(r.assinatura.dataDeVencimento) < new Date());
      }
      // sort
      if(sort.value === 'vencimento'){
        list.sort((a,b)=>{
          const av = a.assinatura ? new Date(a.assinatura.dataDeVencimento).getTime() : Infinity;
          const bv = b.assinatura ? new Date(b.assinatura.dataDeVencimento).getTime() : Infinity;
          return av - bv;
        });
      }else{
        list.sort((a,b)=> a.nome.localeCompare(b.nome));
      }
      // table
      const table = document.createElement('table');
      const thead = document.createElement('thead');
      thead.innerHTML = `<tr><th>Nome</th><th>Plano</th><th>Vencimento</th><th>Progresso</th><th>Ações</th></tr>`;
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      for(const r of list){
        const tr = document.createElement('tr');
        const nomeTd = document.createElement('td');
        nomeTd.textContent = r.nome;
        const planoTd = document.createElement('td');
        planoTd.textContent = r.plano ? r.plano.nome : '-';
        const vencTd = document.createElement('td');
        vencTd.textContent = r.assinatura ? DomUtils.formatDateISO(r.assinatura.dataDeVencimento) : '-';
        const progTd = document.createElement('td');
        // compute soma pontos
        const pontos = (await MockDB.getAll('pontosDeAcesso')).filter(p=>p.cliente===r.id);
        const somaPontos = pontos.reduce((s,x)=>s + Number(x.pontosSimultaneos||0),0);
        const telas = r.assinatura ? Number(r.assinatura.telas||0) : 0;
        const percent = telas ? Math.min(100, Math.round((somaPontos / telas) * 100)) : 0;
        progTd.innerHTML = `<div>${somaPontos} / ${telas}</div><div class="progress-bar"><div class="progress" style="width:${percent}%"></div></div>`;
        const actionsTd = document.createElement('td');
        const btnEdit = DomUtils.createEl('button',{class:'btn ghost', text:'Editar'});
        btnEdit.addEventListener('click', ()=> openEdit(r));
        const btnBlock = DomUtils.createEl('button',{class:'btn ghost', text: r.bloqueado ? 'Desbloquear' : 'Bloquear'});
        btnBlock.addEventListener('click', async ()=>{
          if(!window.sessionAdmin) return;
          // only master can unblock
          if(r.bloqueado && !window.sessionAdmin.adminMaster){ DomUtils.toast('Apenas Admin Master pode desbloquear'); return; }
          await MockDB.update('clientes', r.id, { bloqueado: !r.bloqueado });
          DomUtils.toast(r.bloqueado ? 'Cliente desbloqueado' : 'Cliente bloqueado');
          render();
        });
        const btnWhats = DomUtils.createEl('button',{class:'btn ghost', text:'WhatsApp'});
        btnWhats.addEventListener('click', ()=>{
          const telefone = r.telefone.replace(/\D/g,'');
          const nomePrimeiro = r.nome.split(' ')[0];
          const msg = encodeURIComponent(`Olá ${nomePrimeiro}, seu acesso está vencendo, para renovar`);
          window.open(`https://wa.me/${telefone}?text=${msg}`, '_blank');
        });
        const btnRenew = DomUtils.createEl('button',{class:'btn ghost', text:'Renovar'});
        btnRenew.addEventListener('click', async ()=>{
          if(!r.assinatura){ DomUtils.toast('Sem assinatura'); return; }
          try{
            const plano = r.plano;
            const nova = AssinaturaService.renew(r.assinatura, plano.validadeEmMeses);
            await MockDB.update('assinaturas', r.assinatura.id, { dataDeVencimento: nova });
            // if adjusted to 1st, show info
            const origDay = new Date(r.assinatura.dataDeVencimento).getDate();
            const newDay = new Date(nova).getDate();
            if(newDay === 1 && newDay !== origDay){
              DomUtils.toast(`Renovado. Dia original não existe no mês alvo, ajustado para 01/${(new Date(nova).getMonth()+1).toString().padStart(2,'0')}/${new Date(nova).getFullYear()}`);
            } else DomUtils.toast('Assinatura renovada');
            await MockDB.insert('atividades',{ adminId: window.sessionAdmin?.adminId || null, action:'renew', detalhe:`assinatura ${r.assinatura.id}` });
            render();
          }catch(e){ DomUtils.toast('Erro ao renovar'); }
        });

        actionsTd.appendChild(btnEdit);
        actionsTd.appendChild(btnBlock);
        actionsTd.appendChild(btnWhats);
        actionsTd.appendChild(btnRenew);
        if(window.sessionAdmin && window.sessionAdmin.adminMaster){
          const btnDel = DomUtils.createEl('button',{class:'btn', text:'Excluir'});
          btnDel.addEventListener('click', async ()=>{
            if(!confirm('Confirma exclusão do cliente?')) return;
            try{ await MockDB.remove('clientes', r.id); DomUtils.toast('Cliente excluído'); render(); }
            catch(e){ DomUtils.toast('Erro ao excluir'); }
          });
          actionsTd.appendChild(btnDel);
        }

        tr.appendChild(nomeTd);
        tr.appendChild(planoTd);
        tr.appendChild(vencTd);
        tr.appendChild(progTd);
        tr.appendChild(actionsTd);
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      container.appendChild(table);
    }

    function openEdit(cliente){
      // redirect to a new hash with params or open modal; for simplicity, alert
      DomUtils.toast(`Abrir edição de ${cliente.nome} (implementação completa no formulário de cadastro/edição)`);
    }

    filter.addEventListener('change', render);
    sort.addEventListener('change', render);
    btnNew.addEventListener('click', ()=> DomUtils.toast('Abrir formulário de novo cliente (implementar modal/form completo)'));
    await render();
  }
  return { init };
})();
