// Resume modal: opens an embedded PDF viewer with download + close actions.
// No libraries. Closes on: X, footer Close button, Escape, or clicking the
// overlay outside the modal box. Focus moves into the modal on open and
// returns to the trigger button on close.

(function(){
  // This script is included from both /index.html and /resume/index.html,
  // one directory apart, via correctly-relative <script src> paths in each
  // — so both resolve to the SAME script URL (site-root/js/resume.js). That
  // resolved URL is a reliable anchor for the PDF's real site-root path,
  // regardless of which page (or hosting subpath) loaded it.
  var scriptEl = document.currentScript;
  var siteBase = scriptEl ? scriptEl.src.replace(/js\/resume\.js(\?.*)?$/, '') : '';
  var RESUME_PATH = siteBase + 'assets/resume.pdf';

  var openBtn = document.getElementById('resume-btn');
  var overlay = document.getElementById('resume-modal');
  var closeX = document.getElementById('resume-close-x');
  var closeBtn = document.getElementById('resume-close-btn');
  var iframe = document.getElementById('resume-frame');
  var downloadLink = document.getElementById('resume-download');
  if (!openBtn || !overlay || !iframe) return; // not on this page

  iframe.src = RESUME_PATH;
  if (downloadLink){
    downloadLink.href = RESUME_PATH;
    downloadLink.setAttribute('download', 'Benjamin-Toth-Resume.pdf');
  }

  var lastFocused = null;

  function open(){
    lastFocused = document.activeElement;
    overlay.hidden = false;
    document.addEventListener('keydown', onKeydown);
    closeX.focus();
  }

  function close(){
    overlay.hidden = true;
    document.removeEventListener('keydown', onKeydown);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function onKeydown(evt){
    if (evt.key === 'Escape') close();
  }

  openBtn.addEventListener('click', open);
  if (closeX) closeX.addEventListener('click', close);
  if (closeBtn) closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function(evt){
    if (evt.target === overlay) close();
  });

  // The /resume route's whole purpose: land with the modal already open.
  var path = location.pathname.replace(/\/+$/, '');
  if (/\/resume$/.test(path)){
    open();
  }
})();
