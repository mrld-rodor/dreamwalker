import traceback
from html import escape

import requests
from flask import url_for

from control.email_config import (
    email_api_key,
    email_api_timeout,
    email_api_url,
    email_receiver,
    email_sender,
)


class EmailDeliveryError(Exception):
    """Erro base para falhas no envio de email."""


class EmailNetworkError(EmailDeliveryError):
    """Falha de conectividade com a API."""


class Contato:
    def __init__(self, nome, email, mensagem):
        self.nome = nome
        self.email = email
        self.mensagem = mensagem


def _build_logo_url():
    return url_for(
        'static',
        filename='img/amiraldo_logo_transparent_circl_crope.png',
        _external=True,
    )


def _build_plain_text(contato):
    return f"""
Nova mensagem — Dreamwalker Tales

Nome: {contato.nome}
Email: {contato.email}

Mensagem:
{contato.mensagem}
""".strip()


def _build_html_email(contato):
    nome     = escape(contato.nome)
    email    = escape(contato.email)
    mensagem = escape(contato.mensagem).replace('\n', '<br>')
    logo_url = _build_logo_url()

    return f"""
<!DOCTYPE html>
<html lang="pt">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nova mensagem — Dreamwalker Tales</title>
</head>
<body style="margin:0; padding:0; background-color:#000000; color:#FFFFFF; font-family:'Roboto Mono', 'Courier New', monospace;">

  <div style="background: radial-gradient(circle at top, #0a0a2e 0%, #000000 70%); padding: 32px 16px;">

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
           style="max-width: 680px; margin: 0 auto; border-collapse: collapse;">
      <tr>
        <td style="padding: 0;">
          <div style="border: 1px solid rgba(107, 104, 255, 0.35); background: #0a0a14; border-radius: 12px; overflow: hidden; box-shadow: 0 0 40px rgba(58, 54, 255, 0.25), 0 20px 60px rgba(0, 0, 0, 0.7);">

            <!-- CABEÇALHO -->
            <div style="padding: 36px 28px 28px; border-bottom: 1px solid rgba(6, 3, 180, 0.4); text-align: center; background: linear-gradient(180deg, #0a0a14 0%, #04041a 100%);">

              <div style="display: inline-block; padding: 8px 18px; border: 1px solid rgba(107, 104, 255, 0.5); border-radius: 9999px; color: #6B68FF; font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; background: rgba(6, 3, 180, 0.15);">
                ✦ Nova mensagem recebida
              </div>

              <div style="margin: 24px 0 16px;">
                <img src="{logo_url}" alt="Dreamwalker Tales" style="width: 96px; max-width: 96px; height: auto; display: inline-block; filter: drop-shadow(0 0 16px rgba(58, 54, 255, 0.6));">
              </div>

              <h1 style="margin: 0; color: #FFFFFF; font-family: 'Orbitron', 'Arial Black', sans-serif; font-size: 22px; font-weight: 900; letter-spacing: 0.2em; line-height: 1.2; text-shadow: 0 0 10px rgba(139, 136, 255, 0.5), 0 0 24px rgba(58, 54, 255, 0.3);">
                DREAMWALKER TALES
              </h1>

              <p style="margin: 10px 0 0; color: #6B68FF; font-size: 11px; font-weight: 600; letter-spacing: 0.25em; text-transform: uppercase;">
                Histórias nascidas dos sonhos
              </p>
            </div>

            <!-- CORPO -->
            <div style="padding: 32px 28px 8px;">

              <div style="background: rgba(6, 3, 180, 0.08); border: 1px solid rgba(107, 104, 255, 0.3); border-radius: 10px; padding: 20px 22px; margin-bottom: 24px;">
                <div style="color: #6B68FF; text-transform: uppercase; letter-spacing: 0.22em; font-size: 10px; font-weight: 700; margin-bottom: 12px;">
                  ◆ Remetente
                </div>
                <div style="font-size: 20px; color: #FFFFFF; font-family: 'Orbitron', 'Arial Black', sans-serif; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 6px;">
                  {nome}
                </div>
                <div style="font-size: 13px; color: #9CA3AF; letter-spacing: 0.03em;">
                  {email}
                </div>
              </div>

              <div style="margin-bottom: 24px;">
                <div style="color: #6B68FF; text-transform: uppercase; letter-spacing: 0.22em; font-size: 10px; font-weight: 700; margin-bottom: 10px;">
                  ◆ Mensagem
                </div>
                <div style="background: #05051a; border-left: 3px solid #3A36FF; border-radius: 6px; padding: 22px 24px; color: #D3D3D3; font-size: 14px; line-height: 1.8; font-family: 'Roboto Mono', 'Courier New', monospace; box-shadow: inset 0 0 20px rgba(58, 54, 255, 0.1);">
                  {mensagem}
                </div>
              </div>

              <div style="text-align: center; margin: 32px 0 12px;">
                <a href="mailto:{email}" style="display: inline-block; padding: 14px 36px; background: #0603B4; color: #FFFFFF; text-decoration: none; border-radius: 4px; font-family: 'Orbitron', 'Arial Black', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; border: 1px solid rgba(107, 104, 255, 0.5); box-shadow: 0 0 20px rgba(58, 54, 255, 0.5), 0 0 40px rgba(58, 54, 255, 0.25);">
                  Responder
                </a>
              </div>

            </div>

            <!-- RODAPÉ -->
            <div style="padding: 22px 28px 28px; text-align: center; border-top: 1px solid rgba(6, 3, 180, 0.3); background: rgba(6, 3, 180, 0.05); color: #9CA3AF; font-size: 11px; letter-spacing: 0.1em;">
              <div style="margin-bottom: 8px;">
                ✦ Enviado automaticamente pelo formulário do site
              </div>
              <div style="color: #6B68FF; font-weight: 600; letter-spacing: 0.2em; text-transform: uppercase;">
                Dreamwalker Tales
              </div>
            </div>

          </div>
        </td>
      </tr>
    </table>
  </div>

</body>
</html>
    """.strip()


def send_email(contato):
    html_body = _build_html_email(contato)
    text_body = _build_plain_text(contato)

    if not email_api_key or not email_sender or not email_receiver:
        missing = []
        if not email_api_key:
            missing.append('RESEND_API_KEY')
        if not email_sender:
            missing.append('EMAIL_SENDER')
        if not email_receiver:
            missing.append('EMAIL_RECEIVER')
        raise EmailDeliveryError(f"Configuração de email incompleta: {', '.join(missing)}")

    email_receiver_list = [email.strip() for email in email_receiver.split(',') if email.strip()]

    try:
        payload = {
            'from': email_sender,
            'to': email_receiver_list,
            'subject': f'Nova mensagem no Dreamwalker Tales — {contato.nome}',
            'reply_to': contato.email,
            'html': html_body,
            'text': text_body,
        }

        response = requests.post(
            email_api_url,
            headers={
                'Authorization': f'Bearer {email_api_key}',
                'Content-Type': 'application/json',
            },
            json=payload,
            timeout=email_api_timeout,
        )
        response.raise_for_status()
        print('[INFO] Email enviado com sucesso.')
        return 202

    except requests.exceptions.Timeout as e:
        raise EmailNetworkError('Timeout na comunicação com o provedor de email') from e
    except requests.exceptions.ConnectionError as e:
        raise EmailNetworkError('Provedor de email indisponível') from e
    except requests.exceptions.HTTPError as e:
        body = e.response.text if e.response is not None else ''
        print(f"[ERROR] API retornou erro HTTP: {body}")
        raise EmailDeliveryError('Provedor de email rejeitou a solicitação') from e
    except Exception as e:
        print(f"[ERROR] Erro ao enviar email: {e}")
        print(traceback.format_exc())
        raise EmailDeliveryError("Erro inesperado ao enviar email") from e