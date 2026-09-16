// script.js — comportamentos da landing Dreamwalker

document.addEventListener('DOMContentLoaded', () => {

  const toggle = document.getElementById('menu-toggle');
  const menu   = document.getElementById('mobile-menu');

  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('open');

      // Alterna entre 'hidden' e 'flex' do Tailwind
      if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        menu.classList.add('flex');
      } else {
        menu.classList.remove('flex');
        menu.classList.add('hidden');
      }
    });

    // Fecha o menu ao clicar num link
    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('open');
        menu.classList.add('hidden');
        menu.classList.remove('flex');
      });
    });
  }

});