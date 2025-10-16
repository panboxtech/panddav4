// App entity with multiplosAcessos flag
window.AppService = {
  async list(){ return MockDB.getAll('apps'); },
  async create(payload){ return MockDB.insert('apps', payload); },
  async update(id, patch){ return MockDB.update('apps', id, patch); },
  async remove(id){ return MockDB.remove('apps', id); }
};
