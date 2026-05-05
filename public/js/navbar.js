// navbar.js — inject navbar and handle session
async function initNavbar(activePage) {
  const res = await fetch('/api/me');
  const data = await res.json();
  if (!data.user) { window.location.href = '/'; return; }

  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.id = 'mainNav';
  nav.innerHTML = `
    <a href="/home" class="nav-brand" style="text-decoration:none">
      <span class="script">Sweet Scoops</span>
      <span class="tagline">Artisan Ice Cream</span>
    </a>
    <ul class="nav-links">
      <li><a href="/home" class="${activePage==='home'?'active':''}">Home</a></li>
      <li><a href="/menu" class="${activePage==='menu'?'active':''}">Menu</a></li>
      <li><a href="/contact" class="${activePage==='contact'?'active':''}">Contact</a></li>
      <li><a href="/feedback" class="${activePage==='feedback'?'active':''}">Feedback</a></li>
    </ul>
    <div class="nav-user">
      <span class="nav-user-name">Hello, ${data.user.name.split(' ')[0]}</span>
      <button class="btn-logout" onclick="logout()">Logout</button>
    </div>
  `;
  document.body.prepend(nav);

  // Scroll shrink
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  });
}

async function logout() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

// Toast notifications
function showToast(icon, title, subtitle) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<div class="toast-inner"><span class="toast-icon"></span><div class="toast-text"><strong></strong><span></span></div></div>`;
    document.body.appendChild(toast);
  }
  toast.querySelector('.toast-icon').textContent = icon;
  toast.querySelector('.toast-text strong').textContent = title;
  toast.querySelector('.toast-text span').textContent = subtitle;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// Scroll fade-in
function initScrollAnimations() {
  const els = document.querySelectorAll('.fade-up');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e, i) => {
      if (e.isIntersecting) {
        setTimeout(() => e.target.classList.add('visible'), e.target.dataset.delay || 0);
      }
    });
  }, { threshold: 0.1 });
  els.forEach(el => obs.observe(el));
}

window.addEventListener('DOMContentLoaded', initScrollAnimations);
