import { supabase } from '@/lib/supabase'

function diasHasta(fechaStr) {
  const hoy = new Date().toISOString().split('T')[0]
  const msPorDia = 24 * 60 * 60 * 1000
  return Math.round((new Date(fechaStr) - new Date(hoy)) / msPorDia)
}

export async function GET() {
  const hoy = new Date().toISOString().split('T')[0]
  const en10Dias = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { data: eventos } = await supabase
    .from('eventos')
    .select('*')
    .gte('fecha', hoy)
    .lte('fecha', en10Dias)
    .eq('lista_entreno_activa', true)
    .neq('estado', 'cancelado')
    .in('tipo', ['entreno', 'partido', 'torneo'])

  const aEnviar = (eventos || []).filter(evento => {
    const dias = diasHasta(evento.fecha)
    if (evento.tipo === 'entreno') {
      return dias === 1
    }
    return dias === 10 || dias === 5 || dias === 1
  })

  if (aEnviar.length === 0) {
    return Response.json({ ok: true, mensaje: 'Sin recordatorios que enviar hoy' })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  for (const evento of aEnviar) {
    const { count } = await supabase
      .from('apuntes_entreno')
      .select('*', { count: 'exact', head: true })
      .eq('evento_id', evento.id)
      .eq('estado', 'apuntado')

    const [año, mes, dia] = evento.fecha.split('-')
    const fechaFormateada = `${dia}-${mes}-${año}`
    const etiquetaTipo = evento.tipo === 'entreno' ? 'entreno' : evento.tipo === 'partido' ? 'partido' : 'torneo'

    const mensaje = `🔔 Recordatorio de ${etiquetaTipo}\n📅 ${fechaFormateada} a las ${evento.hora || ''} · ${evento.lugar || evento.titulo || ''}\n👥 Apuntados: ${count || 0}${evento.min_jugadores ? ` / mínimo ${evento.min_jugadores}` : ''}\n👉 Apúntate aquí: https://afvnerja.vercel.app/eventos/${evento.id}`

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: mensaje, disable_web_page_preview: true }),
    })
  }

  return Response.json({ ok: true, enviados: aEnviar.length })
}