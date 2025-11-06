// funAdmin.js - Funcionalidad completa para el Panel de Administración

const API_BASE_URL = 'http://127.0.0.1:5000';

// Variables globales
let currentDate = new Date();
let selectedCalendarDate = null;
let allCitas = [];

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPanel();
});

async function initializeAdminPanel() {
    try {
        console.log('Inicializando panel de administración...');
        await loadCitas();
        
        // DEBUG: Mostrar información de citas
        debugCitas();
        
        initializeEventListeners();
        updateCalendar();
        updateSelectedDate(new Date());
        updateStats();
        updateScheduleForDate(new Date());
        updatePatientCardsForDate(new Date());
        
        console.log('Panel de administración inicializado correctamente');
    } catch (error) {
        console.error('Error inicializando panel:', error);
        alert('Error al cargar los datos del panel de administración: ' + error.message);
    }
}

function initializeEventListeners() {
    // Navegación del calendario
    document.getElementById('prev-month').addEventListener('click', previousMonth);
    document.getElementById('next-month').addEventListener('click', nextMonth);
    
    // Cerrar modal
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', function(event) {
        if (event.target === document.getElementById('appointment-modal')) {
            closeModal();
        }
    });
    
    // Botones del modal
    document.querySelector('.modal-actions .btn-primary').addEventListener('click', editAppointment);
    document.querySelector('.modal-actions .btn-secondary').addEventListener('click', printAppointment);
    document.querySelector('.modal-actions .btn-danger').addEventListener('click', cancelAppointment);
    
    // Inicializar eventos de fechas del calendario
    initializeCalendarEvents();
}

// ==================== FUNCIONES DE LA API ====================

async function loadCitas() {
    try {
        console.log('Cargando citas desde API...');
        
        // Intentar primero la ruta de debug (sin autenticación)
        let response = await fetch(`${API_BASE_URL}/api/citas/debug`);
        
        if (!response.ok) {
            // Si falla, intentar la ruta normal con autenticación
            console.log('Ruta debug falló, intentando ruta normal...');
            response = await fetch(`${API_BASE_URL}/api/citas/admin`, {
                credentials: 'include'
            });
        }
        
        console.log('Respuesta de API:', response.status, response.statusText);
        
        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('No estás autenticado. Por favor inicia sesión.');
            } else if (response.status === 403) {
                throw new Error('No tienes permisos para ver las citas.');
            } else {
                throw new Error(`Error del servidor: ${response.status}`);
            }
        }
        
        allCitas = await response.json();
        console.log('Citas cargadas correctamente:', allCitas);
        
        return allCitas;
        
    } catch (error) {
        console.error('Error cargando citas:', error);
        
        // Para desarrollo, mostrar datos de demo
        console.log('Usando datos de demo para desarrollo');
        allCitas = getDemoCitas();
        return allCitas;
    }
}

async function updateAppointmentStatus(citaId, nuevoEstado) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/citas/${citaId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ estado: nuevoEstado })
        });
        
        if (response.ok) {
            await loadCitas(); // Recargar datos
            updateScheduleForDate(selectedCalendarDate || new Date());
            updatePatientCardsForDate(selectedCalendarDate || new Date());
            updateStats();
            closeModal();
            alert('Estado de cita actualizado correctamente');
        } else {
            throw new Error('Error al actualizar cita');
        }
    } catch (error) {
        console.error('Error actualizando cita:', error);
        alert('Error al actualizar el estado de la cita');
    }
}

// ==================== FUNCIONALIDAD DEL CALENDARIO ====================

function previousMonth() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    updateCalendar();
}

function nextMonth() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    updateCalendar();
}

function updateCalendar() {
    const monthYearElement = document.querySelector('.calendar-header h3');
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    monthYearElement.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    
    // Marcar días con citas
    markDaysWithAppointments();
}

function markDaysWithAppointments() {
    console.log('Marcando días con citas en el calendario...');
    
    // Limpiar marcadores anteriores
    document.querySelectorAll('.has-appointments').forEach(el => {
        el.classList.remove('has-appointments');
    });
    
    // Contar citas por día para debug
    const citasPorDia = {};
    allCitas.forEach(cita => {
        citasPorDia[cita.fecha] = (citasPorDia[cita.fecha] || 0) + 1;
    });
    console.log('Citas por día:', citasPorDia);
    
    // Marcar días que tienen citas
    allCitas.forEach(cita => {
        const citaDate = new Date(cita.fecha);
        if (citaDate.getMonth() === currentDate.getMonth() && 
            citaDate.getFullYear() === currentDate.getFullYear()) {
            
            const dayElements = document.querySelectorAll('.calendar-date:not(.other-month)');
            dayElements.forEach(dayElement => {
                const dayNumber = parseInt(dayElement.textContent);
                if (dayNumber === citaDate.getDate()) {
                    dayElement.classList.add('has-appointments');
                    console.log(`Marcado día ${dayNumber} con cita`);
                }
            });
        }
    });
    
    console.log('Días marcados:', document.querySelectorAll('.has-appointments').length);
}

function initializeCalendarEvents() {
    const calendarDates = document.querySelectorAll('.calendar-date:not(.other-month)');
    calendarDates.forEach(date => {
        date.addEventListener('click', function() {
            handleDateSelection(this);
        });
    });
}

function handleDateSelection(dateElement) {
    const selectedDay = parseInt(dateElement.textContent);
    selectedCalendarDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay);
    
    // Actualizar selección visual
    document.querySelectorAll('.calendar-date').forEach(date => {
        date.classList.remove('selected');
    });
    dateElement.classList.add('selected');
    
    updateSelectedDate(selectedCalendarDate);
    updateScheduleForDate(selectedCalendarDate);
    updatePatientCardsForDate(selectedCalendarDate);
}

function updateSelectedDate(date) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = date.toLocaleDateString('es-ES', options);
    
    document.querySelector('.selected-date').innerHTML = `
        <strong>Fecha seleccionada:</strong><br>
        ${formattedDate}
    `;
    
    document.querySelector('.schedule-header h2').innerHTML = 
        `<i class="fas fa-clock"></i> Horario del día - ${formattedDate}`;
}

// ==================== TABLA DE HORARIOS CON DATOS REALES ====================

function updateScheduleForDate(date) {
    const dateString = date.toISOString().split('T')[0];
    const citasDelDia = allCitas.filter(cita => cita.fecha === dateString);
    
    console.log(`Actualizando horario para ${dateString}:`, citasDelDia.length, 'citas');
    
    // Limpiar toda la tabla primero
    const tableCells = document.querySelectorAll('.schedule-table td');
    tableCells.forEach(cell => {
        if (!cell.classList.contains('time-slot')) {
            cell.innerHTML = 'Disponible';
            cell.classList.remove('has-appointment');
        }
    });
    
    // Llenar tabla con citas del día
    citasDelDia.forEach(cita => {
        const hora = cita.hora.substring(0, 5);
        const gabineteNum = parseInt(cita.gabinete.replace('Gabinete ', ''));
        
        if (gabineteNum <= 5) { // Solo gabinetes 1-5 para la tabla
            const timeSlotRow = findTimeSlotRow(hora);
            if (timeSlotRow) {
                const gabineteCell = timeSlotRow.cells[gabineteNum];
                gabineteCell.innerHTML = createAppointmentHTML(cita);
                gabineteCell.classList.add('has-appointment');
                
                // Agregar event listener
                const appointmentElement = gabineteCell.querySelector('.appointment');
                appointmentElement.addEventListener('click', () => showAppointmentDetails(cita));
            }
        }
    });
}

function findTimeSlotRow(hora) {
    const rows = document.querySelectorAll('.schedule-table tbody tr');
    for (let row of rows) {
        const timeCell = row.cells[0];
        const rowTime = timeCell.textContent.match(/\d{2}:\d{2}/);
        if (rowTime && rowTime[0] === hora) {
            return row;
        }
    }
    return null;
}

function createAppointmentHTML(cita) {
    const statusClass = getStatusClass(cita.estado);
    const nombreCompleto = `${cita.paciente.nombre} ${cita.paciente.apellido}`;
    const shortName = nombreCompleto.length > 20 ? 
        nombreCompleto.substring(0, 20) + '...' : nombreCompleto;
    
    return `
        <div class="appointment ${statusClass}" 
             data-cita-id="${cita.id_cita}">
            <div class="patient-name">${shortName}</div>
            <div class="patient-info">Edad: ${cita.paciente.edad}</div>
            <div class="patient-info">${cita.motivo}</div>
            <span class="status ${cita.estado.toLowerCase()}">${cita.estado}</span>
        </div>
    `;
}

// ==================== TARJETAS DE PACIENTES CON DATOS REALES ====================

function updatePatientCardsForDate(date) {
    const dateString = date.toISOString().split('T')[0];
    const citasDelDia = allCitas.filter(cita => cita.fecha === dateString);
    const container = document.querySelector('.patient-cards');
    
    container.innerHTML = '';
    
    if (citasDelDia.length === 0) {
        container.innerHTML = '<div class="no-appointments">No hay citas programadas para esta fecha</div>';
        return;
    }
    
    citasDelDia.forEach(cita => {
        const card = document.createElement('div');
        card.className = 'patient-card';
        card.innerHTML = createPatientCardHTML(cita);
        card.addEventListener('click', () => showAppointmentDetails(cita));
        container.appendChild(card);
    });
}

function createPatientCardHTML(cita) {
    const nombreCompleto = `${cita.paciente.nombre} ${cita.paciente.apellido}`;
    
    return `
        <div class="patient-card-header">
            <div class="patient-card-name">${nombreCompleto}</div>
            <div class="gabinete-badge">${cita.gabinete}</div>
        </div>
        <div class="patient-card-info">Edad: ${cita.paciente.edad}</div>
        <div class="patient-card-info">Tel: ${cita.paciente.telefono}</div>
        <div class="patient-card-info">Hora: ${cita.hora.substring(0, 5)} hrs</div>
        <div class="patient-card-info">Servicio: ${cita.motivo}</div>
        <span class="status ${cita.estado.toLowerCase()}">${cita.estado}</span>
    `;
}

// ==================== MODAL CON DETALLES REALES ====================

function showAppointmentDetails(cita) {
    const nombreCompleto = `${cita.paciente.nombre} ${cita.paciente.apellido}`;
    
    document.getElementById('modal-patient-name').textContent = nombreCompleto;
    document.getElementById('modal-patient-age').textContent = cita.paciente.edad;
    document.getElementById('modal-patient-phone').textContent = cita.paciente.telefono;
    document.getElementById('modal-gabinete').textContent = cita.gabinete;
    document.getElementById('modal-time').textContent = `${cita.hora.substring(0, 5)} hrs`;
    
    const statusElement = document.getElementById('modal-status');
    statusElement.textContent = cita.estado;
    statusElement.className = `status ${cita.estado.toLowerCase()}`;
    
    // Actualizar notas con información real
    const notesElement = document.getElementById('modal-notes');
    notesElement.textContent = `Servicio: ${cita.motivo}. ${getAdditionalNotes(cita)}`;
    
    // Guardar ID de cita para acciones
    document.getElementById('appointment-modal').dataset.citaId = cita.id_cita;
    
    document.getElementById('appointment-modal').style.display = 'block';
}

function getAdditionalNotes(cita) {
    if (cita.motivo.includes('armazón')) {
        return 'Paciente requiere examen completo para lentes de armazón.';
    } else if (cita.motivo.includes('contacto')) {
        return 'Paciente interesado en lentes de contacto. Evaluar adaptación.';
    }
    return 'Examen de rutina. Verificar agudeza visual y salud ocular.';
}

function closeModal() {
    document.getElementById('appointment-modal').style.display = 'none';
}

function editAppointment() {
    const citaId = document.getElementById('appointment-modal').dataset.citaId;
    alert(`Editar cita ${citaId} - Funcionalidad en desarrollo`);
}

function printAppointment() {
    const patientName = document.getElementById('modal-patient-name').textContent;
    const details = `
        Paciente: ${patientName}
        Edad: ${document.getElementById('modal-patient-age').textContent}
        Teléfono: ${document.getElementById('modal-patient-phone').textContent}
        Gabinete: ${document.getElementById('modal-gabinete').textContent}
        Hora: ${document.getElementById('modal-time').textContent}
        Estado: ${document.getElementById('modal-status').textContent}
        Notas: ${document.getElementById('modal-notes').textContent}
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Detalles de Cita - ${patientName}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #274e3b; }
                    .detail { margin: 10px 0; }
                </style>
            </head>
            <body>
                <h1>Detalles de Cita</h1>
                <pre>${details}</pre>
                <script>window.print();</script>
            </body>
        </html>
    `);
    printWindow.document.close();
}

function cancelAppointment() {
    const citaId = document.getElementById('appointment-modal').dataset.citaId;
    if (confirm('¿Estás seguro de que quieres cancelar esta cita?')) {
        updateAppointmentStatus(citaId, 'Cancelada');
    }
}

// ==================== ESTADÍSTICAS CON DATOS REALES ====================

function updateStats() {
    const totalCitas = allCitas.length;
    const completadas = allCitas.filter(c => c.estado && c.estado.toLowerCase() === 'completada').length;
    const programadas = allCitas.filter(c => c.estado && c.estado.toLowerCase() === 'programada').length;
    const canceladas = allCitas.filter(c => c.estado && c.estado.toLowerCase() === 'cancelada').length;
    
    console.log('Actualizando estadísticas:', { totalCitas, completadas, programadas, canceladas });
    
    // Actualizar estadísticas generales
    const statNumbers = document.querySelectorAll('.stats-grid .stat-number');
    if (statNumbers.length >= 4) {
        statNumbers[0].textContent = totalCitas;
        statNumbers[1].textContent = completadas;
        statNumbers[2].textContent = programadas;
        statNumbers[3].textContent = canceladas;
    }
    
    // Actualizar estadísticas del día
    const today = new Date().toISOString().split('T')[0];
    const citasHoy = allCitas.filter(c => c.fecha === today);
    
    const atendidasHoy = citasHoy.filter(c => c.estado && c.estado.toLowerCase() === 'completada').length;
    const pendientesHoy = citasHoy.filter(c => c.estado && c.estado.toLowerCase() === 'programada').length;
    const noAtendidasHoy = citasHoy.filter(c => c.estado && c.estado.toLowerCase() === 'cancelada').length;
    
    const dayStats = document.querySelectorAll('.day-stats-grid .stat-number');
    if (dayStats.length >= 3) {
        dayStats[0].textContent = atendidasHoy;
        dayStats[1].textContent = pendientesHoy;
        dayStats[2].textContent = noAtendidasHoy;
    }
}

// ==================== FUNCIONES UTILITARIAS ====================

function getStatusClass(estado) {
    if (!estado) return '';
    
    switch(estado.toLowerCase()) {
        case 'completada': return 'completed';
        case 'cancelada': return 'cancelled';
        default: return '';
    }
}

// Función de debug
function debugCitas() {
    console.log('=== DEBUG CITAS ===');
    console.log('Total de citas:', allCitas.length);
    console.log('Citas:', allCitas);
    
    // Verificar estructura de cada cita
    allCitas.forEach((cita, index) => {
        console.log(`Cita ${index + 1}:`, {
            id: cita.id_cita,
            fecha: cita.fecha,
            hora: cita.hora,
            paciente: cita.paciente,
            motivo: cita.motivo,
            gabinete: cita.gabinete,
            estado: cita.estado
        });
    });
}

// Datos de demo para cuando la API no esté disponible
function getDemoCitas() {
    const today = new Date().toISOString().split('T')[0];
    return [
        {
            id_cita: 1,
            fecha: today,
            hora: '09:00:00',
            paciente: { nombre: 'María', apellido: 'García López', edad: 25, telefono: '555-0101' },
            motivo: 'Lentes graduados de armazón',
            gabinete: 'Gabinete 1',
            estado: 'Programada'
        },
        {
            id_cita: 2,
            fecha: today,
            hora: '10:00:00',
            paciente: { nombre: 'Juan Carlos', apellido: 'Martínez Rodríguez', edad: 30, telefono: '555-0102' },
            motivo: 'Lentes de contacto',
            gabinete: 'Gabinete 2',
            estado: 'Programada'
        }
    ];
}