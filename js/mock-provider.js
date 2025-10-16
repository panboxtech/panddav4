// Mock provider: exposes async CRUD functions and initial data with latency simulation.
// All IDs and timestamps are generated here for mock. Functions return deep copies.

window.MockDB = (function(){
  const LATENCY = 220;

  const _nowIso = ()=> new Date().toISOString();

  // initial data: servers, apps, planos, admins, clientes, assinaturas, pontosDeAcesso, atividades
  const servers = [
    { id: 1, nome: "Servidor A", dataDeCriacao: _nowIso() },
    { id: 2, nome: "Servidor B", dataDeCriacao: _nowIso() },
    { id: 3, nome: "Servidor C", dataDeCriacao: _nowIso() }
  ];

  const apps = [
    { id: 1, nome: "App Android", multiplosAcessos: false, servidor:1, tipo: "android", dataDeCriacao:_nowIso() },
    { id: 2, nome: "App Web", multiplosAcessos: true, servidor:1, tipo: "web", dataDeCriacao:_nowIso() },
    { id: 3, nome: "App iOS", multiplosAcessos: false, servidor:2, tipo: "ios", dataDeCriacao:_nowIso() },
    { id: 4, nome: "App SmartTV", multiplosAcessos: true, servidor:2, tipo: "smarttv", dataDeCriacao:_nowIso() },
    { id: 5, nome: "App Firestick", multiplosAcessos: false, servidor:3, tipo: "firestick", dataDeCriacao:_nowIso() },
    { id: 6, nome: "App Roku", multiplosAcessos: true, servidor:3, tipo: "roku", dataDeCriacao:_nowIso() }
  ];

  const planos = [
    { id: 1, nome: "Básico", validadeEmMeses: 1 },
    { id: 2, nome: "Mensal+", validadeEmMeses: 3 },
    { id: 3, nome: "Anual", validadeEmMeses: 12 }
  ];

  const admins = [
    { id: 1, email: "master@pandda.local", senha: "masterpass", dataDeCadastro:_nowIso(), adminMaster:true },
    { id: 2, email: "comum@pandda.local", senha: "comumpass", dataDeCadastro:_nowIso(), adminMaster:false }
  ];

  let clientes = [];
  let assinaturas = [];
  let pontosDeAcesso = [];
  let atividades = [];
  let _idCounter = 100;

  function _nextId(){ return ++_idCounter; }
  function _clone(v){ return JSON.parse(JSON.stringify(v)); }
  function _simulate(latency=LATENCY){ return new Promise(r=>setTimeout(r, latency)); }

  // create sample 5 clients with combinations and signatures/pontos
  (function seedClients(){
    const today = new Date();
    function addDays(dt, n){ const d = new Date(dt); d.setDate(d.getDate()+n); return d.toISOString(); }
    // Cliente 1: expires in 2 days (<=3) => for filter
    const c1 = { id: _nextId(), nome: "Carlos Almeida", telefone: "5511999000011", email:"carlos@ex.com", dataDeCriacao:_nowIso(), plano:1, servidor1:1, servidor2:2, bloqueado:false };
    clientes.push(c1);
    const a1 = { id: _nextId(), cliente:c1.id, plano:1, dataDeVencimento: addDays(today, 2), dataDePagamento:addDays(today,-28), telas:2, formaDePagamento:"cartao", valor:29.9 };
    assinaturas.push(a1);
    pontosDeAcesso.push({ id:_nextId(), cliente:c1.id, servidor:1, app:1, pontosSimultaneos:1, usuario:"carlos_u1", senha:"p1" });
    pontosDeAcesso.push({ id:_nextId(), cliente:c1.id, servidor:2, app:4, pontosSimultaneos:1, usuario:"carlos_u2", senha:"p2" });

    // Cliente 2: expired 10 days ago (<30)
    const c2 = { id:_nextId(), nome:"Fernanda Silva", telefone:"5511988000022", email:"fernanda@ex.com", dataDeCriacao:_nowIso(), plano:2, servidor1:2, servidor2:null, bloqueado:false };
    clientes.push(c2);
    const a2 = { id:_nextId(), cliente:c2.id, plano:2, dataDeVencimento: addDays(today, -10), dataDePagamento:addDays(today,-40), telas:1, formaDePagamento:"boleto", valor:49.9 };
    assinaturas.push(a2);
    pontosDeAcesso.push({ id:_nextId(), cliente:c2.id, servidor:2, app:3, pontosSimultaneos:1, usuario:"fern_u", senha:"p3" });

    // Cliente 3: valid long-term
    const c3 = { id:_nextId(), nome:"João Pereira", telefone:"5511977000033", email:"joao@ex.com", dataDeCriacao:_nowIso(), plano:3, servidor1:3, servidor2:1, bloqueado:false };
    clientes.push(c3);
    const a3 = { id:_nextId(), cliente:c3.id, plano:3, dataDeVencimento: addDays(today, 40), dataDePagamento:addDays(today,-20), telas:3, formaDePagamento:"pix", valor:199.9 };
    assinaturas.push(a3);
    pontosDeAcesso.push({ id:_nextId(), cliente:c3.id, servidor:3, app:5, pontosSimultaneos:1, usuario:"joao_u1", senha:"p4" });
    pontosDeAcesso.push({ id:_nextId(), cliente:c3.id, servidor:1, app:2, pontosSimultaneos:2, usuario:"joao_u2", senha:"p5" });

    // Cliente 4: expires today
    const c4 = { id:_nextId(), nome:"Mariana Costa", telefone:"5511966000044", email:"mariana@ex.com", dataDeCriacao:_nowIso(), plano:1, servidor1:2, servidor2:3, bloqueado:false };
    clientes.push(c4);
    const a4 = { id:_nextId(), cliente:c4.id, plano:1, dataDeVencimento: addDays(today, 0), dataDePagamento:addDays(today,-30), telas:2, formaDePagamento:"cartao", valor:29.9 };
    assinaturas.push(a4);
    pontosDeAcesso.push({ id:_nextId(), cliente:c4.id, servidor:2, app:4, pontosSimultaneos:2, usuario:"mariana_u", senha:"p6" });

    // Cliente 5: expired 40 days ago
    const c5 = { id:_nextId(), nome:"Rafael Gomes", telefone:"5511955000055", email:"rafael@ex.com", dataDeCriacao:_nowIso(), plano:2, servidor1:1, servidor2:null, bloqueado:true };
    clientes.push(c5);
    const a5 = { id:_nextId(), cliente:c5.id, plano:2, dataDeVencimento: addDays(today, -40), dataDePagamento:addDays(today,-70), telas:1, formaDePagamento:"boleto", valor:49.9 };
    assinaturas.push(a5);
    pontosDeAcesso.push({ id:_nextId(), cliente:c5.id, servidor:1, app:1, pontosSimultaneos:1, usuario:"rafael_u", senha:"p7" });
  })();

  // generic CRUD helpers
  async function getAll(table){
    await _simulate();
    switch(table){
      case 'admins': return _clone(admins);
      case 'servidores': return _clone(servers);
      case 'apps': return _clone(apps);
      case 'planos': return _clone(planos);
      case 'clientes': return _clone(clientes);
      case 'assinaturas': return _clone(assinaturas);
      case 'pontosDeAcesso': return _clone(pontosDeAcesso);
      case 'atividades': return _clone(atividades);
      default: return [];
    }
  }

  async function insert(table, payload){
    await _simulate();
    const timestamp = _nowIso();
    if(table === 'admins'){ const id=_nextId(); const rec = Object.assign({id, dataDeCadastro:timestamp}, payload); admins.push(rec); return _clone(rec); }
    if(table === 'servidores'){ const rec = Object.assign({id:_nextId(), dataDeCriacao:timestamp}, payload); servers.push(rec); return _clone(rec); }
    if(table === 'apps'){ const rec = Object.assign({id:_nextId(), dataDeCriacao:timestamp}, payload); apps.push(rec); return _clone(rec); }
    if(table === 'planos'){ const rec = Object.assign({id:_nextId()}, payload); planos.push(rec); return _clone(rec); }
    if(table === 'clientes'){ const rec = Object.assign({id:_nextId(), dataDeCriacao: timestamp}, payload); clientes.push(rec); return _clone(rec); }
    if(table === 'assinaturas'){ const rec = Object.assign({id:_nextId()}, payload); assinaturas.push(rec); return _clone(rec); }
    if(table === 'pontosDeAcesso'){ const rec = Object.assign({id:_nextId()}, payload); pontosDeAcesso.push(rec); return _clone(rec); }
    if(table === 'atividades'){ const rec = Object.assign({id:_nextId(), timestamp}, payload); atividades.push(rec); return _clone(rec); }
    throw new Error('Unknown table: ' + table);
  }

  async function update(table, id, patch){
    await _simulate();
    function findAndPatch(arr){
      const i = arr.findIndex(x=>x.id===id);
      if(i<0) throw new Error('Not found');
      arr[i] = Object.assign({}, arr[i], patch);
      return _clone(arr[i]);
    }
    if(table==='clientes') return findAndPatch(clientes);
    if(table==='assinaturas') return findAndPatch(assinaturas);
    if(table==='pontosDeAcesso') return findAndPatch(pontosDeAcesso);
    if(table==='planos') return findAndPatch(planos);
    if(table==='apps') return findAndPatch(apps);
    if(table==='servidores') return findAndPatch(servers);
    throw new Error('Unknown table: ' + table);
  }

  async function remove(table, id){
    await _simulate();
    function removeFrom(arr){
      const i = arr.findIndex(x=>x.id===id);
      if(i<0) throw new Error('Not found');
      const [r] = arr.splice(i,1);
      return _clone(r);
    }
    if(table==='clientes'){
      // also remove assinaturas and pontos for that client
      assinaturas = assinaturas.filter(a=>a.cliente!==id);
      pontosDeAcesso = pontosDeAcesso.filter(p=>p.cliente!==id);
      return removeFrom(clientes);
    }
    if(table==='assinaturas') return removeFrom(assinaturas);
    if(table==='pontosDeAcesso') return removeFrom(pontosDeAcesso);
    if(table==='planos') return removeFrom(planos);
    if(table==='apps') return removeFrom(apps);
    if(table==='servidores') return removeFrom(servers);
    if(table==='admins') return removeFrom(admins);
    throw new Error('Unknown table: ' + table);
  }

  async function findOne(table, predicate){
    await _simulate();
    let arr = [];
    switch(table){
      case 'admins': arr = admins; break;
      case 'clientes': arr = clientes; break;
      case 'planos': arr = planos; break;
      case 'apps': arr = apps; break;
      case 'pontosDeAcesso': arr = pontosDeAcesso; break;
      case 'assinaturas': arr = assinaturas; break;
    }
    const found = arr.find(predicate);
    return found ? _clone(found) : null;
  }

  return { getAll, insert, update, remove, findOne };
})();
