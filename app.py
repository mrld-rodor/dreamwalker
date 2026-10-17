import os
import uuid
import time
from collections import defaultdict
from datetime import datetime, timedelta
from urllib.parse import unquote

from flask import Flask, flash, render_template, request, jsonify, redirect, url_for, session
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.middleware.proxy_fix import ProxyFix
from authlib.integrations.flask_client import OAuth

from control.database import db, init_db
from control.models import User, Visit, DonationClick, Subscriber
from control.email_sender import (
    Contato, EmailDeliveryError, EmailNetworkError, 
    send_email, send_verification_email, send_welcome_email,
    send_campaign_email,
)

app = Flask(
    __name__,
    template_folder=str("templates"),
    static_folder=str("static"),
)

app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

# ============================================================
# BASE DE DADOS E FLASK-LOGIN
# ============================================================
init_db(app)

app.secret_key = os.getenv('SECRET_KEY')
if not app.secret_key:
    raise RuntimeError("SECRET_KEY não está definida no .env")

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'admin_login'
login_manager.login_message = 'Precisas de fazer login para aceder ao painel.'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# ============================================================
# OAUTH — GOOGLE
# ============================================================
oauth = OAuth(app)
oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)

# ============================================================
# CRIAR TABELAS E ADMIN INICIAL
# ============================================================
with app.app_context():
    db.create_all()
    admin_username = os.getenv('ADMIN_USER')
    admin_password = os.getenv('ADMIN_PASS')
    if admin_username and admin_password:
        existing = User.query.filter_by(username=admin_username).first()
        if not existing:
            new_admin = User(username=admin_username)
            new_admin.set_password(admin_password)
            db.session.add(new_admin)
            db.session.commit()

# ============================================================
# HELPERS
# ============================================================
@app.before_request
def log_visit():
    if request.endpoint == 'index':
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        city = request.headers.get('X-Vercel-IP-City')
        country = request.headers.get('X-Vercel-IP-Country')
        if city: city = unquote(city)
        if country: country = unquote(country)
        user_agent = request.headers.get('User-Agent', '')[:500]

        new_visit = Visit(ip_address=ip, city=city, country=country, path=request.path, user_agent=user_agent)
        db.session.add(new_visit)
        db.session.commit()

_rate_store = defaultdict(list)
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX = 3

def is_rate_limited(ip):
    now = time.time()
    _rate_store[ip] = [t for t in _rate_store[ip] if now - t < RATE_LIMIT_WINDOW]
    if len(_rate_store[ip]) >= RATE_LIMIT_MAX:
        return True
    _rate_store[ip].append(now)
    return False

# ============================================================
# ROTAS PÚBLICAS
# ============================================================
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/privacidade")
def privacidade():
    return render_template("privacidade.html")

@app.route("/termos")
def termos():
    return render_template("termos.html")

@app.route('/enviar-contato', methods=['POST'])
def enviar_contato():
    honeypot = request.form.get('website', '')
    if honeypot: return jsonify({'success': True, 'message': 'Mensagem enviada!'})

    form_start = request.form.get('form_start', type=float)
    if form_start and (time.time() - form_start) < 2.0:
        return jsonify({'success': False, 'message': 'Preencha o formulário com calma.'}), 400

    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if is_rate_limited(ip):
        return jsonify({'success': False, 'message': 'Muitas tentativas. Aguarde um minuto.'}), 429

    nome, email, mensagem = request.form.get('nome'), request.form.get('email'), request.form.get('mensagem')
    if not nome or not email or not mensagem:
        return jsonify({'success': False, 'message': 'Preencha todos os campos obrigatórios.'}), 400

    try:
        send_email(Contato(nome, email, mensagem))
        return jsonify({'success': True, 'message': 'Mensagem enviada!'})
    except Exception as e:
        return jsonify({'success': False, 'message': f'Erro ao enviar: {str(e)}'}), 500

@app.route('/api/donation-click', methods=['POST'])
def donation_click():
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    city = unquote(request.headers.get('X-Vercel-IP-City')) if request.headers.get('X-Vercel-IP-City') else None
    country = unquote(request.headers.get('X-Vercel-IP-Country')) if request.headers.get('X-Vercel-IP-Country') else None

    db.session.add(DonationClick(ip_address=ip, city=city, country=country))
    db.session.commit()
    return jsonify({'status': 'ok'}), 200

# ============================================================
# AUTENTICAÇÃO E SUBSCRIÇÃO
# ============================================================
@app.route('/api/subscribe', methods=['POST'])
def api_subscribe():
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if is_rate_limited(ip):
        return jsonify({'success': False, 'message': 'Muitas tentativas. Aguarda um minuto.'}), 429

    name = (request.form.get('name') or '').strip()
    email = (request.form.get('email') or '').strip().lower()
    consent = request.form.get('consent') == '1'

    if not name or not email or not consent:
        return jsonify({'success': False, 'message': 'Preenche todos os campos e aceita os termos.'}), 400

    city = unquote(request.headers.get('X-Vercel-IP-City')) if request.headers.get('X-Vercel-IP-City') else None
    country = unquote(request.headers.get('X-Vercel-IP-Country')) if request.headers.get('X-Vercel-IP-Country') else None

    existing = Subscriber.query.filter_by(email=email).first()

    # BLOQUEIO: Verifica se está bloqueado antes de qualquer ação
    if existing and existing.blocked:
        return jsonify({'success': False, 'message': 'Este email está bloqueado.'}), 403

    if existing:
        if existing.email_verified and existing.consent_marketing and not existing.unsubscribed:
            return jsonify({'success': True, 'message': 'Já estás subscrito.'})
        
        existing.verification_token = uuid.uuid4().hex
        existing.verification_sent_at = datetime.utcnow()
        existing.consent_marketing = True
        existing.unsubscribed = False
        db.session.commit()

        try:
            verify_url = url_for('auth_verify', token=existing.verification_token, _external=True)
            send_verification_email(email, existing.name or name, verify_url)
        except Exception as e:
            return jsonify({'success': False, 'message': str(e)}), 500
        return jsonify({'success': True, 'message': 'Enviamos um novo link de confirmação.'})

    token = uuid.uuid4().hex
    new_sub = Subscriber(
        subscribed_via='email', email=email, name=name, ip_address=ip, city=city, country=country,
        consent_marketing=True, consent_date=datetime.utcnow(), email_verified=False,
        verification_token=token, verification_sent_at=datetime.utcnow(),
    )
    db.session.add(new_sub)
    db.session.commit()

    try:
        verify_url = url_for('auth_verify', token=token, _external=True)
        send_verification_email(email, name, verify_url)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

    return jsonify({'success': True, 'message': 'Verifica o teu email para confirmares.'})

@app.route('/auth/verify/<token>')
def auth_verify(token):
    sub = Subscriber.query.filter_by(verification_token=token).first()
    if not sub:
        flash('Link inválido.', 'error')
        return redirect(url_for('index'))
    
    if not sub.email_verified:
        sub.email_verified = True
        sub.last_login = datetime.utcnow()
        db.session.commit()
        
        try:
            send_welcome_email(sub.email, sub.name, url_for('auth_unsubscribe', token=token, _external=True))
        except:
            pass
            
        flash(f'Subscrição confirmada, {sub.name}!', 'success')
    else:
        flash('Este email já foi confirmado.', 'success')
        
    return redirect(url_for('index'))

@app.route('/auth/unsubscribe/<token>')
def auth_unsubscribe(token):
    sub = Subscriber.query.filter_by(verification_token=token).first()
    if sub:
        sub.unsubscribed = True
        sub.consent_marketing = False
        db.session.commit()
        flash('Subscrição cancelada.', 'success')
    return redirect(url_for('index'))

@app.route('/auth/google')
def auth_google():
    consent = request.args.get('consent', '0') == '1'
    session['pending_consent'] = consent
    return oauth.google.authorize_redirect(url_for('auth_google_callback', _external=True))

@app.route('/auth/google/callback')
def auth_google_callback():
    try:
        token = oauth.google.authorize_access_token()
    except Exception:
        flash('Não foi possível autenticar.', 'error')
        return redirect(url_for('index'))

    user_info = token.get('userinfo')
    google_id = user_info.get('sub')
    email = user_info.get('email')
    name = user_info.get('name')

    if not google_id or not email:
        flash('Dados incompletos.', 'error')
        return redirect(url_for('index'))

    # BLOQUEIO: Verifica se o ID ou Email está bloqueado
    blocked_sub = Subscriber.query.filter(
        (Subscriber.google_id == google_id) | (Subscriber.email == email)
    ).first()

    if blocked_sub and blocked_sub.blocked:
        flash('O teu acesso foi bloqueado.', 'error')
        return redirect(url_for('index'))

    consent = session.pop('pending_consent', False)
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    city = unquote(request.headers.get('X-Vercel-IP-City')) if request.headers.get('X-Vercel-IP-City') else None
    country = unquote(request.headers.get('X-Vercel-IP-Country')) if request.headers.get('X-Vercel-IP-Country') else None

    subscriber = Subscriber.query.filter_by(google_id=google_id).first()

    if subscriber:
        subscriber.last_login = datetime.utcnow()
        if not subscriber.email_verified:
            subscriber.email_verified = True
        if consent and not subscriber.consent_marketing:
            subscriber.consent_marketing = True
            subscriber.unsubscribed = False
        db.session.commit()
        session['subscriber_id'] = subscriber.id
        flash(f'Bem-vindo de volta, {name.split()[0]}!', 'success')
    else:
        subscriber = Subscriber(
            subscribed_via='google', google_id=google_id, email=email, name=name, picture_url=user_info.get('picture'),
            ip_address=ip, city=city, country=country, consent_marketing=consent,
            consent_date=datetime.utcnow() if consent else None, email_verified=True
        )
        db.session.add(subscriber)
        db.session.commit()
        session['subscriber_id'] = subscriber.id
        flash(f'Subscreveste com sucesso, {name.split()[0]}!', 'success')

    return redirect(url_for('index'))

@app.route('/auth/logout')
def auth_logout():
    session.pop('subscriber_id', None)
    flash('Sessão encerrada.', 'success')
    return redirect(url_for('index'))

# ============================================================
# ADMIN — LOGIN
# ============================================================
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if current_user.is_authenticated:
        return redirect(url_for('admin_dashboard'))

    if request.method == 'POST':
        user = User.query.filter_by(username=request.form.get('username', '').strip()).first()
        if user and user.check_password(request.form.get('password', '')):
            login_user(user)
            return redirect(request.args.get('next') or url_for('admin_dashboard'))
        flash('Credenciais inválidas.', 'error')
    return render_template('admin_login.html')

@app.route('/admin/logout')
@login_required
def admin_logout():
    logout_user()
    flash('Sessão encerrada.', 'success')
    return redirect(url_for('admin_login'))

# ============================================================
# ADMIN — DASHBOARD E SUBSCRITORES
# ============================================================
@app.route('/admin/dashboard')
@login_required
def admin_dashboard():
    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week = now - timedelta(days=7)
    month = now - timedelta(days=30)
    period = request.args.get('period', 'all')

    q_visits = Visit.query
    if period == 'today': q_visits = q_visits.filter(Visit.timestamp >= today)
    elif period == 'week': q_visits = q_visits.filter(Visit.timestamp >= week)
    elif period == 'month': q_visits = q_visits.filter(Visit.timestamp >= month)

    visits = q_visits.order_by(Visit.timestamp.desc()).limit(500).all()

    return render_template('admin_dashboard.html',
        visits=visits,
        counters={
            'total': Visit.query.count(), 'today': Visit.query.filter(Visit.timestamp >= today).count(),
            'week': Visit.query.filter(Visit.timestamp >= week).count(), 'month': Visit.query.filter(Visit.timestamp >= month).count()
        },
        donation_counters={
            'total': DonationClick.query.count(), 'today': DonationClick.query.filter(DonationClick.timestamp >= today).count(),
            'week': DonationClick.query.filter(DonationClick.timestamp >= week).count(), 'month': DonationClick.query.filter(DonationClick.timestamp >= month).count()
        },
        top_cities=db.session.query(Visit.city, db.func.count(Visit.city)).filter(Visit.city.isnot(None)).group_by(Visit.city).order_by(db.func.count(Visit.city).desc()).limit(5).all(),
        top_countries=db.session.query(Visit.country, db.func.count(Visit.country)).filter(Visit.country.isnot(None)).group_by(Visit.country).order_by(db.func.count(Visit.country).desc()).limit(5).all(),
        current_period=period,
        current_user_name=current_user.username,
        subscribers=Subscriber.query.order_by(Subscriber.created_at.desc()).limit(100).all()
    )

@app.route('/admin/subscribers')
@login_required
def admin_subscribers():
    return render_template('admin_subscribers.html', subscribers=Subscriber.query.order_by(Subscriber.created_at.desc()).all(), current_user_name=current_user.username)

# --- CRUD ACTIONS ---
@app.route('/admin/subscribers/<int:sub_id>/edit', methods=['POST'])
@login_required
def admin_subscriber_edit(sub_id):
    sub = Subscriber.query.get_or_404(sub_id)
    name = (request.form.get('name') or '').strip()
    email = (request.form.get('email') or '').strip().lower()

    if not name or not email:
        return jsonify({'success': False, 'message': 'Nome e email são obrigatórios.'}), 400

    if Subscriber.query.filter(Subscriber.email == email, Subscriber.id != sub_id).first():
        return jsonify({'success': False, 'message': 'Este email já está em uso.'}), 400

    sub.name, sub.email = name, email
    db.session.commit()
    return jsonify({'success': True, 'message': 'Subscritor atualizado.'})

@app.route('/admin/subscribers/<int:sub_id>/delete', methods=['POST'])
@login_required
def admin_subscriber_delete(sub_id):
    sub = Subscriber.query.get_or_404(sub_id)
    db.session.delete(sub)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Subscritor eliminado.'})

@app.route('/admin/subscribers/<int:sub_id>/block', methods=['POST'])
@login_required
def admin_subscriber_block(sub_id):
    sub = Subscriber.query.get_or_404(sub_id)
    sub.blocked = not sub.blocked
    sub.blocked_at = datetime.utcnow() if sub.blocked else None
    if sub.blocked:
        sub.unsubscribed = True
        sub.consent_marketing = False
    db.session.commit()
    return jsonify({'success': True, 'message': 'Estado alterado.', 'blocked': sub.blocked})


@app.route('/admin/subscribers/send-email', methods=['POST'])
@login_required
def admin_send_email():
    data = request.get_json()
    subscriber_ids = data.get('ids', [])
    subject = data.get('subject', '').strip()
    message = data.get('message', '').strip()

    if not subscriber_ids or not subject or not message:
        return jsonify({'success': False, 'message': 'Faltam dados ou nenhum subscritor selecionado.'}), 400

    # Vai buscar os subscritores (ignorando os bloqueados e os cancelados)
    subscribers = Subscriber.query.filter(
        Subscriber.id.in_(subscriber_ids),
        Subscriber.blocked == False,
        Subscriber.unsubscribed == False
    ).all()

    if not subscribers:
        return jsonify({'success': False, 'message': 'Nenhum subscritor válido encontrado na seleção.'}), 400

    sucesso = 0
    falha = 0

    for sub in subscribers:
        try:
            # Substitui a tag {name} na mensagem caso o admin a tenha usado
            send_campaign_email(sub.email, sub.name, subject, message)
            sucesso += 1
        except Exception:
            falha += 1

    return jsonify({
        'success': True, 
        'message': f'Enviados: {sucesso}. Falhas: {falha}.'
    })

# ============================================================
# ERRO 404
# ============================================================
@app.errorhandler(404)
def page_not_found(e):
    return render_template("404.html"), 404

# ============================================================
# API DE GESTÃO DE ADMINISTRADORES (Protegida pelo SECRET_KEY)
# ============================================================
@app.route('/api/admin/users/create', methods=['POST'])
def api_create_admin():
    # Verifica se o pedido tem o token correto
    if request.headers.get('X-Admin-Token') != os.getenv('SECRET_KEY'):
        return jsonify({'error': 'Não autorizado'}), 401

    username = request.form.get('username')
    password = request.form.get('password')

    if not username or not password:
        return jsonify({'error': 'Username e password são obrigatórios'}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Este username já existe'}), 400

    new_user = User(username=username)
    new_user.set_password(password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({'success': True, 'message': f'Admin "{username}" criado com sucesso.'}), 201


@app.route('/api/admin/users/delete', methods=['POST'])
def api_delete_admin():
    if request.headers.get('X-Admin-Token') != os.getenv('SECRET_KEY'):
        return jsonify({'error': 'Não autorizado'}), 401

    username = request.form.get('username')

    if not username:
        return jsonify({'error': 'O username é obrigatório'}), 400

    # Impede que o admin principal se apague a si próprio (opcional, mas recomendado)
    if username == os.getenv('ADMIN_USER'):
        return jsonify({'error': 'Não podes apagar o administrador principal.'}), 403

    user = User.query.filter_by(username=username).first()
    if not user:
        return jsonify({'error': 'Utilizador não encontrado'}), 404

    db.session.delete(user)
    db.session.commit()

    return jsonify({'success': True, 'message': f'Admin "{username}" eliminado com sucesso.'}), 200


@app.route('/api/admin/users/list', methods=['GET'])
def api_list_admins():
    if request.headers.get('X-Admin-Token') != os.getenv('SECRET_KEY'):
        return jsonify({'error': 'Não autorizado'}), 401

    users = User.query.all()
    user_list = [{'id': u.id, 'username': u.username, 'created_at': u.created_at} for u in users]
    return jsonify({'users': user_list}), 200

if __name__ == "__main__":
    app.run(debug=True)