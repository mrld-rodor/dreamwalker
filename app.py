import os

from flask import Flask, flash, render_template
from urllib.parse import unquote

import time
from collections import defaultdict
from flask import jsonify, request

from datetime import datetime
from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_login import LoginManager, login_user, logout_user, login_required, current_user

from control.database import db, init_db
from control.models import User, Visit
from control.models import User, Visit, DonationClick

from control.email_sender import (
    Contato,
    EmailDeliveryError,
    EmailNetworkError,
    send_email,
)


app = Flask(
    __name__,
    template_folder=str("templates"),
    static_folder=str("static"),
)


# ============================================================
# BASE DE DADOS
# ============================================================
init_db(app)

# ============================================================
# FLASK-LOGIN
# ============================================================
app.secret_key = os.getenv('SECRET_KEY')
if not app.secret_key:
    raise RuntimeError("SECRET_KEY não está definida no .env")

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'admin_login'   # nome da rota de login (Fase 4)
login_manager.login_message = 'Precisas de fazer login para aceder ao painel.'


@login_manager.user_loader
def load_user(user_id):
    """Diz ao Flask-Login qual é o utilizador com base no ID do cookie."""
    return User.query.get(int(user_id))


# ============================================================
# CRIAR TABELAS + UTILIZADOR ADMIN INICIAL
# ============================================================
with app.app_context():
    db.create_all()

    # Cria o admin inicial se ainda não existir
    admin_username = os.getenv('ADMIN_USER')
    admin_password = os.getenv('ADMIN_PASS')

    if admin_username and admin_password:
        existing = User.query.filter_by(username=admin_username).first()
        if not existing:
            new_admin = User(username=admin_username)
            new_admin.set_password(admin_password)
            db.session.add(new_admin)
            db.session.commit()
            print(f"[INFO] Utilizador admin criado: {admin_username}")
        else:
            print(f"[INFO] Utilizador admin já existe: {admin_username}")


# ============================================================
# REGISTAR VISITAS — corre antes de cada pedido
# ============================================================
@app.before_request
def log_visit():
    if request.endpoint == 'index':
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)

        # Vercel fornece isto automaticamente em produção — DESCODIFICADO
        city = request.headers.get('X-Vercel-IP-City')
        country = request.headers.get('X-Vercel-IP-Country')

        # Descodifica %20 → espaço, %C3%A3 → ã, etc.
        if city:
            city = unquote(city)
        if country:
            country = unquote(country)

        user_agent = request.headers.get('User-Agent', '')[:500]

        new_visit = Visit(
            ip_address=ip,
            city=city,
            country=country,
            path=request.path,
            user_agent=user_agent,
        )
        db.session.add(new_visit)
        db.session.commit()

# ============================================================
# Rate limiting simples (em memória)
# ============================================================
_rate_store = defaultdict(list)
RATE_LIMIT_WINDOW = 60    # segundos
RATE_LIMIT_MAX    = 3     # máximo de pedidos por janela

def is_rate_limited(ip):
    now = time.time()
    # limpa pedidos antigos
    _rate_store[ip] = [t for t in _rate_store[ip] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_store[ip]) >= RATE_LIMIT_MAX:
        return True
    _rate_store[ip].append(now)
    return False



@app.route("/")
def index():
    return render_template("index.html")



@app.route('/enviar-contato', methods=['POST'])
def enviar_contato():
    # 1. Honeypot
    honeypot = request.form.get('website', '')
    if honeypot:
        return jsonify({'success': True, 'message': 'Mensagem enviada!'})

    # 2. Tempo mínimo de preenchimento
    form_start = request.form.get('form_start', type=float)
    if form_start and (time.time() - form_start) < 2.0:
        return jsonify({'success': False, 'message': 'Preencha o formulário com calma. Tente novamente.'}), 400

    # 3. Rate limit por IP
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if is_rate_limited(ip):
        return jsonify({'success': False, 'message': 'Muitas tentativas. Aguarde um minuto.'}), 429

    # 4. Captura
    nome     = request.form.get('nome')
    email    = request.form.get('email')
    mensagem = request.form.get('mensagem')

    # 5. Validação
    if not nome or not email or not mensagem:
        return jsonify({'success': False, 'message': 'Preencha todos os campos obrigatórios.'}), 400

    # 6. Envio
    contato = Contato(nome, email, mensagem)

    try:
        send_email(contato)
        return jsonify({'success': True, 'message': 'Mensagem enviada! Entraremos em contacto em breve.'})
    except EmailNetworkError as e:
        return jsonify({'success': False, 'message': f'Erro de conexão: {str(e)}'}), 503
    except EmailDeliveryError as e:
        return jsonify({'success': False, 'message': f'Erro ao enviar: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro inesperado: {str(e)}'}), 500


@app.route("/privacidade")
def privacidade():
    return render_template("privacidade.html")

@app.route("/termos")
def termos():
    return render_template("termos.html")

# ============================================================
# ADMIN — LOGIN
# ============================================================
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    # Se já está autenticado, vai direto para o dashboard
    if current_user.is_authenticated:
        return redirect(url_for('admin_dashboard'))

    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '')

        # Procura o utilizador
        user = User.query.filter_by(username=username).first()

        # Verifica se existe E se a password está correta
        if user and user.check_password(password):
            login_user(user)            

            # Respeita o "next" (para onde ia antes de ser bloqueado)
            next_page = request.args.get('next')
            return redirect(next_page or url_for('admin_dashboard'))

        # Falha
        flash('Credenciais inválidas.', 'error')

    return render_template('admin_login.html')

# ============================================================
# ADMIN — LOGOUT
# ============================================================
@app.route('/admin/logout')
@login_required
def admin_logout():
    logout_user()
    flash('Sessão encerrada.', 'success')
    return redirect(url_for('admin_login'))


# ============================================================
# ADMIN — DASHBOARD
# ============================================================
@app.route('/admin/dashboard')
@login_required
def admin_dashboard():
    from datetime import datetime, timedelta

    # Marcadores de tempo
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)

    # Contadores (sempre calculados, independentes do filtro)
    counters = {
        'total': Visit.query.count(),
        'today': Visit.query.filter(Visit.timestamp >= today_start).count(),
        'week':  Visit.query.filter(Visit.timestamp >= week_start).count(),
        'month': Visit.query.filter(Visit.timestamp >= month_start).count(),
    }

    # Filtro ativo (vindo da URL: ?period=today)
    period = request.args.get('period', 'all')

    # Base da query
    query = Visit.query

    if period == 'today':
        query = query.filter(Visit.timestamp >= today_start)
    elif period == 'week':
        query = query.filter(Visit.timestamp >= week_start)
    elif period == 'month':
        query = query.filter(Visit.timestamp >= month_start)
    # 'all' → sem filtro

    visits = query.order_by(Visit.timestamp.desc()).limit(500).all()

        # Top 5 cidades (ignora NULLs)
    top_cities = (
        db.session.query(Visit.city, db.func.count(Visit.city).label('total'))
        .filter(Visit.city.isnot(None))
        .group_by(Visit.city)
        .order_by(db.func.count(Visit.city).desc())
        .limit(5)
        .all()
    )

    # Top 5 países (ignora NULLs)
    top_countries = (
        db.session.query(Visit.country, db.func.count(Visit.country).label('total'))
        .filter(Visit.country.isnot(None))
        .group_by(Visit.country)
        .order_by(db.func.count(Visit.country).desc())
        .limit(5)
        .all()
    )

    # Contadores de cliques na doação
    donation_counters = {
        'total': DonationClick.query.count(),
        'today': DonationClick.query.filter(DonationClick.timestamp >= today_start).count(),
        'week':  DonationClick.query.filter(DonationClick.timestamp >= week_start).count(),
        'month': DonationClick.query.filter(DonationClick.timestamp >= month_start).count(),
    }

    return render_template(
        'admin_dashboard.html',
        visits=visits,
        counters=counters,
        donation_counters=donation_counters,
        current_period=period,
        current_user_name=current_user.username,
        top_cities=top_cities,          
        top_countries=top_countries,    
    )


# ============================================================
# API — registar clique no botão de doação
# ============================================================
@app.route('/api/donation-click', methods=['POST'])
def donation_click():
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    city = request.headers.get('X-Vercel-IP-City')
    country = request.headers.get('X-Vercel-IP-Country')

    if city:
        city = unquote(city)
    if country:
        country = unquote(country)

    click = DonationClick(
        ip_address=ip,
        city=city,
        country=country,
    )
    db.session.add(click)
    db.session.commit()

    return jsonify({'status': 'ok'}), 200
    

@app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404

if __name__ == "__main__":
    app.run(debug=True)