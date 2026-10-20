from datetime import datetime
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

from control.database import db


class User(UserMixin, db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def __repr__(self):
        return f'<User {self.username}>'


class Visit(db.Model):
    __tablename__ = 'visits'

    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    ip_address = db.Column(db.String(45), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    country = db.Column(db.String(100), nullable=True)
    path = db.Column(db.String(255), nullable=True)
    user_agent = db.Column(db.String(500), nullable=True)

    def __repr__(self):
        return f'<Visit {self.timestamp} {self.city}/{self.country}>'


class DonationClick(db.Model):
    __tablename__ = 'donation_clicks'

    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
    ip_address = db.Column(db.String(45), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    country = db.Column(db.String(100), nullable=True)

    def __repr__(self):
        return f'<DonationClick {self.timestamp} {self.city}/{self.country}>'


class Subscriber(db.Model):
    __tablename__ = 'subscribers'

    id = db.Column(db.Integer, primary_key=True)

    # Origem do registo: "google" ou "email"
    subscribed_via = db.Column(db.String(20), default='google', nullable=False)
    password_hash = db.Column(db.String(255), nullable=True)

    # Dados do Google (nullable para registos por email)
    google_id = db.Column(db.String(120), unique=True, nullable=True, index=True)
    picture_url = db.Column(db.String(500), nullable=True)

    # Dados comuns
    email = db.Column(db.String(200), unique=True, nullable=False, index=True)
    name = db.Column(db.String(200), nullable=True)

    # Localização (recolhida no primeiro contacto)
    ip_address = db.Column(db.String(45), nullable=True)
    city = db.Column(db.String(100), nullable=True)
    country = db.Column(db.String(100), nullable=True)

    # RGPD — consentimento
    consent_marketing = db.Column(db.Boolean, default=False, nullable=False)
    consent_date = db.Column(db.DateTime, nullable=True)
    unsubscribed = db.Column(db.Boolean, default=False, nullable=False)
    unsubscribed_at = db.Column(db.DateTime, nullable=True)

    # Verificação de email (duplo opt-in)
    email_verified = db.Column(db.Boolean, default=False, nullable=False)
    verification_token = db.Column(db.String(64), nullable=True, index=True)
    verification_sent_at = db.Column(db.DateTime, nullable=True)

    # Bloqueio (impede login e subscrição)
    blocked = db.Column(db.Boolean, default=False, nullable=False)
    blocked_at = db.Column(db.DateTime, nullable=True)

    # Metadados
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_login = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f'<Subscriber {self.email} via {self.subscribed_via}>'

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)