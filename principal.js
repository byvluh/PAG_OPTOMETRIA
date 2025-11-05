let currentStep = 1;
const totalSteps = 5;

function showStep(step) {
  const views = document.querySelectorAll('.step-view');
  const dots = document.querySelectorAll('.step');
  const progress = document.querySelector('.progress');

  views.forEach((v, i) => v.classList.toggle('active', i === step - 1));
  dots.forEach((d, i) => d.classList.toggle('active', i === step - 1));

  const percent = ((step - 1) / (totalSteps - 1)) * 100;
  progress.style.width = `${percent}%`;
}

document.querySelectorAll('.back').forEach(btn => {
  btn.addEventListener('click', () => {
    if (currentStep > 1) showStep(--currentStep);
  });
});
document.querySelector('#next1').onclick = () => showStep(++currentStep);
document.querySelector('#next2').onclick = () => showStep(++currentStep);
document.querySelector('#next3').onclick = () => showStep(++currentStep);
document.querySelector('#next4').onclick = () => showStep(++currentStep);

// ---------------------------
// Calendario dinámico
// ---------------------------
const calendarEl = document.getElementById('calendar');
const monthYearEl = document.getElementById('monthYear');
const prevBtn = document.getElementById('prevMonth');
const nextBtn = document.getElementById('nextMonth');
const timeSlotsEl = document.getElementById('timeSlots');
const selectedText = document.getElementById('selectedText');

let currentDate = new Date();
let selectedDate = null;
let selectedTime = null;

const bookedDates = {
  '2025-11-10': ['10:30', '13:30'],
  '2025-11-11': ['9:30', '12:30', '15:30'],
  '2025-11-15': ['9:30', '10:30', '11:30', '12:30']
};

function generateCalendar(date) {
  calendarEl.innerHTML = '';
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const monthName = date.toLocaleString('es-ES', { month: 'long' });
  monthYearEl.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

  const headers = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  headers.forEach(h => {
    const div = document.createElement('div');
    div.textContent = h;
    div.classList.add('header');
    calendarEl.appendChild(div);
  });

  for (let i = 0; i < firstDay.getDay(); i++) {
    calendarEl.appendChild(document.createElement('div'));
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dayDiv = document.createElement('div');
    dayDiv.textContent = d;
    dayDiv.classList.add('day');

    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    dayDiv.addEventListener('click', () => selectDate(dateKey, dayDiv));
    if (selectedDate === dateKey) dayDiv.classList.add('selected');

    calendarEl.appendChild(dayDiv);
  }
}

function selectDate(dateKey, dayDiv) {
  selectedDate = dateKey;
  selectedTime = null;
  document.querySelectorAll('.day').forEach(d => d.classList.remove('selected'));
  dayDiv.classList.add('selected');
  generateTimeSlots();
  updateSummary();
}

function generateTimeSlots() {
  timeSlotsEl.innerHTML = '';
  const hours = ['9:30', '10:30', '11:30', '12:30', '13:30', '14:30', '15:30'];
  const booked = bookedDates[selectedDate] || [];

  hours.forEach(time => {
    const slot = document.createElement('div');
    slot.textContent = `${time} hrs`;
    slot.classList.add('time-slot');

    if (booked.includes(time)) {
      slot.classList.add('disabled');
    } else {
      slot.addEventListener('click', () => selectTime(slot, time));
    }

    timeSlotsEl.appendChild(slot);
  });
}

function selectTime(slot, time) {
  selectedTime = time;
  document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
  slot.classList.add('selected');
  updateSummary();
}

function updateSummary() {
  if (!selectedDate) {
    selectedText.textContent = 'Ninguna';
    return;
  }

  const dateObj = new Date(selectedDate);
  const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
  const formattedDate = dateObj.toLocaleDateString('es-ES', options);
  selectedText.textContent = selectedTime
    ? `${formattedDate} — ${selectedTime} hrs`
    : `${formattedDate} (sin hora seleccionada)`;
}

prevBtn.onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  generateCalendar(currentDate);
};
nextBtn.onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  generateCalendar(currentDate);
};

generateCalendar(currentDate);


/// Paso 5: llenar los datos de confirmación
document.getElementById('confirm').addEventListener('click', () => {
  const tipoAtencion = document.querySelector('.step-view:nth-child(3) .option.selected')?.textContent || 'Presencial';
  const tipoServicio = document.querySelector('.step-view:nth-child(4) .option.selected')?.textContent || 'Seguimiento';
  const fecha = document.getElementById('selectedText').textContent || 'No seleccionada';
  const nombre = document.querySelector('input[type="text"]').value || '---';

  document.getElementById('confirmTipoAtencion').textContent = tipoAtencion;
  document.getElementById('confirmTipoServicio').textContent = tipoServicio;
  document.getElementById('confirmFecha').textContent = fecha.split('—')[0] || fecha;
  document.getElementById('confirmHora').textContent = fecha.split('—')[1] ? fecha.split('—')[1].trim() : '---';
  document.getElementById('confirmNombre').textContent = nombre;

  showStep(++currentStep);
});

// Botón "Agendar otra cita"
document.getElementById('newAppointment').addEventListener('click', () => {
  // Reiniciar datos y volver al paso 1
  currentStep = 1;
  selectedDate = null;
  selectedTime = null;
  document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
  document.getElementById('selectedText').textContent = 'Ninguna';
  document.querySelectorAll('input').forEach(i => i.value = '');

  showStep(currentStep);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

