// Selected-work section: three real Greenheart sites Benjamin built and
// maintains (source: project/resume.md, plus public facts verified against
// the live sites). Tabs swap which site's link + highlights show; the panel
// always shows one site's content (never an empty state).

(function(){
  // This script is included from both /index.html and /resume/index.html,
  // one directory apart, via correctly-relative <script src> paths in each
  // — so both resolve to the SAME script URL (site-root/js/work.js). That
  // resolved URL anchors the image paths below to their real site-root
  // location, regardless of which page (or hosting subpath) loaded it.
  var scriptEl = document.currentScript;
  var siteBase = scriptEl ? scriptEl.src.replace(/js\/work\.js(\?.*)?$/, '') : '';

  var WORK = [
    {
      name: 'Greenheart Exchange',
      url: 'https://greenheartexchange.org',
      image: 'assets/images/Exchange.jpg',
      bullets: [
        'Designed, built, and maintain the full site — theme, plugins, and backend integrations',
        'Shared master theme with a customized child theme',
        'Gravity Forms application forms syncing to multiple CRMs',
        'Salesforce, Microsoft, and third-party automations and data integrations',
        'Dynamic content sync serving profile pages from external data sources',
        'Full blog sub-theme',
        'Block-based (React/JS) theming',
        'Versioned via Git, with release-cycle deployments through GitHub Actions',
        'AWS hosting',
        'Backup and recovery via AWS, with daily full-site image and external database snapshots'
      ]
    },
    {
      name: 'Greenheart Travel',
      url: 'https://greenhearttravel.org',
      image: 'assets/images/Travel.jpg',
      bullets: [
        'Designed, built, and maintain the full site — theme, plugins, and backend integrations',
        'Shared master theme with a customized child theme',
        'Formstack-to-Salesforce integration',
        'Dynamic application screening with selectable, custom criteria per post',
        'Full blog sub-theme',
        'Block-based (React/JS) theming',
        'Versioned via Git, with release-cycle deployments through GitHub Actions',
        'AWS hosting',
        'Backup and recovery via AWS, with daily full-site image and external database snapshots'
      ]
    },
    {
      name: 'Greenheart.org',
      url: 'https://greenheart.org',
      image: 'assets/images/Greenheart.jpg',
      bullets: [
        'Designed, built, and maintain the full site — theme, plugins, and backend integrations',
        'Shared master theme with a customized child theme',
        'Gravity Forms payment-form integration',
        'Full blog sub-theme',
        'Block-based (React/JS) theming',
        'Versioned via Git, with release-cycle deployments through GitHub Actions',
        'AWS hosting',
        'Backup and recovery via AWS, with daily full-site image and external database snapshots'
      ]
    }
  ];

  var tabsEl = document.getElementById('work-tabs');
  var panelEl = document.getElementById('work-panel');
  var linkEl = document.getElementById('work-link');
  var listEl = document.getElementById('work-highlights');
  var imageEl = panelEl ? panelEl.querySelector('.work-image') : null;
  var detailsEl = panelEl ? panelEl.querySelector('.work-details') : null;
  var imgTag = imageEl ? imageEl.querySelector('img') : null;
  var imgLinkEl = document.getElementById('work-image-link');
  if (!tabsEl || !panelEl || !linkEl || !listEl || !detailsEl) return; // not on this page

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SLIDE_TRANSITION = 'transform 460ms cubic-bezier(0.22, 1, 0.36, 1)';
  var reversed = false;
  var firstRender = true;

  function applyContent(index){
    var w = WORK[index];
    linkEl.href = w.url;
    linkEl.textContent = w.name;
    var arrow = document.createElement('span');
    arrow.className = 'arrow';
    arrow.textContent = ' ↗';
    linkEl.appendChild(arrow);

    listEl.innerHTML = '';
    w.bullets.forEach(function(text){
      var li = document.createElement('li');
      li.textContent = text;
      listEl.appendChild(li);
    });

    if (imgTag){
      imgTag.src = siteBase + w.image;
      imgTag.alt = 'Screenshot of ' + w.name;
    }
    if (imgLinkEl){
      imgLinkEl.href = w.url;
    }

    var tabs = tabsEl.querySelectorAll('.work-tab');
    tabs.forEach(function(tab, i){
      tab.setAttribute('aria-pressed', i === index ? 'true' : 'false');
    });
  }

  // FLIP: snap el instantly back to where it visually was (before), then let
  // a transition animate it from there to its real new layout position — so
  // the swap reads as a slide, not a teleport. `after` is passed in rather
  // than re-measured here, since by the time this runs on the second/third
  // element there could otherwise be ambiguity about which rect is "real"
  // layout vs. a still-snapped transform. The element stays fully visible
  // throughout — content already updated by the time this runs, so it's
  // seen mid-flight, not hidden behind a fade.
  function flip(el, before, after){
    var dx = before.left - after.left;
    var dy = before.top - after.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    el.style.transition = 'transform 0s';
    el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    void el.offsetWidth; // force reflow so the snap applies before we release it
    requestAnimationFrame(function(){
      el.style.transition = SLIDE_TRANSITION;
      el.style.transform = '';
    });
  }

  // Takes the image's true final rect explicitly — must NOT be re-queried
  // after flip() has run, since flip() leaves a temporary snap-back
  // transform in place until its own rAF fires, which would skew a fresh
  // getBoundingClientRect() read toward the OLD position.
  function pointBlobAt(rect){
    if (!window.reconfigureBlobAt) return;
    var xNorm = (rect.left + rect.right) / 2 / window.innerWidth;
    var yNorm = rect.top / window.innerHeight;
    window.reconfigureBlobAt(xNorm, yNorm);
  }

  function render(index){
    if (firstRender){
      firstRender = false;
      applyContent(index);
      pointBlobAt(imageEl.getBoundingClientRect());
      return;
    }

    // Both boxes stay visible the whole time — nothing fades. Positions and
    // content swap together in one synchronous step, then each box slides
    // (FLIP) from its old on-screen spot to its new one, so the new content
    // is seen mid-flight rather than appearing only after it's landed.
    var beforeImage = imageEl.getBoundingClientRect();
    var beforeDetails = detailsEl.getBoundingClientRect();

    reversed = !reversed;
    panelEl.classList.toggle('reversed', reversed);
    applyContent(index);

    // Read both true final rects before either flip() call touches
    // transform, so neither read is skewed by the other's snap-back.
    var afterImage = imageEl.getBoundingClientRect();
    var afterDetails = detailsEl.getBoundingClientRect();

    if (!reduceMotion){
      flip(imageEl, beforeImage, afterImage);
      flip(detailsEl, beforeDetails, afterDetails);
    }
    pointBlobAt(afterImage);
  }

  WORK.forEach(function(w, i){
    var tab = document.createElement('button');
    tab.className = 'work-tab';
    tab.type = 'button';
    tab.textContent = w.name;
    tab.setAttribute('aria-pressed', i === 0 ? 'true' : 'false');
    tab.addEventListener('click', function(){ render(i); });
    tabsEl.appendChild(tab);
  });

  render(0);
})();
