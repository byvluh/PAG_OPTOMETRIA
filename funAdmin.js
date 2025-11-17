// funAdmin.js - VERSIÓN CORREGIDA

const API_BASE_URL = 'http://127.0.0.1:5000';

// Variables globales
let currentDate = new Date();
let selectedCalendarDate = null;
let allCitas = [];

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando panel de administración...');
    initializeAdminPanel();
});

// funcion de navegacion
function showSection(sectionName) {
    // Ocultar todas las secciones
    document.querySelectorAll('.admin-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Remover activo de todos los botones
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar sección seleccionada y activar botón
    document.getElementById(sectionName + 'Section').style.display = 'block';
    event.target.classList.add('active');
}

// Agregar función para manejar el formulario de terapia visual
document.addEventListener('DOMContentLoaded', function() {
    // ... código existente ...
    
    // Agregar event listener para el formulario de terapia visual
    const terapiaForm = document.getElementById('terapiaVisualForm');
    if (terapiaForm) {
        terapiaForm.addEventListener('submit', handleTerapiaVisualSubmit);
    }
    
    // Establecer fecha mínima como hoy
    const fechaInput = document.getElementById('terapiaFecha');
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.min = today;
        fechaInput.value = today;
    }
});

async function handleTerapiaVisualSubmit(event) {
    event.preventDefault();
    
    console.log("🔄 Iniciando envío de terapia visual...");
    
    // Obtener y validar datos
    const nombrePaciente = document.getElementById('terapiaNombre').value;
    const fechaInput = document.getElementById('terapiaFecha').value;
    const horaSelect = document.getElementById('terapiaHora');
    const horaValor = horaSelect.options[horaSelect.selectedIndex].value;
    
    if (!nombrePaciente || !fechaInput || !horaValor) {
        alert('Por favor completa todos los campos requeridos');
        return;
    }
    
    // Validar formato de fecha (debe ser YYYY-MM-DD)
    let fechaFormateada = fechaInput;
    
    // Si el input type="date" funciona correctamente, ya vendrá en formato YYYY-MM-DD
    console.log(`📊 Datos a enviar:`, {
        nombrePaciente,
        fechaInput,
        fechaFormateada,
        horaValor
    });
    
    const esRecurrente = document.getElementById('terapiaRecurrente').checked;
    
    const formData = {
        nombre_paciente: nombrePaciente,
        fecha_inicio: fechaFormateada,
        hora: horaValor,
        edad: document.getElementById('terapiaEdad').value || null,
        telefono: document.getElementById('terapiaTelefono').value || null,
        notas: document.getElementById('terapiaNotas').value || '',
        es_recurrente: esRecurrente
    };
    
    const messageEl = document.getElementById('terapiaMessage');
    messageEl.innerHTML = '<div style="color: #856404; background: #fff3cd; padding: 10px; border-radius: 5px;">Agendando terapia visual...</div>';
    
    try {
        console.log("📤 Enviando solicitud al servidor...");
        
        // ✅ CORRECCIÓN: Usar la ruta correcta para terapia visual
        const response = await fetch(`${API_BASE_URL}/api/citas/agendar_terapia`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        console.log(`📡 Respuesta del servidor: ${response.status}`);
        
        const data = await response.json();
        console.log("📨 Datos de respuesta:", data);
        
        if (response.ok) {
            let mensajeExito = `✅ Terapia visual agendada exitosamente para ${formData.nombre_paciente}`;
            
            if (esRecurrente && data.total_citas) {
                mensajeExito += `<br>📅 Se crearon ${data.total_citas} citas hasta el ${data.fecha_fin}`;
            }
            
            messageEl.innerHTML = `<div style="color: #155724; background: #d4edda; padding: 10px; border-radius: 5px;">
                ${mensajeExito}
            </div>`;
            
            // Limpiar formulario
            document.getElementById('terapiaVisualForm').reset();
            
            // Restaurar fecha actual
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('terapiaFecha').value = today;
            
            // Actualizar estadísticas y calendario
            await loadCitas();
            updateStats();
            updateCalendar();
            
        } else {
            console.error("❌ Error del servidor:", data);
            messageEl.innerHTML = `<div style="color: #721c24; background: #f8d7da; padding: 10px; border-radius: 5px;">
                ❌ Error: ${data.message || 'Error desconocido del servidor'}
            </div>`;
        }
        
    } catch (error) {
        console.error('💥 Error de conexión:', error);
        messageEl.innerHTML = `<div style="color: #721c24; background: #f8d7da; padding: 10px; border-radius: 5px;">
            ❌ Error de conexión con el servidor: ${error.message}
        </div>`;
    }
}

async function initializeAdminPanel() {
   try {
        console.log('🔧 Inicializando panel de administración...');
        
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
            console.log('❌ No autenticado, deteniendo inicialización');
            return;
        }
        
        console.log('✅ Autenticación verificada, cargando datos...');
        
        await loadCitas();
        initializeEventListeners();
        updateCalendar();
        updateSelectedDate(new Date());
        updateStats();
        updateScheduleForDate(new Date());
        updatePatientCardsForDate(new Date());
        
        // ⭐⭐ NUEVO: Inicializar formulario de terapia visual
        setupTerapiaVisualForm();
        
        console.log('✅ Panel de administración inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando panel:', error);
        alert('Error al cargar los datos del panel de administración: ' + error.message);
    }
}

// ==================== VERIFICACIÓN DE SESIÓN CORREGIDA ====================

async function checkAuth() {
    try {
        console.log('🔐 Verificando sesión...');
        
        // PRIMERO: Verificar debug session
        console.log('🔧 Verificando estado de sesión...');
        const debugResponse = await fetch(`${API_BASE_URL}/api/debug/session`, {
            method: 'GET',
            credentials: 'include', // ¡CRÍTICO! Incluir cookies
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('🔧 Debug session status:', debugResponse.status);
        
        if (debugResponse.ok) {
            const debugData = await debugResponse.json();
            console.log('🔧 Debug session data:', debugData);
            
            if (debugData.current_user_authenticated) {
                console.log('✅ Sesión activa encontrada');
                return true;
            }
        }
        
        // SEGUNDO: Verificar usuario actual
        console.log('👤 Verificando usuario actual...');
        const response = await fetch(`${API_BASE_URL}/api/user/current`, {
            method: 'GET',
            credentials: 'include', // ¡CRÍTICO! Incluir cookies
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 Estado de verificación:', response.status);
        
        if (response.ok) {
            const userData = await response.json();
            console.log('✅ Usuario autenticado:', userData);
            return true;
        } else {
            console.log('❌ No autenticado, redirigiendo al login');
            window.location.href = 'login.html';
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error verificando autenticación:', error);
        console.log('⚠️  Redirigiendo al login por error de conexión');
        window.location.href = 'login.html';
        return false;
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

function setupTerapiaVisualForm() {
    const terapiaForm = document.getElementById('terapiaVisualForm');
    if (!terapiaForm) return;
    
    // Establecer fecha mínima como hoy
    const fechaInput = document.getElementById('terapiaFecha');
    if (fechaInput) {
        const today = new Date().toISOString().split('T')[0];
        fechaInput.min = today;
        fechaInput.value = today;
    }
}

// ⭐⭐ MODIFICAR la función handleTerapiaVisualSubmit existente:
async function handleTerapiaVisualSubmit(event) {
    event.preventDefault();
    
    // ⭐⭐ NUEVO: Obtener el estado del checkbox
    const recurrenteCheckbox = document.getElementById('terapiaRecurrente');
    const esRecurrente = recurrenteCheckbox ? recurrenteCheckbox.checked : true; // Por defecto true
    
    const formData = {
        nombre_paciente: document.getElementById('terapiaNombre').value,
        fecha_inicio: document.getElementById('terapiaFecha').value, // ⭐⭐ CAMBIÉ de 'fecha' a 'fecha_inicio'
        hora: document.getElementById('terapiaHora').value,
        edad: document.getElementById('terapiaEdad').value || null,
        telefono: document.getElementById('terapiaTelefono').value || null,
        notas: document.getElementById('terapiaNotas').value || '',
        es_recurrente: esRecurrente // ⭐⭐ NUEVO campo
    };
    
    const messageEl = document.getElementById('terapiaMessage');
    messageEl.innerHTML = '<div style="color: #856404; background: #fff3cd; padding: 10px; border-radius: 5px;">Agendando terapia visual...</div>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/citas/agendar_terapia`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            let mensajeExito = `✅ Terapia visual agendada exitosamente para ${formData.nombre_paciente}`;
            
            // ⭐⭐ NUEVO: Mensaje específico para recurrencia
            if (esRecurrente && data.total_citas) {
                mensajeExito += `<br>📅 Se crearon ${data.total_citas} citas hasta el ${data.fecha_fin}`;
            }
            
            messageEl.innerHTML = `<div style="color: #155724; background: #d4edda; padding: 10px; border-radius: 5px;">
                ${mensajeExito}
            </div>`;
            
            // Limpiar formulario
            document.getElementById('terapiaVisualForm').reset();
            
            // Restaurar fecha actual
            const fechaInput = document.getElementById('terapiaFecha');
            if (fechaInput) {
                const today = new Date().toISOString().split('T')[0];
                fechaInput.value = today;
            }
            
            // Actualizar estadísticas y calendario
            await loadCitas();
            updateStats();
            updateCalendar();
            
        } else {
            messageEl.innerHTML = `<div style="color: #721c24; background: #f8d7da; padding: 10px; border-radius: 5px;">
                ❌ Error: ${data.message}
            </div>`;
        }
        
    } catch (error) {
        console.error('Error agendando terapia visual:', error);
        messageEl.innerHTML = `<div style="color: #721c24; background: #f8d7da; padding: 10px; border-radius: 5px;">
            ❌ Error de conexión con el servidor
        </div>`;
    }
}

// ==================== FUNCIONES DE LA API CORREGIDAS ====================

async function loadCitas() {
    try {
        console.log('📅 Cargando citas desde API...');
        
        // Intentar primero la ruta con autenticación
        let response = await fetch(`${API_BASE_URL}/api/citas/admin`, {
            method: 'GET',
            credentials: 'include', // ¡CRÍTICO! Incluir cookies
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📊 Respuesta de citas admin:', response.status);
        
        if (!response.ok) {
            // Si falla, intentar la ruta de debug (sin autenticación)
            console.log('🔄 Ruta admin falló, intentando ruta debug...');
            response = await fetch(`${API_BASE_URL}/api/citas/debug`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
        }
        
        console.log('📡 Estado final de citas:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Error del servidor: ${response.status}`);
        }
        
        allCitas = await response.json();
        console.log('✅ Citas cargadas correctamente:', allCitas.length, 'citas');
        
        return allCitas;
        
    } catch (error) {
        console.error('❌ Error cargando citas:', error);
        
        // Para desarrollo, mostrar datos de demo
        console.log('⚠️ Usando datos de demo para desarrollo');
        allCitas = getDemoCitas();
        return allCitas;
    }
}

async function updateAppointmentStatus(citaId, nuevoEstado) {
    try {
        // Usamos la ruta de edición completa para asegurar la auditoría, aunque solo cambiemos el estado.
        const response = await fetch(`${API_BASE_URL}/api/citas/${citaId}/editar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // ¡CRÍTICO! Incluir cookies
            body: JSON.stringify({ 
                estado: nuevoEstado,
                // Auditoría simulada para cancelación rápida
                matricula_editor: 'QUICKEDIT', 
                tipo_modificacion: 'cancelar',
                motivo_modificacion: 'Cancelación rápida desde panel',
                detalle_motivo: 'Cancelado por el usuario del panel de admin',
                fecha_modificacion: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            await loadCitas(); // Recargar datos
            updateScheduleForDate(selectedCalendarDate || new Date());
            updatePatientCardsForDate(selectedCalendarDate || new Date());
            updateStats();
            closeModal();
            alert('Estado de cita actualizado correctamente a: ' + nuevoEstado);
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al actualizar cita');
        }
    } catch (error) {
        console.error('Error actualizando cita:', error);
        alert('Error al actualizar el estado de la cita: ' + error.message);
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
    console.log('📅 Marcando días con citas en el calendario...');
    
    // Limpiar marcadores anteriores
    document.querySelectorAll('.has-appointments').forEach(el => {
        el.classList.remove('has-appointments');
    });
    
    // Obtener mes y año actuales del calendario visible
    const currentMonth = currentDate.getMonth(); // 0-11
    const currentYear = currentDate.getFullYear();

    allCitas.forEach(cita => {
        // La fecha viene como "YYYY-MM-DD" desde la API (string)
        if (!cita.fecha) return;

        // Desglosamos la fecha string para evitar conversiones de zona horaria
        // Ejemplo: "2025-11-19" -> parts[0]=2025, parts[1]=11, parts[2]=19
        const parts = cita.fecha.split('-'); 
        const citaYear = parseInt(parts[0]);
        const citaMonth = parseInt(parts[1]) - 1; // Restamos 1 porque en JS los meses son 0-11
        const citaDay = parseInt(parts[2]);

        // Comparamos si la cita pertenece al mes y año que estamos viendo
        if (citaYear === currentYear && citaMonth === currentMonth) {
            const dayElements = document.querySelectorAll('.calendar-date:not(.other-month)');
            
            dayElements.forEach(dayElement => {
                const dayNumber = parseInt(dayElement.textContent);
                if (dayNumber === citaDay) {
                    dayElement.classList.add('has-appointments');
                }
            });
        }
    });
}
function initializeCalendarEvents() {
    // Re-bindear eventos al actualizar el calendario
    const calendarDates = document.querySelectorAll('.calendar-grid .calendar-date:not(.other-month)');
    calendarDates.forEach(date => {
        // Evitar múltiples listeners
        date.removeEventListener('click', handleDateSelection); 
        date.addEventListener('click', function() {
            handleDateSelection(this);
        });
    });
}

function handleDateSelection(dateElement) {
    // 1. Obtener el día clicado
    const selectedDay = parseInt(dateElement.textContent);
    
    // 2. Crear la fecha (sin restar zonas horarias)
    selectedCalendarDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), selectedDay);
    
    // 3. Limpieza visual: Quitamos SOLO la clase 'selected' de los otros días
    document.querySelectorAll('.calendar-date').forEach(date => {
        date.classList.remove('selected'); 
        // ¡IMPORTANTE! NO hacemos remove('has-appointments') aquí.
        // El punto rojo se queda donde estaba.
    });
    
    // 4. Añadimos la clase 'selected' al nuevo día
    dateElement.classList.add('selected');
    
    // 5. Actualizar el resto del panel
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
    // Formato 'YYYY-MM-DD' para comparar con la BD
    const dateString = date.toISOString().split('T')[0];
    const citasDelDia = allCitas.filter(cita => cita.fecha === dateString);
    
    console.log(`🕒 Actualizando horario para ${dateString}:`, citasDelDia.length, 'citas');
    
    // Limpiar toda la tabla primero
    const tableCells = document.querySelectorAll('.schedule-table td');
    tableCells.forEach(cell => {
        if (!cell.classList.contains('time-slot')) {
            cell.innerHTML = 'Disponible';
            cell.classList.remove('has-appointment', 'completed', 'cancelled');
        }
    });
    
    // Llenar tabla con citas del día
    citasDelDia.forEach(cita => {
        const hora = cita.hora.substring(0, 5);
        // Extraer número de gabinete (ej: "Gabinete 3" -> 3)
        const gabineteMatch = cita.gabinete.match(/\d+/);
        const gabineteNum = gabineteMatch ? parseInt(gabineteMatch[0]) : 0;
        
        if (gabineteNum >= 1 && gabineteNum <= 5) { // Solo gabinetes 1-5 para la tabla de ejemplo
            const timeSlotRow = findTimeSlotRow(hora);
            if (timeSlotRow) {
                const gabineteCell = timeSlotRow.cells[gabineteNum];
                if (gabineteCell) { // Asegurar que la celda existe
                    gabineteCell.innerHTML = createAppointmentHTML(cita);
                    gabineteCell.classList.add('has-appointment', cita.estado.toLowerCase().replace(' ', '-'));
                    
                    // Agregar event listener
                    const appointmentElement = gabineteCell.querySelector('.appointment');
                    if (appointmentElement) {
                        appointmentElement.addEventListener('click', () => showAppointmentDetails(cita));
                    }
                }
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
    const statusClass = cita.estado.toLowerCase().replace(' ', '-');
    const nombreCompleto = `${cita.paciente.nombre} ${cita.paciente.apellido}`;
    const shortName = nombreCompleto.length > 20 ? 
        nombreCompleto.substring(0, 20) + '...' : nombreCompleto;
    
    return `
        <div class="appointment ${statusClass}" 
             data-cita-id="${cita.id_cita}">
            <div class="patient-name">${shortName}</div>
            <div class="patient-info">Edad: ${cita.paciente.edad}</div>
            <div class="patient-info">${cita.motivo}</div>
            <span class="status ${statusClass}">${cita.estado}</span>
        </div>
    `;
}

// ==================== TARJETAS DE PACIENTES CON DATOS REALES ====================

function updatePatientCardsForDate(date) {
    // Formato 'YYYY-MM-DD' para comparar con la BD
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
        card.classList.add(cita.estado.toLowerCase().replace(' ', '-')); // Añadir clase de estado
        card.innerHTML = createPatientCardHTML(cita);
        card.addEventListener('click', () => showAppointmentDetails(cita));
        container.appendChild(card);
    });
}

function createPatientCardHTML(cita) {
    const nombreCompleto = `${cita.paciente.nombre} ${cita.paciente.apellido}`;
    const statusClass = cita.estado.toLowerCase().replace(' ', '-');
    
    return `
        <div class="patient-card-header">
            <div class="patient-card-name">${nombreCompleto}</div>
            <div class="gabinete-badge">${cita.gabinete}</div>
        </div>
        <div class="patient-card-info">Edad: ${cita.paciente.edad}</div>
        <div class="patient-card-info">Tel: ${cita.paciente.telefono}</div>
        <div class="patient-card-info">Hora: ${cita.hora.substring(0, 5)} hrs</div>
        <div class="patient-card-info">Servicio: ${cita.motivo}</div>
        <span class="status ${statusClass}">${cita.estado}</span>
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
    const statusClass = cita.estado.toLowerCase().replace(' ', '-');
    statusElement.textContent = cita.estado;
    statusElement.className = `status ${statusClass}`;
    
    // Actualizar notas con información real
    const notesElement = document.getElementById('modal-notes');
    notesElement.textContent = `Servicio: ${cita.motivo}. ${getAdditionalNotes(cita)}`;
    
    // Guardar ID de cita para acciones
    document.getElementById('appointment-modal').dataset.citaId = cita.id_cita;
    
    document.getElementById('appointment-modal').style.display = 'block';
}

function getAdditionalNotes(cita) {
    if (cita.motivo.toLowerCase().includes('armazón')) {
        return 'Paciente requiere examen completo para lentes de armazón.';
    } else if (cita.motivo.toLowerCase().includes('contacto')) {
        return 'Paciente interesado en lentes de contacto. Evaluar adaptación.';
    }
    return 'Examen de rutina. Verificar agudeza visual y salud ocular.';
}

function closeModal() {
    document.getElementById('appointment-modal').style.display = 'none';
}

// ==================== FUNCIONALIDAD MEJORADA DE EDICIÓN ====================

function editAppointment() {
    const citaId = document.getElementById('appointment-modal').dataset.citaId;
    if (!citaId) {
        alert('❌ No se pudo obtener el ID de la cita');
        return;
    }
    closeModal(); // Cerrar modal de detalles
    
    // Buscar la cita completa en el arreglo global para evitar un fetch adicional
    const cita = allCitas.find(c => c.id_cita == citaId);
    if (!cita) {
        alert('❌ Cita no encontrada en la memoria.');
        return;
    }
    
    showEditModal(cita); // Abrir modal de edición con los datos
}

// Se elimina openEditModal ya que los datos ya están en allCitas

function showEditModal(cita) {
    const modalHTML = `
        <div id="edit-modal" class="modal">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h2><i class="fas fa-edit"></i> Editar Cita - ${cita.paciente.nombre} ${cita.paciente.apellido}</h2>
                    <span class="close" onclick="closeEditModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="edit-cita-form">
                        <input type="hidden" id="edit-cita-id" value="${cita.id_cita}">
                        
                        <div class="current-info" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                            <h4 style="margin-top: 0; color: #274e3b;">📋 Información Actual</h4>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div><strong>Paciente:</strong> ${cita.paciente.nombre} ${cita.paciente.apellido}</div>
                                <div><strong>Teléfono:</strong> ${cita.paciente.telefono}</div>
                                <div><strong>Fecha Original:</strong> ${cita.fecha}</div>
                                <div><strong>Hora Original:</strong> ${cita.hora.substring(0,5)} hrs</div>
                                <div><strong>Gabinete:</strong> ${cita.gabinete}</div>
                                <div><strong>Servicio:</strong> ${cita.motivo}</div>
                                <div><strong>Estado:</strong> <span class="status ${cita.estado.toLowerCase().replace(' ', '-')}">${cita.estado}</span></div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="edit-matricula"><i class="fas fa-id-card"></i> Tu Matrícula:</label>
                            <input type="text" id="edit-matricula" 
                                   placeholder="Ej: 2024001 o 99999" 
                                   pattern="[0-9]+"
                                   title="Solo números"
                                   required>
                            <small>Ingresa tu matrícula para registrar quién realizó el cambio</small>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-tipo-modificacion"><i class="fas fa-tag"></i> Tipo de Modificación:</label>
                            <select id="edit-tipo-modificacion" required>
                                <option value="">Selecciona el tipo de modificación</option>
                                <option value="reagendar">Reagendar Cita</option>
                                <option value="cancelar">Cancelar Cita</option>
                                <option value="cambio_estado">Cambiar Estado</option>
                            </select>
                        </div>

                        <div id="edit-fields-container">
                            <div class="form-group" id="reagendar-fields" style="display: none;">
                                <label for="edit-fecha">Nueva Fecha:</label>
                                <input type="date" id="edit-fecha" value="${cita.fecha}">
                            </div>
                            
                            <div class="form-group" id="reagendar-time-fields" style="display: none;">
                                <label for="edit-hora">Nueva Hora:</label>
                                <select id="edit-hora">
                                    <option value="">Selecciona una hora</option>
                                    <option value="12:30:00" ${cita.hora.includes('12:30') ? 'selected' : ''}>12:30 PM</option>
                                    <option value="13:30:00" ${cita.hora.includes('13:30') ? 'selected' : ''}>1:30 PM</option>
                                    <option value="14:30:00" ${cita.hora.includes('14:30') ? 'selected' : ''}>2:30 PM</option>
                                    <option value="15:30:00" ${cita.hora.includes('15:30') ? 'selected' : ''}>3:30 PM</option>
                                </select>
                            </div>

                            <div class="form-group" id="estado-fields" style="display: none;">
                                <label for="edit-estado">Nuevo Estado:</label>
                                <select id="edit-estado">
                                    <option value="Programada" ${cita.estado === 'Programada' ? 'selected' : ''}>Programada</option>
                                    <option value="Completada" ${cita.estado === 'Completada' ? 'selected' : ''}>Completada</option>
                                    <option value="Cancelada" ${cita.estado === 'Cancelada' ? 'selected' : ''}>Cancelada</option>
                                    <option value="No asistió" ${cita.estado === 'No asistió' ? 'selected' : ''}>No asistió</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-motivo-modificacion"><i class="fas fa-clipboard-list"></i> Motivo de la Modificación:</label>
                            <select id="edit-motivo-modificacion" required>
                                <option value="">Selecciona el motivo</option>
                                <option value="Solicitud del paciente">Solicitud del paciente</option>
                                <option value="Disponibilidad de gabinete">Disponibilidad de gabinete</option>
                                <option value="Conflicto de horario">Conflicto de horario</option>
                                <option value="Emergencia">Emergencia</option>
                                <option value="Error en agendamiento">Error en agendamiento</option>
                                <option value="Otro">Otro motivo</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="edit-detalle-motivo"><i class="fas fa-comment"></i> Detalle del Motivo:</label>
                            <textarea id="edit-detalle-motivo" 
                                      placeholder="Explica brevemente por qué se modifica la cita..."
                                      rows="3" required></textarea>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" class="btn btn-secondary" onclick="closeEditModal()">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Guardar Cambios</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('edit-modal').style.display = 'block';
    
    // AGREGAR: Event listener para cerrar al hacer clic fuera del modal
    document.getElementById('edit-modal').addEventListener('click', function(event) {
        if (event.target === this) {
            closeEditModal();
        }
    });
    
    // Configurar eventos dinámicos
    setupEditModalEvents();
    document.getElementById('edit-cita-form').addEventListener('submit', handleEditFormSubmit);
}

function setupEditModalEvents() {
    // Mostrar/ocultar campos según tipo de modificación
    const tipoModificacion = document.getElementById('edit-tipo-modificacion');
    if (tipoModificacion) {
        tipoModificacion.addEventListener('change', function() {
            const tipo = this.value;
            
            // Ocultar todos los campos primero
            const reagendarFields = document.getElementById('reagendar-fields');
            const reagendarTimeFields = document.getElementById('reagendar-time-fields');
            const estadoFields = document.getElementById('estado-fields');
            
            if (reagendarFields) reagendarFields.style.display = 'none';
            if (reagendarTimeFields) reagendarTimeFields.style.display = 'none';
            if (estadoFields) estadoFields.style.display = 'none';
            
            // Mostrar campos según tipo
            if (tipo === 'reagendar') {
                if (reagendarFields) reagendarFields.style.display = 'block';
                if (reagendarTimeFields) reagendarTimeFields.style.display = 'block';
            } else if (tipo === 'cambio_estado' || tipo === 'cancelar') {
                if (estadoFields) estadoFields.style.display = 'block';
                if (tipo === 'cancelar') {
                    document.getElementById('edit-estado').value = 'Cancelada';
                }
            }
        });
    }
    
    // Validación de matrícula en tiempo real
    const matriculaInput = document.getElementById('edit-matricula');
    if (matriculaInput) {
        matriculaInput.addEventListener('input', function() {
            const value = this.value;
            // CORRECCIÓN: Validar que solo contenga NÚMEROS (no contenga letras)
            if (!/^[0-9]*$/.test(value)) { 
                this.setCustomValidity('La matrícula solo puede contener números');
            } else {
                this.setCustomValidity('');
            }
        });
    }
}

function closeEditModal() {
    const modal = document.getElementById('edit-modal');
    if (modal) {
        modal.remove();
    }
}

async function handleEditFormSubmit(event) {
    event.preventDefault();
    
    const matricula = document.getElementById('edit-matricula').value;
    const tipoModificacion = document.getElementById('edit-tipo-modificacion').value;
    const motivoModificacion = document.getElementById('edit-motivo-modificacion').value;
    const detalleMotivo = document.getElementById('edit-detalle-motivo').value;
    
    // CORRECCIÓN: Validar matrícula (Solo números)
    if (!/^[0-9]+$/.test(matricula)) {
        alert('❌ La matrícula solo debe contener números');
        return;
    }
    
    if (!matricula) {
        alert('Por favor ingresa tu matrícula para registrar el cambio');
        return;
    }
    
    const formData = {
        id_cita: document.getElementById('edit-cita-id').value,
        // Información de auditoría
        matricula_editor: matricula,
        tipo_modificacion: tipoModificacion,
        motivo_modificacion: motivoModificacion,
        detalle_motivo: detalleMotivo,
        fecha_modificacion: new Date().toISOString()
    };
    
    // Agregar campos según tipo de modificación
    if (tipoModificacion === 'reagendar') {
        formData.fecha = document.getElementById('edit-fecha').value;
        formData.hora = document.getElementById('edit-hora').value;
        
        if (!formData.fecha || !formData.hora) {
            alert('Por favor completa la fecha y hora para reagendar');
            return;
        }
    }
    
    if (tipoModificacion === 'cambio_estado' || tipoModificacion === 'cancelar') {
        formData.estado = document.getElementById('edit-estado').value;
    }
    
    try {
        console.log('📤 Enviando datos de modificación:', formData);
        
        const response = await fetch(`${API_BASE_URL}/api/citas/${formData.id_cita}/editar`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            const result = await response.json();
            
            // Mostrar confirmación detallada
            let mensaje = `✅ Modificación realizada exitosamente\n`;
            mensaje += `📝 Registrado por: ${matricula}\n`;
            mensaje += `🎯 Tipo: ${tipoModificacion}\n`;
            mensaje += `📋 Motivo: ${motivoModificacion}`;
            
            alert(mensaje);
            closeEditModal();
            
            // Recargar datos
            await loadCitas();
            updateScheduleForDate(selectedCalendarDate || new Date());
            updatePatientCardsForDate(selectedCalendarDate || new Date());
            updateStats();
            
        } else {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al actualizar cita');
        }
        
    } catch (error) {
        console.error('❌ Error actualizando cita:', error);
        alert('❌ Error al modificar la cita: ' + error.message);
    }
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
        // Se usa la función de edición completa con auditoría
        updateAppointmentStatus(citaId, 'Cancelada'); 
    }
}

// ==================== ESTADÍSTICAS CON DATOS REALES ====================

function updateStats() {
    const totalCitas = allCitas.length;
    const completadas = allCitas.filter(c => c.estado && c.estado.toLowerCase() === 'completada').length;
    const programadas = allCitas.filter(c => c.estado && c.estado.toLowerCase() === 'programada').length;
    const canceladas = allCitas.filter(c => c.estado && c.estado.toLowerCase() === 'cancelada').length;
    const noAsistio = allCitas.filter(c => c.estado && c.estado.toLowerCase() === 'no asistió').length;
    
    console.log('📊 Actualizando estadísticas:', { totalCitas, completadas, programadas, canceladas, noAsistio });
    
    // Actualizar estadísticas generales
    const statNumbers = document.querySelectorAll('.stats-grid .stat-number');
    if (statNumbers.length >= 4) {
        statNumbers[0].textContent = totalCitas;
        statNumbers[1].textContent = completadas;
        statNumbers[2].textContent = programadas;
        statNumbers[3].textContent = canceladas + noAsistio; // Canceladas + No Asistió
    }
    
    // Actualizar estadísticas del día
    const today = new Date().toISOString().split('T')[0];
    const citasHoy = allCitas.filter(c => c.fecha === today);
    
    const atendidasHoy = citasHoy.filter(c => c.estado && c.estado.toLowerCase() === 'completada').length;
    const pendientesHoy = citasHoy.filter(c => c.estado && c.estado.toLowerCase() === 'programada').length;
    const noAtendidasHoy = citasHoy.filter(c => c.estado && (c.estado.toLowerCase() === 'cancelada' || c.estado.toLowerCase() === 'no asistió')).length;
    
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
        case 'no asistió': return 'cancelled'; // Se usa el mismo estilo para 'No asistió'
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
            hora: '12:30:00',
            paciente: { nombre: 'María', apellido: 'García López', edad: 25, telefono: '555-0101' },
            motivo: 'Lentes graduados de armazón',
            gabinete: 'Gabinete 1',
            estado: 'Programada'
        },
        {
            id_cita: 2,
            fecha: today,
            hora: '13:30:00',
            paciente: { nombre: 'Juan Carlos', apellido: 'Martínez Rodríguez', edad: 30, telefono: '555-0102' },
            motivo: 'Lentes de contacto',
            gabinete: 'Gabinete 2',
            estado: 'Programada'
        },
         {
            id_cita: 3,
            fecha: today,
            hora: '12:30:00',
            paciente: { nombre: 'Laura', apellido: 'Perez Diaz', edad: 40, telefono: '555-0103' },
            motivo: 'Lentes de contacto',
            gabinete: 'Gabinete 3',
            estado: 'Completada'
        },
    ];
}