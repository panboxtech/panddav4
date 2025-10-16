// Assinatura logic and renew function
// Schema: {id, cliente, plano, dataDeVencimento, dataDePagamento, formaDePagamento, telas, valor}
window.AssinaturaService = {
  async list(){ return MockDB.getAll('assinaturas'); },
  async update(id, patch){ return MockDB.update('assinaturas', id, patch); },
  async insert(payload){ return MockDB.insert('assinaturas', payload); },

  renew(assinatura, validadeEmMeses){
    // preserve original day; if target month lacks day, set to 1 of next month
    const orig = new Date(assinatura.dataDeVencimento);
    const day = orig.getDate();
    const target = new Date(orig);
    target.setMonth(target.getMonth() + validadeEmMeses);
    // try same day
    const year = target.getFullYear();
    const month = target.getMonth();
    const test = new Date(year, month, day);
    if (test.getMonth() !== month) {
      // day doesn't exist in month -> 1st of next month
      const next = new Date(year, month+1, 1);
      return next.toISOString();
    }
    return test.toISOString();
  }
};
