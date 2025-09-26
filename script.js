// === CONFIGURACIÓN DE FIREBASE ===
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

let tecnicoNombre = '';

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
  if (horaInicio >= horaFin) {
    return alert('La hora de inicio debe ser menor que la hora de fin.');
  }
  const actividad = {
    fecha,
    horaInicio,
    horaFin,
    tipo,
    descripcion,
    tecnico: tecnicoNombre,
    timestamp: Date.now()
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
      .catch(() => {
        const nuevoId = 'local_' + Date.now();
        todasLasActividades.push({ id: nuevoId, ...actividad });
        guardarEnLocal();
      });
  }
  this.reset();
  document.getElementById('fecha').value = hoy;
  renderActividades();
});

document.getElementById('btnCancelarEdicion').addEventListener('click', () => {
  document.getElementById('activityForm').reset();
  document.getElementById('fecha').value = hoy;
  document.getElementById('editId').value = '';
  document.getElementById('btnGuardar').textContent = 'Agregar Actividad';
  document.getElementById('btnCancelarEdicion').classList.add('d-none');
});

let todasLasActividades = [];
function cargarActividades() {
  const ref = database.ref('actividades').orderByChild('timestamp');
  ref.on('value', (snapshot) => {
    todasLasActividades = [];
    snapshot.forEach((child) => {
      todasLasActividades.push({ id: child.key, ...child.val() });
    });
    todasLasActividades.sort((a, b) => b.timestamp - a.timestamp);
    guardarEnLocal();
    renderActividades();
  }, (error) => {
    console.log("Sin conexión a Firebase. Cargando desde local...");
    cargarDesdeLocal();
  });
}

function renderActividades(fechaInicio = null, fechaFin = null) {
  const tbody = document.getElementById('tablaActividades');
  tbody.innerHTML = '';
  let filtradas = todasLasActividades.filter(act => act.tecnico === tecnicoNombre);
  if (fechaInicio && fechaFin) {
    filtradas = filtradas.filter(act => act.fecha >= fechaInicio && act.fecha <= fechaFin);
  }
  if (filtradas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center">No hay actividades.</td></tr>`;
    return;
  }
  filtradas.forEach(act => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${act.fecha}<br><small>${act.horaInicio} - ${act.horaFin}</small></td>
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
}

function eliminarActividad(id) {
  if (!confirm('¿Eliminar esta actividad?')) return;
  database.ref('actividades/' + id).remove()
    .catch(() => {
      todasLasActividades = todasLasActividades.filter(a => a.id !== id);
      guardarEnLocal();
    });
  renderActividades();
}

document.getElementById('btnVerReporte').addEventListener('click', () => {
  const inicio = document.getElementById('fechaInicio').value;
  const fin = document.getElementById('fechaFin').value;
  if (!inicio || !fin) return alert('Seleccione ambas fechas.');
  document.getElementById('fechaInicioReporte').textContent = inicio;
  document.getElementById('fechaFinReporte').textContent = fin;
  renderActividades(inicio, fin);
  document.getElementById('reporteContainer').classList.remove('d-none');
});

// === ✅ FUNCIÓN CORREGIDA PARA PDF CON DESCRIPCIÓN COMPLETA ===
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

  // Encabezado
  doc.setFontSize(22);
  doc.setTextColor(...primaryColor);
  doc.text('KOMTEST', 15, 20);
  doc.setFontSize(10);
  doc.setTextColor(...darkColor);
  doc.text('Sistemas de Prueba Diesel y Gasolina', 15, 26);
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.8);
  doc.line(15, 32, 195, 32);
  doc.setFontSize(16);
  doc.text('Informe de Actividades Técnicas', 105, 42, { align: 'center' });
  doc.setFontSize(11);
  doc.text(`Técnico: ${tecnicoNombre}`, 20, 52);
  doc.text(`Periodo: ${formatearFecha(inicio)} – ${formatearFecha(fin)}`, 20, 58);

  // Preparar datos para la tabla
  const tableData = actividadesFiltradas.map(act => [
    `${act.fecha}\n${act.horaInicio} - ${act.horaFin}`,
    act.tipo,
    act.descripcion // ✅ Sin recortar
  ]);

  // Agregar tabla con soporte para texto largo
  doc.autoTable({
    startY: 66,
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
      2: { 
        cellWidth: 85,
        // ✅ Permitir que el texto se ajuste en múltiples líneas
        minCellHeight: 15 
      }
    },
    margin: { left: 15, right: 15 },
    // ✅ Habilitar división de texto en celdas
    willDrawCell: function (data) {
      if (data.section === 'body' && data.column.index === 2) {
        // Asegurar que el texto se muestre completo
        doc.setFontSize(9);
      }
    }
  });

  // Pie de página
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const footerY = doc.internal.pageSize.height - 10;
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text('Documento generado mediante Bitácora Komtest Pro • Confidencial', 105, footerY, { align: 'center' });
  }

  // Firma
  const finalY = doc.lastAutoTable.finalY + 15;
  if (finalY < doc.internal.pageSize.height - 20) {
    doc.setFontSize(11);
    doc.setTextColor(...darkColor);
    doc.text('Firma del Técnico: _________________________', 20, finalY);
    doc.text(`Nombre: ${tecnicoNombre}`, 140, finalY);
  }

  const nombreArchivo = `Komtest_Informe_${tecnicoNombre.replace(/\s+/g, '_')}_${inicio.replaceAll('-', '')}_${fin.replaceAll('-', '')}.pdf`;
  doc.save(nombreArchivo);
});

function formatearFecha(fechaISO) {
  const [y, m, d] = fechaISO.split('-');
  return `${d}/${m}/${y}`;
}

document.getElementById('btnRespaldo').addEventListener('click', () => {
  const misActividades = todasLasActividades.filter(act => act.tecnico === tecnicoNombre);
  const dataStr = JSON.stringify(misActividades, null, 2);
  const dataUri = 'application/json;charset=utf-8,' + encodeURIComponent(dataStr);
  const exportFileDefaultName = `bitacora_komtest_${tecnicoNombre.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.json`;
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
});