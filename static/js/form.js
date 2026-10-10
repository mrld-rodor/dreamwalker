// ============================================================
// MÁSCARA DE TELEFONE
// ============================================================
const telefoneInput = document.getElementById('telefone');
if (telefoneInput) {
    telefoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        value = value.slice(0, 11);
        if (value.length > 0) {
            if (value.length <= 2) {
                value = `(${value}`;
            } else if (value.length <= 6) {
                value = `(${value.slice(0,2)}) ${value.slice(2)}`;
            } else if (value.length <= 10) {
                value = `(${value.slice(0,2)}) ${value.slice(2,6)}-${value.slice(6)}`;
            } else {
                value = `(${value.slice(0,2)}) ${value.slice(2,7)}-${value.slice(7)}`;
            }
        }
        e.target.value = value;
    });

    telefoneInput.addEventListener('keypress', function(e) {
        const char = String.fromCharCode(e.keyCode);
        if (!/[0-9()\-\s]/.test(char)) {
            e.preventDefault();
        }
    });
}

// ============================================================
// ENVIO DO FORMULÁRIO COM HONEYPOT + TEMPO MÍNIMO
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.querySelector('.sg-contact-form form');
    if (!contactForm) return;

    // Registra o momento em que o formulário foi carregado
    const formStart = Date.now();

    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData(contactForm);
        // Adiciona o tempo de preenchimento (em segundos) para validação no servidor
        formData.append('form_start', formStart / 1000);

        const submitBtn = contactForm.querySelector('.sg-form-submit');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Enviando...';
        submitBtn.disabled = true;

        try {
            const response = await fetch('/enviar-contato', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (data.success) {
                showFeedback('success', data.message);
                contactForm.reset();
            } else {
                showFeedback('error', data.message || 'Erro ao enviar. Tente novamente.');
            }
        } catch (error) {
            showFeedback('error', 'Erro de conexão. Tente novamente mais tarde.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
});

// ============================================================
// FUNÇÃO DE FEEDBACK
// ============================================================
function showFeedback(type, message) {
    const feedbackModal = document.getElementById('feedback-modal');
    const feedbackBody = document.getElementById('feedback-body');
    const feedbackClose = document.getElementById('feedback-close');
    const feedbackOverlay = document.getElementById('feedback-overlay');

    if (!feedbackModal) return;

    const title = type === 'success' ? 'Tudo certo!' : 'Ops! Algo deu errado.';
    const logoUrl = "/static/images/logo_logo_header.png"; 
    const formattedMessage = message ? message.replace(/\n/g, '<br>') : '';
    
    feedbackBody.innerHTML = `
        <img src="${logoUrl}" alt="Espaço Girassol" class="sg-feedback-icon sg-mobile-coin">
        <h3 class="sg-feedback-title">${title}</h3>
        <p class="sg-feedback-message">${formattedMessage}</p>
    `;

    feedbackModal.classList.add('visible');
    document.body.style.overflow = 'hidden';

    feedbackClose.addEventListener('click', closeFeedback);
    feedbackOverlay.addEventListener('click', closeFeedback);

    function closeFeedback() {
        feedbackModal.classList.remove('visible');
        document.body.style.overflow = '';
        feedbackClose.removeEventListener('click', closeFeedback);
        feedbackOverlay.removeEventListener('click', closeFeedback);
    }
}