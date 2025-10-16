window.LoginView = (function(){
  async function init(){
    const fillBtn = document.getElementById('fill-mock');
    const loginBtn = document.getElementById('btn-login');
    const emailInput = document.getElementById('login-email');
    const senhaInput = document.getElementById('login-senha');
    const errEmail = document.getElementById('err-email');
    const errSenha = document.getElementById('err-senha');

    fillBtn.addEventListener('click', async ()=>{
      const admins = await MockDB.getAll('admins');
      if(admins && admins[0]){ emailInput.value = admins[0].email; senhaInput.value = admins[0].senha; DomUtils.toast('Campos preenchidos (mock)'); }
    });

    loginBtn.addEventListener('click', async ()=>{
      errEmail.classList.add('hidden'); errSenha.classList.add('hidden');
      const email = emailInput.value.trim(); const senha = senhaInput.value.trim();
      if(!email){ errEmail.textContent='Email é obrigatório'; errEmail.classList.remove('hidden'); return; }
      if(!senha){ errSenha.textContent='Senha é obrigatória'; errSenha.classList.remove('hidden'); return; }
      try{
        const admin = await AdminService.login(email, senha);
        window.sessionAdmin = { adminId: admin.id, adminMaster: admin.adminMaster, email: admin.email };
        DomUtils.toast('Autenticado');
        location.hash = '/clientes';
      }catch(err){
        if(err && err.code === 'INVALID_CREDENTIALS') DomUtils.toast('Credenciais inválidas');
        else DomUtils.toast('Erro ao autenticar. Tente novamente');
      }
    });
  }
  return { init };
})();
