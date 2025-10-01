const firebaseConfig = {
  apiKey: "AIzaSyDytfMkD8w0IeyHPRTyzsr_SRAP9l3GQX0",
  authDomain: "bitacora-komtest.firebaseapp.com",
  databaseURL: "https://bitacora-komtest-default-rtdb.firebaseio.com",
  projectId: "bitacora-komtest",
  storageBucket: "bitacora-komtest.firebasestorage.app",
  messagingSenderId: "924827342611",
  appId: "1:924827342611:web:a815a5bbf149b65068ece6",
  measurementId: "G-XVH8L4XRXF"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
database.goOffline();
database.goOnline();

// === CONFIGURACIÓN DE FERIADOS ECUADOR 2025 ===
const FERIADOS_ECUADOR = [
  '2025-01-01', '2025-02-28', '2025-03-01', '2025-03-28',
  '2025-05-01', '2025-05-24', '2025-08-10', '2025-10-09',
  '2025-11-02', '2025-11-03', '2025-12-25'
];

let tecnicoNombre = '';

// Verificar si una fecha es día laborable (lunes a sábado, no feriado)
function esDiaLaborable(fechaISO) {
  const fecha = new Date(fechaISO);
  const diaSemana = fecha.getDay(); // 0 = domingo, 6 = sábado
  
  // Domingo (0) = no laborable
  if (diaSemana === 0) {
    return false;
  }
  
  // Feriado = no laborable
  if (FERIADOS_ECUADOR.includes(fechaISO)) {
    return false;
  }
  
  return true;
}

// Obtener el tipo de día laborable
function getTipoDia(fechaISO) {
  const fecha = new Date(fechaISO);
  const diaSemana = fecha.getDay(); // 0 = domingo, 6 = sábado
  
  if (diaSemana === 6) {
    return 'sabado'; // Sábado
  }
  return 'lunes-viernes'; // Lunes a viernes
}

// Convertir hora a minutos desde medianoche
function horaAMinutos(horaStr) {
  const [horas, minutos] = horaStr.split(':').map(Number);
  return horas * 60 + minutos;
}

// Calcular horas según jornada laboral ecuatoriana
function calcularHorasEcuador(actividades) {
  let horasNormales = 0;
  let horasExtras = 0;
  
  // Agrupar actividades por fecha
  const actividadesPorFecha = {};
  actividades.forEach(act => {
    if (!actividadesPorFecha[act.fecha]) {
      actividadesPorFecha[act.fecha] = [];
    }
    actividadesPorFecha[act.fecha].push(act);
  });
  
  // Procesar cada fecha
  Object.keys(actividadesPorFecha).forEach(fecha => {
    const actividadesDelDia = actividadesPorFecha[fecha];
    const esLaborable = esDiaLaborable(fecha);
    const tipoDia = getTipoDia(fecha);
    
    if (!esLaborable) {
      // Domingo o feriado = todo es hora extra
      actividadesDelDia.forEach(act => {
        const inicio = horaAMinutos(act.horaInicio);
        const fin = horaAMinutos(act.horaFin);
        const minutos = fin - inicio;
        horasExtras += minutos / 60;
      });
    } else {
      // Día laborable - calcular horas normales y extras
      let minutosNormales = 0;
      let minutosExtras = 0;
      
      actividadesDelDia.forEach(act => {
        const inicioAct = horaAMinutos(act.horaInicio);
        const finAct = horaAMinutos(act.horaFin);
        
        if (tipoDia === 'lunes-viernes') {
          // Lunes a viernes: 9:00-12:00 y 13:00-18:00 (8 horas normales)
          const periodosNormales = [
            { inicio: 9 * 60, fin: 12 * 60 },    // 9:00-12:00
            { inicio: 13 * 60, fin: 18 * 60 }    // 13:00-18:00
          ];
          
          // Calcular minutos normales y extras para esta actividad
          let actMinutosNormales = 0;
          let actMinutosExtras = finAct - inicioAct;
          
          periodosNormales.forEach(periodo => {
            const overlapInicio = Math.max(inicioAct, periodo.inicio);
            const overlapFin = Math.min(finAct, periodo.fin);
            if (overlapFin > overlapInicio) {
              const overlapMinutos = overlapFin - overlapInicio;
              actMinutosNormales += overlapMinutos;
              actMinutosExtras -= overlapMinutos;
            }
          });
          
          minutosNormales += actMinutosNormales;
          minutosExtras += Math.max(0, actMinutosExtras);
        } else {
          // Sábado: 9:00-13:00 (4 horas normales)
          const inicioNormal = 9 * 60; // 9:00 AM
          const finNormal = 13 * 60;   // 1:00 PM
          
          const overlapInicio = Math.max(inicioAct, inicioNormal);
          const overlapFin = Math.min(finAct, finNormal);
          const minutosNormalesAct = Math.max(0, overlapFin - overlapInicio);
          const minutosExtrasAct = (finAct - inicioAct) - minutosNormalesAct;
          
          minutosNormales += minutosNormalesAct;
          minutosExtras += Math.max(0, minutosExtrasAct);
        }
      });
      
      // Aplicar límites máximos
      if (tipoDia === 'lunes-viernes') {
        // Máximo 8 horas normales por día
        const maxNormales = 8 * 60;
        if (minutosNormales > maxNormales) {
          minutosExtras += minutosNormales - maxNormales;
          minutosNormales = maxNormales;
        }
      } else {
        // Sábado: máximo 4 horas normales
        const maxNormales = 4 * 60;
        if (minutosNormales > maxNormales) {
          minutosExtras += minutosNormales - maxNormales;
          minutosNormales = maxNormales;
        }
      }
      
      horasNormales += minutosNormales / 60;
      horasExtras += minutosExtras / 60;
    }
  });
  
  return { horasNormales, horasExtras };
}

function guardarEnLocal() {
  const misActividades = todasLasActividades.filter(act => act.tecnico === tecnicoNombre);
  localStorage.setItem('komtest_actividades', JSON.stringify(misActividades));
}

function cargarDesdeLocal() {
  const data = localStorage.getItem('komtest_actividades');
  if (data) {
    try {
      todasLasActividades = JSON.parse(data);
      renderActividades();
      actualizarEstadisticas();
    } catch (e) {
      console.error("Error al cargar desde local:", e);
    }
  }
}

document.getElementById('btnIniciar').addEventListener('click', () => {
  const nombre = document.getElementById('nombreTecnicoInput').value.trim();
  const darkMode = document.getElementById('darkModeToggle').checked;
  if (!nombre) return alert('Por favor ingresa tu nombre.');
  tecnicoNombre = nombre;
  localStorage.setItem('tecnicoNombre', nombre);
  localStorage.setItem('darkMode', darkMode);
  if (darkMode) {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
  }
  document.getElementById('appContainer').style.display = 'block';
  document.getElementById('nombreMostrado').textContent = nombre;
  const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
  if (modal) modal.hide();
  cargarActividades();
});

window.addEventListener('load', () => {
  const nombreGuardado = localStorage.getItem('tecnicoNombre');
  const darkMode = localStorage.getItem('darkMode') === 'true';
  if (darkMode) {
    document.documentElement.setAttribute('data-bs-theme', 'dark');
    document.getElementById('darkModeToggle').checked = true;
  }
  if (nombreGuardado) {
    tecnicoNombre = nombreGuardado;
    document.getElementById('appContainer').style.display = 'block';
    document.getElementById('nombreMostrado').textContent = nombreGuardado;
    cargarActividades();
  } else {
    const modal = new bootstrap.Modal(document.getElementById('loginModal'));
    modal.show();
  }
});

const hoy = new Date().toISOString().split('T')[0];
document.getElementById('fecha').value = hoy;
document.getElementById('fecha').max = hoy;

document.getElementById('activityForm').addEventListener('submit', function(e) {
  e.preventDefault();
  if (!tecnicoNombre) return;
  const id = document.getElementById('editId').value;
  const fecha = document.getElementById('fecha').value;
  const horaInicio = document.getElementById('horaInicio').value;
  const horaFin = document.getElementById('horaFin').value;
  const tipo = document.getElementById('tipo').value;
  const descripcion = document.getElementById('descripcion').value.trim();
  
  // Validación mejorada de horas
  const inicio = new Date(`2000-01-01T${horaInicio}`);
  const fin = new Date(`2000-01-01T${horaFin}`);
  const diffHoras = (fin - inicio) / (1000 * 60 * 60);
  
  if (diffHoras <= 0) {
    return alert('La hora de inicio debe ser menor que la hora de fin.');
  }
  if (diffHoras > 12) {
    return alert('La jornada no puede exceder 12 horas.');
  }
  
  const actividad = {
    fecha,
    horaInicio,
    horaFin,
    tipo,
    descripcion,
    tecnico: tecnicoNombre,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };
  
  if (id) {
    database.ref('actividades/' + id).update(actividad)
      .catch(() => {
        const index = todasLasActividades.findIndex(a => a.id === id);
        if (index !== -1) {
          todasLasActividades[index] = { id, ...actividad };
          guardarEnLocal();
        }
      });
    document.getElementById('editId').value = '';
    document.getElementById('btnGuardar').textContent = 'Agregar Actividad';
    document.getElementById('btnCancelarEdicion').classList.add('d-none');
  } else {
    database.ref('actividades').push(actividad)
      .then(() => {
        if ('serviceWorker' in navigator && Notification.permission === 'granted') {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification('✅ Actividad guardada', {
              body: 'Se sincronizará con todos tus dispositivos',
              icon: '/icons/icon-192.png'
            });
          });
        }
      })
      .catch(() => {
        const nuevoId = 'local_' + Date.now();
        todasLasActividades.push({ id: nuevoId, ...actividad });
        guardarEnLocal();
      });
  }
  this.reset();
  document.getElementById('fecha').value = hoy;
  renderActividades();
  actualizarEstadisticas();
});

document.getElementById('btnCancelarEdicion').addEventListener('click', () => {
  document.getElementById('activityForm').reset();
  document.getElementById('fecha').value = hoy;
  document.getElementById('editId').value = '';
  document.getElementById('btnGuardar').textContent = 'Agregar Actividad';
  document.getElementById('btnCancelarEdicion').classList.add('d-none');
});

let todasLasActividades = [];
let firebaseListener = null;

function cargarActividades() {
  if (firebaseListener) {
    firebaseListener.off();
  }
  
  const ref = database.ref('actividades').orderByChild('timestamp');
  firebaseListener = ref.on('value', (snapshot) => {
    todasLasActividades = [];
    snapshot.forEach((child) => {
      todasLasActividades.push({ id: child.key, ...child.val() });
    });
    todasLasActividades.sort((a, b) => b.timestamp - a.timestamp);
    guardarEnLocal();
    renderActividades();
    actualizarEstadisticas();
  }, (error) => {
    console.error("Error en Firebase:", error);
    cargarDesdeLocal();
  });
}

function renderActividades(fechaInicio = null, fechaFin = null) {
  const tbody = document.getElementById('tablaActividades');
  const filtrosSection = document.getElementById('filtrosSection');
  const estadisticasSection = document.getElementById('estadisticasSection');
  
  tbody.innerHTML = '';
  let filtradas = todasLasActividades.filter(act => act.tecnico === tecnicoNombre);
  
  if (fechaInicio && fechaFin) {
    filtradas = filtradas.filter(act => act.fecha >= fechaInicio && act.fecha <= fechaFin);
  }
  
  // Aplicar filtros adicionales
  const tipoFiltro = document.getElementById('filtroTipo')?.value || '';
  const descFiltro = document.getElementById('filtroDescripcion')?.value.toLowerCase() || '';
  
  if (tipoFiltro) {
    filtradas = filtradas.filter(act => act.tipo === tipoFiltro);
  }
  if (descFiltro) {
    filtradas = filtradas.filter(act => act.descripcion.toLowerCase().includes(descFiltro));
  }
  
  if (filtradas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center">No hay actividades.</td></tr>`;
    filtrosSection.classList.add('d-none');
    estadisticasSection.classList.add('d-none');
    return;
  }
  
  filtradas.forEach(act => {
    const esLaborable = esDiaLaborable(act.fecha);
    const badge = !esLaborable ? '<span class="badge bg-danger ms-1">EXTRA</span>' : '';
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${act.fecha}${badge}<br><small>${act.horaInicio} - ${act.horaFin}</small></td>
      <td>${act.tipo}</td>
      <td>${act.descripcion}</td>
      <td>
        <button class="btn btn-sm btn-outline-primary me-1 edit-btn" data-id="${act.id}">✏️</button>
        <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${act.id}">🗑️</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
  
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => editarActividad(btn.dataset.id));
  });
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => eliminarActividad(btn.dataset.id));
  });
  
  document.getElementById('nombreEnReporte').textContent = tecnicoNombre;
  document.getElementById('fechaFirma').textContent = new Date().toLocaleDateString('es-MX');
  
  // Mostrar secciones
  filtrosSection.classList.remove('d-none');
  estadisticasSection.classList.remove('d-none');
}

function editarActividad(id) {
  const act = todasLasActividades.find(a => a.id === id);
  if (!act) return;
  document.getElementById('editId').value = id;
  document.getElementById('fecha').value = act.fecha;
  document.getElementById('horaInicio').value = act.horaInicio;
  document.getElementById('horaFin').value = act.horaFin;
  document.getElementById('tipo').value = act.tipo;
  document.getElementById('descripcion').value = act.descripcion;
  document.getElementById('btnGuardar').textContent = 'Actualizar Actividad';
  document.getElementById('btnCancelarEdicion').classList.remove('d-none');
  document.getElementById('activityForm').scrollIntoView({ behavior: 'smooth' });
}

function eliminarActividad(id) {
  if (!confirm('¿Eliminar esta actividad?')) return;
  database.ref('actividades/' + id).remove()
    .catch(() => {
      todasLasActividades = todasLasActividades.filter(a => a.id !== id);
      guardarEnLocal();
    });
  renderActividades();
  actualizarEstadisticas();
}

// === ESTADÍSTICAS ACTUALIZADAS ===
function actualizarEstadisticas() {
  const actividades = todasLasActividades.filter(act => act.tecnico === tecnicoNombre);
  if (actividades.length === 0) return;
  
  // Total actividades
  document.getElementById('totalActividades').textContent = actividades.length;
  
  // Calcular horas según normativa
  const { horasNormales, horasExtras } = calcularHorasEcuador(actividades);
  
  // Mostrar en estadísticas
  document.getElementById('totalHoras').textContent = 
    `${horasNormales.toFixed(1)}h normales + ${horasExtras.toFixed(1)}h extras`;
  
  // Promedio diario laborable
  const diasLaborables = [...new Set(
    actividades
      .filter(act => esDiaLaborable(act.fecha))
      .map(a => a.fecha)
  )];
  const promedioDiario = diasLaborables.length > 0 ? 
    (horasNormales / diasLaborables.length).toFixed(1) : 0;
  document.getElementById('promedioDiario').textContent = `${promedioDiario}h`;
  
  // Tipo principal
  const tipos = {};
  actividades.forEach(act => {
    tipos[act.tipo] = (tipos[act.tipo] || 0) + 1;
  });
  const tipoPrincipal = Object.keys(tipos).reduce((a, b) => tipos[a] > tipos[b] ? a : b, '');
  document.getElementById('tipoPrincipal').textContent = tipoPrincipal;
  
  // Mostrar días no laborables si existen
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

// === VER REPORTE ===
document.getElementById('btnVerReporte').addEventListener('click', () => {
  const inicio = document.getElementById('fechaInicio').value;
  const fin = document.getElementById('fechaFin').value;
  if (!inicio || !fin) return alert('Seleccione ambas fechas.');
  
  document.getElementById('fechaInicioReporte').textContent = inicio;
  document.getElementById('fechaFinReporte').textContent = fin;
  renderActividades(inicio, fin);
  document.getElementById('reporteContainer').classList.remove('d-none');
});

// === FILTROS ===
document.getElementById('filtroTipo')?.addEventListener('change', () => {
  const inicio = document.getElementById('fechaInicio').value;
  const fin = document.getElementById('fechaFin').value;
  renderActividades(inicio || null, fin || null);
});

document.getElementById('filtroDescripcion')?.addEventListener('input', () => {
  const inicio = document.getElementById('fechaInicio').value;
  const fin = document.getElementById('fechaFin').value;
  renderActividades(inicio || null, fin || null);
});

document.getElementById('btnLimpiarFiltros')?.addEventListener('click', () => {
  document.getElementById('filtroTipo').value = '';
  document.getElementById('filtroDescripcion').value = '';
  const inicio = document.getElementById('fechaInicio').value;
  const fin = document.getElementById('fechaFin').value;
  renderActividades(inicio || null, fin || null);
});

// === PDF CON JORNADA LABORAL ECUATORIANA ===
document.getElementById('btnGenerarPDF').addEventListener('click', () => {
  const inicio = document.getElementById('fechaInicio').value;
  const fin = document.getElementById('fechaFin').value;
  if (!inicio || !fin) return alert('Seleccione un rango de fechas.');

  const actividadesFiltradas = todasLasActividades
    .filter(act => act.tecnico === tecnicoNombre && act.fecha >= inicio && act.fecha <= fin)
    .sort((a, b) => new Date(a.fecha + 'T' + a.horaInicio) - new Date(b.fecha + 'T' + b.horaInicio));

  if (actividadesFiltradas.length === 0) {
    return alert('No hay actividades en este rango para generar el informe.');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const primaryColor = [13, 110, 253];
  const darkColor = [33, 37, 41];
  const lightGray = [240, 240, 240];

  // === CARGAR LOGO Y GENERAR PDF ===
  const logoUrl = '/logo-komtest.png';
  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.src = logoUrl;
  
  img.onload = () => {
    // === FUNCIÓN PARA AGREGAR MARCA DE AGUA ===
    function agregarMarcaAgua() {
      doc.saveGraphicsState();
      
      // Obtener dimensiones de la página
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // Calcular dimensiones responsivas para el logo
      const logoWidth = pageWidth * 0.6; // 60% del ancho de la página
      const logoHeight = (img.height * logoWidth) / img.width; // Mantener proporción
      
      // Posición centrada
      const x = (pageWidth - logoWidth) / 2;
      const y = (pageHeight - logoHeight) / 2;
      
      // Agregar imagen con opacidad (usando canvas para transparencia)
      const watermarkCanvas = createWatermarkCanvas(img, logoWidth, logoHeight);
      doc.addImage(watermarkCanvas, 'PNG', x, y, logoWidth, logoHeight);
      
      doc.restoreGraphicsState();
    }
    
    // === CREAR CANVAS CON OPACIDAD ===
    function createWatermarkCanvas(image, width, height) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      
      // Fondo transparente
      ctx.clearRect(0, 0, width, height);
      
      // Dibujar imagen con opacidad
      ctx.globalAlpha = 0.08; // 8% de opacidad
      ctx.drawImage(image, 0, 0, width, height);
      
      return canvas.toDataURL('image/png');
    }
    
    // === ENCABEZADO ACTUALIZADO ===
    doc.setFontSize(22);
    doc.setTextColor(...primaryColor);
    doc.text('DIESEL INJECTION SERVICES', 15, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(...darkColor);
    doc.text('Especialistas en Sistemas de Inyección CRDi', 15, 26);
    
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.8);
    doc.line(15, 32, 195, 32);
    
    doc.setFontSize(16);
    doc.text('Informe de Actividades Técnicas', 105, 42, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Técnico: ${tecnicoNombre}`, 20, 52);
    doc.text(`Periodo: ${formatearFecha(inicio)} – ${formatearFecha(fin)}`, 20, 58);
    
    // Total de horas según normativa ecuatoriana actualizada
    const { horasNormales, horasExtras } = calcularHorasEcuador(actividadesFiltradas);
    let yPosition = 64;

    doc.text(`Horas normales: ${horasNormales.toFixed(1)}h`, 20, yPosition);
    yPosition += 6;
    doc.text(`Horas extras: ${horasExtras.toFixed(1)}h`, 20, yPosition);
    yPosition += 6;
    doc.text('Jornada: L-V 9:00-18:00 (1h almuerzo), Sáb 9:00-13:00', 20, yPosition);
    yPosition += 6;
    doc.text('Cumple con normativa del Ministerio de Trabajo del Ecuador', 20, yPosition);
    
    // === AGREGAR MARCA DE AGUA A LA PRIMERA PÁGINA ===
    agregarMarcaAgua();
    
    // === TABLA ===
    const tableData = actividadesFiltradas.map(act => {
      const esLaborable = esDiaLaborable(act.fecha);
      const tipoHorario = !esLaborable ? 'Extra' : 'Normal';
      return [
        `${act.fecha}\n${act.horaInicio} - ${act.horaFin}`,
        act.tipo,
        `${act.descripcion}\n(${tipoHorario})`
      ];
    });
    
    doc.autoTable({
      startY: yPosition + 12,
      head: [['Fecha y Horario', 'Tipo de Actividad', 'Descripción']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 10,
        halign: 'center',
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 2,
        textColor: darkColor,
        lineColor: lightGray,
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 35, halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: 85, minCellHeight: 15 }
      },
      margin: { left: 15, right: 15 },
      didDrawPage: function (data) {
        // Agregar marca de agua a nuevas páginas
        agregarMarcaAgua();
      }
    });
    
    // === PIE DE PÁGINA ===
    const finalPageCount = doc.getNumberOfPages();
    for (let i = 1; i <= finalPageCount; i++) {
      doc.setPage(i);
      const footerY = doc.internal.pageSize.height - 10;
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text('Documento generado mediante Bitácora Komtest Pro • Confidencial', 105, footerY, { align: 'center' });
    }
    
    // === FIRMA ===
    const finalY = doc.lastAutoTable.finalY + 15;
    if (finalY < doc.internal.pageSize.height - 20) {
      const fechaActual = new Date().toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      doc.setFontSize(11);
      doc.setTextColor(...darkColor);
      doc.text(`Fecha: ${fechaActual}`, 20, finalY);
      doc.text('Firma: _________________________', 20, finalY + 6);
      doc.text(`Nombre: ${tecnicoNombre}`, 140, finalY + 6);
    }
    
    const nombreArchivo = `DieselInjection_Informe_${tecnicoNombre.replace(/\s+/g, '_')}_${inicio.replaceAll('-', '')}_${fin.replaceAll('-', '')}_ECUADOR.pdf`;
    doc.save(nombreArchivo);
  };
  
  img.onerror = () => {
    // Si no hay logo, generar sin marca de agua
    console.warn("Logo no encontrado, generando sin marca de agua");
    
    // Generar PDF sin marca de agua (usa la versión anterior)
    doc.setFontSize(22);
    doc.setTextColor(...primaryColor);
    doc.text('DIESEL INJECTION SERVICES', 15, 20);
    doc.setFontSize(10);
    doc.setTextColor(...darkColor);
    doc.text('Especialistas en Sistemas de Inyección CRDi', 15, 26);
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.8);
    doc.line(15, 32, 195, 32);
    doc.setFontSize(16);
    doc.text('Informe de Actividades Técnicas', 105, 42, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Técnico: ${tecnicoNombre}`, 20, 52);
    doc.text(`Periodo: ${formatearFecha(inicio)} – ${formatearFecha(fin)}`, 20, 58);
    
    const { horasNormales, horasExtras } = calcularHorasEcuador(actividadesFiltradas);
    let yPosition = 64;

    doc.text(`Horas normales: ${horasNormales.toFixed(1)}h`, 20, yPosition);
    yPosition += 6;
    doc.text(`Horas extras: ${horasExtras.toFixed(1)}h`, 20, yPosition);
    yPosition += 6;
    doc.text('Jornada: L-V 9:00-18:00 (1h almuerzo), Sáb 9:00-13:00', 20, yPosition);
    yPosition += 6;
    doc.text('Cumple con normativa del Ministerio de Trabajo del Ecuador', 20, yPosition);
    
    const tableData = actividadesFiltradas.map(act => {
      const esLaborable = esDiaLaborable(act.fecha);
      const tipoHorario = !esLaborable ? 'Extra' : 'Normal';
      return [
        `${act.fecha}\n${act.horaInicio} - ${act.horaFin}`,
        act.tipo,
        `${act.descripcion}\n(${tipoHorario})`
      ];
    });
    
    doc.autoTable({
      startY: yPosition + 12,
      head: [['Fecha y Horario', 'Tipo de Actividad', 'Descripción']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 10,
        halign: 'center',
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 2,
        textColor: darkColor,
        lineColor: lightGray,
        lineWidth: 0.1
      },
      columnStyles: {
        0: { cellWidth: 35, halign: 'center' },
        1: { cellWidth: 50 },
        2: { cellWidth: 85, minCellHeight: 15 }
      },
      margin: { left: 15, right: 15 }
    });
    
    const finalPageCount = doc.getNumberOfPages();
    for (let i = 1; i <= finalPageCount; i++) {
      doc.setPage(i);
      const footerY = doc.internal.pageSize.height - 10;
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text('Documento generado mediante Bitácora Komtest Pro • Confidencial', 105, footerY, { align: 'center' });
    }
    
    const finalY = doc.lastAutoTable.finalY + 15;
    if (finalY < doc.internal.pageSize.height - 20) {
      const fechaActual = new Date().toLocaleDateString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      doc.setFontSize(11);
      doc.setTextColor(...darkColor);
      doc.text(`Fecha: ${fechaActual}`, 20, finalY);
      doc.text('Firma: _________________________', 20, finalY + 6);
      doc.text(`Nombre: ${tecnicoNombre}`, 140, finalY + 6);
    }
    
    const nombreArchivo = `DieselInjection_Informe_${tecnicoNombre.replace(/\s+/g, '_')}_${inicio.replaceAll('-', '')}_${fin.replaceAll('-', '')}_ECUADOR.pdf`;
    doc.save(nombreArchivo);
  };
});

// === EXCEL ACTUALIZADO ===
document.getElementById('btnGenerarExcel').addEventListener('click', () => {
  const inicio = document.getElementById('fechaInicio').value;
  const fin = document.getElementById('fechaFin').value;
  if (!inicio || !fin) return alert('Seleccione un rango de fechas.');
  
  const actividades = todasLasActividades
    .filter(act => act.tecnico === tecnicoNombre && act.fecha >= inicio && act.fecha <= fin);
  
  if (actividades.length === 0) {
    return alert('No hay actividades en este rango.');
  }
  
  const datosExcel = actividades.map(act => {
    const esLaborable = esDiaLaborable(act.fecha);
    const tipoDia = getTipoDia(act.fecha);
    
    // Determinar si la actividad tiene horas extras
    let tipoHorario = 'Normal';
    if (!esLaborable) {
      tipoHorario = 'Extra (Domingo/Feriado)';
    } else {
      const inicioMin = horaAMinutos(act.horaInicio);
      const finMin = horaAMinutos(act.horaFin);
      
      if (tipoDia === 'lunes-viernes') {
        // Verificar si está fuera del horario normal
        const esExtra = (inicioMin < 9*60 || finMin > 18*60) && 
                       !(inicioMin >= 12*60 && finMin <= 13*60);
        if (esExtra) tipoHorario = 'Extra (Horario extendido)';
      } else {
        // Sábado
        if (inicioMin < 9*60 || finMin > 13*60) {
          tipoHorario = 'Extra (Horario extendido)';
        }
      }
    }
    
    return {
      Fecha: act.fecha,
      'Hora Inicio': act.horaInicio,
      'Hora Fin': act.horaFin,
      'Tipo de Actividad': act.tipo,
      Descripción: act.descripcion,
      'Tipo Horario': tipoHorario
    };
  });
  
  const ws = XLSX.utils.json_to_sheet(datosExcel);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Actividades");
  XLSX.writeFile(wb, `DieselInjection_${tecnicoNombre}_${inicio}_${fin}_ECUADOR.xlsx`);
});

function formatearFecha(fechaISO) {
  const [y, m, d] = fechaISO.split('-');
  return `${d}/${m}/${y}`;
}

// === RESPALDO JSON ===
document.getElementById('btnRespaldo').addEventListener('click', () => {
  const misActividades = todasLasActividades.filter(act => act.tecnico === tecnicoNombre);
  const dataStr = JSON.stringify(misActividades, null, 2);
  const dataUri = 'application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  const exportFileDefaultName = `bitacora_diesel_injection_${tecnicoNombre.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}_ECUADOR.json`;
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
});

// === Solicitar permisos de notificación ===
if ('Notification' in window) {
  Notification.requestPermission();
}
