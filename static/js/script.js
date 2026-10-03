// script.js — comportamentos da landing Dreamwalker

document.addEventListener('DOMContentLoaded', () => {

  // Elementos globais (definidos primeiro para estarem acessíveis em todo o lado)
  const header = document.querySelector('.navbar');
  const toggle = document.getElementById('menu-toggle');
  const menu   = document.getElementById('mobile-menu');

  // ============================================================
  // MENU MOBILE
  // ============================================================
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      menu.classList.toggle('hidden');
      menu.classList.toggle('flex');
    });

    // Ao clicar num link: fecha o menu E esconde o header
    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('open');
        menu.classList.add('hidden');
        menu.classList.remove('flex');

        // Esconde o header imediatamente (só faz sentido em mobile)
        if (window.innerWidth < 768) {
          header.classList.add('is-hidden');
          suppressHeaderReveal = true;   // bloqueia o reaparecimento
        }
      });
    });
  }

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
  // HEADER — esconde ao descer / mostra ao subir (só mobile)
  // ============================================================
  const isMobile = () => window.innerWidth < 768;
  const SHOW_AT_TOP = 80;
  let lastScrollY = window.pageYOffset;
  let ticking = false;

    function handleScroll() {
    const currentY = window.pageYOffset;

    if (!isMobile()) {
      header.classList.remove('is-hidden');
      lastScrollY = currentY;
      ticking = false;
      return;
    }

    if (currentY < SHOW_AT_TOP) {
      header.classList.remove('is-hidden');
      suppressHeaderReveal = false;   // chegou ao topo → liberta
    }
    else if (currentY > lastScrollY) {
      // A descer → esconde sempre
      header.classList.add('is-hidden');
      if (menu && !menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
        menu.classList.remove('flex');
        if (toggle) toggle.classList.remove('open');
      }
    }
    else if (currentY < lastScrollY && !suppressHeaderReveal) {
      // A subir → mostra, MAS só se não estiver bloqueado
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
  // CARROSSEL + MODAL DE CONTOS
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

    window.__carouselStopAutoplay = stopAutoplay;
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
    const slides        = document.querySelectorAll('.carousel-slide');

    let lastFocused = null;

    function openModal(slide) {
      const num      = slide.dataset.number       || '';
      const title    = slide.dataset.title        || '';
      const synopsis = slide.dataset.synopsisLong || slide.dataset.synopsisShort || '';
      const cover    = slide.dataset.cover        || '';
      const buy      = slide.dataset.buy          || '#';

      modalNumber.textContent   = num;
      modalTitle.textContent    = title;
      modalSynopsis.textContent = synopsis;
      modalCover.src            = cover;
      modalCover.alt            = `Capa de ${title}`;
      modalBuy.href             = buy;

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

    slides.forEach(slide => {
      slide.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(slide);
      });
    });

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
  // ANIMAÇÕES DE ENTRADA — IntersectionObserver
  // ============================================================
  const animatedEls = document.querySelectorAll('[data-anime]');

  if (animatedEls.length > 0 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);   // anima só uma vez
        }
      });
    }, {
      threshold: 0.15,                       // 15% do elemento visível
      rootMargin: '0px 0px -50px 0px'        // dispara 50px antes do fim do viewport
    });

    animatedEls.forEach(el => observer.observe(el));
  } else {
    // Fallback: se o browser não suporta, mostra tudo
    animatedEls.forEach(el => el.classList.add('is-visible'));
  }

});