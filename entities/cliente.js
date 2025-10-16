// Cliente logic including create/update flow with transactional mock rollback
window.ClienteService = {
  async list(){
    const clientes = await MockDB.getAll('clientes');
    const assinaturas = await MockDB.getAll('assinaturas');
    const planos = await MockDB.getAll('planos');
    // join cliente + assinatura + plano
    return clientes.map(c=>{
      const a = assinaturas.find(s=>s.cliente===c.id) || null;
      const plano = planos.find(p=>p.id === (a ? a.plano : c.plano)) || null;
      return Object.assign({}, c, { assinatura: a, plano });
    });
  },

  async createWithAssinaturaAndPontos(clientePayload, assinaturaPayload, pontosList){
    // Simulated transaction: create cliente, assinatura, pontos; rollback on failure
    const created = { cliente:null, assinatura:null, pontos:[] };
    try{
      const cliente = await MockDB.insert('clientes', clientePayload); created.cliente = cliente;
      assinaturaPayload.cliente = cliente.id;
      const assinatura = await MockDB.insert('assinaturas', assinaturaPayload); created.assinatura = assinatura;
      for(const p of pontosList){
        p.cliente = cliente.id;
        const point = await MockDB.insert('pontosDeAcesso', p);
        created.pontos.push(point);
      }
      // post-creation validation: sum pontos == telas
      const sumPontos = created.pontos.reduce((s,x)=>s + Number(x.pontosSimultaneos||0),0);
      if(sumPontos !== Number(assinaturaPayload.telas)){
        // rollback
        if(created.pontos.length) for(const pt of created.pontos) await MockDB.remove('pontosDeAcesso', pt.id);
        if(created.assinatura) await MockDB.remove('assinaturas', created.assinatura.id);
        if(created.cliente) await MockDB.remove('clientes', created.cliente.id);
        throw new Error('Soma de pontos persistida diferente de telas. Operação revertida');
      }
      // log activity
      await MockDB.insert('atividades',{ adminId: window.sessionAdmin?.adminId || null, action:'create_cliente', detalhe:`cliente ${cliente.id}` });
      return created;
    }catch(err){
      // rollback partial creations
      try{
        if(created.pontos.length) for(const pt of created.pontos) await MockDB.remove('pontosDeAcesso', pt.id);
        if(created.assinatura) await MockDB.remove('assinaturas', created.assinatura.id);
        if(created.cliente) await MockDB.remove('clientes', created.cliente.id);
      }catch(_) {}
      throw err;
    }
  },

  async updateClienteAndPontos(clienteId, clientePatch, assinaturaId, assinaturaPatch, newPontosList, strategy='A'){
    // strategy A: remove all existing pontos and re-insert new ones
    const backup = { cliente:null, assinatura:null, pontos:[] };
    try{
      const clienteOld = await MockDB.findOne('clientes', c=>c.id===clienteId);
      if(!clienteOld) throw new Error('Cliente não encontrado');
      backup.cliente = clienteOld;
      const assinaturaOld = await MockDB.findOne('assinaturas', a=>a.id===assinaturaId);
      backup.assinatura = assinaturaOld;
      // get existing pontos
      const pontosExist = await MockDB.getAll('pontosDeAcesso');
      const existingForCliente = pontosExist.filter(p=>p.cliente===clienteId);
      backup.pontos = existingForCliente.map(p=>p);
      // apply updates
      await MockDB.update('clientes', clienteId, clientePatch);
      if(assinaturaPatch) await MockDB.update('assinaturas', assinaturaId, assinaturaPatch);
      // remove existing pontos
      for(const p of existingForCliente) await MockDB.remove('pontosDeAcesso', p.id);
      // insert new pontos
      const inserted = [];
      for(const p of newPontosList){
        p.cliente = clienteId;
        const pt = await MockDB.insert('pontosDeAcesso', p);
        inserted.push(pt);
      }
      // validate sum
      const sumInserted = inserted.reduce((s,x)=>s+Number(x.pontosSimultaneos||0),0);
      const telas = assinaturaPatch && assinaturaPatch.telas !== undefined ? Number(assinaturaPatch.telas) : (backup.assinatura ? backup.assinatura.telas : 0);
      if(sumInserted !== telas){
        // rollback
        for(const pt of inserted) await MockDB.remove('pontosDeAcesso', pt.id);
        // restore old pontos
        for(const pt of backup.pontos) await MockDB.insert('pontosDeAcesso', pt);
        // restore cliente and assinatura
        await MockDB.update('clientes', clienteId, backup.cliente);
        if(backup.assinatura) await MockDB.update('assinaturas', assinaturaId, backup.assinatura);
        throw new Error('Soma de pontos não bate com telas. Operação revertida');
      }
      await MockDB.insert('atividades',{ adminId: window.sessionAdmin?.adminId || null, action:'update_cliente', detalhe:`cliente ${clienteId}` });
      return true;
    }catch(err){
      throw err;
    }
  }
};
