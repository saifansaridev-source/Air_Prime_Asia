document.addEventListener('DOMContentLoaded', () => {
    // --- Sticky Header Scroll ---
    const headerNav = document.getElementById('header-nav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            headerNav.classList.add('scrolled');
        } else {
            headerNav.classList.remove('scrolled');
        }
    });

    // --- Mobile Menu Toggle ---
    const hamburger = document.getElementById('hamburger-menu');
    const navMenu = document.getElementById('nav-links');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            
            // Toggle hamburger animation if desired
            const spans = hamburger.querySelectorAll('span');
            if (navMenu.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(6px, 6px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(6px, -6px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    }

    // --- Mobile Nested Dropdown Accordions ---
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const link = item.querySelector('.nav-link');
        const dropdown = item.querySelector('.dropdown-menu');
        
        if (link && dropdown) {
            // Check if viewport is mobile
            link.addEventListener('click', (e) => {
                if (window.innerWidth <= 992) {
                    // Only prevent default if it has sub-items and we are opening it
                    if (e.target.closest('.dropdown-item-wrap')) {
                        // Do not block sub-trigger clicks here
                        return;
                    }
                    e.preventDefault();
                    item.classList.toggle('open');
                }
            });
        }
    });

    // --- Mobile Nested Sub-Dropdown Accordions ---
    const subWraps = document.querySelectorAll('.dropdown-item-wrap');
    subWraps.forEach(wrap => {
        const trigger = wrap.querySelector('.sub-trigger');
        if (trigger) {
            trigger.addEventListener('click', (e) => {
                if (window.innerWidth <= 992) {
                    e.preventDefault();
                    wrap.classList.toggle('open-sub');
                }
            });
        }
    });

    // --- Scroll Top Button ---
    const btnScrollTop = document.getElementById('btn-scroll-top');
    if (btnScrollTop) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                btnScrollTop.classList.add('show');
            } else {
                btnScrollTop.classList.remove('show');
            }
        });
        
        btnScrollTop.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // --- Entrance Reveal Animations (Intersection Observer) ---
    const revealElements = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        });
        
        revealElements.forEach(el => observer.observe(el));
    } else {
        // Fallback for older browsers
        revealElements.forEach(el => el.classList.add('active'));
    }

    // --- Photo Gallery Lightbox ---
    const galleryItems = document.querySelectorAll('.gallery-item');
    if (galleryItems.length > 0) {
        // Create Lightbox DOM structure dynamically if not present
        let lightbox = document.getElementById('lightbox-modal');
        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'lightbox-modal';
            lightbox.className = 'lightbox';
            lightbox.innerHTML = `
                <div class="lightbox-content">
                    <span class="lightbox-close" id="lightbox-close">&times;</span>
                    <img id="lightbox-img" src="" alt="Zoomed view">
                </div>
            `;
            document.body.appendChild(lightbox);
        }

        const lightboxImg = document.getElementById('lightbox-img');
        const lightboxClose = document.getElementById('lightbox-close');

        galleryItems.forEach(item => {
            item.addEventListener('click', () => {
                const img = item.querySelector('img');
                if (img) {
                    lightboxImg.src = img.src;
                    lightboxImg.alt = img.alt;
                    lightbox.classList.add('active');
                    document.body.style.overflow = 'hidden'; // Stop background scrolling
                }
            });
        });

        // Close Lightbox functions
        const closeLightbox = () => {
            lightbox.classList.remove('active');
            document.body.style.overflow = 'auto';
        };

        lightboxClose.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                closeLightbox();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && lightbox.classList.contains('active')) {
                closeLightbox();
            }
        });
    }

    // --- Newsletter Form Submission ---
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const emailInput = newsletterForm.querySelector('input[type="email"]');
            if (emailInput && emailInput.value) {
                alert(`Thank you! ${emailInput.value} has been subscribed to Air Prime Asia admissions updates.`);
                emailInput.value = '';
            }
        });
    }

    // --- Hero Background Slide Auto-Rotation ---
    const heroSlides = document.querySelectorAll('.hero-slide');
    if (heroSlides.length > 0) {
        let currentSlideIndex = 0;
        setInterval(() => {
            heroSlides[currentSlideIndex].classList.remove('active');
            currentSlideIndex = (currentSlideIndex + 1) % heroSlides.length;
            heroSlides[currentSlideIndex].classList.add('active');
        }, 5000); // Transitions every 5 seconds
    }

// ===== LOGO SWITCHER — YAHAN DAALO =====
    const logoSlides = document.querySelectorAll('.logo-slide');
    if (logoSlides.length > 0) {
        let currentLogo = 0;
        setInterval(() => {
            logoSlides[currentLogo].classList.remove('active');
            currentLogo = (currentLogo + 1) % logoSlides.length;
            logoSlides[currentLogo].classList.add('active');
        }, 3000);
    }

}); 
// --- Air Charter Popup Logic (Temporarily Disabled) ---
// Set to true in future when you want to enable the popup again
var ENABLE_POPUP = false;

document.addEventListener("DOMContentLoaded", function () {
  if (!ENABLE_POPUP) return; // Popup temporarily stopped

  var overlay = document.getElementById("apaPopupOverlay");
  var closeBtn = document.getElementById("apaPopupClose");
  var skipBtn = document.getElementById("apaPopupSkip");

  // Agar is page pe popup exist hi nahi karta, toh yahin se return ho jao
  if (!overlay || !closeBtn || !skipBtn) return;

  // Show popup after 1 second (har visit pe)
  setTimeout(function () {
    overlay.classList.add("apa-active");
  }, 1000);

  function closePopup() {
    overlay.classList.remove("apa-active");
  }

  closeBtn.addEventListener("click", closePopup);
  skipBtn.addEventListener("click", closePopup);

  // Outside click pe bhi close ho jaye
  overlay.addEventListener("click", function (e) {
    if (e.target === overlay) {
      closePopup();
    }
  });

  // Esc key se bhi close ho jaye
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closePopup();
    }
  });
});