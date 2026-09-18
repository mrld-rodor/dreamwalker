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

});