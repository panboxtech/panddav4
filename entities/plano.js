// Plano entity logic
window.PlanoService = {
  async list(){ return MockDB.getAll('planos'); },
  async create(payload){ return MockDB.insert('planos', payload); },
  async update(id, patch){ return MockDB.update('planos', id, patch); },
  async remove(id){ return MockDB.remove('planos', id); }
};
