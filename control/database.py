# control/database.py
import os
from flask_sqlalchemy import SQLAlchemy

# Objeto global — usado por todos os modelos
db = SQLAlchemy()


def init_db(app):
    """Liga o SQLAlchemy à app Flask e à base de dados."""
    database_url = os.getenv('DATABASE_URL')

    if not database_url:
        raise RuntimeError(
            "DATABASE_URL não está definida no .env ou nas variáveis de ambiente."
        )

    # O Vercel/Heroku às vezes dá URLs começadas por "postgres://"
    # mas o SQLAlchemy só aceita "postgresql://"
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)

    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
        'pool_pre_ping': True,   # testa a ligação antes de usar
        'pool_recycle': 300,     # recicla ligações a cada 5 min
    }

    db.init_app(app)