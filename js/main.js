// main entry: session handling in memory and boot
window.sessionAdmin = null; // { adminId, AdminMaster, email }

document.addEventListener('DOMContentLoaded', ()=>{
  const app = document.getElementById('app');
  // If logged in, render layout shell; otherwise show login view only
  const shell = document.getElementById('layout-shell').content.cloneNode(true);
  app.appendChild(shell);
  // logout handler
  document.getElementById('logout-btn').addEventListener('click', ()=>{
    window.sessionAdmin = null;
    location.hash = '/login';
    DomUtils.toast('Sessão encerrada');
  });
  AppRouter.start();
});
