# Dreamwalker Tales

O Dreamwalker Tales é uma landing page literária para um projeto de contos baseados em sonhos lúcidos reais. O site serve como vitrine para os livros e conta com um sistema de captação de leads (newsletter), autenticação de usuários (para liberar ações específicas) e um painel administrativo para gerenciar os dados.

Link do site: [dreamwalkertales.online](https://dreamwalkertales.online)

## Tecnologias

**Backend:**
* Python e Flask
* SQLAlchemy com PostgreSQL (hospedado na Neon)
* Flask-Login (para sessão do painel admin)
* Authlib (integração com Google OAuth)
* Resend (envio de emails)

**Frontend:**
* HTML e Jinja2
* Tailwind CSS e CSS puro
* JavaScript Vanilla
* Fontes próprias (Orbitron, Amatic SC e Roboto Mono)

## O que o site faz

**Para os visitantes:**
* Navegação livre por todo o conteúdo (contos, sinopses, autor).
* Login opcional com conta Google ou por e-mail.
* O sistema de e-mail usa "duplo opt-in" (envia um link de confirmação) para garantir a privacidade (RGPD). Se o usuário já tiver conta, ele recebe um link mágico para entrar sem precisar de senha.
* A leitura é livre, mas ações como comprar na Hotmart, doar ou enviar uma mensagem exigem que o usuário se identifique.

**Para o administrador:**
* Painel com estatísticas de visitas (cidade, país, IP) e cliques no botão de doação.
* Gestão de subscritores: pode editar, bloquear (impede o acesso) ou excluir contas.
* Ferramenta de email marketing: dispara emails em massa para os subscritores selecionados, usando templates prontos e variáveis como `{name}`.

## Estrutura do projeto

```text
dreamwalker/
├── app.py                 # Rotas, controladores e inicialização do site
├── control/
│   ├── database.py        # Conexão com o banco de dados
│   ├── models.py          # Tabelas (User, Visit, Subscriber)
│   ├── email_config.py    # Credenciais do serviço de email
│   └── email_sender.py    # Funções de envio de email
├── templates/             # Arquivos HTML
└── static/
    ├── css/               # Estilos (Tailwind e custom)
    ├── js/                # Lógica do frontend
    └── img/               # Imagens e logos