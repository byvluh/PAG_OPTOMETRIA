# app.py

#Este archivo contiene los modelos de la base de datos
#la configiuración de la autenticación y todas las rutas (endpoints)
#de la API


from flask import Flask, request, jsonify, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from config import Config
import json
from flask_cors import CORS  # <-- AGREGA ESTA LÍNEA


# Inicialización de la aplicación
app = Flask(__name__)
app.config.from_object(Config)
CORS(app)  # <-- AGREGA ESTA LÍNEA




# Inicialización de extensiones
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login' # La vista a la que redirigir si no está logueado

# ----------------------------------------------------
# 📌 Modelos de la Base de Datos
# ----------------------------------------------------

# Tablas Auxiliares para Relaciones N:M
rol_permiso = db.Table('rol_permiso',
    db.Column('id_rol', db.Integer, db.ForeignKey('rol.id_rol'), primary_key=True),
    db.Column('id_permiso', db.Integer, db.ForeignKey('permiso.id_permiso'), primary_key=True)
)

usuario_permiso = db.Table('usuario_permiso',
    db.Column('id_usuario', db.Integer, db.ForeignKey('usuario.id_usuario'), primary_key=True),
    db.Column('id_permiso', db.Integer, db.ForeignKey('permiso.id_permiso'), primary_key=True)
)

# Modelo Paciente
class Paciente(db.Model):
    id_paciente = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), nullable=False)
    apellido = db.Column(db.String(50), nullable=False)
    edad = db.Column(db.Integer, nullable=False)
    telefono = db.Column(db.String(15), unique=True, nullable=False)
    # Relación con Citas
    citas = db.relationship('Cita', backref='paciente', lazy='dynamic')

    def to_dict(self):
        return {
            'id_paciente': self.id_paciente,
            'nombre': self.nombre,
            'apellido': self.apellido,
            'edad': self.edad,
            'telefono': self.telefono
        }

# Modelo MotivoCita
class MotivoCita(db.Model):
    id_motivo = db.Column(db.Integer, primary_key=True)
    descripcion = db.Column(db.String(50), nullable=False)
    citas = db.relationship('Cita', backref='motivo', lazy='dynamic')

# Modelo Gabinete
class Gabinete(db.Model):
    id_gabinete = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(20), nullable=False)
    citas = db.relationship('Cita', backref='gabinete', lazy='dynamic')

# Modelo Usuario (Incluye UserMixin para Flask-Login)
class Usuario(UserMixin, db.Model):
    id_usuario = db.Column(db.Integer, primary_key=True)
    nombre_usuario = db.Column(db.String(50), unique=True, nullable=False)
    contrasena = db.Column(db.String(255), nullable=False)
    id_rol = db.Column(db.Integer, db.ForeignKey('rol.id_rol'), nullable=False)
    # Relaciones
    rol = db.relationship('Rol', backref='usuarios')
    citas = db.relationship('Cita', backref='estudiante', lazy='dynamic')
    permisos_especificos = db.relationship('Permiso', secondary=usuario_permiso, lazy='dynamic', backref=db.backref('usuarios', lazy='dynamic'))
    
    def get_id(self):
        return str(self.id_usuario)

# Modelo Rol
class Rol(db.Model):
    id_rol = db.Column(db.Integer, primary_key=True)
    nombre_rol = db.Column(db.String(30), unique=True, nullable=False)
    permisos = db.relationship('Permiso', secondary=rol_permiso, lazy='dynamic', backref=db.backref('roles', lazy='dynamic'))

# Modelo Permiso
class Permiso(db.Model):
    id_permiso = db.Column(db.Integer, primary_key=True)
    nombre_permiso = db.Column(db.String(20), unique=True, nullable=False)

# Modelo Cita
class Cita(db.Model):
    id_cita = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.Date, nullable=False)
    hora = db.Column(db.Time, nullable=False)
    id_paciente = db.Column(db.Integer, db.ForeignKey('paciente.id_paciente'), nullable=False)
    id_motivo = db.Column(db.Integer, db.ForeignKey('motivo_cita.id_motivo'), nullable=False)
    id_gabinete = db.Column(db.Integer, db.ForeignKey('gabinete.id_gabinete'), nullable=False)
    id_usuario = db.Column(db.Integer, db.ForeignKey('usuario.id_usuario'), nullable=True) # Estudiante asignado
    estado = db.Column(db.String(20), default='Programada')

    def to_dict(self):
        return {
            'id_cita': self.id_cita,
            'fecha': self.fecha.strftime('%Y-%m-%d'),
            'hora': str(self.hora),
            'paciente': self.paciente.to_dict(),
            'motivo': self.motivo.descripcion,
            'gabinete': self.gabinete.nombre,
            'estado': self.estado
        }

# ----------------------------------------------------
# 🔑 Flask-Login Configuration
# ----------------------------------------------------

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(Usuario, int(user_id))

# ----------------------------------------------------
# ⚙️ Funciones de Inicialización
# ----------------------------------------------------

def inicializar_db():
    """Crea las tablas e inserta datos iniciales."""
    with app.app_context():
        db.create_all()
        
        # 1. Permisos
        permisos_data = ['lectura', 'edicion']
        for p_nombre in permisos_data:
            if not Permiso.query.filter_by(nombre_permiso=p_nombre).first():
                db.session.add(Permiso(nombre_permiso=p_nombre))
        db.session.commit()
        
        permiso_lectura = Permiso.query.filter_by(nombre_permiso='lectura').first()
        permiso_edicion = Permiso.query.filter_by(nombre_permiso='edicion').first()

        # 2. Roles
        if not Rol.query.filter_by(nombre_rol='Administrador').first():
            admin_rol = Rol(nombre_rol='Administrador')
            admin_rol.permisos.extend([permiso_lectura, permiso_edicion])
            db.session.add(admin_rol)

        if not Rol.query.filter_by(nombre_rol='Coordinador').first():
            coord_rol = Rol(nombre_rol='Coordinador')
            coord_rol.permisos.extend([permiso_lectura, permiso_edicion])
            db.session.add(coord_rol)
            
        if not Rol.query.filter_by(nombre_rol='Estudiante').first():
            est_rol = Rol(nombre_rol='Estudiante')
            est_rol.permisos.append(permiso_lectura)
            db.session.add(est_rol)
            
        db.session.commit()
        admin_rol = Rol.query.filter_by(nombre_rol='Administrador').first()
        est_rol = Rol.query.filter_by(nombre_rol='Estudiante').first()

        # 3. Usuarios Iniciales
        # Crear un usuario Administrador por defecto
        if not Usuario.query.filter_by(nombre_usuario='admin').first():
            admin_user = Usuario(
                nombre_usuario='admin',
                contrasena=generate_password_hash('adminpass'),
                id_rol=admin_rol.id_rol
            )
            db.session.add(admin_user)

        # Usuario compartido para Estudiantes
        if not Usuario.query.filter_by(nombre_usuario='estudiante_optometria').first():
            est_user = Usuario(
                nombre_usuario='estudiante_optometria',
                contrasena=generate_password_hash('estudiantepass'),
                id_rol=est_rol.id_rol
            )
            db.session.add(est_user)

        # 4. Gabinetes
        for g_data in Config.GABINETES:
            if not Gabinete.query.filter_by(id_gabinete=g_data['id']).first():
                db.session.add(Gabinete(id_gabinete=g_data['id'], nombre=g_data['nombre']))

        # 5. Motivos de Cita
        for m_data in Config.MOTIVOS_CITA:
            if not MotivoCita.query.filter_by(id_motivo=m_data['id']).first():
                db.session.add(MotivoCita(id_motivo=m_data['id'], descripcion=m_data['descripcion']))

        db.session.commit()
        print("Base de datos inicializada con datos por defecto.")

# ----------------------------------------------------
# 🚪 Rutas de Autenticación
# ----------------------------------------------------

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = Usuario.query.filter_by(nombre_usuario=username).first()

    if user and check_password_hash(user.contrasena, password):
        login_user(user)
        return jsonify({'message': 'Login exitoso', 'user': user.nombre_usuario, 'rol': user.rol.nombre_rol}), 200
    
    return jsonify({'message': 'Credenciales inválidas'}), 401

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logout exitoso'}), 200

# ----------------------------------------------------
# 📅 Rutas de Agenda y Pacientes
# ----------------------------------------------------

@app.route('/api/paciente/buscar', methods=['POST'])
def buscar_paciente():
    """Busca un paciente por número de teléfono."""
    data = request.get_json()
    telefono = data.get('telefono')

    if not telefono:
        return jsonify({'message': 'Teléfono requerido'}), 400

    paciente = Paciente.query.filter_by(telefono=telefono).first()

    if paciente:
        return jsonify({'message': 'Paciente encontrado', 'paciente': paciente.to_dict(), 'es_nuevo': False}), 200
    else:
        return jsonify({'message': 'Paciente no encontrado', 'es_nuevo': True}), 200


@app.route('/api/citas/disponibilidad', methods=['POST'])
def disponibilidad_citas():
    """
    Retorna los horarios disponibles para una fecha específica.
    Esto simula la lógica del frontend `principal.js` para la disponibilidad.
    """
    data = request.get_json()
    fecha_str = data.get('fecha')

    if not fecha_str:
        return jsonify({'message': 'Fecha requerida'}), 400

    try:
        fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Formato de fecha inválido. Use YYYY-MM-DD'}), 400

    # Días de la semana para atención: Lunes (0) a Viernes (4)
    if fecha.weekday() >= 5: # Sábado (5) o Domingo (6)
        return jsonify({'message': 'No hay atención los fines de semana', 'disponibles': []}), 200

    disponibilidad = {}
    total_gabinetes = len(Config.GABINETES)

    for hora_str in Config.HORARIOS_ATENCION:
        # Contar citas ya programadas para esa fecha y hora
        citas_existentes = Cita.query.filter_by(fecha=fecha, hora=hora_str).count()
        
        # Si el número de citas es menor al total de gabinetes, hay disponibilidad
        if citas_existentes < total_gabinetes:
            disponibilidad[hora_str] = 'Disponible'
        else:
            disponibilidad[hora_str] = 'Ocupado'

    return jsonify({'disponibilidad': disponibilidad}), 200


def asignar_gabinete(fecha, hora_str):
    """
    Asigna el gabinete en orden secuencial (1-6, 1-6, ...).
    Retorna el id_gabinete disponible.
    """
    
    # 1. Encontrar gabinetes ya ocupados en esa hora
    citas_ocupadas = Cita.query.filter_by(fecha=fecha, hora=hora_str).all()
    gabinetes_ocupados_ids = {cita.id_gabinete for cita in citas_ocupadas}
    
    # 2. Encontrar el primer gabinete disponible (el que no esté en la lista de ocupados)
    for gabinete_data in Config.GABINETES:
        gabinete_id = gabinete_data['id']
        if gabinete_id not in gabinetes_ocupados_ids:
            return gabinete_id # Gabinete encontrado

    return None # No debería pasar si se valida la disponibilidad antes


@app.route('/api/citas/agendar', methods=['POST'])
def agendar_cita():
    """Registra una nueva cita y/o un nuevo paciente."""
    data = request.get_json()
    
    # Datos del paciente
    es_nuevo = data.get('es_nuevo', True)
    nombre = data.get('nombre')
    apellido = data.get('apellido')
    edad = data.get('edad')
    telefono = data.get('telefono')
    
    # Datos de la cita
    fecha_str = data.get('fecha')
    hora_str = data.get('hora')
    id_motivo = data.get('id_motivo')

    # Validación básica de datos
    if not all([telefono, fecha_str, hora_str, id_motivo]):
        return jsonify({'message': 'Faltan datos requeridos (teléfono, fecha, hora, motivo)'}), 400
    
    if es_nuevo and not all([nombre, apellido, edad]):
         return jsonify({'message': 'Faltan datos de paciente nuevo (nombre, apellido, edad)'}), 400
    
    try:
        fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        hora = datetime.strptime(hora_str, '%H:%M:%S').time()
        edad = int(edad) if es_nuevo else None
        id_motivo = int(id_motivo)
    except ValueError:
        return jsonify({'message': 'Formato de fecha, hora o edad inválido'}), 400

    # 1. Crear o recuperar paciente
    paciente = Paciente.query.filter_by(telefono=telefono).first()
    
    if es_nuevo:
        if paciente:
             return jsonify({'message': 'Error: Ya existe un paciente con este teléfono'}), 400
        
        paciente = Paciente(
            nombre=nombre, 
            apellido=apellido, 
            edad=edad, 
            telefono=telefono
        )
        db.session.add(paciente)
        db.session.flush() # Para obtener id_paciente antes del commit
    else:
        if not paciente:
             return jsonify({'message': 'Error: Paciente habitual no encontrado'}), 404
    
    # 2. Asignar Gabinete y verificar disponibilidad final
    id_gabinete = asignar_gabinete(fecha, hora_str)
    
    if id_gabinete is None:
        return jsonify({'message': f'No hay gabinetes disponibles para {fecha_str} a las {hora_str}'}), 409 # Conflict

    # 3. Asignar estudiante compartido
    estudiante = Usuario.query.filter_by(nombre_usuario='estudiante_optometria').first()
    if not estudiante:
        return jsonify({'message': 'Error interno: Usuario estudiante no encontrado'}), 500

    # 4. Crear la Cita
    nueva_cita = Cita(
        fecha=fecha,
        hora=hora,
        id_paciente=paciente.id_paciente,
        id_motivo=id_motivo,
        id_gabinete=id_gabinete,
        id_usuario=estudiante.id_usuario,
        estado='Programada'
    )
    db.session.add(nueva_cita)
    db.session.commit()
    
    # **PENDIENTE: Integración con Twilio para WhatsApp aquí**
    
    return jsonify({'message': 'Cita agendada con éxito', 'cita': nueva_cita.to_dict()}), 201


@app.route('/api/citas/admin', methods=['GET'])
@login_required
def get_citas_admin():
    """Obtiene todas las citas, con filtros (solo para Coordinador/Admin)."""
    
    # Opcional: Implementar permisos detallados aquí
    if current_user.rol.nombre_rol not in ['Administrador', 'Coordinador']:
        return jsonify({'message': 'Acceso denegado'}), 403
        
    fecha_filtro = request.args.get('fecha')

    query = Cita.query
    if fecha_filtro:
        try:
            fecha = datetime.strptime(fecha_filtro, '%Y-%m-%d').date()
            query = query.filter(Cita.fecha == fecha)
        except ValueError:
            return jsonify({'message': 'Formato de fecha de filtro inválido'}), 400
            
    citas = query.order_by(Cita.fecha, Cita.hora).all()
    
    return jsonify([cita.to_dict() for cita in citas]), 200

# Agrega esta ruta a tu app.py - después de las rutas existentes

@app.route('/api/citas/<int:cita_id>', methods=['PUT'])
@login_required
def actualizar_cita(cita_id):
    """Actualiza el estado de una cita."""
    if current_user.rol.nombre_rol not in ['Administrador', 'Coordinador']:
        return jsonify({'message': 'Acceso denegado'}), 403
    
    data = request.get_json()
    nuevo_estado = data.get('estado')
    
    if not nuevo_estado:
        return jsonify({'message': 'Estado requerido'}), 400
    
    cita = Cita.query.get_or_404(cita_id)
    cita.estado = nuevo_estado
    
    try:
        db.session.commit()
        return jsonify({'message': 'Cita actualizada correctamente', 'cita': cita.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error al actualizar cita'}), 500
    

    # Agrega esta ruta TEMPORAL para testing - puedes quitarla después
@app.route('/api/citas/debug', methods=['GET'])
def debug_citas():
    """Ruta temporal para debug de citas"""
    try:
        citas = Cita.query.all()
        result = []
        for cita in citas:
            cita_data = {
                'id_cita': cita.id_cita,
                'fecha': cita.fecha.strftime('%Y-%m-%d'),
                'hora': str(cita.hora),
                'paciente': {
                    'nombre': cita.paciente.nombre,
                    'apellido': cita.paciente.apellido,
                    'edad': cita.paciente.edad,
                    'telefono': cita.paciente.telefono
                },
                'motivo': cita.motivo.descripcion,
                'gabinete': cita.gabinete.nombre,
                'estado': cita.estado
            }
            result.append(cita_data)
        
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
# ----------------------------------------------------
# 🚀 Ejecución de la Aplicación
# ----------------------------------------------------

if __name__ == '__main__':
    # Inicializa la base de datos y crea el Administrador/Estudiante por defecto
    inicializar_db() 
    app.run(debug=True)