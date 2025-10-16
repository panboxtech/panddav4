window.ServidorService = {
  async list(){ return MockDB.getAll('servidores'); },
  async create(payload){ return MockDB.insert('servidores', payload); },
  async update(id, patch){ return MockDB.update('servidores', id, patch); },
  async remove(id){ return MockDB.remove('servidores', id); }
};
