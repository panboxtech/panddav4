window.AppsView = (function(){
  async function init(){
    const root = document.getElementById('apps-root');
    DomUtils.clearChildren(root);

    const btnNew = DomUtils.createEl('button',{class:'btn', text:'Novo App'});
    root.appendChild(btnNew);

    const list = await AppService.list();
    const pontos = await MockDB.getAll('pontosDeAcesso');
    const ul = document.createElement('ul');
    for(const a of list){
      const li = document.createElement('li');
      li.textContent = `${a.nome} — servidor ${a.servidor} — ${a.multiplosAcessos ? 'mult. acessos' : 'exclusivo'}`;
      if(!a.multiplosAcessos){
        // check duplicates in mock: same usuario used more than once for this app
        const usuarios = pontos.filter(p=>p.app===a.id).map(p=>p.usuario);
        const dup = usuarios.some((u,i)=> usuarios.indexOf(u)!==i);
        if(dup){
          const warn = DomUtils.createEl('span',{class:'', text:' — AVISO: credenciais duplicadas detectadas'});
          warn.style.color='orange';
          li.appendChild(warn);
        }
      }
      const edit = DomUtils.createEl('button',{class:'btn ghost', text:'Editar'});
      edit.addEventListener('click', ()=> DomUtils.toast(`Editar app ${a.nome} (implementar form com validação de impacto ao alterar multiplosAcessos)`));
      const del = DomUtils.createEl('button',{class:'btn', text:'Excluir'});
      del.addEventListener('click', async ()=>{
        if(!window.sessionAdmin?.adminMaster){ DomUtils.toast('Apenas Admin Master pode excluir apps'); return; }
        // if points exist for this app, block deletion in mock
        const pts = pontos.filter(p=>p.app===a.id);
        if(pts.length){ DomUtils.toast('Remoção bloqueada: existem pontos vinculados a este app'); return; }
        if(!confirm('Confirma exclusão do app?')) return;
        try{ await AppService.remove(a.id); DomUtils.toast('App excluído'); init(); }catch(e){ DomUtils.toast('Erro ao excluir app'); }
      });
      li.appendChild(edit); li.appendChild(del);
      ul.appendChild(li);
    }
    root.appendChild(ul);

    btnNew.addEventListener('click', ()=> DomUtils.toast('Abrir formulário Novo App (implementar modal/form)'));
  }

  return { init };
})();
