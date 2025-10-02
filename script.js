// ... (todo el código anterior hasta la función actualizarEstadisticas)

// === ESTADÍSTICAS PROFESIONALES ACTUALIZADAS ===
function actualizarEstadisticas() {
  const actividades = todasLasActividades.filter(act => act.tecnico === tecnicoNombre);
  if (actividades.length === 0) return;
  
  // Total actividades
  document.getElementById('totalActividades').textContent = actividades.length;
  
  // Calcular horas según normativa
  const { horasNormales, horasExtras } = calcularHorasEcuador(actividades);
  const horasTotales = horasNormales + horasExtras;
  
  // Mostrar horas separadas
  document.getElementById('totalHorasNormales').textContent = `${horasNormales.toFixed(1)}h`;
  document.getElementById('totalHorasExtras').textContent = `${horasExtras.toFixed(1)}h`;
  
  // Días laborables
  const diasLaborables = [...new Set(
    actividades
      .filter(act => esDiaLaborable(act.fecha))
      .map(a => a.fecha)
  )];
  
  // Promedios
  const promedioTotal = diasLaborables.length > 0 ? 
    (horasTotales / diasLaborables.length).toFixed(1) : 0;
  
  document.getElementById('promedioTotal').textContent = `${promedioTotal}h`;
  
  // Tipo principal
  const tipos = {};
  actividades.forEach(act => {
    tipos[act.tipo] = (tipos[act.tipo] || 0) + 1;
  });
  const tipoPrincipal = Object.keys(tipos).reduce((a, b) => tipos[a] > tipos[b] ? a : b, '');
  document.getElementById('tipoPrincipal').textContent = tipoPrincipal;
  
  // Días no laborables
  const diasNoLaborables = actividades.filter(act => !esDiaLaborable(act.fecha));
  if (diasNoLaborables.length > 0) {
    const diasTexto = [...new Set(diasNoLaborables.map(d => d.fecha))].join(', ');
    document.getElementById('diasNoLaborables').textContent = 
      `Días no laborables: ${diasTexto}`;
    document.getElementById('diasNoLaborablesRow').classList.remove('d-none');
  } else {
    document.getElementById('diasNoLaborablesRow').classList.add('d-none');
  }
}

// ... (resto del código sin cambios)
