# Dreamwalker

Landing page do projeto **Dreamwalker** — uma coleção de contos baseados em sonhos lúcidos reais do autor.

## Sobre

Dreamwalker é um projeto literário que transforma experiências reais de sonhos lúcidos em contos. Cada história nasce de uma experiência vivida, tornando cada narrativa única e autêntica.

Este repositório contém a landing page onde os leitores podem conhecer o projeto, o autor, e adquirir os contos em PDF.

## Stack

- **Backend:** Python + Flask
- **Frontend:** HTML + Tailwind CSS + JavaScript
- **Deploy:** Vercel
- **Email:** Resend

## Como correr localmente

```bash
# 1. Clonar o repositório
git clone <url-do-repo>
cd dreamwalker

# 2. Criar e ativar o ambiente virtual
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

# 3. Instalar dependências
pip install -r requirements.txt

# 4. Correr o servidor de desenvolvimento
python api/index.py
```

O site fica disponível em `http://localhost:5000`.

## Estrutura do projeto

```
dreamwalker/
├── api/              # Backend Flask (funções serverless no Vercel)
├── templates/        # HTMLs renderizados pelo Flask
├── static/           # Ficheiros estáticos (CSS, JS, imagens)
├── requirements.txt  # Dependências Python
├── vercel.json       # Configuração do Vercel
└── README.md         # Este ficheiro
```

## Autor

**Dreamwalker** — projeto literário de Rodor Xes