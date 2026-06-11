const XLSX = require('xlsx')
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://oewqclyiykoplygumshh.supabase.co'
const supabaseKey = 'sb_publishable_rAdQ_odeeJPRNYCgPiAQ0Q_d1Mng0Cr' // tu publishable key completa

const supabase = createClient(supabaseUrl, supabaseKey)

const wb = XLSX.readFile('./Veteranos_2025-26_v2.xlsm')

async function migrar() {

  // 1. CREAR TEMPORADA
  console.log('Creando temporada 2025-26...')
  const { data: temporada, error: errT } = await supabase
    .from('temporadas')
    .insert({
      nombre: '2025-26',
      fecha_inicio: '2025-09-01',
      fecha_fin: '2026-07-10',
      activa: true,
      cuota_importe: 60,
      min_asistencias: 15,
    })
    .select()
    .single()

  if (errT) { console.error('Error temporada:', errT.message); return }
  console.log('✅ Temporada creada:', temporada.id)

  // 2. MIGRAR SOCIOS desde CONTROL_ASISTENCIAS
  console.log('Migrando socios...')
  const wsAsist = wb.Sheets['CONTROL_ASISTENCIAS']
  const asistData = XLSX.utils.sheet_to_json(wsAsist, { header: 1 })
  
  const nombresSocios = asistData.slice(1)
    .map(row => row[0])
    .filter(n => n && n.toString().trim() !== '')

  const sociosInsert = nombresSocios.map(nombre => ({
    nombre_completo: nombre.toString().trim(),
    apodo: nombre.toString().trim(),
    tipo_socio: 'activo_entrenos',
    activo: true,
  }))

  const { data: socios, error: errS } = await supabase
    .from('socios')
    .insert(sociosInsert)
    .select()

  if (errS) { console.error('Error socios:', errS.message); return }
  console.log(`✅ ${socios.length} socios migrados`)

  // Mapa nombre -> id
  const socioMap = {}
  socios.forEach(s => { socioMap[s.nombre_completo] = s.id })

  // 3. MIGRAR EVENTOS Y ASISTENCIAS
  console.log('Migrando eventos y asistencias...')
  const cabeceras = asistData[0].slice(1).filter(c => c)

  for (let i = 0; i < cabeceras.length; i++) {
    const cabecera = cabeceras[i].toString().trim()
    
    // Detectar si es fecha o tiene resultado
    let fecha = null
    let titulo = null
    let tipo = 'entreno'
    let golesFavor = null
    let golesContra = null

    // Formato: "21-09-25 (Veladilla 2-7)" o "27-09-25"
    const matchPartido = cabecera.match(/(\d{2}-\d{2}-\d{2})\s*\((.+)\)/)
    const matchFecha = cabecera.match(/(\d{2}-\d{2}-\d{2})/)

    if (matchPartido) {
      const [d, m, y] = matchPartido[1].split('-')
      fecha = `20${y}-${m}-${d}`
      titulo = matchPartido[2]
      tipo = 'partido'
      const marcador = matchPartido[2].match(/(\d+)-(\d+)/)
      if (marcador) {
        golesFavor = parseInt(marcador[1])
        golesContra = parseInt(marcador[2])
      }
    } else if (matchFecha) {
      const [d, m, y] = matchFecha[1].split('-')
      fecha = `20${y}-${m}-${d}`
      titulo = `Entreno ${cabecera}`
    } else {
      continue
    }

    // Insertar evento
    const { data: evento, error: errE } = await supabase
      .from('eventos')
      .insert({
        temporada_id: temporada.id,
        tipo,
        fecha,
        titulo: titulo || cabecera,
        goles_favor: golesFavor,
        goles_contra: golesContra,
        estado: 'jugado',
        cuenta_asistencia: true,
      })
      .select()
      .single()

    if (errE) { console.error(`Error evento ${cabecera}:`, errE.message); continue }

    // Insertar asistencias para este evento
    const asistenciasEvento = []
    for (let j = 1; j < asistData.length; j++) {
      const row = asistData[j]
      const nombreSocio = row[0]?.toString().trim()
      const valor = row[i + 1]

      if (!nombreSocio || !socioMap[nombreSocio]) continue
      if (valor === null || valor === undefined) continue

      let estado
      if (valor === 1) estado = 'asistio'
      else if (valor === 0) estado = 'se_borro'
      else if (valor === -1) estado = 'no_aparecio'
      else continue

      asistenciasEvento.push({
        socio_id: socioMap[nombreSocio],
        evento_id: evento.id,
        estado,
      })
    }

    if (asistenciasEvento.length > 0) {
      const { error: errA } = await supabase
        .from('asistencias')
        .insert(asistenciasEvento)
      if (errA) console.error(`Error asistencias evento ${fecha}:`, errA.message)
      else console.log(`  ✅ Evento ${fecha} (${tipo}): ${asistenciasEvento.length} asistencias`)
    }
  }

  console.log('\n🎉 Migración completada')
}

migrar()