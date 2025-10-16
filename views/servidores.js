window.ServidoresView = (function(){
  async function init(){
    const root = document.getElementById('servidores-root');
    DomUtils.clearChildren(root);

    const btnNew = DomUtils.createEl('button',{class:'btn', text:'Novo Servidor'});
    root.appendChild(btnNew);

    const servers = await ServidorService.list();
    const apps = await AppService.list();
    const ul = document.createElement('ul');
    for(const s of servers){
      const associatedApps = apps.filter(a=>a.servidor === s.id).length;
      const li = document.createElement('li');
      li.textContent = `${s.nome} — apps vinculados: ${associatedApps}`;
      const edit = DomUtils.createElement ? null : null; // keep pattern
      const btnEdit = DomUtils.createEl('button',{class:'btn ghost', text:'Editar'});
      btnEdit.addEventListener('click', ()=> DomUtils.toast(`Editar servidor ${s.nome}`));
      const btnDel = DomUtils.createEl('button',{class:'btn', text:'Excluir'});
      btnDel.addEventListener('click', async ()=>{
        if(!window.sessionAdmin?.adminMaster){ DomUtils.toast('Apenas Admin Master pode excluir servidores'); return; }
        if(associatedApps > 0){ DomUtils.toast('Remoção bloqueada: existem apps vinculados ao servidor'); return; }
        if(!confirm('Confirma exclusão do servidor?')) return;
        try{ await ServidorService.remove(s.id); DomUtils.toast('Servidor excluído'); init(); }catch(e){ DomUtils.toast('Erro ao excluir servidor'); }
      });
      li.appendChild(btnEdit); li.appendChild(btnDel);
      ul.appendChild(li);
    }
    root.appendChild(ul);

    btnNew.addEventListener('click', ()=> DomUtils.toast('Abrir formulário Novo Servidor (implementar modal/form)'));
  }

  return { init };
})();
