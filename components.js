// ===== NAVIGATION COMPONENT =====
function createNav(activePage) {
  const pages = [
    { href: 'homepage.html', label: 'Home', id: 'home' },
    { href: 'about.html', label: 'About', id: 'about' },
    { href: 'services.html', label: 'Services', id: 'services' },
    { href: 'portfolio.html', label: 'Portfolio', id: 'portfolio' },
    { href: 'contact.html', label: 'Contact', id: 'contact' },
  ];

  const navLinks = pages.map(p =>
    `<a href="${p.href}" class="nav-link${p.id === activePage ? ' active' : ''}">${p.label}</a>`
  ).join('');

  const mobileLinks = pages.map(p =>
    `<a href="${p.href}" class="${p.id === activePage ? 'active' : ''}">${p.label}</a>`
  ).join('');

  return `
    <nav class="navbar" id="navbar">
      <div class="nav-inner">
        <a href="homepage.html" class="nav-logo">
          <div class="nav-logo-icon"><img src="logo.png" alt="logo" class="nav-logo-icon" /> </div>
          <span>The Admin Media Concept</span>
        </a>
        <div class="nav-links">
          ${navLinks}
          <a href="contact.html" class="nav-cta nav-link">Get Started</a>
        </div>
        <button class="hamburger" id="hamburger" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </nav>
    <div class="mobile-menu" id="mobileMenu">
      ${mobileLinks}
      <a href="contact.html" style="background:var(--secondary);color:white;border-radius:8px;margin-top:.5rem;">Get Started</a>
    </div>
  `;
}

// ===== FOOTER COMPONENT =====
function createFooter() {
  return `
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-grid">
          <div class="footer-brand">
            <div class="nav-logo" style="color:white;margin-bottom:1rem;">
              <div class="nav-logo-icon"><img src="logo.png" alt="logo" class="nav-logo-icon" /></div>
              <span>The Admin Media Concept</span>
            </div>
            <p>Your trusted partner for creative and digital solutions. We help businesses transform their brand presence and connect with their audience effectively.</p>
            <div class="footer-social">
              <a href="https://web.facebook.com/profile.php?id=61577837131582" target="_blank" title="Facebook"><i class="fab fa-facebook-f"></i></a>
              <a href="https://x.com/AyomiOlowe" target="_blank" title="Twitter/X"><i class="fab fa-x-twitter"></i></a>
              <a href="https://www.instagram.com/theadmin001" target="_blank" title="Instagram"><i class="fab fa-instagram"></i></a>
              <a href="https://youtube.com/@theadminmediaconcept" target="_blank" title="YouTube"><i class="fab fa-youtube"></i></a>
              <a href="https://www.tiktok.com/@admintech_" target="_blank" title="TikTok"><i class="fab fa-tiktok"></i></a>
            </div>
          </div>
          <div>
            <h4>Quick Links</h4>
            <ul class="footer-links">
              <li><a href="homepage.html">Home</a></li>
              <li><a href="about.html">About</a></li>
              <li><a href="services.html">Services</a></li>
              <li><a href="portfolio.html">Portfolio</a></li>
              <li><a href="contact.html">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4>Services</h4>
            <ul class="footer-links">
              <li><a href="services.html">Logo Design</a></li>
              <li><a href="services.html">Brand Identity</a></li>
              <li><a href="services.html">Web Development</a></li>
              <li><a href="services.html">Digital Marketing</a></li>
              <li><a href="services.html">Video Production</a></li>
            </ul>
          </div>
          <div>
            <h4>Contact Info</h4>
            <ul class="footer-links">
              <li><a href="tel:+2348035543302"><i class="fas fa-phone" style="color:var(--secondary);margin-right:.5rem;"></i>+234 803 554 3302</a></li>
              <li><a href="mailto:oloweayomide229@gmail.com"><i class="fas fa-envelope" style="color:var(--secondary);margin-right:.5rem;"></i>oloweayomide229@gmail.com</a></li>
              <li><span style="color:rgba(255,255,255,.7);font-size:.9rem;"><i class="fas fa-map-marker-alt" style="color:var(--secondary);margin-right:.5rem;"></i>Ilesha, Nigeria</span></li>
              <li style="margin-top:.75rem;">
                <a href="https://wa.me/2348035543302" target="_blank" style="background:#25d366;color:white;padding:.5rem 1rem;border-radius:8px;font-size:.85rem;font-weight:600;display:inline-flex;align-items:center;gap:.4rem;">
                  <i class="fab fa-whatsapp"></i> WhatsApp Us
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <p>© 2025 The Admin Media Concept. All Rights Reserved.</p>
        </div>
      </div>
    </footer>
  `;
}

// ===== INIT FUNCTIONS =====
function initNav(activePage) {
  document.getElementById('nav-placeholder').innerHTML = createNav(activePage);
  document.getElementById('footer-placeholder').innerHTML = createFooter();

  // Hamburger toggle
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  hamburger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
  });

  // Navbar scroll
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('navbar');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
  });
}

// ===== SCROLL REVEAL =====
function initReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', initReveal);
