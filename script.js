document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initSPARouting();
    initResumeModals();
    initGalleryMarquee();
    initMoreWorkMarquee();
    initScrollShrink();
    initAntigravityParticles();
    initTypedHeader();
    initTextReveal();
    initScreenRail();
    initCursorGallery();
    initAvatarGroup();
    initBento();
    initNavAutoHide();
    initTimelineReveal();
    initNamasteRoll();
    initProjectCursor();
    initProjectScrollScale();
    initBackToTop();
    initFlowerSway();
});

/* ==========================================================================
   SPA Routing: Home / Info / Case Study Views
   ========================================================================== */
function initSPARouting() {
    const navLinks = document.querySelectorAll('.nav-pill-link[data-target]');
    const pageViews = document.querySelectorAll('.page-view');
    const projectCards = document.querySelectorAll('.project-card');
    
    const caseStudyView = document.getElementById('case-study-view');
    const caseStudyContentTarget = document.getElementById('case-study-content-target');
    const caseStudyBackBtn = document.getElementById('case-study-back-btn');
    
    let lastActiveProject = null;

    // View Switching logic
    function switchView(targetViewId) {
        pageViews.forEach(view => {
            if (view.id === targetViewId) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });

        // Sync navigation capsule active state
        navLinks.forEach(link => {
            const target = link.getAttribute('data-target');
            if (target === targetViewId) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Always scroll to top on page swap
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    // Nav Pill clicks
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target');
            if (target) {
                switchView(target);
                // Reset address hash safely
                window.history.pushState(null, '', `#${target.replace('-view', '')}`);
            }
        });
    });

    /* Opens a case study by project slug.

       A featured project has its own template-case-study-<slug>. The More Work
       items share one placeholder instead — six near-identical templates would
       be six places to edit — and its marked slots are filled from whichever
       element was clicked. A project that later earns its own template gets it
       automatically, since the named lookup is tried first.

       Returns false when there is nothing to open, so callers can fall back. */
    function openCaseStudy(projectName, source) {
        if (!projectName || !caseStudyContentTarget) return false;

        let template = document.getElementById(`template-case-study-${projectName}`);
        const usingPlaceholder = !template;
        if (usingPlaceholder) {
            template = document.getElementById('template-case-study-placeholder');
        }
        if (!template) return false;

        caseStudyContentTarget.innerHTML = '';
        caseStudyContentTarget.appendChild(template.content.cloneNode(true));

        if (usingPlaceholder && source) {
            // data-* first, then the card's own visible copy, so a featured
            // project missing its template still opens with real text.
            const pick = (attr, selector) => source.dataset[attr]
                || source.querySelector(selector)?.textContent.trim();
            const fill = (slot, value) => {
                const el = caseStudyContentTarget.querySelector(`[data-slot="${slot}"]`);
                if (el && value) el.textContent = value;
            };
            fill('title', pick('title', '.project-title, .more-work-label'));
            fill('subtitle', pick('subtitle', '.project-description'));

            const banner = caseStudyContentTarget.querySelector('[data-slot="image"]');
            const thumb = source.querySelector('img');
            if (banner && thumb) {
                banner.src = thumb.getAttribute('src');
                banner.alt = pick('title', '.project-title, .more-work-label') || '';
            }
        }

        switchView('case-study-view');

        // Primed after the view is shown: an element inside a hidden view
        // never intersects, so the observer would sit idle forever.
        primeTextReveal(caseStudyContentTarget);
        initScreenRail(caseStudyContentTarget);
        initCursorGallery(caseStudyContentTarget);
        initAvatarGroup(caseStudyContentTarget);
        initBento(caseStudyContentTarget);
        initInitiativeRail(caseStudyContentTarget);
        buildCasePager(caseStudyContentTarget, projectName, openCaseStudy);

        window.history.pushState(null, '', `#work-${projectName}`);
        return true;
    }

    // Project Card clicks -> Load Case Study Detail Page
    projectCards.forEach(card => {
        card.addEventListener('click', () => {
            lastActiveProject = card;
            openCaseStudy(card.getAttribute('data-project'), card);
        });
    });

    /* More Work items are delegated rather than bound one by one: the marquee
       clones its whole run after this runs, and a per-element listener would
       miss every copy — leaving half the strip dead to the click.

       Items that carry data-project open a case study on this site. The rest
       are plain links out to Behance, and must be left alone so the browser
       follows the href — intercepting them would swallow the navigation. */
    document.addEventListener('click', (e) => {
        const link = e.target.closest('.more-work-link');
        if (!link || !link.dataset.project) return;
        lastActiveProject = link.closest('.more-work-section') || link;
        openCaseStudy(link.dataset.project, link);
    });

    // Back to home button in case study page
    if (caseStudyBackBtn) {
        caseStudyBackBtn.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('home-view');
            window.history.pushState(null, '', '#home');
            
            // Smooth scroll to the project card the user was looking at
            if (lastActiveProject) {
                setTimeout(() => {
                    const rect = lastActiveProject.getBoundingClientRect();
                    const absoluteTop = window.scrollY + rect.top;
                    window.scrollTo({
                        top: absoluteTop - 120,
                        behavior: 'smooth'
                    });
                }, 100);
            }
        });
    }

    // Initial check for URL hashes to support direct links/reloads
    const currentHash = window.location.hash;
    if (currentHash === '#info') {
        switchView('info-view');
    } else if (currentHash.startsWith('#work-')) {
        const projName = currentHash.replace('#work-', '');
        const matchingCard = document.querySelector(`.project-card[data-project="${projName}"]`);
        // The marquee's clone does not exist yet at this point, but the run in
        // the markup does, so a More Work slug still resolves on a cold load.
        const matchingLink = document.querySelector(`.more-work-link[data-project="${projName}"]`);
        if (matchingCard) {
            matchingCard.click();
        } else if (matchingLink) {
            openCaseStudy(projName, matchingLink);
        } else {
            // Unknown slug — go home rather than render an empty placeholder.
            switchView('home-view');
        }
    } else {
        switchView('home-view');
    }
}

/* ==========================================================================
   Resumé Modal Triggers (DEPRECATED - Modals removed)
   ========================================================================== */
function initResumeModals() {
    // Modal functionality removed - Resume now uses dedicated tab view
}
/* ==========================================================================
   Personal gallery — infinite marquee

   The markup ships one run of images. This clones it so the track holds two
   identical runs, which is what lets the CSS translate the track by -50% and
   restart on a frame identical to the one it started on.

   Cloning here rather than in the markup means adding or replacing images is
   a matter of editing the one list; the copy follows automatically. The clone
   is hidden from assistive tech so each image is announced once.

   Speed is set from the run's measured width so the strip travels at a
   constant pixels-per-second no matter how many images are in it — otherwise
   adding a ninth image would silently make everything move faster.
   ========================================================================== */
function initGalleryMarquee() {
    const track = document.getElementById('gallery-track');
    if (!track) return;

    const run = track.querySelector('.gallery-run');
    if (!run) return;

    const PX_PER_SECOND = 40;

    const clone = run.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    // Duplicated images must not be reachable by keyboard or announced.
    clone.querySelectorAll('img').forEach((img) => { img.alt = ''; });
    track.appendChild(clone);

    function setSpeed() {
        const width = run.getBoundingClientRect().width;
        if (!width) return;
        track.style.animationDuration = (width / PX_PER_SECOND).toFixed(2) + 's';
    }

    setSpeed();
    track.classList.add('is-running');

    // Images finish decoding after this runs, and a lazy one may never have
    // been measured at all; re-measure once the row has settled.
    window.addEventListener('load', setSpeed);

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(setSpeed, 150);
    });
}

/* ==========================================================================
   Capsule Navigation Scroll Behavior
   ========================================================================== */
function initScrollShrink() {
    const navCapsule = document.querySelector('.nav-capsule');
    if (!navCapsule) return;

    // Toggle a class rather than writing inline transform/box-shadow: the glass
    // capsule's shadow carries inset specular edges an inline value would erase.
    window.addEventListener('scroll', () => {
        navCapsule.classList.toggle('nav-scrolled', window.scrollY > 40);
    }, { passive: true });
}

/* ==========================================================================
   Nav Auto-Hide

   Direction-driven rather than position-driven: the capsule leaves the moment
   the page moves down and comes back the moment it moves up, anywhere on the
   page. The animation itself lives in CSS — this only decides which of the
   two states the capsule is in, so the transition is never fighting a value
   written per frame.

   Two guards keep it from flickering. Movement under DEAD_ZONE pixels is
   ignored without resetting the baseline, so slow drags still accumulate to a
   decision instead of being discarded; and inside TOP_ZONE the capsule is
   always shown, so it cannot be left hidden at the top of the page.
   ========================================================================== */
function initNavAutoHide() {
    const wrapper = document.querySelector('.nav-capsule-wrapper');
    if (!wrapper) return;

    const TOP_ZONE = 80;    // always visible this close to the top
    const DEAD_ZONE = 6;    // px of travel before a direction counts

    let lastY = Math.max(0, window.scrollY);
    let queued = false;

    function show() { wrapper.classList.remove('nav-hidden'); }
    function hide() { wrapper.classList.add('nav-hidden'); }

    function update() {
        queued = false;
        // Clamped: overscroll bounce reports negative offsets, which would
        // read as an upward scroll and flash the capsule back in.
        const y = Math.max(0, window.scrollY);

        if (y <= TOP_ZONE) {
            show();
            lastY = y;
            return;
        }

        const delta = y - lastY;
        if (Math.abs(delta) < DEAD_ZONE) return;   // baseline deliberately kept

        if (delta > 0) hide(); else show();
        lastY = y;
    }

    function onScroll() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(update);
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // A hidden capsule must not swallow keyboard focus: tabbing into it brings
    // it back rather than leaving the user on an invisible control.
    wrapper.addEventListener('focusin', show);

    // The SPA swaps views under a fixed nav, which moves the scroll offset
    // without a scroll gesture. Re-baseline so the jump is not read as a
    // direction.
    const homeView = document.getElementById('home-view');
    if (homeView && homeView.parentElement) {
        new MutationObserver(() => {
            lastY = Math.max(0, window.scrollY);
            show();
        }).observe(homeView.parentElement, {
            attributes: true,
            attributeFilter: ['class'],
            subtree: true,
        });
    }

    update();
}

/* ==========================================================================
   Timeline Scroll Reveal

   Mirrors harrisonwheeler.com: each year group starts 48px down and
   transparent, then eases into place as it enters the viewport
   (0.45s, cubic-bezier(0.22, 1, 0.36, 1) — both set in styles.css).
   Groups within a view are staggered so they cascade rather than pop at once.
   ========================================================================== */
function initTimelineReveal() {
    const groups = document.querySelectorAll('.timeline-item');
    if (!groups.length) return;

    // No IntersectionObserver (or motion is unwanted): show everything.
    if (!('IntersectionObserver' in window)) {
        groups.forEach(group => group.classList.add('visible'));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const group = entry.target;
            const delay = Number(group.dataset.revealIndex || 0) * 90;
            setTimeout(() => group.classList.add('visible'), delay);
            observer.unobserve(group); // reveal once, don't re-hide on scroll back
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

    groups.forEach((group, index) => {
        group.dataset.revealIndex = index;
        observer.observe(group);
    });
}

/* ==========================================================================
   Namasté pop-in

   Alternates the greeting between Latin and Devanagari. Each swap paints
   the word as individual clusters and replays the Transitions.dev number
   pop-in over them, staggered left to right.
   ========================================================================== */
function initNamasteRoll() {
    const roll = document.querySelector('.namaste-roll');
    const group = roll && roll.querySelector('.t-digit-group');
    const source = roll && roll.querySelector('.namaste-source');
    if (!roll || !group || !source) return;

    const words = Array.from(source.children).map((el) => ({
        text: el.textContent.trim(),
        lang: el.getAttribute('lang') || '',
    }));
    if (words.length < 2) return;

    const HOLD_MS = 2600;
    let index = 0;
    let widths = [];

    /* Devanagari cannot be split per code point: नमस्ते is
       न + म + स + ् + त + े, so indexing would strip the virama and orphan the
       matra, rendering broken text. Intl.Segmenter groups each base with its
       marks. Without it, don't split at all — one unsplit word animating as a
       block is correct, where a wrongly split one is not. */
    const segmenter = (typeof Intl !== 'undefined' && Intl.Segmenter)
        ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
        : null;

    function clusters(text) {
        if (!segmenter) return [text];
        return Array.from(segmenter.segment(text), (part) => part.segment);
    }

    /* The two words are not the same length in glyphs — "Namasté" segments to
       seven clusters, नमस्ते to four, since each consonant carries its matra as
       one unit. A fixed per-glyph delay would therefore make the reveal sweep
       visibly quicker across the Devanagari, which is what made the two swaps
       read as different effects. Dividing a constant window by the gaps in the
       word instead keeps the sweep the same length in time either way. */
    const SWEEP_MS = 320;

    // Fills the group without starting the animation.
    function paint(word) {
        group.setAttribute('lang', word.lang);
        group.classList.remove('is-animating');
        group.textContent = '';

        const parts = clusters(word.text);
        const gaps = Math.max(parts.length - 1, 1);
        group.style.setProperty('--digit-stagger', (SWEEP_MS / gaps) + 'ms');

        parts.forEach((cluster, position) => {
            const span = document.createElement('span');
            span.className = 't-digit';
            span.style.setProperty('--digit-index', position);
            span.textContent = cluster;
            group.appendChild(span);
        });
    }

    /* Widths must be read with the box unconstrained: once roll carries an
       explicit width it clamps the group, and every later measurement returns
       the previous word's width instead of the next one's.

       Returns false when the greeting is not being rendered — see start(). */
    function measureWidths() {
        // offsetParent is null while an ancestor is display:none, and every
        // rect inside it measures 0. Writing those zeros onto roll is what
        // makes the greeting overlap the text beside it.
        if (roll.offsetParent === null) return false;

        const prevTransition = roll.style.transition;
        const prevWidth = roll.style.width;
        roll.style.transition = 'none';
        roll.style.width = 'auto';
        widths = words.map((word) => {
            paint(word);
            return group.getBoundingClientRect().width;
        });
        roll.style.width = prevWidth || widths[index] + 'px';
        void roll.offsetWidth;
        roll.style.transition = prevTransition;
        /* The loop above leaves the group showing whichever word it measured
           last. Put the live one back, or a re-measure silently swaps the
           visible greeting. */
        paint(words[index]);
        return true;
    }

    function show(next) {
        index = next;
        paint(words[index]);
        void group.offsetWidth;               // reflow, so the animation replays
        group.classList.add('is-animating');
        roll.style.width = widths[index] + 'px';
    }

    let started = false;

    /* The greeting lives in the Info view, which the SPA keeps at display:none
       until it is opened — and this runs at DOMContentLoaded, with Home
       active. Measuring then yields nothing but zeros, so the roll gets a 0px
       width and नमस्ते spills over ", I am Nirali Amin". Reloading straight
       onto Info hid the bug, because the view was already visible.

       So starting is deferred until the greeting is actually laid out. */
    const start = () => {
        if (started || !measureWidths()) return;
        started = true;
        show(0);
        setInterval(() => show((index + 1) % words.length), HOLD_MS);
    };

    function remeasure() {
        if (!started) { start(); return; }
        if (measureWidths()) roll.style.width = widths[index] + 'px';
    }

    /* Wait for the faces these words actually need, not just for the page's.

       document.fonts.ready only accounts for faces something has already
       asked for. Nothing on the page renders Devanagari until this function
       paints it — .namaste-source is `hidden`, so its glyphs request nothing —
       which means ready resolves against the Latin face alone. The Noto word
       would then be measured with fallback metrics,
       and the real faces swapping in would leave the word wider than the
       width written onto .namaste-roll.

       Asking for each word's own face by name is what makes the measurement
       correct on a cold load. */
    function loadFaces() {
        if (!document.fonts || !document.fonts.load) return Promise.resolve();

        // Measured off a real .t-digit-group so the lang-specific family and
        // the inherited size are exactly what the greeting will render with.
        const probe = document.createElement('span');
        probe.className = 't-digit-group';
        probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
        roll.appendChild(probe);

        const pending = words.map((word) => {
            probe.setAttribute('lang', word.lang);
            const cs = getComputedStyle(probe);
            const spec = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
            // A face that fails to load is not fatal: the fallback still reads.
            return document.fonts.load(spec, word.text).catch(() => {});
        });

        probe.remove();
        return Promise.all(pending);
    }

    loadFaces().then(start, start);

    // Opening the Info view is what usually makes the greeting measurable.
    const view = roll.closest('.page-view');
    if (view) {
        new MutationObserver(remeasure).observe(view, {
            attributes: true,
            attributeFilter: ['class'],
        });
    }

    /* Last line of defence. If a face arrives after the measurement anyway —
       a slow network, or one the probe could not name — re-measure rather than
       leave the greeting overlapping the text beside it. */
    if (document.fonts && document.fonts.addEventListener) {
        document.fonts.addEventListener('loadingdone', remeasure);
    }

    // The heading steps down at the mobile breakpoint, so widths change with it.
    window.addEventListener('resize', remeasure);
}

/* ==========================================================================
   Project Media Cursor Pill

   Mirrors antigravity.google's .custom-cursor: a pill that tracks the pointer
   inside each project image and scales in on enter. Position is written
   straight to the transform with no transition so the follow is instant (their
   .custom-cursor reads transition-duration: 0s); the scale/fade lives on the
   inner element in CSS, so the two never fight over the same property.

   Built here rather than in the markup so a script failure leaves the images
   untouched. The pill is decoration, not the affordance — the whole card
   carries the click handler, so the project stays reachable without it.
   ========================================================================== */
function initProjectCursor() {
    // Nothing to follow without a hovering pointer.
    if (!window.matchMedia || !window.matchMedia('(hover: hover)').matches) return;

    document.querySelectorAll('.project-thumbnail-wrapper').forEach((frame) => {
        const wrapper = document.createElement('span');
        wrapper.className = 'project-cursor-wrapper';
        wrapper.setAttribute('aria-hidden', 'true');

        const cursor = document.createElement('span');
        cursor.className = 'project-cursor';

        const content = document.createElement('span');
        content.className = 'project-cursor-content';
        content.innerHTML =
            '<svg class="project-cursor-icon" viewBox="0 0 24 24" focusable="false">' +
            '<path d="M5 12h13M12 6l6 6-6 6" fill="none" stroke="currentColor" ' +
            'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            '<span>View project</span>';

        cursor.appendChild(content);
        wrapper.appendChild(cursor);
        frame.appendChild(wrapper);
        frame.classList.add('has-custom-cursor');

        // Park it at the centre so the first frame of the scale-in isn't
        // anchored at the top-left corner.
        /* The frame carries a scroll-driven scale (see initProjectScrollScale),
           so its bounding rect is scaled while its offset size is not. Work in
           fractions of the rect and multiply by the unscaled offset size, and
           the pill lands under the pointer at any scale. */
        let parked = false;
        const park = () => {
            cursor.style.transform =
                `translate(${frame.offsetWidth / 2}px, ${frame.offsetHeight / 2}px)`;
        };
        park();

        frame.addEventListener('pointermove', (event) => {
            if (event.pointerType !== 'mouse') return;
            const box = frame.getBoundingClientRect();
            if (!box.width || !box.height) return;
            const fx = (event.clientX - box.left) / box.width;
            const fy = (event.clientY - box.top) / box.height;
            cursor.style.transform =
                `translate(${fx * frame.offsetWidth}px, ${fy * frame.offsetHeight}px)`;
            parked = false;
        });

        // Re-centre once the pill has faded out, ready for the next entry.
        frame.addEventListener('pointerleave', () => {
            if (parked) return;
            parked = true;
            setTimeout(() => { if (parked) park(); }, 300);
        });
    });
}

/* ==========================================================================
   Project Scroll Expansion

   antigravity.google's hero: section.landing-video-section is authored as
   transform: scale(1) with transform-origin at its centre and no transition
   (transition-duration reads 0s), while JS holds it at scale(0.5) and writes
   a new scale every frame as you scroll — so the growth is mapped directly to
   scroll position rather than played back over time.

   Same idea here, per project image: 0.5 at the moment it rises past the
   bottom of the viewport, reaching 1 by the time it is properly in view.
   ========================================================================== */
function initProjectScrollScale() {
    const frames = document.querySelectorAll('.project-thumbnail-wrapper');
    if (!frames.length) return;

    // Reduced motion: leave every image at its final size.
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const MIN_SCALE = 0.5;      // matches their resting scale(0.5)
    const END_FRACTION = 0.35;  // fully grown once the top reaches 35% of the viewport

    let queued = false;

    function apply() {
        queued = false;
        const viewport = window.innerHeight;
        const start = viewport;
        const end = viewport * END_FRACTION;

        frames.forEach((frame) => {
            const top = frame.getBoundingClientRect().top;
            // Below the fold -> 0, fully in view -> 1.
            let progress = (start - top) / (start - end);
            progress = Math.min(1, Math.max(0, progress));
            const scale = MIN_SCALE + (1 - MIN_SCALE) * progress;
            frame.style.transform = `scale(${scale.toFixed(4)})`;
        });
    }

    function onScroll() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(apply);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    // The cards live in the SPA's home view, so re-run when a view is shown.
    const homeView = document.getElementById('home-view');
    if (homeView) {
        new MutationObserver(onScroll).observe(homeView, {
            attributes: true,
            attributeFilter: ['class'],
        });
    }

    apply();
}

/* ==========================================================================
   Footer "Back to top"
   ========================================================================== */
function initBackToTop() {
    const link = document.querySelector('.site-footer-totop');
    if (!link) return;

    /* "instant", not "auto": html carries scroll-behavior: smooth, and "auto"
       defers to that, so the jump would still glide. */
    link.addEventListener("click", (event) => {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: "instant" });
    });
}



/* ==========================================================================
   Footer flower sway — ported from cyze.dev's footer script

   The flowers do not rotate. Each path's geometry is rewritten every frame so
   the stem bends along its length: a point's displacement scales with how far
   up the flower it sits, leaving the base planted while the head travels.

   Per point, with n = 1 - y/height (0 at the base, 1 at the tip):
       angle = (sway + velocity * LOOKAHEAD * n) * n^2
       arm   = height * n
       x' = x + arm * sin(angle)
       y' = y + arm * (1 - cos(angle)) * DROOP

   Driving it: a pointermove anywhere in the footer frame sets a target bend
   for every flower within RADIUS, falling off on a smoothstep, and a spring
   chases that target (velocity += (target - sway) * stiffness; velocity *=
   damping). Stiffness is detuned per flower so the row never moves as one.
   ========================================================================== */
function initFlowerSway() {
    const row = document.querySelector('.site-footer-flowers');
    if (!row || !window.matchMedia) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const RADIUS = 150;
    const MAX_SWAY = 0.09;
    const LOOKAHEAD = 3;
    const DROOP = 3;
    const DAMPING = 0.88;
    const REST = 8e-4;

    /* Absolute M/L/C/V/H/Z only. Anything else (arcs, relative commands)
       returns null and that path is left alone rather than mangled. */
    const ARITY = { M: 2, L: 2, C: 6, V: 1, H: 1 };

    function parsePath(d) {
        if (/[a-df-z]/.test(d.replace(/e[-+]?\d+/g, ''))) return null;
        const tokens = d.match(/[A-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g);
        if (!tokens) return null;

        const commands = [];
        let command = '';
        let x = 0;
        let y = 0;
        let i = 0;

        while (i < tokens.length) {
            if (/[A-Z]/.test(tokens[i])) command = tokens[i++];

            if (command === 'Z') { commands.push({ c: 'Z', n: [] }); continue; }
            if (!(command in ARITY)) return null;

            // V and H carry one number; expand them to a full L so the bend
            // maths only ever sees coordinate pairs.
            if (command === 'V') { y = Number(tokens[i++]); commands.push({ c: 'L', n: [x, y] }); continue; }
            if (command === 'H') { x = Number(tokens[i++]); commands.push({ c: 'L', n: [x, y] }); continue; }

            const count = ARITY[command];
            const nums = tokens.slice(i, i + count).map(Number);
            if (nums.length < count || nums.some(Number.isNaN)) return null;
            i += count;
            x = nums[count - 2];
            y = nums[count - 1];
            commands.push({ c: command, n: nums });
        }
        return commands;
    }

    const flowers = Array.from(row.querySelectorAll('.flower svg')).map((svg, index) => ({
        svg: svg,
        height: (svg.viewBox && svg.viewBox.baseVal && svg.viewBox.baseVal.height) || 200,
        paths: Array.from(svg.querySelectorAll('path'))
            .map((el) => ({ el: el, cmds: parsePath(el.getAttribute('d') || ''), d0: el.getAttribute('d') || '' }))
            .filter((p) => p.cmds !== null),
        sway: 0,
        velocity: 0,
        bent: false,
        stiffness: 0.03 * (1 + ((index % 3) - 1) * 0.15),
    })).filter((f) => f.paths.length);

    if (!flowers.length) return;

    const pointer = { x: 0, y: 0, active: false };
    let frame = 0;
    const smoothstep = (t) => t * t * (3 - 2 * t);

    function tick() {
        let settled = true;

        for (const flower of flowers) {
            let target = 0;
            const host = flower.svg.closest('.flower');

            if (pointer.active && host && host.offsetParent !== null) {
                const box = flower.svg.getBoundingClientRect();
                const cx = box.left + box.width / 2;
                const cy = box.top + box.height / 2;
                const distance = Math.hypot(pointer.x - cx, pointer.y - cy);
                if (distance < RADIUS) {
                    const strength = smoothstep(1 - distance / RADIUS);
                    target = (Math.sign(cx - pointer.x) || 1) * MAX_SWAY * strength;
                }
            }

            flower.velocity += (target - flower.sway) * flower.stiffness;
            flower.velocity *= DAMPING;
            flower.sway += flower.velocity;

            if (Math.abs(flower.sway) < REST && Math.abs(flower.velocity) < REST && target === 0) {
                // Settled: restore the authored geometry exactly once.
                if (flower.bent) {
                    flower.bent = false;
                    flower.sway = 0;
                    flower.velocity = 0;
                    for (const path of flower.paths) path.el.setAttribute('d', path.d0);
                }
                continue;
            }

            settled = false;
            const height = flower.height;
            const bendPoint = (px, py) => {
                const n = Math.max(0, 1 - py / height);
                const angle = (flower.sway + flower.velocity * LOOKAHEAD * n) * n * n;
                const arm = height * n;
                return [px + arm * Math.sin(angle), py + arm * (1 - Math.cos(angle)) * DROOP];
            };

            for (const path of flower.paths) {
                let d = '';
                for (const cmd of path.cmds) {
                    if (cmd.c === 'Z') { d += 'Z'; continue; }
                    d += cmd.c;
                    for (let k = 0; k < cmd.n.length; k += 2) {
                        const [bx, by] = bendPoint(cmd.n[k], cmd.n[k + 1]);
                        d += bx.toFixed(2) + ' ' + by.toFixed(2) + ' ';
                    }
                }
                path.el.setAttribute('d', d);
            }
            flower.bent = true;
        }

        frame = settled ? 0 : requestAnimationFrame(tick);
    }

    function wake() { if (!frame) frame = requestAnimationFrame(tick); }

    const host = row.closest('.site-footer-frame') || row;
    host.addEventListener('pointermove', (event) => {
        if (event.pointerType !== 'mouse') return;
        pointer.x = event.clientX;
        pointer.y = event.clientY;
        pointer.active = true;
        wake();
    }, { passive: true });

    host.addEventListener('pointerleave', () => { pointer.active = false; wake(); });
}

/* ==========================================================================
   Theme toggle — ported from cyze.dev

   Dark is the default: with no stored preference the page stays dark rather
   than reading prefers-color-scheme, so a first-time visitor always lands on
   the dark design. Light is opt-in and remembered in localStorage.

   The switch itself is a circular reveal driven by the View Transitions API.
   Three details are what make it read cleanly rather than as a flash:

     1. The circle is centred on the toggle and grows to the furthest corner,
        so the new theme appears to spread from the control you pressed.
     2. Centre and radius are expressed in percentages, not pixels. Chromium
        resolves px on ::view-transition-new(root) against a box that is not
        the CSS viewport, which lands the circle at half its coordinates on a
        2x display. A circle's % radius resolves against the box diagonal over
        sqrt(2), so the px radius is converted the same way.
     3. Every colour transition is snapped to 0s while the snapshots are
        taken, or the old frame captures mid-transition colours and the reveal
        looks muddy. The thumb's own transform transition is exempt so it
        keeps sliding during the wipe.
   ========================================================================== */
function initThemeToggle() {
    const STORAGE_KEY = 'theme';
    const root = document.documentElement;

    function storedTheme() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === 'light' || saved === 'dark') return saved;
        } catch (error) { /* private mode — fall through to the default */ }
        return 'dark';   // default, deliberately not prefers-color-scheme
    }

    function applyTheme(theme) {
        const isLight = theme === 'light';
        root.classList.toggle('light', isLight);
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            // aria-checked tracks "is dark", matching the switch's label.
            toggle.setAttribute('aria-checked', String(!isLight));
            toggle.setAttribute('aria-label', isLight ? 'Toggle dark mode' : 'Toggle light mode');
        }
    }

    function persist(theme) {
        try { localStorage.setItem(STORAGE_KEY, theme); } catch (error) { /* ignore */ }
    }

    applyTheme(storedTheme());

    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    toggle.addEventListener('click', function () {
        const next = root.classList.contains('light') ? 'dark' : 'light';
        const reduced = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // No View Transitions, or motion is unwanted: swap outright.
        if (!document.startViewTransition || reduced) {
            applyTheme(next);
            persist(next);
            return;
        }

        const rect = this.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        const radiusPx = Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y));
        const at = ' at ' + (x / vw * 100).toFixed(3) + '% ' + (y / vh * 100).toFixed(3) + '%';
        const radius = (radiusPx / (Math.hypot(vw, vh) / Math.SQRT2) * 100).toFixed(3);
        // Clear anything stranded by a transition that was skipped before its
        // own cleanup could run. Without this, an interrupted switch leaves
        // the 0s-transition override in the head and every CSS transition on
        // the site stays dead until reload.
        document.querySelectorAll('style[data-theme-transition]').forEach(function (node) {
            node.remove();
        });

        // Kills the browser's default crossfade, which would otherwise wash
        // out the clip-path reveal.
        const vtStyle = document.createElement('style');
        vtStyle.dataset.themeTransition = 'vt';
        vtStyle.textContent =
            '::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal}';
        document.head.appendChild(vtStyle);

        const snapStyle = document.createElement('style');
        snapStyle.dataset.themeTransition = 'snap';
        snapStyle.textContent =
            '*,*::before,*::after{transition-duration:0s!important}' +
            '#theme-toggle .toggle-thumb{transition:transform 350ms cubic-bezier(0.2, 0, 0, 1)!important}';
        document.head.appendChild(snapStyle);

        const transition = document.startViewTransition(function () {
            applyTheme(next);
            persist(next);
        });

        transition.ready.then(function () {
            snapStyle.remove();   // snapshots taken; let the thumb animate live
            root.animate(
                { clipPath: ['circle(0%' + at + ')', 'circle(' + radius + '%' + at + ')'] },
                {
                    duration: 600,
                    // Literal bezier: the Web Animations API will not resolve a
                    // CSS custom property here.
                    easing: 'cubic-bezier(0.2, 0, 0, 1)',
                    pseudoElement: '::view-transition-new(root)',
                }
            );
        }).catch(function () {
            // Skipped — usually a second click landing mid-transition. The
            // theme still applies; only the reveal is lost.
            snapStyle.remove();
        });

        transition.finished.finally(function () {
            snapStyle.remove();
            vtStyle.remove();
        });
    });
}

/* ==========================================================================
   Typed hero headline

   Ported from antigravity.google's TypedHeader:
     _astro/TypedHeader.astro_astro_type_script_index_0_lang.BK7Om3wI.js

   Their version runs on GSAP with the SplitText plugin. The behaviour it
   describes is small enough to write directly, which avoids pulling a
   licensed plugin and a tweening library onto a site that has neither.

   Timings are theirs exactly:
     delay      0.2s before the first character
     stagger    0.05s between characters
     duration   0.01s per character — effectively an on/off reveal
     cursor     parks 10px past the right edge of the newest character
     outro      cursor fades over 0.5s once the line is done

   Splitting happens per word, then per character inside it, so words stay
   unbreakable and the headline still wraps exactly where it did before.
   The split copy is hidden from assistive tech and a plain-text copy is left
   beside it, so the headline is read once, as one sentence.
   ========================================================================== */
function initTypedHeader() {
    const heading = document.querySelector('.hero-headline');
    if (!heading) return;

    const text = heading.textContent.trim().replace(/\s+/g, ' ');
    if (!text) return;

    heading.textContent = '';
    heading.classList.add('is-typed');

    const readable = document.createElement('span');
    readable.className = 'visually-hidden';
    readable.textContent = text;
    heading.appendChild(readable);

    const content = document.createElement('span');
    content.className = 'typed-content';
    content.setAttribute('aria-hidden', 'true');
    heading.appendChild(content);

    const chars = [];
    text.split(' ').forEach((word, wordIndex, words) => {
        const wordEl = document.createElement('span');
        wordEl.className = 'typed-word';
        for (const ch of word) {
            const charEl = document.createElement('span');
            charEl.className = 'typed-char';
            charEl.textContent = ch;
            wordEl.appendChild(charEl);
            chars.push(charEl);
        }
        content.appendChild(wordEl);
        // A real space between words, so the line breaks where it always did.
        if (wordIndex < words.length - 1) {
            content.appendChild(document.createTextNode(' '));
        }
    });

    if (!chars.length) return;

    const cursor = document.createElement('span');
    cursor.className = 'typed-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    heading.appendChild(cursor);

    function moveCursorTo(charEl, trailing) {
        // offsetLeft is relative to the nearest positioned ancestor, which is
        // the heading — the same basis the cursor is positioned against.
        const x = charEl.offsetLeft + (trailing ? charEl.offsetWidth + 10 : 0);
        const y = charEl.offsetTop;
        cursor.style.setProperty('--cursor-pos-x', x + 'px');
        cursor.style.setProperty('--cursor-pos-y', y + 'px');
    }

    const reduced = window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
        chars.forEach((c) => { c.style.opacity = '1'; });
        cursor.remove();
        return;
    }

    moveCursorTo(chars[0], false);

    const DELAY = 200;
    const STAGGER = 50;
    let started = 0;
    let revealed = 0;

    function step(now) {
        if (!started) started = now;
        const due = Math.min(
            chars.length,
            Math.floor((now - started - DELAY) / STAGGER) + 1
        );

        // Catch up in one pass rather than one character per frame, so a
        // dropped frame does not slow the whole line down.
        while (revealed < due) {
            const charEl = chars[revealed];
            charEl.style.opacity = '1';
            moveCursorTo(charEl, true);
            revealed++;
        }

        if (revealed < chars.length) {
            requestAnimationFrame(step);
            return;
        }
        cursor.classList.add('is-done');   // fades out over 0.5s
    }

    requestAnimationFrame((now) => {
        cursor.classList.add('is-visible');
        step(now);
    });
}

/* ==========================================================================
   More Work — infinite marquee

   Same construction as initGalleryMarquee: the markup ships one run, this
   clones it so the track holds two, and the CSS translates by -50% so the
   restart lands on an identical frame.

   Two differences, both because these items are links rather than pictures.
   The clone is inert — its buttons are removed from the tab order and hidden
   from assistive tech, so each project is announced and focusable once, not
   twice. And a drag is not treated as a click: without that, nudging the
   strip sideways to read a card would open it.
   ========================================================================== */
function initMoreWorkMarquee() {
    const track = document.getElementById('more-work-track');
    if (!track) return;

    const run = track.querySelector('.more-work-run');
    if (!run) return;

    const PX_PER_SECOND = 40;

    const clone = run.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.querySelectorAll('.more-work-link').forEach((link) => {
        link.tabIndex = -1;
    });
    clone.querySelectorAll('img').forEach((img) => { img.alt = ''; });
    track.appendChild(clone);

    function setSpeed() {
        const width = run.getBoundingClientRect().width;
        if (!width) return;
        // Derived from the run's own width, so adding a project lengthens the
        // loop instead of speeding everything up.
        track.style.animationDuration = (width / PX_PER_SECOND).toFixed(2) + 's';
    }

    setSpeed();
    track.classList.add('is-running');

    window.addEventListener('load', setSpeed);

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(setSpeed, 150);
    });

    /* The clone's buttons carry the same data attributes as the originals, so
       a click on either opens the same case study — no special casing needed
       beyond letting the event reach the shared handler in initSPARouting. */
}

/* ==========================================================================
   Character Reveal
   --------------------------------------------------------------------------
   Fades text in one character at a time, the way antigravity.google reveals
   its feature copy. STAGGER is the gap between consecutive characters
   starting; FADE is how long any single character takes. Keeping FADE several
   times larger than STAGGER leaves roughly FADE/STAGGER characters mid-fade
   at once, so the effect reads as a soft edge sweeping along the line rather
   than a hard typewriter.
   ========================================================================== */

const REVEAL_STAGGER_MS = 9;
const REVEAL_FADE_MS = 140;   // mirrors the .reveal-char transition in styles.css

let textRevealObserver = null;

function initTextReveal() {
    primeTextReveal(document);
}

/* Splits every not-yet-primed [data-text-reveal] under `root` and hands it to
   the observer so it plays when it first scrolls into view. Runs again after
   the case study clones a template, since that copy doesn't exist at load. */
function primeTextReveal(root) {
    if (!root) return;

    const targets = root.querySelectorAll('[data-text-reveal]');
    if (!targets.length) return;

    const reduced = window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!reduced && !textRevealObserver) {
        textRevealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                playTextReveal(entry.target);
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.25 });
    }

    targets.forEach(el => {
        if (el.dataset.revealReady) return;
        el.dataset.revealReady = 'true';

        // Reduced motion leaves the original text node alone entirely.
        if (reduced) return;

        splitIntoChars(el);
        textRevealObserver.observe(el);
    });
}

/* Rebuilds the element as one wrapper per word, each holding one span per
   character. Words stay unbreakable so none splits across lines mid-fade.
   The split copy is decorative — the sentence moves to aria-label so screen
   readers announce it once instead of spelling it out letter by letter. */
function splitIntoChars(el) {
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return;

    el.setAttribute('aria-label', text);
    el.textContent = '';

    const shell = document.createElement('span');
    shell.setAttribute('aria-hidden', 'true');

    let index = 0;
    text.split(' ').forEach((word, wordIndex) => {
        if (wordIndex > 0) shell.appendChild(document.createTextNode(' '));

        const wordEl = document.createElement('span');
        wordEl.className = 'reveal-word';

        for (const char of word) {
            const charEl = document.createElement('span');
            charEl.className = 'reveal-char';
            charEl.textContent = char;
            charEl.style.transitionDelay = (index * REVEAL_STAGGER_MS) + 'ms';
            wordEl.appendChild(charEl);
            index += 1;
        }

        shell.appendChild(wordEl);
        index += 1;   // count the space too, so the sweep travels evenly
    });

    el.appendChild(shell);
}

/* One frame of breathing room lets the browser paint the characters at
   opacity 0 before the transitions start; without it the line can appear
   fully formed instead of fading. */
function playTextReveal(el) {
    const chars = el.querySelectorAll('.reveal-char');
    if (!chars.length) return;

    requestAnimationFrame(() => {
        chars.forEach(char => char.classList.add('is-revealed'));
    });

    // Drop the compositing hint once the last character has landed.
    const total = REVEAL_FADE_MS + chars.length * REVEAL_STAGGER_MS;
    setTimeout(() => {
        chars.forEach(char => { char.style.willChange = 'auto'; });
    }, total + 100);
}

/* ==========================================================================
   Screen rail
   --------------------------------------------------------------------------
   A horizontal snap rail whose centred card comes forward. The scrolling
   itself is the browser's: the markup is a real scroll container with snap
   points, so dragging, flicking, trackpads, keyboards and touch all work
   without being reimplemented here. This only does the two things CSS cannot:
   decide which card is currently centred, and move to the next one on a timer.
   ========================================================================== */

const RAIL_ADVANCE_MS = 3000;
/* Long enough for a smooth scroll to finish before the wrap is applied. */
const RAIL_SETTLE_MS = 700;

function initScreenRail(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-rail]').forEach(setUpRail);
}

function setUpRail(rail) {
    if (rail.dataset.railReady) return;
    rail.dataset.railReady = 'true';

    const track = rail.querySelector('.cs-rail-track');
    const items = Array.from(rail.querySelectorAll('.cs-rail-item'));
    if (!track || !items.length) return;

    const reduced = window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const count = items.length;

    /* A second copy of the run, so the rail can keep travelling in one
       direction past the last card. Reaching the end used to mean scrolling
       all the way back to the start, which read as the rail running backwards
       through everything it had just shown. Now the card after the last is
       the copy of the first: the rail carries on forwards, and once it has
       settled there the scroll position is moved to the real first card
       without animating. The two are identical, so the seam is invisible. */
    if (!reduced) {
        items.forEach((item) => {
            const clone = item.cloneNode(true);
            /* One run of screens, announced once. */
            clone.setAttribute('aria-hidden', 'true');
            track.appendChild(clone);
        });
    }

    const all = Array.from(rail.querySelectorAll('.cs-rail-item'));

    /* Which card is centred. A band down the middle of the rail is the test:
       whichever card overlaps it most is the one in focus. Reading it from the
       observer rather than from scrollLeft means it stays correct through a
       flick, a drag, or a snap settling. */
    const marker = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            entry.target.classList.toggle('is-active', entry.isIntersecting);
        });
    }, { root: rail, rootMargin: '0px -45% 0px -45%', threshold: 0.01 });

    all.forEach((item) => marker.observe(item));

    // Where a card sits when centred, in the rail's own scroll space.
    const restFor = (item) => item.offsetLeft - (rail.clientWidth - item.offsetWidth) / 2;

    // Centre a card without touching the page's own scroll position.
    const centre = (item) => {
        rail.scrollTo({ left: restFor(item), behavior: reduced ? 'auto' : 'smooth' });
    };

    if (reduced) return;   // no autoplay; the rail stays fully usable by hand

    /* Read the position back rather than counting steps, so a drag or a flick
       by the reader leaves the rail picking up from wherever they left it. */
    const centred = () => {
        const middle = rail.scrollLeft + rail.clientWidth / 2;
        let best = 0;
        let shortest = Infinity;
        all.forEach((item, i) => {
            const gap = Math.abs(item.offsetLeft + item.offsetWidth / 2 - middle);
            if (gap < shortest) {
                shortest = gap;
                best = i;
            }
        });
        return best;
    };

    let timer = null;
    let paused = false;

    const step = () => {
        if (paused) return;

        const next = Math.min(centred() + 1, count);
        centre(all[next]);

        if (next === count) {
            /* Landed on the copy of the first card. Once the smooth scroll has
               finished, drop back to the real one — same picture, same offset
               from the centre, so nothing moves on screen.

               The centred class has to move across in the same breath. Left to
               the observer it arrives a frame later, and the real first card
               spends that frame at its resting scale before growing in, which
               shows up as a pop exactly at the wrap. Transitions are off for
               the one frame it takes to hand over. */
            window.setTimeout(() => {
                rail.classList.add('is-snapping');
                all[count].classList.remove('is-active');
                all[0].classList.add('is-active');
                rail.scrollTo({ left: restFor(all[0]), behavior: 'auto' });
                void rail.offsetWidth;   // paint the handover before easing resumes
                requestAnimationFrame(() => rail.classList.remove('is-snapping'));
            }, RAIL_SETTLE_MS);
        }
    };

    const start = () => { if (!timer) timer = setInterval(step, RAIL_ADVANCE_MS); };
    const stop = () => { clearInterval(timer); timer = null; };

    start();

    // Hand off to the reader the moment they touch it, and take back over once
    // they leave.
    const hold = () => { paused = true; };
    const release = () => { paused = false; };

    rail.addEventListener('pointerenter', hold);
    rail.addEventListener('pointerleave', release);
    rail.addEventListener('focusin', hold);
    rail.addEventListener('focusout', release);
    rail.addEventListener('touchstart', hold, { passive: true });
    rail.addEventListener('touchend', release, { passive: true });
}


/* ==========================================================================
   Autoplaying carousel
   --------------------------------------------------------------------------
   Cycles by itself and never stops. There are no controls, so the only job
   here is the transition, and the whole effect is in how the two frames move
   differently: the incoming one crosses the full width, the outgoing one
   drifts about a third of that while dimming and shrinking a little. Equal
   speeds would read as one flat strip sliding past; unequal speeds read as
   one image arriving over another that is falling back. Nothing is drawn
   between the two: a lit seam on the leading edge read as a hard white line
   over the artwork instead of a blend, so the parallax carries it alone.

   Grown out of Originkit's Cursor Image Gallery, which is React and is driven
   by the pointer rather than a timer:
   https://www.originkit.dev/components/cursor-image-gallery
   ========================================================================== */

const GALLERY_DURATION_MS = 850;
const GALLERY_HOLD_MS = 2200;
/* Must match --gallery-parallax in the stylesheet. */
const GALLERY_PARALLAX = 0.34;

function initCursorGallery(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-gallery]').forEach(setUpGallery);
}

function setUpGallery(gallery) {
    if (gallery.dataset.galleryReady) return;
    gallery.dataset.galleryReady = 'true';

    let slides = [];
    try {
        slides = JSON.parse(gallery.dataset.gallerySlides || '[]');
    } catch (error) {
        slides = [];
    }
    if (!slides.length) return;

    const stage = gallery.querySelector('[data-gallery-stage]');
    if (!stage) return;

    const reduced = window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const frames = slides.map((slide, index) => {
        const img = document.createElement('img');
        img.className = 'cs-gallery-slide';
        img.src = slide.src;
        /* The container carries the description; the frames are one rotating
           view of the same subject, so announcing each would only repeat. */
        img.alt = '';
        img.decoding = 'async';
        /* Only the opening frame is worth blocking on. The rest are built now
           so a turn never waits on the network, but they load in their own
           time. */
        img.loading = index === 0 ? 'eager' : 'lazy';
        return img;
    });

    let index = 0;
    let current = frames[0];
    stage.appendChild(current);

    let moving = false;

    const advance = () => {
        if (moving) return;
        const next = (index + 1) % frames.length;
        if (next === index) return;

        const incoming = frames[next];
        const outgoing = current;

        moving = true;
        index = next;

        if (reduced) {
            stage.replaceChildren(incoming);
            current = incoming;
            moving = false;
            return;
        }

        /* Start state, applied before the transition class so the browser has
           something to animate away from. */
        incoming.classList.remove('is-animating', 'is-leaving');
        incoming.classList.add('is-entering');
        incoming.style.transform = 'translateX(100%)';
        incoming.style.opacity = '1';

        outgoing.classList.remove('is-entering');
        outgoing.classList.add('is-leaving');
        outgoing.style.transform = 'translateX(0%) scale(1)';
        outgoing.style.opacity = '1';

        stage.appendChild(incoming);

        /* Two frames: one for the browser to adopt the start state, a second
           before the class that animates off it. A single frame is sometimes
           collapsed with the append and the move is skipped entirely. */
        requestAnimationFrame(() => requestAnimationFrame(() => {
            incoming.classList.add('is-animating');
            outgoing.classList.add('is-animating');

            incoming.style.transform = 'translateX(0%)';
            /* The slower layer. Dimming and a slight shrink on top of the
               shorter travel, so it reads as falling back rather than just
               lagging. */
            outgoing.style.transform =
                `translateX(${-100 * GALLERY_PARALLAX}%) scale(0.96)`;
            outgoing.style.opacity = '0.35';
        }));

        window.setTimeout(() => {
            outgoing.remove();
            outgoing.classList.remove('is-animating', 'is-leaving');
            outgoing.style.transform = '';
            outgoing.style.opacity = '';

            incoming.classList.remove('is-animating', 'is-entering');
            current = incoming;
            moving = false;
        }, GALLERY_DURATION_MS);
    };

    if (reduced) return;

    /* Starts with the case study and never stops — not gated on being in
       view, so it is already mid-cycle rather than sitting on its first
       frame by the time the reader scrolls down to it. */
    window.setInterval(advance, GALLERY_HOLD_MS + GALLERY_DURATION_MS);
}


/* ==========================================================================
   Avatar group
   --------------------------------------------------------------------------
   Hovering one avatar lifts it and scales it up, and nudges its neighbours by
   a share of that lift which falls away with distance — so the row bends
   around the pointer instead of one item moving alone.

   Spring, falloff and the two easing curves are Transitions.dev's avatar
   group. The one thing worth knowing: the timing function is written inline
   BEFORE the variables that move things. Hover-in eases out softly; leaving
   uses a curve that overshoots, which is what gives the row its snap back.
   Writing the curve after the offsets would apply it a transition late.
   ========================================================================== */

function initAvatarGroup(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-avatars]').forEach(setUpAvatarGroup);
}

function setUpAvatarGroup(group) {
    if (group.dataset.avatarsReady) return;
    group.dataset.avatarsReady = 'true';

    const items = Array.from(group.querySelectorAll('.cs-avatar'));
    if (!items.length) return;

    const scope = group.closest('.cs-role') || group.parentElement;
    const tip = scope && scope.querySelector('[data-avatar-tip]');
    const tipName = tip && tip.querySelector('[data-avatar-tip-name]');
    const tipRole = tip && tip.querySelector('[data-avatar-tip-role]');

    const read = (name, fallback) => {
        const value = parseFloat(getComputedStyle(group).getPropertyValue(name));
        return Number.isNaN(value) ? fallback : value;
    };

    const settle = (easing) => {
        items.forEach((item) => {
            item.style.transitionTimingFunction = easing;
        });
    };

    const focus = (index) => {
        const lift = read('--avatar-lift', -6);
        const scale = read('--avatar-scale', 1.06);
        const falloff = read('--avatar-falloff', 0.45);

        settle('var(--avatar-ease-in)');

        items.forEach((item, i) => {
            const distance = Math.abs(i - index);
            item.style.setProperty('--shift', (lift * Math.pow(falloff, distance)).toFixed(3) + 'px');
            item.style.setProperty('--scale-active', i === index ? scale : 1);
            item.classList.toggle('is-active', i === index);
        });

        if (!tip) return;
        const item = items[index];
        const box = item.getBoundingClientRect();
        const frame = scope.getBoundingClientRect();
        tipName.textContent = item.dataset.name || '';
        tipRole.textContent = item.dataset.role || '';
        tip.style.left = `${box.left - frame.left + box.width / 2}px`;
        /* Sits just clear of the avatar's lifted position. */
        tip.style.top = `${box.top - frame.top - 12}px`;
        tip.classList.add('is-visible');
    };

    const release = () => {
        settle('var(--avatar-ease-out)');
        items.forEach((item) => {
            item.style.setProperty('--shift', '0px');
            item.style.setProperty('--scale-active', 1);
            item.classList.remove('is-active');
        });
        if (tip) tip.classList.remove('is-visible');
    };

    items.forEach((item, index) => {
        item.addEventListener('mouseenter', () => focus(index));
        /* Keyboard and touch reach it the same way. */
        item.addEventListener('focus', () => focus(index));
        item.setAttribute('tabindex', '0');
    });

    group.addEventListener('mouseleave', release);
    group.addEventListener('focusout', (event) => {
        if (!group.contains(event.relatedTarget)) release();
    });
}


/* ==========================================================================
   Case study pager
   --------------------------------------------------------------------------
   Previous and next project at the foot of every case study, each with the
   cover it already has on the home page. Built from the project cards rather
   than written into each template, so the four stay in step with the home
   page order and a fifth would be picked up without touching this.

   Reference for the pattern: https://www.kerem.co/projects/carbon-health
   ========================================================================== */

function buildCasePager(root, slug, open) {
    if (!root) return;

    const editorial = root.querySelector('.case-study-editorial');
    if (!editorial || editorial.querySelector('.cs-pager')) return;

    const cards = Array.from(document.querySelectorAll('.project-card[data-project]'));
    const here = cards.findIndex((card) => card.dataset.project === slug);
    if (here === -1 || cards.length < 2) return;

    /* Wraps, so the last project leads back to the first rather than
       dead-ending. */
    const wrap = (i) => (i + cards.length) % cards.length;

    const entry = (card, direction) => {
        const title = card.querySelector('.project-title')?.textContent.trim() || '';
        const thumb = card.querySelector('.project-thumbnail');
        const back = direction === 'previous';

        const link = document.createElement('button');
        link.type = 'button';
        link.className = `cs-pager-link cs-pager-link--${direction}`;
        link.dataset.project = card.dataset.project;
        link.setAttribute('aria-label', `${back ? 'Previous' : 'Next'} project: ${title}`);

        const arrow = back
            ? '<path d="M19 12H5M11 18l-6-6 6-6"/>'
            : '<path d="M5 12h14M13 6l6 6-6 6"/>';

        link.innerHTML = `
            <span class="cs-pager-arrow" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${arrow}</svg>
            </span>
            <span class="cs-pager-thumb" aria-hidden="true">
                <img src="${thumb ? thumb.getAttribute('src') : ''}" alt="" loading="lazy" decoding="async">
            </span>
            <span class="cs-pager-copy">
                <span class="cs-pager-eyebrow">${back ? 'Previous' : 'Next'}</span>
                <span class="cs-pager-title">${title}</span>
            </span>`;

        link.addEventListener('click', () => {
            open(card.dataset.project, card);
            window.scrollTo({ top: 0, behavior: 'auto' });
        });

        return link;
    };

    const pager = document.createElement('nav');
    pager.className = 'cs-pager';
    pager.setAttribute('aria-label', 'More projects');
    pager.append(
        entry(cards[wrap(here - 1)], 'previous'),
        entry(cards[wrap(here + 1)], 'next')
    );

    editorial.appendChild(pager);
}


/* ==========================================================================
   Bento grid
   --------------------------------------------------------------------------
   Plays the tile entrance once, the first time the grid is properly on
   screen. After the longest staggered transition has finished, the grid is
   marked settled so hover can take over without the entrance delays.
   ========================================================================== */

function initBento(root) {
    const scope = root || document;
    /* [data-play-once] reuses the same one-shot trigger for any other
       entrance, such as the HDFC scope-of-work stack. */
    scope.querySelectorAll('[data-bento], [data-play-once]').forEach((bento) => {
        if (bento.dataset.bentoReady) return;
        bento.dataset.bentoReady = 'true';

        const tiles = bento.querySelectorAll('.bento-tile');
        const reduced = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const play = () => {
            bento.classList.add('is-in');
            const lastBeat = Math.max(0, ...Array.from(tiles, (t) => Number(t.style.getPropertyValue('--i')) || 0));
            window.setTimeout(() => bento.classList.add('is-settled'), lastBeat * 45 + 1600);
        };

        if (reduced) {
            play();
            return;
        }

        /* Two triggers, whichever lands first: the observer, and a plain
           geometry check on scroll. The observer alone can report a zero
           intersection when the page is not painting frames (a background
           tab, some embedded webviews), and the entrance must never be left
           unplayed with every tile invisible. */
        let done = false;
        let observer = null;
        const check = () => {
            if (done) return;
            const box = bento.getBoundingClientRect();
            const vh = window.innerHeight || document.documentElement.clientHeight;
            if (box.top < vh * 0.8 && box.bottom > vh * 0.2) start();
        };
        /* Called directly, not through requestAnimationFrame: a throttled
           page may never deliver the frame, which is the case this guards. */
        const onScroll = check;
        const start = () => {
            if (done) return;
            done = true;
            if (observer) observer.disconnect();
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onScroll);
            play();
        };

        if ('IntersectionObserver' in window) {
            observer = new IntersectionObserver((entries) => {
                if (entries.some((entry) => entry.isIntersecting)) start();
            }, { threshold: 0.25 });
            observer.observe(bento);
        }
        window.addEventListener('scroll', onScroll, { passive: true, capture: true });
        window.addEventListener('resize', onScroll);
        check();
    });
}


/* ==========================================================================
   Initiative rail fade
   --------------------------------------------------------------------------
   Every frame, each card's opacity and scale are set from how close its
   centre is to the nearer edge of the rail: full inside the middle, easing
   to nothing as it leaves. Fading whole cards keeps the dark theme clean,
   where a gradient mask would cut a bright light-card band across the edge.
   ========================================================================== */

function initInitiativeRail(root) {
    const scope = root || document;
    scope.querySelectorAll('.hd-rail').forEach((rail) => {
        if (rail.dataset.fadeReady) return;
        rail.dataset.fadeReady = 'true';

        const cards = Array.from(rail.querySelectorAll('.hd-insight'));
        const reduced = window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!cards.length || reduced) return;

        const ease = (t) => t * t * (3 - 2 * t);   // smoothstep

        const tick = () => {
            if (!rail.isConnected) return;
            const box = rail.getBoundingClientRect();
            if (box.width) {
                cards.forEach((card) => {
                    const c = card.getBoundingClientRect();
                    const centre = c.left + c.width / 2;
                    const edge = Math.min(centre - box.left, box.right - centre);
                    /* Fully visible once the centre is most of a card inside the
                       rail; gone once the centre has passed a third of a card
                       beyond the edge. */
                    const t = ease(Math.max(0, Math.min(1, (edge + c.width * 0.35) / (c.width * 1.05))));
                    card.style.opacity = t.toFixed(3);
                    card.style.transform = `scale(${(0.94 + 0.06 * t).toFixed(4)})`;
                });
            }
            window.requestAnimationFrame(tick);
        };
        window.requestAnimationFrame(tick);
    });
}
