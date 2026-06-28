import { supabase } from '@/lib/supabase'

export async function GET() {
  const mañana = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: eventos } = await supabase
    .from('eventos')
    .select('*')
    .eq('fecha', mañana)
    .eq('tipo', 'entreno')
    .eq('lista_entreno_activa', true)
    .neq('estado', 'cancelado')

  if (!eventos || eventos.length === 0) {
    return Response.json({ ok: true, mensaje: 'Sin entrenos mañana, no se envía nada' })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  for (const evento of eventos) {
    const { count } = await supabase
      .from('apuntes_entreno')
      .select('*', { count: 'exact', head: true })
      .eq('evento_id', evento.id)
      .eq('estado', 'apuntado')

    const [año, mes, dia] = evento.fecha.split('-')
    const fechaFormateada = `${dia}-${mes}-${año}`

    const mensaje = `🔔 Recordatorio de entreno\n📅 ${fechaFormateada} a las ${evento.hora || ''} · ${evento.lugar || evento.titulo || ''}\n👥 Apuntados: ${count || 0}${evento.min_jugadores ? ` / mínimo ${evento.min_jugadores}` : ''}\n👉 Apúntate aquí: https://afvnerja.vercel.app/eventos/${evento.id}`

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: mensaje, disable_web_page_preview: true }),
    })
  }

  return Response.json({ ok: true, enviados: eventos.length })
}