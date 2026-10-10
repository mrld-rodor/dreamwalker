import os
from dotenv import load_dotenv

load_dotenv()

email_api_url = os.getenv('EMAIL_API_URL', 'https://api.resend.com/emails')
email_api_timeout = float(os.getenv('EMAIL_API_TIMEOUT', '10'))
email_api_key = os.getenv('RESEND_API_KEY')
email_sender = os.getenv('EMAIL_SENDER')
email_receiver = os.getenv('EMAIL_RECEIVER')

# Aviso simples para facilitar depuração em produção (Render: Config Vars)
missing = []
if not email_api_key:
    missing.append('RESEND_API_KEY')
if not email_sender:
    missing.append('EMAIL_SENDER')
if not email_receiver:
    missing.append('EMAIL_RECEIVER')

if missing:
    print(f"[WARN] Variáveis de email ausentes: {', '.join(missing)}. Defina-as nas Config Vars do Render ou no .env.")