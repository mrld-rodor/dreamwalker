// script.js — comportamentos da landing Dreamwalker

document.addEventListener('DOMContentLoaded', () => {

  // ============================================================
  // ELEMENTOS GLOBAIS
  // ============================================================
  const header = document.querySelector('.navbar');
  const toggle = document.getElementById('menu-toggle');
  const menu   = document.getElementById('mobile-menu');

  // ============================================================
  // HELPERS DE LOGIN — definidos cedo para estarem acessíveis
  // ============================================================
  function isSubscriberLoggedIn() {
    return document.body.dataset.subscriber === 'true';
  }

  function openLoginModal(pendingAction) {
    if (pendingAction) {
      try {
        sessionStorage.setItem('dw_pending_action', JSON.stringify(pendingAction));
      } catch (err) {
        console.warn('[login-modal] sessionStorage bloqueado:', err);
      }
    }

    // Em vez de abrir o modal antigo, abre o modal completo de subscrição
    openSubscribeModal();
  }


  // ============================================================
  // MENU MOBILE — abrir/fechar
  // ============================================================
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      menu.classList.toggle('hidden');
      menu.classList.toggle('flex');
    });

    // Fechar o menu ao clicar num link
    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('open');
        menu.classList.add('hidden');
        menu.classList.remove('flex');
      });
    });
  }

  // ============================================================
  // HEADER — esconder ao descer / mostrar ao subir (só mobile)
  // ============================================================
  const isMobile = () => window.innerWidth < 768;
  const SHOW_AT_TOP = 80;

  // Bloqueia o reaparecimento do header até o utilizador interagir manualmente
  let suppressHeaderReveal = false;

  // Deteta interação real do utilizador (roda, toque, teclado)
  function userIsScrolling() {
    suppressHeaderReveal = false;
  }
  window.addEventListener('wheel',       userIsScrolling, { passive: true });
  window.addEventListener('touchstart',  userIsScrolling, { passive: true });
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
      userIsScrolling();
    }
  });

  // ============================================================
  // LINKS INTERNOS — esconder header ao navegar (só mobile)
  // ============================================================
  // Apanha links que apontam para âncoras: "#...", "/#...", ou "/"
  const internalLinks = document.querySelectorAll('a[href^="#"], a[href^="/#"], a[href="/"]');

  internalLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth < 768) {
        header.classList.add('is-hidden');
        suppressHeaderReveal = true;
      }
    });
  });

  // ============================================================
  // SCROLL HANDLER — esconde/mostra o header
  // ============================================================
  let lastScrollY = window.pageYOffset;
  let ticking = false;

  function handleScroll() {
    const currentY = window.pageYOffset;

    // Desktop → header sempre visível
    if (!isMobile()) {
      header.classList.remove('is-hidden');
      lastScrollY = currentY;
      ticking = false;
      return;
    }

    // Perto do topo → sempre visível
    if (currentY < SHOW_AT_TOP) {
      header.classList.remove('is-hidden');
      suppressHeaderReveal = false;
    }
    // A descer → esconde
    else if (currentY > lastScrollY) {
      header.classList.add('is-hidden');
      if (menu && !menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
        menu.classList.remove('flex');
        if (toggle) toggle.classList.remove('open');
      }
    }
    // A subir → mostra, MAS só se não estiver bloqueado
    else if (currentY < lastScrollY && !suppressHeaderReveal) {
      header.classList.remove('is-hidden');
    }

    lastScrollY = currentY;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(handleScroll);
      ticking = true;
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (!isMobile()) {
      header.classList.remove('is-hidden');
    }
    lastScrollY = window.pageYOffset;
  });

  // ============================================================
  // CARROSSEL DE CONTOS
  // ============================================================
  const carousel = document.getElementById('contos-carousel');
  const modal    = document.getElementById('conto-modal');

  if (carousel) {
    const track   = document.getElementById('carousel-track');
    const slides  = carousel.querySelectorAll('.carousel-slide');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const input   = document.getElementById('carousel-input');
    const total   = slides.length;

    let current = 0;
    let autoplayId = null;
    const AUTOPLAY_DELAY = 6000;

    function goTo(index) {
      if (index < 0) index = total - 1;
      if (index >= total) index = 0;
      current = index;
      track.style.transform = `translateX(-${current * 100}%)`;
      if (input) input.value = current + 1;
    }

    function goNext() { goTo(current + 1); }
    function goPrev() { goTo(current - 1); }

    function startAutoplay() {
      stopAutoplay();
      autoplayId = setInterval(goNext, AUTOPLAY_DELAY);
    }

    function stopAutoplay() {
      if (autoplayId) {
        clearInterval(autoplayId);
        autoplayId = null;
      }
    }

    window.__carouselStopAutoplay  = stopAutoplay;
    window.__carouselStartAutoplay = startAutoplay;

    if (nextBtn) nextBtn.addEventListener('click', () => { goNext(); startAutoplay(); });
    if (prevBtn) prevBtn.addEventListener('click', () => { goPrev(); startAutoplay(); });

    if (input) {
      const jump = () => {
        let n = parseInt(input.value, 10);
        if (isNaN(n)) { input.value = current + 1; return; }
        n = Math.max(1, Math.min(total, n));
        goTo(n - 1);
        startAutoplay();
      };
      input.addEventListener('change', jump);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); jump(); input.blur(); }
      });
    }

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', () => {
      setTimeout(() => {
        if (!carousel.contains(document.activeElement)) startAutoplay();
      }, 100);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    });

    goTo(0);
    startAutoplay();
  }

  // ============================================================
  // MODAL DE CONTO
  // ============================================================
  if (modal) {
    const modalCover    = document.getElementById('modal-cover');
    const modalNumber   = document.getElementById('modal-number');
    const modalTitle    = document.getElementById('modal-title');
    const modalSynopsis = document.getElementById('modal-synopsis');
    const modalBuy      = document.getElementById('modal-buy');
    const body          = modal.querySelector('.conto-modal-body');
    const slides        = document.querySelectorAll('.carousel-slide');

    let lastFocused = null;

    function openModal(slide) {
      const num   = slide.dataset.number || '';
      const title = slide.dataset.title  || '';
      const cover = slide.dataset.cover  || '';
      const buy   = slide.dataset.buy    || '#';

      // Sinopse: procura primeiro o <div hidden>, depois o data-attribute (fallback)
      const hiddenSynopsis = slide.querySelector('.conto-synopsis-data');

      modalNumber.textContent = num;
      modalTitle.textContent  = title;
      modalCover.src          = cover;
      modalCover.alt          = `Capa de ${title}`;
      modalBuy.href           = buy;

      // Aplica a sinopse (HTML se for div, texto se for data-attribute)
      if (hiddenSynopsis) {
        modalSynopsis.innerHTML = hiddenSynopsis.innerHTML;
      } else {
        modalSynopsis.textContent = slide.dataset.synopsisLong || '';
      }

      // Reset do scroll da sinopse
      if (body) body.scrollTop = 0;

      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');

      lastFocused = document.activeElement;

      const closeBtn = modal.querySelector('.conto-modal-close');
      if (closeBtn) closeBtn.focus();

      if (window.__carouselStopAutoplay) window.__carouselStopAutoplay();
    }

    function closeModal() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');

      if (lastFocused) lastFocused.focus();
      if (window.__carouselStartAutoplay) window.__carouselStartAutoplay();
    }

    // Clique no card OU no botão "VER DETALHES" abre o modal
    slides.forEach(slide => {
      slide.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(slide);
      });
    });

    // Botão "Comprar" dentro do modal do conto → requer login
    if (modalBuy) {
      modalBuy.addEventListener('click', (e) => {
        if (!isSubscriberLoggedIn()) {
          e.preventDefault();
          openLoginModal({
            type: 'hotmart',
            url: modalBuy.href
          });
        }
      });
    }

    modal.querySelectorAll('[data-close-modal]').forEach(el => {
      el.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) {
        closeModal();
      }
    });
  }

    // ============================================================
  // FLASH MESSAGES — auto-fade
  // ============================================================
  const flashMessages = document.querySelectorAll('.flash-message');

  flashMessages.forEach(msg => {
    setTimeout(() => {
      msg.classList.add('is-hiding');
      setTimeout(() => msg.remove(), 500);
    }, 6000);   // 6 segundos
  });

  // ============================================================
  // ANIMAÇÕES DE ENTRADA — IntersectionObserver
  // ============================================================
  const animatedEls = document.querySelectorAll('[data-anime]');

  if (animatedEls.length > 0 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    });

    animatedEls.forEach(el => observer.observe(el));
  } else {
    animatedEls.forEach(el => el.classList.add('is-visible'));
  }

  // ============================================================
  // FORMULÁRIO DE CONTACTO + MODAL DE FEEDBACK
  // ============================================================
  const contactForm = document.getElementById('contact-form');

  if (contactForm) {
    const formStart       = document.getElementById('form-start');
    const feedbackModal   = document.getElementById('feedback-modal');
    const feedbackOverlay = document.getElementById('feedback-overlay');
    const feedbackClose   = document.getElementById('feedback-close');
    const feedbackTitle   = document.getElementById('feedback-title');
    const feedbackMsg     = document.getElementById('feedback-message');

    let autoCloseTimer = null;

    // ------------------------------------------------------------
    // Limpa o formulário completamente
    // ------------------------------------------------------------
    function clearForm() {
      // Não usamos o contactForm.reset() para não apagar os campos já preenchidos
      
      contactForm.querySelectorAll('input:not([type="hidden"]), textarea').forEach(field => {
        // Se não for o honeypot E não for um campo bloqueado, limpa
        if (field.name !== 'website' && !field.hasAttribute('readonly')) {
          field.value = '';
        }
      });
      
      if (formStart) formStart.value = (Date.now() / 1000).toString();
    }

    // Limpa ao carregar a página (evita cache do browser)
    clearForm();

    // Limpa também quando a página volta do bfcache (botão "atrás")
    window.addEventListener('pageshow', clearForm);

    // ------------------------------------------------------------
    // Modal de feedback
    // ------------------------------------------------------------
    function openFeedback(type, message) {
      if (!feedbackModal) return;

      feedbackModal.classList.remove('is-success', 'is-error');
      feedbackModal.classList.add('is-open');
      feedbackModal.classList.add(type === 'success' ? 'is-success' : 'is-error');
      feedbackModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');

      feedbackTitle.textContent = type === 'success'
        ? 'Mensagem enviada!'
        : 'Ops, algo falhou';
      feedbackMsg.textContent = message || '';

      // Reinicia a animação da barra de countdown
      const bar = feedbackModal.querySelector('.feedback-timer-bar');
      if (bar) {
        bar.style.animation = 'none';
        void bar.offsetWidth;
        bar.style.animation = '';
      }

      // Auto-fecha em 5 segundos
      clearTimeout(autoCloseTimer);
      autoCloseTimer = setTimeout(closeFeedback, 5000);
    }

    function closeFeedback() {
      if (!feedbackModal) return;
      feedbackModal.classList.remove('is-open', 'is-success', 'is-error');
      feedbackModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      clearTimeout(autoCloseTimer);
    }

    if (feedbackClose)   feedbackClose.addEventListener('click', closeFeedback);
    if (feedbackOverlay) feedbackOverlay.addEventListener('click', closeFeedback);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && feedbackModal.classList.contains('is-open')) {
        closeFeedback();
      }
    });

    // ------------------------------------------------------------
    // Submissão do formulário
    // ------------------------------------------------------------
    contactForm.addEventListener('submit', async (e) => {
      // Bloqueia se não estiver autenticado
      if (!isSubscriberLoggedIn()) {
        e.preventDefault();

        // Guarda os dados do formulário para retomar depois do login
        const formData = new FormData(contactForm);
        const data = {};
        formData.forEach((v, k) => {
          if (k !== 'website' && k !== 'form_start') data[k] = v;
        });

        openLoginModal({ type: 'contact', formData: data });
        return;
      }

      // A partir daqui, é o comportamento normal (utilizador autenticado)
      e.preventDefault();

      const submitBtn = contactForm.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : '';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'A ENVIAR...';
      }

      try {
        const formData = new FormData(contactForm);

        const response = await fetch('/enviar-contato', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (data.success) {
          openFeedback('success', data.message);
          clearForm();
        } else {
          openFeedback('error', data.message || 'Erro ao enviar. Tente novamente.');
        }
      } catch (err) {
        console.error('[Contact form]', err);
        openFeedback('error', 'Erro de rede. Verifique a ligação e tente novamente.');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      }
    });
  }

  // ============================================================
  // RASTREAR CLIQUES NO BOTÃO DE DOAÇÃO
  // ============================================================
  const donationButtons = document.querySelectorAll('.donation-btn');

  donationButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Se não está autenticado, abre o modal de login
      if (!isSubscriberLoggedIn()) {
        e.preventDefault();
        openLoginModal({ type: 'donation' });
        return;
      }

      // Autenticado → deixa clicar normalmente + tracking
      fetch('/api/donation-click', { method: 'POST', keepalive: true })
        .catch(err => console.warn('[donation-click] falhou:', err));
    });
  });

  
  // ------------------------------------------------------------
  // Retomar ação após login
  // ------------------------------------------------------------
  function showContinueToast(message) {
    // Remove se já existir
    const existing = document.querySelector('.pending-action-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'pending-action-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Auto-remove após 8 segundos
    setTimeout(() => {
      toast.classList.add('is-hiding');
      setTimeout(() => toast.remove(), 400);
    }, 8000);
  }

  function highlightPendingButton(btn) {
    if (!btn) return;
    btn.classList.add('is-pending-action');
    setTimeout(() => btn.classList.remove('is-pending-action'), 8000);
  }

  if (isSubscriberLoggedIn()) {
    const pendingRaw = sessionStorage.getItem('dw_pending_action');

    if (pendingRaw) {
      sessionStorage.removeItem('dw_pending_action');

      try {
        const pending = JSON.parse(pendingRaw);

        setTimeout(() => {

          // // ---- DOAÇÃO ----
          // if (pending.type === 'donation') {
          //   const btn = document.querySelector('.donation-btn');
          //   if (btn) {
          //     btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
          //     highlightPendingButton(btn);
          //     showContinueToast('Sessão iniciada! Clica novamente para continuar.');
          //   }
          // }

          // ---- HOTMART ----
          if (pending.type === 'hotmart') {
            const btn = document.querySelector('.btn-primary.conto-modal-btn')
                     || document.getElementById('modal-buy');
            if (btn) {
              btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
              highlightPendingButton(btn);
              showContinueToast('Sessão iniciada! Clica novamente para comprar.');
            }
          }

          // ---- CONTACTO ----
          else if (pending.type === 'contact') {
            const form = document.getElementById('contact-form');
            if (form && pending.formData) {
              ['nome', 'email', 'mensagem'].forEach(field => {
                const input = form.querySelector(`[name="${field}"]`);
                if (input && pending.formData[field]) {
                  input.value = pending.formData[field];
                }
              });

              const contactSection = document.getElementById('contacto');
              if (contactSection) {
                contactSection.scrollIntoView({ behavior: 'smooth' });
              }

              showContinueToast('Sessão iniciada! Clica em ENVIAR para completar.');

              const submitBtn = form.querySelector('button[type="submit"]');
              if (submitBtn) {
                setTimeout(() => {
                  highlightPendingButton(submitBtn);
                  submitBtn.focus();
                }, 600);
              }
            }
          }

        }, 400);

      } catch (err) {
        console.warn('[login-resume] falhou:', err);
      }
    }
  }

  // ============================================================
  // BOTÃO FLUTUANTE + MODAL DE SUBSCRIÇÃO (COM ARRASTO)
  // ============================================================
  const subscribeFab       = document.getElementById('subscribe-fab');
  const subscribeModal     = document.getElementById('subscribe-modal');
  const subscribeForm      = document.getElementById('subscribe-form');

  function openSubscribeModal() {
    if (!subscribeModal) return;
    subscribeModal.classList.add('is-open');
    subscribeModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeSubscribeModal() {
    if (!subscribeModal) return;
    subscribeModal.classList.remove('is-open');
    subscribeModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }

  if (subscribeFab && subscribeModal) {
    // 1. Tentar restaurar a posição (se existir e for válida)
    const storedX = localStorage.getItem('fab_x');
    const storedY = localStorage.getItem('fab_y');

    if (storedX !== null && storedY !== null) {
      const px = parseFloat(storedX);
      const py = parseFloat(storedY);
      
      // Só aplica se os valores forem reais (não NaN) e estiverem dentro do ecrã
      if (!isNaN(px) && !isNaN(py) && px > 0 && py > 0 && px < window.innerWidth && py < window.innerHeight) {
        subscribeFab.style.transform = `translate(${px}px, ${py}px)`;
        subscribeFab.style.bottom = 'auto';
        subscribeFab.style.right = 'auto';
      } else {
        localStorage.removeItem('fab_x');
        localStorage.removeItem('fab_y');
      }
    }

    // 2. Lógica de Arrasto (Drag)
    let isDragging = false;
    let hasMoved = false;
    let startX, startY;
    let startLeft, startTop; // Posição onde o dedo tocou

    subscribeFab.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      
      // Pega a posição exata do botão no ecrã naquele milissegundo
      const rect = subscribeFab.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;

      // Fixa o botão nessa posição para começar a arrastar
      subscribeFab.style.transform = `translate(${startLeft}px, ${startTop}px)`;
      subscribeFab.style.bottom = 'auto';
      subscribeFab.style.right = 'auto';

      startX = e.clientX;
      startY = e.clientY;

      isDragging = true;
      hasMoved = false;
      subscribeFab.setPointerCapture(e.pointerId);
    });

    subscribeFab.addEventListener('pointermove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        hasMoved = true;
      }

      let newX = startLeft + deltaX;
      let newY = startTop + deltaY;

      // Limites (para não sair do ecrã)
      const maxX = window.innerWidth - subscribeFab.offsetWidth;
      const maxY = window.innerHeight - subscribeFab.offsetHeight;

      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      subscribeFab.style.transform = `translate(${newX}px, ${newY}px)`;
    });

    subscribeFab.addEventListener('pointerup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      subscribeFab.releasePointerCapture(e.pointerId);

      // Guarda a posição final onde o utilizador soltou o dedo
      const finalRect = subscribeFab.getBoundingClientRect();
      localStorage.setItem('fab_x', finalRect.left);
      localStorage.setItem('fab_y', finalRect.top);

      // Se foi apenas um clique (e não um arrasto), abre o modal
      if (!hasMoved) {
        openSubscribeModal();
      }
    });

    // Impede a abertura do modal se foi um arrasto
    subscribeFab.addEventListener('click', (e) => {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
        hasMoved = false;
      }
    });

    // Resto dos eventos (modal)
    subscribeModal.querySelectorAll('[data-close-subscribe]').forEach(el => {
      el.addEventListener('click', closeSubscribeModal);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && subscribeModal.classList.contains('is-open')) {
        closeSubscribeModal();
      }
    });
  }

  // ============================================================
  // HELPER — mostrar flash dinamicamente (sem reload)
  // ============================================================
  function showFlash(type, message) {
    let container = document.getElementById('flash-container');

    // Se não existir, cria
    if (!container) {
      container = document.createElement('div');
      container.id = 'flash-container';
      container.className = 'flash-container';
      document.body.appendChild(container);
    }

    const flash = document.createElement('div');
    flash.className = `flash-message flash-${type}`;
    flash.innerHTML = `
      <span class="flash-text">${message}</span>
      <button type="button" class="flash-close" aria-label="Fechar">✕</button>
    `;

    flash.querySelector('.flash-close').addEventListener('click', () => flash.remove());

    container.appendChild(flash);

    // Auto-fade após 6 segundos
    setTimeout(() => {
      flash.classList.add('is-hiding');
      setTimeout(() => flash.remove(), 500);
    }, 6000);
  }

});