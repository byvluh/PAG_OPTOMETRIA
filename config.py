# config.py
#Este archivo maneja la configuración de la base de datos y las claves secretas

import os

class Config:
    # Clave secreta para la seguridad de la sesión de Flask
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'una_clave_secreta_fuerte'

    # Configuración de la base de datos MySQL (ajusta estos valores)
    # Formato: dialect+driver://user:password@host:port/database
    SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:@localhost/ual_optometria'
    
    # Desactiva la señalización para ahorrar recursos
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Gabinetes disponibles (6 gabinetes)
    GABINETES = [
        {'id': 1, 'nombre': 'Gabinete 1'},
        {'id': 2, 'nombre': 'Gabinete 2'},
        {'id': 3, 'nombre': 'Gabinete 3'},
        {'id': 4, 'nombre': 'Gabinete 4'},
        {'id': 5, 'nombre': 'Gabinete 5'},
        {'id': 6, 'nombre': 'Gabinete 6'},
    ]

    # Tipos de citas
    MOTIVOS_CITA = [
        {'id': 1, 'descripcion': 'Lentes graduados de armazón'},
        {'id': 2, 'descripcion': 'Lentes de contacto'},
    ]

    # Horarios de atención más amplios para pruebas
    HORARIOS_ATENCION = [  # <-- ESTA LÍNEA DEBE ESTAR INDENTADA
        '12:30:00','13:30:00','14:30:00', '15:30:00'
    ]  # <-- ESTA LÍNEA TAMBIÉN DEBE ESTAR INDENTADA
    