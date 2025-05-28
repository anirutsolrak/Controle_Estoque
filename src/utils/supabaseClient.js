import { createClient } from '@supabase/supabase-js';

// **ATENÇÃO CRÍTICA: AGORA ESTAMOS LENDO DO ARQUIVO .ENV**
// As variáveis devem ser prefixadas com VITE_ no seu arquivo .env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Adicionado log para verificar se as chaves estão sendo lidas corretamente
console.log('supabaseClient.js: Lendo URL do .env:', SUPABASE_URL ? 'Carregado' : 'NÃO CARREGADO');
console.log('supabaseClient.js: Lendo ANON_KEY do .env:', SUPABASE_ANON_KEY ? 'Carregado' : 'NÃO CARREGADO');

// Inicializa o cliente Supabase e o exporta.
// Se SUPABASE_URL ou SUPABASE_ANON_KEY estiverem vazias/inválidas (não carregadas do .env),
// createClient pode retornar um cliente inválido ou lançar um erro.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Adicionado log para verificar o cliente Supabase após a criação
console.log('supabaseClient.js: Cliente Supabase criado:', supabase);