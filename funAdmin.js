// Modal functionality
const modal = document.getElementById('appointment-modal');
const closeBtn = document.querySelector('.close');

// Close modal when clicking the X
closeBtn.addEventListener('click', function() {
    modal.style.display = 'none';
});

// Close modal when clicking outside the modal content
window.addEventListener('click', function(event) {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Function to open modal with appointment details
function openAppointmentModal(patientName, age, phone, gabinete, time, status) {
    document.getElementById('modal-patient-name').textContent = patientName;
    document.getElementById('modal-patient-age').textContent = age;
    document.getElementById('modal-patient-phone').textContent = phone;
    document.getElementById('modal-gabinete').textContent = `Gabinete ${gabinete}`;
    document.getElementById('modal-time').textContent = `${time} hrs`;
    
    const statusElement = document.getElementById('modal-status');
    statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    statusElement.className = `status ${status}`;
    
    modal.style.display = 'block';
}

// Add click event to appointments in schedule
const appointments = document.querySelectorAll('.appointment');
appointments.forEach(appointment => {
    appointment.addEventListener('click', function() {
        const patientName = this.getAttribute('data-patient');
        const age = this.getAttribute('data-age');
        const phone = this.getAttribute('data-phone');
        const gabinete = this.getAttribute('data-gabinete');
        const time = this.getAttribute('data-time');
        const status = this.getAttribute('data-status');
        
        openAppointmentModal(patientName, age, phone, gabinete, time, status);
    });
});

// Add click event to patient cards
const patientCards = document.querySelectorAll('.patient-card');
patientCards.forEach(card => {
    card.addEventListener('click', function() {
        const patientName = this.getAttribute('data-patient');
        const age = this.getAttribute('data-age');
        const phone = this.getAttribute('data-phone');
        const gabinete = this.getAttribute('data-gabinete');
        const status = this.getAttribute('data-status');
        
        // For patient cards, we don't have a specific time, so we use a placeholder
        openAppointmentModal(patientName, age, phone, gabinete, 'Por asignar', status);
    });
});

// Calendar functionality
document.getElementById('prev-month').addEventListener('click', function() {
    alert('Navegando al mes anterior');
    // En una aplicación real, aquí se cargarían los datos del mes anterior
});

document.getElementById('next-month').addEventListener('click', function() {
    alert('Navegando al mes siguiente');
    // En una aplicación real, aquí se cargarían los datos del mes siguiente
});

// Add click event to calendar dates
const calendarDates = document.querySelectorAll('.calendar-date:not(.other-month)');
calendarDates.forEach(date => {
    date.addEventListener('click', function() {
        // Remove selected class from all dates
        calendarDates.forEach(d => d.classList.remove('selected'));
        // Add selected class to clicked date
        this.classList.add('selected');
        
        // Update selected date display
        const dateText = this.textContent;
        const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        
        // Simple date calculation for demo purposes
        const dayIndex = parseInt(dateText) % 7;
        const monthIndex = parseInt(dateText) > 20 ? 11 : 10; // noviembre o diciembre
        
        const selectedDateDisplay = document.querySelector('.selected-date');
        selectedDateDisplay.innerHTML = `
            <strong>Fecha seleccionada:</strong><br>
            ${days[dayIndex]}, ${dateText} de ${months[monthIndex]} de 2024
        `;
        
        // In a real app, this would update the schedule and patient details
        // with data for the selected date
        console.log('Fecha seleccionada: ' + dateText);
    });
});

// Add hover effect to stat cards
const statCards = document.querySelectorAll('.stat-card');
statCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
        this.style.transform = 'translateY(-5px)';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = 'translateY(0)';
    });
});