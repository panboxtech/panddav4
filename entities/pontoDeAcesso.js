// PontoDeAcesso entity and validations
// Schema: {id, cliente, servidor, app, pontosSimultaneos, usuario, senha}
window.PontoService = {
  async list(){ return MockDB.getAll('pontosDeAcesso'); },
  async create(payload){ return MockDB.insert('pontosDeAcesso', payload); },
  async update(id, patch){ return MockDB.update('pontosDeAcesso', id, patch); },
  async remove(id){ return MockDB.remove('pontosDeAcesso', id); },

  async validateUniqueUsuarioForExclusiveApp(usuario, appId, excludePontoId=null){
    // If app.multiplosAcessos == false, usuario must be unique for that app globally
    const apps = await MockDB.getAll('apps');
    const app = apps.find(a=>a.id===appId);
    if(!app) throw new Error('App not found');
    if(app.multiplosAcessos) return true;
    const pontos = await MockDB.getAll('pontosDeAcesso');
    const found = pontos.find(p => p.app===appId && p.usuario===usuario && p.id !== excludePontoId);
    return !found;
  }
};
