from flask import Flask, render_template

import time
from collections import defaultdict
from flask import jsonify, request

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

if __name__ == "__main__":
    app.run(debug=True)