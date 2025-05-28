import { createClient } from '@supabase/supabase-js';

// Substitua 'YOUR_SUPABASE_URL' e 'YOUR_SUPABASE_ANON_KEY' pelos seus valores reais do Supabase.
// Você pode encontrá-los no painel do Supabase, em Project Settings > API.
const SUPABASE_URL = 'https://cuwrtawbuprrrzhtsbcd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1d3J0YXdidXBycnJ6aHRzYmNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4NTcxNDIsImV4cCI6MjA2MTQzMzE0Mn0.Q8rvIkTy9NreTCsFJUCy4NchJWWW4n14J-iNgCsX_m8';

// Inicializa o cliente Supabase e o exporta para ser usado em outros arquivos.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);