// Contact modal: opens a Formspree-backed form. Submits via fetch (with
// Accept: application/json, which Formspree uses to skip its own redirect
// page) so success/error shows inline in the modal instead of navigating
// away. No libraries.
// Closes on: X, footer Close button, Escape, or clicking the overlay
// outside the modal box. Focus moves into the modal on open and returns to
// the trigger button on close — same pattern as resume.js.

(function(){
  var openBtn = document.getElementById('contact-btn');
  var overlay = document.getElementById('contact-modal');
  var closeX = document.getElementById('contact-close-x');
  var closeBtn = document.getElementById('contact-close-btn');
  var form = document.getElementById('contact-form');
  var statusEl = document.getElementById('contact-status');
  var submitBtn = document.getElementById('contact-submit');
  if (!openBtn || !overlay || !form) return; // not on this page

  var lastFocused = null;

  function open(){
    lastFocused = document.activeElement;
    overlay.hidden = false;
    document.addEventListener('keydown', onKeydown);
    var firstField = form.querySelector('input, textarea');
    if (firstField) firstField.focus();
  }

  function close(){
    overlay.hidden = true;
    document.removeEventListener('keydown', onKeydown);
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  }

  function onKeydown(evt){
    if (evt.key === 'Escape') close();
  }

  function setStatus(text, state){
    statusEl.textContent = text;
    if (state){
      statusEl.setAttribute('data-state', state);
    } else {
      statusEl.removeAttribute('data-state');
    }
  }

  function onSubmit(evt){
    evt.preventDefault();
    submitBtn.disabled = true;
    setStatus('Sending…', null);

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    }).then(function(res){
      if (res.ok){
        setStatus('Thanks — message sent. I’ll get back to you soon.', 'success');
        form.reset();
      } else {
        return res.json().then(function(data){
          var msg = (data && data.errors && data.errors.length)
            ? data.errors.map(function(e){ return e.message; }).join(', ')
            : 'Something went wrong — please try again.';
          setStatus(msg, 'error');
        });
      }
    }).catch(function(){
      setStatus('Network error — please try again, or email directly.', 'error');
    }).finally(function(){
      submitBtn.disabled = false;
    });
  }

  openBtn.addEventListener('click', open);
  if (closeX) closeX.addEventListener('click', close);
  if (closeBtn) closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function(evt){
    if (evt.target === overlay) close();
  });
  form.addEventListener('submit', onSubmit);
})();
