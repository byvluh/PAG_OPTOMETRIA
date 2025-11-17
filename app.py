# app.py - VERSIÓN CORREGIDA FINAL

from flask import Flask, request, jsonify, session, make_response
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
from config import Config
import json
from flask_cors import CORS
import os
from flask import send_from_directory, send_file 
from dateutil.relativedelta import relativedelta  # ← NUEVO import

# Inicialización de la aplicación
app = Flask(__name__)
app.config.from_object(Config)

# CONFIGURACIÓN CRÍTICA DE COOKIES Y SESIÓN
app.config.update(
    SECRET_KEY='clave_super_secreta_para_desarrollo_2025_optometria_ual',
    # Configuración de cookies
    SESSION_COOKIE_NAME='optometria_session',
    SESSION_COOKIE_SECURE=False,            # False para desarrollo (HTTP)
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',          # ¡IMPORTANTE! Para desarrollo
    SESSION_COOKIE_DOMAIN=None,             # None para localhost
    # Configuración de sesión
    PERMANENT_SESSION_LIFETIME=timedelta(hours=1),
    SESSION_REFRESH_EACH_REQUEST=True,
    # Configuración de remember cookie
    REMEMBER_COOKIE_NAME='optometria_remember',
    REMEMBER_COOKIE_DURATION=timedelta(hours=1),
    REMEMBER_COOKIE_SECURE=False,
    REMEMBER_COOKIE_HTTPONLY=True,
    REMEMBER_COOKIE_SAMESITE='Lax'
)

# Configuración CORS explícita
CORS(app, 
     origins=["http://localhost:5000", "http://127.0.0.1:5000"],
     supports_credentials=True,
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization", "X-Requested-With"])

# Headers CORS para todas las respuestas
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin')
    allowed_origins = ["http://localhost:5000", "http://127.0.0.1:5000"]
    
    if origin in allowed_origins:
        response.headers.add('Access-Control-Allow-Origin', origin)
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    
    # Headers para control de caché de sesión
    response.headers.add('Cache-Control', 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0')
    response.headers.add('Pragma', 'no-cache')
    response.headers.add('Expires', '0')
    
    return response

# Manejar preflight OPTIONS requests
@app.route('/login', methods=['OPTIONS'])
@app.route('/api/<path:path>', methods=['OPTIONS'])
def options_handler(path=None):
    response = make_response()
    origin = request.headers.get('Origin')
    if origin in ["http://localhost:5000", "http://127.0.0.1:5000"]:
        response.headers.add('Access-Control-Allow-Origin', origin)
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Inicialización de extensiones
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
login_manager.session_protection = "basic"

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

# Modelo Usuario
class Usuario(UserMixin, db.Model):
    id_usuario = db.Column(db.Integer, primary_key=True)
    nombre_usuario = db.Column(db.String(50), unique=True, nullable=False)
    contrasena = db.Column(db.String(255), nullable=False)
    id_rol = db.Column(db.Integer, db.ForeignKey('rol.id_rol'), nullable=False)
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
    id_usuario = db.Column(db.Integer, db.ForeignKey('usuario.id_usuario'), nullable=True)
    estado = db.Column(db.String(20), default='Programada')

# cita recurrente new model

class CitaRecurrente(db.Model):
    __tablename__ = 'cita_recurrente'
    id_serie = db.Column(db.Integer, primary_key=True)
    id_cita_original = db.Column(db.Integer, db.ForeignKey('cita.id_cita'))
    fecha_inicio = db.Column(db.Date)
    fecha_fin = db.Column(db.Date)
    dia_semana = db.Column(db.Integer)
    hora = db.Column(db.Time)
    creado_por = db.Column(db.Integer, db.ForeignKey('usuario.id_usuario'))
    estado_serie = db.Column(db.String(20))

    # Relación correcta (solo una dirección)
    citas_generadas = db.relationship('Cita', backref='serie_recurrente', lazy=True)

class CitaRecurrenteDetalle(db.Model):
    id_detalle = db.Column(db.Integer, primary_key=True)
    id_serie = db.Column(db.Integer, db.ForeignKey('cita_recurrente.id_serie'), nullable=False)
    id_cita = db.Column(db.Integer, db.ForeignKey('cita.id_cita'), nullable=False)
    fecha_programada = db.Column(db.Date, nullable=False)
    estado_individual = db.Column(db.String(20), default='Programada')  # Programada, Modificada, Cancelada

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
# 📌 Modelos de la Base de Datos
# ----------------------------------------------------

# ... todos tus modelos existentes (Paciente, Cita, Usuario, etc.) ...

# ----------------------------------------------------
# ⚙️ Funciones Auxiliares
# ----------------------------------------------------

def calcular_fecha_fin(fecha_inicio, meses=3):
    """Calcula la fecha fin sumando meses a la fecha inicio"""
    from dateutil.relativedelta import relativedelta
    return fecha_inicio + relativedelta(months=meses)

def verificar_disponibilidad_fecha(fecha, hora):
    """Verifica si una fecha y hora están disponibles"""
    cita_existente = Cita.query.filter_by(fecha=fecha, hora=hora).first()
    return cita_existente is None

def encontrar_proximo_dia(fecha, dia_semana):
    """Encuentra la próxima fecha que coincida con el día de la semana"""
    dias_restantes = (dia_semana - fecha.weekday()) % 7
    if dias_restantes == 0:
        dias_restantes = 7  # Ir a la siguiente semana
    return fecha + timedelta(days=dias_restantes)

def generar_citas_recurrentes(id_serie, id_paciente, fecha_inicio, fecha_fin, dia_semana, hora, id_usuario):
    """Genera todas las citas recurrentes para la serie (INCLUYENDO la fecha original)"""
    citas_generadas = []
    
    # Empezar desde la fecha original (no desde la semana siguiente)
    fecha_actual = fecha_inicio
    
    semana_numero = 0  # Empezar desde 0 para incluir la semana original
    while fecha_actual <= fecha_fin and semana_numero <= 12:  # Máximo 12 semanas (3 meses)
        
        # Asegurar que sea el mismo día de la semana
        while fecha_actual.weekday() != dia_semana and fecha_actual <= fecha_fin:
            fecha_actual += timedelta(days=1)
        
        if fecha_actual > fecha_fin:
            break
            
        # Verificar disponibilidad antes de crear la cita (excepto para la fecha original que ya fue verificada)
        if fecha_actual == fecha_inicio or verificar_disponibilidad_fecha(fecha_actual, hora):
            id_gabinete = get_next_available_gabinete(fecha_actual)
            
            # Para la fecha original, ya existe la cita, solo la registramos en la serie
            if fecha_actual == fecha_inicio:
                print(f"  📅 Semana {semana_numero}: {fecha_actual} - Cita original")
            else:
                # Crear nueva cita para fechas futuras
                cita = Cita(
                    fecha=fecha_actual,
                    hora=hora,
                    id_paciente=id_paciente,
                    id_motivo=3,  # Terapia visual
                    id_gabinete=id_gabinete,
                    estado='Programada',
                    id_usuario=id_usuario
                )
                db.session.add(cita)
                db.session.flush()
                
                # Registrar en el detalle de la serie recurrente
                detalle = CitaRecurrenteDetalle(
                    id_serie=id_serie,
                    id_cita=cita.id_cita,
                    fecha_programada=fecha_actual,
                    estado_individual='Programada'
                )
                db.session.add(detalle)
                
                citas_generadas.append(cita)
                print(f"  📅 Semana {semana_numero}: {fecha_actual} - Gabinete {id_gabinete}")
        
        # Avanzar a la siguiente semana (7 días exactos)
        fecha_actual += timedelta(days=7)
        semana_numero += 1
    
    print(f"📊 Total de citas recurrentes generadas: {len(citas_generadas)}")
    return citas_generadas

def obtener_serie_de_cita(cita_id):
    """Obtiene la serie recurrente a la que pertenece una cita"""
    detalle = CitaRecurrenteDetalle.query.filter_by(id_cita=cita_id).first()
    if detalle:
        return CitaRecurrente.query.get(detalle.id_serie)
    return None

def es_cita_recurrente(cita_id):
    """Verifica si una cita pertenece a una serie recurrente"""
    return CitaRecurrenteDetalle.query.filter_by(id_cita=cita_id).first() is not None


def get_next_available_gabinete(fecha):
    """Calcula el siguiente gabinete a asignar para una fecha dada."""
    try:
        citas_del_dia = Cita.query.filter_by(fecha=fecha).count()
        # Los gabinetes van del 1 al 6. El índice de gabinete_id es (citas_del_dia % 6) + 1
        id_gabinete = (citas_del_dia % 6) + 1
        print(f"🔢 Asignando gabinete: citas_del_dia={citas_del_dia}, id_gabinete={id_gabinete}")
        return id_gabinete
    except Exception as e:
        print(f"❌ Error en get_next_available_gabinete: {e}")
        return 1  # Fallback al gabinete 1
    

# ----------------------------------------------------
# 🔑 Flask-Login Configuration
# ----------------------------------------------------

@login_manager.user_loader
def load_user(user_id):
    try:
        return db.session.get(Usuario, int(user_id))
    except:
        return None

@login_manager.unauthorized_handler
def unauthorized():
    print("🔐 UNAUTHORIZED: No hay usuario autenticado")
    print(f"    🍪 Session keys: {list(session.keys())}")
    print(f"    🆔 User ID in session: {session.get('_user_id')}")
    print(f"    🌐 Request origin: {request.headers.get('Origin')}")
    print(f"    🍪 Cookies recibidas: {request.cookies}")
    return jsonify({'message': 'No autorizado - por favor inicia sesión'}), 401

@app.before_request
def make_session_permanent():
    session.permanent = True

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
        coord_rol = Rol.query.filter_by(nombre_rol='Coordinador').first()
        est_rol = Rol.query.filter_by(nombre_rol='Estudiante').first()

        # 3. Usuarios Iniciales
        if not Usuario.query.filter_by(nombre_usuario='admin').first():
            admin_user = Usuario(
                nombre_usuario='admin',
                contrasena=generate_password_hash('adminpass'),
                id_rol=admin_rol.id_rol
            )
            db.session.add(admin_user)

        if not Usuario.query.filter_by(nombre_usuario='coordinador').first():
            coord_user = Usuario(
                nombre_usuario='coordinador',
                contrasena=generate_password_hash('coordinadorpass'),
                id_rol=coord_rol.id_rol
            )
            db.session.add(coord_user)

        if not Usuario.query.filter_by(nombre_usuario='estudiante_optometria').first():
            est_user = Usuario(
                nombre_usuario='estudiante_optometria',
                contrasena=generate_password_hash('estudiantepass'),
                id_rol=est_rol.id_rol
            )
            db.session.add(est_user)

        # 4. Gabinetes 
        try:
            for g_data in Config.GABINETES:
                if not Gabinete.query.filter_by(id_gabinete=g_data['id']).first():
                    db.session.add(Gabinete(id_gabinete=g_data['id'], nombre=g_data['nombre']))
        except AttributeError:
             print("⚠️ Advertencia: Config.GABINETES no encontrado, saltando inicialización de gabinetes.")

        # 5. Motivos de Cita
        try:
            for m_data in Config.MOTIVOS_CITA:
                if not MotivoCita.query.filter_by(id_motivo=m_data['id']).first():
                    db.session.add(MotivoCita(id_motivo=m_data['id'], descripcion=m_data['descripcion']))
        except AttributeError:
            print("⚠️ Advertencia: Config.MOTIVOS_CITA no encontrado, saltando inicialización de motivos.")

        db.session.commit()
        print("✅ Base de datos inicializada con datos por defecto.")


# ----------------------------------------------------
# 🚪 Rutas de Autenticación
# ----------------------------------------------------

@app.route('/login', methods=['POST', 'OPTIONS'])
def login():
    if request.method == 'OPTIONS':
        return '', 200
        
    data = request.get_json()
    if not data:
        return jsonify({'message': 'Datos JSON requeridos'}), 400
        
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'message': 'Usuario y contraseña requeridos'}), 400

    user = Usuario.query.filter_by(nombre_usuario=username).first()

    if user and check_password_hash(user.contrasena, password):
        # Login con configuración explícita
        login_user(user, remember=True, duration=timedelta(hours=1))
        
        # FORZAR guardado de sesión
        session.modified = True
        
        print(f"✅ LOGIN EXITOSO: {username} ({user.rol.nombre_rol}) - ID: {user.id_usuario}")
        # CORRECCIÓN: Eliminada la referencia a session.sid
        print(f"    🍪 SESIÓN CREADA - Session activa") 
        print(f"    🔐 Session keys: {list(session.keys())}")
        print(f"    📍 Request origin: {request.headers.get('Origin')}")
        print(f"    🍪 Cookies establecidas: session_cookie")
        
        response = jsonify({
            'message': 'Login exitoso', 
            'user': user.nombre_usuario, 
            'rol': user.rol.nombre_rol,
            'id_usuario': user.id_usuario,
            'session_created': True
        })
        
        return response, 200
    
    print(f"❌ LOGIN FALLIDO: {username}")
    return jsonify({'message': 'Credenciales inválidas'}), 401

@app.route('/logout')
@login_required
def logout():
    print(f"🚪 LOGOUT: {current_user.nombre_usuario}")
    logout_user()
    session.clear()
    return jsonify({'message': 'Logout exitoso'}), 200

# ----------------------------------------------------
# 🔐 Rutas de Verificación de Sesión
# ----------------------------------------------------

@app.route('/api/user/current', methods=['GET'])
@login_required
def get_current_user():
    print(f"🔍 VERIFICACIÓN SESIÓN EXITOSA: {current_user.nombre_usuario}")
    print(f"    🆔 User ID: {current_user.id_usuario}")
    print(f"    👤 Rol: {current_user.rol.nombre_rol}")
    # CORRECCIÓN: session.sid no existe
    print(f"    🍪 Session activa") 
    print(f"    📍 Request origin: {request.headers.get('Origin')}")
    print(f"    🍪 Cookies recibidas: {request.cookies}")
    
    return jsonify({
        'id_usuario': current_user.id_usuario,
        'nombre_usuario': current_user.nombre_usuario,
        'rol': current_user.rol.nombre_rol,
        'session_active': True
    }), 200

# Ruta de debug mejorada
@app.route('/api/debug/session', methods=['GET'])
def debug_session():
    session_info = {
        'session_keys': list(session.keys()),
        'user_id_in_session': session.get('_user_id'),
        'current_user_authenticated': current_user.is_authenticated,
        'current_user_id': current_user.get_id() if current_user.is_authenticated else None,
        # CORRECCIÓN: session.sid no existe
        'session_id': 'N/A (SecureCookieSession)', 
        'session_permanent': session.get('_permanent'),
        'request_origin': request.headers.get('Origin'),
        'cookies_received': dict(request.cookies)
    }
    print(f"🔧 DEBUG SESSION: {session_info}")
    return jsonify(session_info), 200

# Ruta especial para forzar sesión
@app.route('/api/session/refresh', methods=['POST'])
def refresh_session():
    """Forzar refresco de sesión"""
    session.modified = True
    print("🔄 Sesión refrescada manualmente")
    return jsonify({'message': 'Session refreshed'}), 200

# ----------------------------------------------------
# 📅 Rutas de Agenda y Pacientes
# ----------------------------------------------------

# LÓGICA DE ASIGNACIÓN DE GABINETE (Necesaria para agendar)
def get_next_available_gabinete(fecha):
    """Calcula el siguiente gabinete a asignar para una fecha dada."""
    citas_del_dia = Cita.query.filter_by(fecha=fecha).count()
    # Los gabinetes van del 1 al 6. El índice de gabinete_id es (citas_del_dia % 6) + 1
    id_gabinete = (citas_del_dia % 6) + 1
    return id_gabinete

# Ruta para agendar cita
@app.route('/api/citas/agendar', methods=['POST'])
def agendar_cita():
    data = request.get_json()
    
    # Validación de datos básicos
    required_fields = ['fecha', 'hora', 'id_motivo', 'es_nuevo', 'nombre', 'apellido', 'edad', 'telefono']
    for field in required_fields:
        if field not in data:
            return jsonify({'message': f'Falta el campo requerido: {field}'}), 400

    fecha_dt = datetime.strptime(data['fecha'], '%Y-%m-%d').date()
    hora_dt = datetime.strptime(data['hora'], '%H:%M:%S').time()
    
    # 1. Búsqueda o creación del paciente
    paciente = Paciente.query.filter_by(telefono=data['telefono']).first()
    
    if data['es_nuevo']:
        if paciente:
            return jsonify({'message': 'Error: Ya existe un paciente con este número de teléfono. Selecciona "Paciente habitual"'}), 400
        
        paciente = Paciente(
            nombre=data['nombre'],
            apellido=data['apellido'],
            edad=data['edad'],
            telefono=data['telefono']
        )
        db.session.add(paciente)
        db.session.flush() # Obtiene el id_paciente antes del commit
    else: # Paciente habitual
        if not paciente:
            return jsonify({'message': 'Paciente habitual no encontrado con este teléfono.'}), 404
        # Actualizar datos si cambian (opcional, aquí solo se valida que exista)

    # 2. Verificación de superposición de hora (cualquier gabinete)
    superposicion = Cita.query.filter_by(fecha=fecha_dt, hora=hora_dt).first()
    if superposicion:
         # Ya que las citas son de una hora, la superposición simple basta.
         return jsonify({'message': 'Horario ya ocupado para ese día en todos los gabinetes.'}), 
    
    # 3. Asignación de Gabinete (ciclado 1-6)
    id_gabinete = get_next_available_gabinete(fecha_dt)
    gabinete = Gabinete.query.get(id_gabinete)

    # 4. Creación de la cita
    try:
        nueva_cita = Cita(
            fecha=fecha_dt,
            hora=hora_dt,
            id_paciente=paciente.id_paciente,
            id_motivo=data['id_motivo'],
            id_gabinete=id_gabinete,
            estado='Programada'
        )
        db.session.add(nueva_cita)
        db.session.commit()
        
        print(f"✅ Cita agendada: {paciente.nombre} el {data['fecha']} a las {data['hora']} en {gabinete.nombre}")
        
        return jsonify({
            'message': 'Cita agendada con éxito',
            'cita': nueva_cita.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error interno al agendar la cita', 'error': str(e)}), 500

# Ruta para buscar disponibilidad (Paso 3)
@app.route('/api/citas/disponibilidad', methods=['POST'])
def get_disponibilidad():
    data = request.get_json()
    fecha_str = data.get('fecha')
    
    if not fecha_str:
        return jsonify({'message': 'Fecha requerida'}), 400
    
    try:
        fecha_dt = datetime.strptime(fecha_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Formato de fecha inválido'}), 400

    # Determinar si el día es de fin de semana (Domingo=6, Sábado=5 si se usa Monday=0)
    # En Python, Monday=0, Sunday=6
    day_of_week = fecha_dt.weekday() 
    # Sábado (5) o Domingo (6)
    if day_of_week >= 5: 
        return jsonify({'disponibilidad': {}, 'message': 'No hay atención los fines de semana'}), 200

    # Obtener todas las citas para ese día
    citas_dia = Cita.query.filter_by(fecha=fecha_dt).all()
    horas_ocupadas = {str(cita.hora): cita for cita in citas_dia}
    
    disponibilidad = {}
    
    # Asumimos que Config.HORARIOS_ATENCION está disponible (ej: ['12:30:00', '13:30:00', '14:30:00', '15:30:00'])
    horarios_atencion = getattr(Config, 'HORARIOS_ATENCION', [])

    for hora in horarios_atencion:
        # Una hora está ocupada si ya hay 6 citas (un ciclo completo de gabinetes)
        # o si la hora específica ya tiene una cita, lo cual implica que el ciclo ya avanzó
        # Simplificación: Si ya hay una cita a esta hora, asumimos que todos los gabinetes ya están asignados
        
        # Corrección de lógica: Para que el paciente solo vea si la hora está disponible,
        # solo verificamos si ya se llenaron los 6 gabinetes para esa hora.
        citas_en_hora = Cita.query.filter_by(fecha=fecha_dt, hora=datetime.strptime(hora, '%H:%M:%S').time()).count()

        if citas_en_hora < len(Config.GABINETES):
            disponibilidad[hora] = 'Disponible'
        else:
            disponibilidad[hora] = 'Ocupado'

    return jsonify({'disponibilidad': disponibilidad}), 200


# Ruta para buscar paciente habitual (Paso 4)
@app.route('/api/paciente/buscar', methods=['POST'])
def buscar_paciente():
    data = request.get_json()
    telefono = data.get('telefono')
    
    if not telefono:
        return jsonify({'message': 'Teléfono requerido'}), 400

    paciente = Paciente.query.filter_by(telefono=telefono).first()

    if paciente:
        return jsonify({
            'es_nuevo': False,
            'paciente': paciente.to_dict()
        }), 200
    else:
        return jsonify({
            'es_nuevo': True,
            'message': 'Paciente no encontrado. Considera registrarte como nuevo paciente.'
        }), 200


@app.route('/api/citas/admin', methods=['GET'])
@login_required
def get_citas_admin():
    """Ruta con autenticación"""
    try:
        print(f"📊 Citas solicitadas por: {current_user.nombre_usuario}")
        citas = Cita.query.order_by(Cita.fecha, Cita.hora).all()
        return jsonify([cita.to_dict() for cita in citas]), 200
    except Exception as e:
        return jsonify({'message': 'Error al cargar citas', 'error': str(e)}), 500

@app.route('/api/citas/debug', methods=['GET'])
def debug_citas():
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
        # Manejar el caso donde no hay citas o no hay BD
        print(f"Error en debug_citas: {e}")
        return jsonify({'error': str(e)}), 500

# ----------------------------------------------------
# 📝 Rutas para Edición de Citas - CON AUDITORÍA
# ----------------------------------------------------

@app.route('/api/citas/<int:cita_id>/editar', methods=['PUT', 'OPTIONS'])
@login_required
def editar_cita_completa(cita_id):
    if request.method == 'OPTIONS':
        return '', 200
        
    data = request.get_json()
    cita = Cita.query.get_or_404(cita_id)
    
    # Validar Matrícula (Solo se aceptan DÍGITOS, según el minimundo "no contenga letras")
    matricula = data.get('matricula_editor')
    if matricula and not matricula.isdigit():
        return jsonify({'message': 'Validación de matrícula fallida: Solo se permiten números.'}), 400
    
    # Registrar información de auditoría
    if 'matricula_editor' in data:
        print(f"\n📝 CITA MODIFICADA - ID: {cita_id}")
        print(f"    👨‍🎓 Editado por: {data['matricula_editor']}")
        print(f"    🏷️ Tipo modificación: {data.get('tipo_modificacion', 'N/A')}")
        print(f"    🎯 Motivo: {data.get('motivo_modificacion', 'N/A')}")
        print(f"    📋 Detalle: {data.get('detalle_motivo', 'N/A')}")
        print(f"    👤 Paciente: {cita.paciente.nombre} {cita.paciente.apellido}")
        print(f"    📞 Teléfono: {cita.paciente.telefono}")
        
        # Mostrar cambios específicos
        cambios = []
        if 'fecha' in data:
            cambios.append(f"🗓️ Fecha: {data['fecha']} (Anterior: {cita.fecha})")
        if 'hora' in data:
            cambios.append(f"⏰ Hora: {data['hora']} (Anterior: {cita.hora})")
        if 'estado' in data:
            cambios.append(f"📊 Estado: {data['estado']} (Anterior: {cita.estado})")
        
        for cambio in cambios:
            print(f"    {cambio}")
        
        print(f"    📅 Fecha modificación: {data.get('fecha_modificacion', 'N/A')}")
        print("─" * 60)
    
    # Aplicar cambios
    if 'fecha' in data:
        try:
            cita.fecha = datetime.strptime(data['fecha'], '%Y-%m-%d').date()
        except ValueError:
            return jsonify({'message': 'Formato de fecha inválido'}), 400
    
    if 'hora' in data:
        try:
            cita.hora = datetime.strptime(data['hora'], '%H:%M:%S').time()
        except ValueError:
            return jsonify({'message': 'Formato de hora inválido'}), 400
    
    if 'estado' in data:
        cita.estado = data['estado']
    
    try:
        db.session.commit()
        return jsonify({
            'message': 'Cita actualizada correctamente', 
            'cita': cita.to_dict(),
            'auditoria': {
                'editor': data.get('matricula_editor'),
                'tipo_modificacion': data.get('tipo_modificacion'),
                'motivo': data.get('motivo_modificacion')
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error al actualizar cita', 'error': str(e)}), 500

# ----------------------------------------------------
# 🌐 Rutas para Servir Archivos HTML
# ----------------------------------------------------

@app.route('/')
def serve_login():
    return send_file('login.html')

@app.route('/login.html')
def serve_login_direct():
    return send_file('login.html')

@app.route('/panelAdmin.html')
def serve_panel_admin():
    return send_file('panelAdmin.html')

@app.route('/vistaprincipal.html')
def serve_vista_principal():
    return send_file('vistaprincipal.html')

@app.route('/<path:filename>')
def serve_static_files(filename):
    return send_from_directory('.', filename)

@app.route('/favicon.ico')
def favicon():
    return '', 204

#ruta terapia visual        
@app.route('/api/citas/agendar_terapia', methods=['POST'])
@login_required
def agendar_terapia_visual_api():
    """Ruta para agendar terapia visual con recurrencia de 3 meses"""
    try:
        print("📥 SOLICITUD RECIBIDA en /api/citas/agendar_terapia")
        
        # Verificar si hay datos JSON
        if not request.is_json:
            print("❌ No se recibió JSON")
            return jsonify({'message': 'Se esperaba JSON'}), 400
            
        data = request.get_json()
        print(f"📊 Datos recibidos: {data}")
        
        # Validar datos requeridos
        required_fields = ['nombre_paciente', 'fecha_inicio', 'hora']
        for field in required_fields:
            if field not in data:
                print(f"❌ Campo faltante: {field}")
                return jsonify({'message': f'Campo requerido faltante: {field}'}), 400

        # Parsear fechas
        try:
            fecha_inicio = datetime.strptime(data['fecha_inicio'], '%Y-%m-%d').date()
            hora_dt = datetime.strptime(data['hora'], '%H:%M:%S').time()
            print(f"✅ Fechas parseadas: {fecha_inicio} {hora_dt}")
        except ValueError as e:
            print(f"❌ Error parseando fechas: {e}")
            return jsonify({'message': 'Formato de fecha u hora inválido'}), 400
        
        # VERIFICACIÓN EXTENDIDA DE LA BASE DE DATOS
        print("🔍 Verificando estado de la base de datos...")
        
        # Verificar motivo
        motivo_terapia = MotivoCita.query.get(3)
        if not motivo_terapia:
            print("❌ Motivo de terapia visual NO encontrado")
            return jsonify({'message': 'Motivo de terapia visual no configurado'}), 500
        print(f"✅ Motivo encontrado: ID {motivo_terapia.id_motivo} - {motivo_terapia.descripcion}")
        
        # Verificar gabinetes
        gabinetes = Gabinete.query.all()
        print(f"✅ Gabinetes disponibles: {[g.nombre for g in gabinetes]}")
        
        # Verificar usuario actual
        print(f"✅ Usuario autenticado: {current_user.nombre_usuario} (ID: {current_user.id_usuario})")
        
        # Crear paciente
        nombre_completo = data['nombre_paciente']
        partes_nombre = nombre_completo.split(' ', 1)
        nombre = partes_nombre[0]
        apellido = partes_nombre[1] if len(partes_nombre) > 1 else ""
        
        print(f"👤 Creando paciente: {nombre} {apellido}")
        
        paciente = Paciente(
            nombre=nombre,
            apellido=apellido,
            edad=data.get('edad', 0) or 0,
            telefono=data.get('telefono', '000-0000') or '000-0000'
        )
        db.session.add(paciente)
        db.session.flush()
        print(f"✅ Paciente creado con ID: {paciente.id_paciente}")
        
        # Asignar gabinete
        id_gabinete = get_next_available_gabinete(fecha_inicio)
        gabinete = Gabinete.query.get(id_gabinete)
        print(f"✅ Gabinete asignado: {id_gabinete} ({gabinete.nombre})")
        
        # Verificar disponibilidad
        if not verificar_disponibilidad_fecha(fecha_inicio, hora_dt):
            print("❌ Fecha y hora no disponibles")
            return jsonify({'message': 'La fecha y hora inicial no están disponibles'}), 400
        print("✅ Fecha y hora disponibles")
        
        # Crear cita original
        print("📝 Creando cita original...")
        cita_original = Cita(
            fecha=fecha_inicio,
            hora=hora_dt,
            id_paciente=paciente.id_paciente,
            id_motivo=3,  # Terapia visual
            id_gabinete=id_gabinete,
            estado='Programada',
            id_usuario=current_user.id_usuario
        )
        db.session.add(cita_original)
        db.session.flush()
        print(f"✅ Cita original creada: ID {cita_original.id_cita}")
        
        # PROCESAR RECURRENCIA
        es_recurrente = data.get('es_recurrente', True)
        citas_generadas = []
        fecha_fin = None  # Inicializar variable

        if es_recurrente:
            print("🔄 Creando serie recurrente por 3 meses...")
            
            # Calcular fecha fin (3 meses después)
            fecha_fin = calcular_fecha_fin(fecha_inicio, meses=3)
            dia_semana = fecha_inicio.weekday()  # 0=Lunes, 6=Domingo
            
            print(f"📅 Serie recurrente: {fecha_inicio} a {fecha_fin} (día {dia_semana})")
            
            # Crear serie recurrente
            serie_recurrente = CitaRecurrente(
                id_cita_original=cita_original.id_cita,
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                dia_semana=dia_semana,
                hora=hora_dt,
                creado_por=current_user.id_usuario,
                estado_serie='Activa'
            )
            db.session.add(serie_recurrente)
            db.session.flush()
            print(f"✅ Serie recurrente creada: ID {serie_recurrente.id_serie}")

            # Registrar la cita original en la serie
            detalle_original = CitaRecurrenteDetalle(
                id_serie=serie_recurrente.id_serie,
                id_cita=cita_original.id_cita,
                fecha_programada=fecha_inicio,
                estado_individual='Programada'
            )
            db.session.add(detalle_original)

            # Generar citas futuras (excluyendo la original)
            citas_generadas = generar_citas_recurrentes(
                serie_recurrente.id_serie,
                paciente.id_paciente,
                fecha_inicio,  # Empezar desde la fecha original
                fecha_fin,
                dia_semana,
                hora_dt,
                current_user.id_usuario
            )
            print(f"✅ Citas recurrentes generadas: {len(citas_generadas)} adicionales")
            
        else:
            print("✅ Cita individual creada (sin recurrencia)")

        db.session.commit()

        # Mensaje final según tipo de cita
        if es_recurrente:
            total_citas = 1 + len(citas_generadas)  # Original + recurrentes
            mensaje_final = f'Terapia visual recurrente agendada exitosamente. {total_citas} citas creadas hasta el {fecha_fin}.'
        else:
            mensaje_final = 'Cita individual de terapia visual agendada exitosamente.'
        
        print(f"🎉 PROCESO COMPLETADO: {mensaje_final}")
        
        return jsonify({
            'message': mensaje_final,
            'cita_original': {
                'id_cita': cita_original.id_cita,
                'fecha': cita_original.fecha.strftime('%Y-%m-%d'),
                'hora': str(cita_original.hora),
                'paciente': {
                    'nombre': paciente.nombre,
                    'apellido': paciente.apellido,
                    'edad': paciente.edad,
                    'telefono': paciente.telefono
                },
                'gabinete': gabinete.nombre,
                'estado': cita_original.estado
            },
            'total_citas': 1 + len(citas_generadas) if es_recurrente else 1,
            'fecha_fin': fecha_fin.strftime('%Y-%m-%d') if es_recurrente else None
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"💥 ERROR CRÍTICO: {str(e)}")
        import traceback
        print(f"📝 Stack trace: {traceback.format_exc()}")
        return jsonify({'message': 'Error al agendar terapia visual', 'error': str(e)}), 500

def encontrar_proximo_dia(fecha, dia_semana):
    """Encuentra la próxima fecha que coincida con el día de la semana"""
    dias_restantes = (dia_semana - fecha.weekday()) % 7
    if dias_restantes == 0:
        dias_restantes = 7  # Ir a la siguiente semana
    return fecha + timedelta(days=dias_restantes)

def verificar_disponibilidad_fecha(fecha, hora):
    """Verifica si una fecha y hora están disponibles"""
    cita_existente = Cita.query.filter_by(fecha=fecha, hora=hora).first()
    return cita_existente is None

@app.route('/api/citas/<int:cita_id>/editar_individual', methods=['PUT'])
@login_required
def editar_cita_individual(cita_id):
    """Edita una cita individual sin afectar la serie recurrente"""
    try:
        data = request.get_json()
        cita = Cita.query.get_or_404(cita_id)
        
        # Verificar si pertenece a una serie recurrente
        detalle_serie = CitaRecurrenteDetalle.query.filter_by(id_cita=cita_id).first()
        
        if not detalle_serie:
            return jsonify({'message': 'Cita no encontrada en serie recurrente'}), 404
        
        # Validar matrícula
        matricula = data.get('matricula_editor')
        if matricula and not matricula.isdigit():
            return jsonify({'message': 'La matrícula solo debe contener números'}), 400
        
        # Registrar auditoría
        print(f"📝 CITA INDIVIDUAL MODIFICADA - Serie: {detalle_serie.id_serie}")
        print(f"    👨‍🎓 Editado por: {matricula}")
        print(f"    📅 Cita original: {cita.fecha} {cita.hora}")
        
        # Aplicar cambios
        cambios = []
        if 'fecha' in data:
            nueva_fecha = datetime.strptime(data['fecha'], '%Y-%m-%d').date()
            cambios.append(f"🗓️ Fecha: {nueva_fecha} (Anterior: {cita.fecha})")
            cita.fecha = nueva_fecha
        
        if 'hora' in data:
            nueva_hora = datetime.strptime(data['hora'], '%H:%M:%S').time()
            cambios.append(f"⏰ Hora: {nueva_hora} (Anterior: {cita.hora})")
            cita.hora = nueva_hora
        
        if 'estado' in data:
            cambios.append(f"📊 Estado: {data['estado']} (Anterior: {cita.estado})")
            cita.estado = data['estado']
        
        # Actualizar estado individual en la serie
        detalle_serie.estado_individual = 'Modificada'
        
        for cambio in cambios:
            print(f"    {cambio}")
        
        db.session.commit()
        
        return jsonify({
            'message': 'Cita individual modificada exitosamente',
            'cita': cita.to_dict(),
            'serie_afectada': False  # Indica que no se afectó la serie completa
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error al modificar cita individual', 'error': str(e)}), 500

@app.route('/api/citas/serie/<int:serie_id>/cancelar', methods=['PUT'])
@login_required
def cancelar_serie_completa(serie_id):
    """Cancela toda la serie recurrente"""
    try:
        data = request.get_json()
        serie = CitaRecurrente.query.get_or_404(serie_id)
        
        # Validar matrícula
        matricula = data.get('matricula_editor')
        if matricula and not matricula.isdigit():
            return jsonify({'message': 'La matrícula solo debe contener números'}), 400
        
        # Cancelar todas las citas futuras de la serie
        citas_futuras = Cita.query.join(CitaRecurrenteDetalle).filter(
            CitaRecurrenteDetalle.id_serie == serie_id,
            Cita.fecha >= datetime.now().date(),
            Cita.estado != 'Cancelada'
        ).all()
        
        for cita in citas_futuras:
            cita.estado = 'Cancelada'
        
        serie.estado_serie = 'Cancelada'
        
        print(f"🚫 SERIE COMPLETA CANCELADA - ID: {serie_id}")
        print(f"    👨‍🎓 Cancelado por: {matricula}")
        print(f"    📅 Citas canceladas: {len(citas_futuras)}")
        print(f"    🎯 Motivo: {data.get('motivo_modificacion', 'N/A')}")
        
        db.session.commit()
        
        return jsonify({
            'message': f'Serie completa cancelada. {len(citas_futuras)} citas afectadas.',
            'citas_canceladas': len(citas_futuras)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': 'Error al cancelar serie', 'error': str(e)}), 500





# ----------------------------------------------------
# 🚀 Ejecución de la Aplicación
# ----------------------------------------------------

if __name__ == '__main__':
    inicializar_db() 
    print("🚀 Servidor Flask iniciado en http://127.0.0.1:5000")
    print("🔐 CONFIGURACIÓN DE COOKIES MEJORADA")
    print("🍪 SESSION_COOKIE_NAME:", app.config['SESSION_COOKIE_NAME'])
    print("🌐 Orígenes permitidos: http://localhost:5000, http://127.0.0.1:5000")
    # Nota: use_reloader=False evita que se ejecute la inicialización dos veces en debug
    app.run(debug=True, host='127.0.0.1', port=5000, use_reloader=False)