// Supabase service placeholder and notes for production integration.
// Initialize Supabase client here in production:
// const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
//
// Table mapping expected:
// admins (id, email, senha, data_de_cadastro, admin_master)
// clientes (id, nome, telefone, email, data_de_criacao, plano, servidor1, servidor2, bloqueado)
// assinaturas (id, cliente, plano, data_de_vencimento, data_de_pagamento, forma_de_pagamento, telas, valor)
// planos (id, nome, validade_em_meses)
// servidores (id, nome, data_de_criacao)
// apps (id, nome, codigo_app, url_download_android, url_download_ios, codigo_download_loja1, codigo_download_loja2, multiplos_acessos, servidor, tipo)
// pontos_de_acesso (id, cliente, servidor, app, pontos_simultaneos, usuario, senha)
// Use transactions or RPC for multi-table operations (create cliente + assinatura + pontos).
//
// For integration, implement methods similar to MockDB and replace calls from entities/views to use this service.
window.SupabaseService = {
  // Implement production methods here following the MockDB API: getAll, insert, update, remove, findOne
};
