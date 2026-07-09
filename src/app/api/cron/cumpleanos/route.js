import { supabase } from '@/lib/supabase'

export async function GET() {
  const hoy = new Date()
  const mes = String(hoy.getUTCMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getUTCDate()).padStart(2, '0')

  const { data: socios } = await supabase
    .from('socios')
    .select('nombre_completo, apodo, fecha_nacimiento, foto_url')
    .eq('activo', true)
    .not('fecha_nacimiento', 'is', null)

  const cumpleaneros = (socios || []).filter(s => {
    const fn = s.fecha_nacimiento
    return fn && fn.slice(5, 7) === mes && fn.slice(8, 10) === dia
  })

  if (cumpleaneros.length === 0) {
    return Response.json({ ok: true, mensaje: 'Sin cumpleaños hoy' })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  for (const socio of cumpleaneros) {
    const nombre = socio.apodo || socio.nombre_completo
    const nacimiento = new Date(socio.fecha_nacimiento)
    const años = hoy.getUTCFullYear() - nacimiento.getUTCFullYear()
    const texto = `🎂 ¡Hoy cumple ${años} años ${nombre}!\n\n¡Muchas felicidades! 🎉💙`

    if (socio.foto_url) {
      await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: socio.foto_url.split('?')[0],
          caption: texto,
        }),
      })
    } else {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: texto }),
      })
    }
  }

  return Response.json({ ok: true, cumpleaneros: cumpleaneros.map(s => s.apodo || s.nombre_completo) })
}