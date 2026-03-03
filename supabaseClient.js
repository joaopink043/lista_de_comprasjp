// Importa a função de criação do client Supabase via CDN
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// Cria o client com a URL e a chave fornecidas
export const supabase = createClient(
  'https://xqeoafxzmsdwnejcqqaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZW9hZnh6bXNkd25lamNxcWFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTIyMjYsImV4cCI6MjA4NzY4ODIyNn0.l---VZVfJIa4rfY1Ss0Q6QUrHY_d0119mbb-g5vsqhU'
)
    