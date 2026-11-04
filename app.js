(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const french = document.documentElement.lang === 'fr';
  const label = (fr, en) => french ? fr : en;
  const body = document.body;
  // Keep the supplied editorial artwork when a remote thumbnail is unavailable.
  $$('img[data-fallback]').forEach(image => {
    const fallback = () => { image.src = image.dataset.fallback; };
    image.addEventListener('error', fallback, { once: true });
    if (image.complete && !image.naturalWidth) fallback();
  });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  try { paused = localStorage.getItem('jr-motion-paused') === 'true'; } catch (_) { /* Storage may be disabled. */ }
  const motionButton = $('.motion-control');
  const motionOff = () => paused || reduceMotion.matches;
  const applyMotion = () => {
    body.classList.toggle('motion-off', motionOff());
    document.documentElement.style.scrollBehavior = motionOff() ? 'auto' : '';
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.setAttribute('aria-label', paused
      ? label('Activer les animations', 'Enable animations')
      : label('Mettre les animations en pause', 'Pause animations'));
    $('.icon use', motionButton).setAttribute('href', paused ? '#play' : '#pause');
  };
  applyMotion();
  motionButton.addEventListener('click', () => {
    paused = !paused;
    try { localStorage.setItem('jr-motion-paused', String(paused)); } catch (_) { /* Optional preference only. */ }
    applyMotion();
  });
  reduceMotion.addEventListener('change', applyMotion);

  // Each language is a complete static page. Keep the reader's section on switch.
  const languageLinks = $$('.language-switch a');
  const updateLanguageLinks = () => languageLinks.forEach(link => {
    link.href = (link.lang === 'en' ? 'index-en.html' : 'index.html') + location.hash;
  });
  updateLanguageLinks();
  window.addEventListener('hashchange', updateLanguageLinks);

  const menu = $('#main-nav');
  const menuButton = $('.menu-toggle');
  const setMenu = open => {
    menu.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? label('Fermer le menu', 'Close menu') : label('Ouvrir le menu', 'Open menu'));
  };
  menuButton.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
  menu.addEventListener('click', event => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('click', event => { if (!event.target.closest('.site-header')) setMenu(false); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.classList.contains('open')) { setMenu(false); menuButton.focus(); }
  });
  window.matchMedia('(min-width: 951px)').addEventListener('change', event => { if (event.matches) setMenu(false); });

  const chapterTabs = $$('[data-chapter]');
  const chapters = $$('.chapter');
  const chapterWindow = $('.chapter-window');
  const chapterPrevious = $('[data-chapter-prev]');
  const chapterNext = $('[data-chapter-next]');
  let currentChapter = 0;
  function selectChapter(index, focus = false) {
    currentChapter = Math.max(0, Math.min(chapters.length - 1, index));
    chapters.forEach((chapter, i) => { chapter.hidden = i !== currentChapter; });
    chapterTabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === currentChapter));
      tab.tabIndex = i === currentChapter ? 0 : -1;
    });
    $('#chapter-current').textContent = String(currentChapter + 1).padStart(2, '0');
    chapterPrevious.disabled = currentChapter === 0;
    chapterNext.disabled = currentChapter === chapters.length - 1;
    if (focus) chapterTabs[currentChapter].focus({ preventScroll: true });
  }
  chapterTabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectChapter(i));
    tab.addEventListener('keydown', event => {
      const destinations = { ArrowRight: (i + 1) % chapters.length, ArrowLeft: (i + chapters.length - 1) % chapters.length, Home: 0, End: chapters.length - 1 };
      if (Object.hasOwn(destinations, event.key)) { event.preventDefault(); selectChapter(destinations[event.key], true); }
    });
  });
  $$('[data-go-chapter]').forEach(link => link.addEventListener('click', () => selectChapter(Number(link.dataset.goChapter))));
  chapterPrevious.addEventListener('click', () => selectChapter(currentChapter - 1));
  chapterNext.addEventListener('click', () => selectChapter(currentChapter + 1));
  chapterWindow.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); selectChapter(currentChapter + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  let touchStart;
  chapterWindow.addEventListener('touchstart', event => {
    if (event.touches.length === 1) touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  chapterWindow.addEventListener('touchend', event => {
    if (!touchStart) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.5) selectChapter(currentChapter + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, { passive: true });
  chapterWindow.addEventListener('touchcancel', () => { touchStart = null; });

  const timeline = $('.timeline');
  const timelinePrevious = $('[data-timeline-prev]');
  const timelineNext = $('[data-timeline-next]');
  const updateTimeline = () => {
    timelinePrevious.disabled = timeline.scrollLeft < 3;
    timelineNext.disabled = timeline.scrollLeft >= timeline.scrollWidth - timeline.clientWidth - 3;
  };
  const moveTimeline = direction => timeline.scrollBy({ left: direction * timeline.clientWidth * 0.75, behavior: motionOff() ? 'instant' : 'smooth' });
  timelinePrevious.addEventListener('click', () => moveTimeline(-1));
  timelineNext.addEventListener('click', () => moveTimeline(1));
  timeline.addEventListener('scroll', updateTimeline, { passive: true });
  timeline.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); moveTimeline(event.key === 'ArrowRight' ? 1 : -1); }
  });
  window.addEventListener('resize', updateTimeline);
  updateTimeline();

  // Remote players are created only after the visitor presses play.
  const videoDialog = $('#video-dialog');
  const galleryDialog = $('#gallery-dialog');
  const videoPlayer = $('#video-player');
  const dialogTriggers = new WeakMap();
  const showDialog = (dialog, trigger) => {
    dialogTriggers.set(dialog, trigger);
    body.classList.add('modal-open');
    dialog.showModal();
  };
  [videoDialog, galleryDialog].forEach(dialog => {
    let backdropStart = false;
    dialog.addEventListener('pointerdown', event => { backdropStart = event.target === dialog; });
    dialog.addEventListener('click', event => {
      if (backdropStart && event.target === dialog) {
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
      }
      backdropStart = false;
    });
    dialog.addEventListener('close', () => {
      body.classList.remove('modal-open');
      if (dialog === videoDialog) videoPlayer.replaceChildren();
      dialogTriggers.get(dialog)?.focus({ preventScroll: true });
    });
  });
  $$('[data-video]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.video;
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id || '')) return;
    const title = button.dataset.title;
    $('#video-title').textContent = title;
    $('#video-external').href = 'https://www.youtube.com/watch?v=' + id;
    const iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0&playsinline=1';
    iframe.title = title + ' — Julien Roman';
    iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    videoPlayer.replaceChildren(iframe);
    showDialog(videoDialog, button);
  }));
  $('[data-close-video]').addEventListener('click', () => videoDialog.close());

  const galleryItems = $$('[data-gallery]');
  let galleryIndex = 0;
  const setGalleryImage = index => {
    galleryIndex = (index + galleryItems.length) % galleryItems.length;
    const item = galleryItems[galleryIndex];
    const original = $('img', item);
    const image = $('#gallery-image');
    image.src = original.src;
    image.alt = original.alt;
    $('#gallery-label').textContent = $('.gallery-caption', item).textContent.trim();
  };
  galleryItems.forEach((item, i) => item.addEventListener('click', () => {
    setGalleryImage(i); showDialog(galleryDialog, item);
  }));
  $('[data-close-gallery]').addEventListener('click', () => galleryDialog.close());
  $('[data-gallery-prev]').addEventListener('click', () => setGalleryImage(galleryIndex - 1));
  $('[data-gallery-next]').addEventListener('click', () => setGalleryImage(galleryIndex + 1));
  galleryDialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); setGalleryImage(galleryIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });

  if ('IntersectionObserver' in window) {
    body.classList.add('motion-ready');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -16px 0px' });
    $$('.reveal').forEach(element => observer.observe(element));
  }

  const progress = $('.reading-progress');
  const navLinks = $$('#main-nav a[href^="#"]');
  const sections = navLinks.map(link => $(link.getAttribute('href')));
  let scrollFrame = 0;
  function updateReading() {
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, scrollY / max) : 0) + ')';
    let active = -1;
    sections.forEach((section, i) => { if (section.getBoundingClientRect().top <= 180) active = i; });
    navLinks.forEach((link, i) => {
      link.classList.toggle('active', i === active);
      if (i === active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
    });
    scrollFrame = 0;
  }
  window.addEventListener('scroll', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateReading); }, { passive: true });
  window.addEventListener('resize', () => { if (!scrollFrame) scrollFrame = requestAnimationFrame(updateReading); });
  updateReading();
})();
