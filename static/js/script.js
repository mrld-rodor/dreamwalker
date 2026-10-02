// script.js — comportamentos da landing Dreamwalker

document.addEventListener('DOMContentLoaded', () => {

  // ============================================================
  // MENU MOBILE
  // ============================================================
  const toggle = document.getElementById('menu-toggle');
  const menu   = document.getElementById('mobile-menu');

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');
      menu.classList.toggle('hidden');
      menu.classList.toggle('flex');
    });

    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('open');
        menu.classList.add('hidden');
        menu.classList.remove('flex');
      });
    });
  }

  // ============================================================
  // HEADER — esconde ao descer / mostra ao subir (só mobile)
  // ============================================================
  const header = document.querySelector('.navbar');

  // Só atua em ecrãs < 768px
  const isMobile = () => window.innerWidth < 768;

  const SHOW_AT_TOP   = 80;   // px — header sempre visível até aqui
  let lastScrollY     = window.pageYOffset;
  let ticking         = false;

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
    }
    // A descer → esconde
    else if (currentY > lastScrollY) {
      header.classList.add('is-hidden');

      // Se o menu mobile estiver aberto, fecha
      if (menu && !menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
        menu.classList.remove('flex');
        if (toggle) toggle.classList.remove('open');
      }
    }
    // A subir → mostra
    else if (currentY < lastScrollY) {
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

  // Se redimensionar para desktop, garante que o header volta
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
  if (carousel) {
    const track   = document.getElementById('carousel-track');
    const slides  = carousel.querySelectorAll('.carousel-slide');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    const input   = document.getElementById('carousel-input');
    const total   = slides.length;

    let current = 0;
    let autoplayId = null;
    const AUTOPLAY_DELAY = 6000;   // 6 segundos

    function goTo(index) {
      // wrap around
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

    // Arrows
    if (nextBtn) nextBtn.addEventListener('click', () => { goNext(); startAutoplay(); });
    if (prevBtn) prevBtn.addEventListener('click', () => { goPrev(); startAutoplay(); });

    // Input — jump to slide
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

    // Pausa autoplay ao passar o rato ou focar o input
    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', () => {
      // só reinicia se o foco sair do carrossel
      setTimeout(() => {
        if (!carousel.contains(document.activeElement)) startAutoplay();
      }, 100);
    });

    // Pausa quando o separador não está visível (bateria/CPU)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    });

    // Inicia
    goTo(0);
    startAutoplay();
  }

});


// ============================================================
// ANIMAÇÃO DE SCROLL — Para elementos com atributo data-anime
// ============================================================
const animeItems = document.querySelectorAll("[data-anime]");

const animeScroll = () => {
    const windowHeight = window.innerHeight;
    const windowTop = window.scrollY;
    
    animeItems.forEach((element) => {
        const elementTop = element.offsetTop;
        const elementVisible = 150;
        
        if (windowTop + windowHeight > elementTop + elementVisible) {
            element.classList.add("animate");
        } else {
            // Opcional: remove a classe se quiser que repita
            // element.classList.remove("animate");
        }
    });
}

// Executa ao carregar
animeScroll();

// Executa ao scrollar
window.addEventListener("scroll", animeScroll);