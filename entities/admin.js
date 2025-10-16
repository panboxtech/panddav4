// Admin entity and service
// Schema expected in Supabase: {id, email, senha, data_de_cadastro, admin_master}
window.AdminService = (function(){
  async function login(email, senha){
    // uses mock for now
    const all = await MockDB.getAll('admins');
    const found = all.find(a=>a.email === email && a.senha === senha);
    if(!found) throw { code:'INVALID_CREDENTIALS' };
    return found;
  }
  return { login };
})();
