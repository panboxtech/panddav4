window.PlanosView = (function(){
  async function init(){
    const root = document.getElementById('planos-root');
    DomUtils.clearChildren(root);

    const header = document.createElement('div');
    header.className = 'row';
    header.innerHTML = `<strong>Planos cadastrados</strong>`;
    const btnNew = DomUtils.createEl('button',{class:'btn', text:'Novo Plano'});
    header.appendChild(btnNew);
    root.appendChild(header);

    const list = await PlanoService.list();
    const ul = document.createElement('ul');
    list.forEach(p=>{
      const li = document.createElement('li');
      li.textContent = `${p.nome} — ${p.validadeEmMeses} meses`;
      const edit = DomUtils.createEl('button',{class:'btn ghost', text:'Editar'});
      edit.addEventListener('click', ()=> openEdit(p));
      const del = DomUtils.createEl('button',{class:'btn', text:'Excluir'});
      del.addEventListener('click', async ()=>{
        if(!window.sessionAdmin?.adminMaster){ DomUtils.toast('Apenas Admin Master pode excluir planos'); return; }
        if(!confirm('Confirma exclusão do plano?')) return;
        try{ await PlanoService.remove(p.id); DomUtils.toast('Plano excluído'); init(); }catch(e){ DomUtils.toast('Erro ao excluir plano'); }
      });
      li.appendChild(edit); li.appendChild(del);
      ul.appendChild(li);
    });
    root.appendChild(ul);

    btnNew.addEventListener('click', ()=> DomUtils.toast('Abrir formulário Novo Plano (implementar modal/form)'));
  }

  function openEdit(plano){
    DomUtils.toast(`Abrir edição do plano ${plano.nome} (implementar modal/form)`);
  }

  return { init };
})();
