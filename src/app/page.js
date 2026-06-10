import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data, error } = await supabase.from('socios').select('*')
  
  return (
    <main>
      <h1>AFV Nerja — Conexión Supabase</h1>
      <p>{error ? 'Error: ' + error.message : 'Conexión correcta ✅'}</p>
    </main>
  )
}