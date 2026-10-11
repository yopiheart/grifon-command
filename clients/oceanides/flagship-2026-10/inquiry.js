(() => {
  'use strict';

  const form = document.getElementById('inquiry-form');
  const panels = [...document.querySelectorAll('[data-panel]')];
  const steps = [...document.querySelectorAll('[data-step]')];
  const summaryText = document.getElementById('summary-text');
  const status = document.getElementById('copy-status');
  const labels = {
    problem: {
      'slow-flush': 'Mabagal ang flush',
      'returning-clog': 'Pabalik-balik ang bara',
      odor: 'May kakaibang amoy',
      maintenance: 'Planning maintenance',
      other: 'Iba pang concern'
    },
    role: { owner: 'Owner', tenant: 'Tenant', manager: 'Property manager' },
    tank: { yes: 'Alam ang location', no: 'Hindi alam ang location', unsure: 'Hindi pa sure sa location' },
    timing: { urgent: 'As soon as possible, for assessment', planned: 'Planuhin muna' }
  };
  let currentStep = 0;
  let reachedStep = 0;
  const postParam = new URLSearchParams(window.location.search).get('post');
  const allowedPostIds = new Set(JSON.parse(document.getElementById('inquiry-post-ids').textContent));
  const sourcePost = allowedPostIds.has(postParam) ? postParam : null;
  if (sourcePost) document.getElementById('inquiry-source').textContent = `FROM CREATIVE ${sourcePost} / INQUIRY PREVIEW`;

  const value = (name) => form.elements.namedItem(name).value;
  const validStep = (step) => step === 0
    ? Boolean(value('problem') && value('role'))
    : Boolean(value('city') && value('tank') && value('timing'));

  function showStep(step, focus = true) {
    if (step > 0 && !validStep(0)) step = 0;
    if (step > 1 && !validStep(1)) step = 1;
    currentStep = step;
    reachedStep = Math.max(reachedStep, step);
    panels.forEach((panel, index) => { panel.hidden = index !== step; });
    steps.forEach((button, index) => {
      button.disabled = index > reachedStep;
      button.classList.toggle('active', index === step);
      button.classList.toggle('complete', index < step);
      if (index === step) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    document.getElementById('step-counter').textContent = `0${step + 1} / 03`;
    document.getElementById('progress-fill').style.width = `${((step + 1) / 3) * 100}%`;
    if (step === 2) updateReview();
    if (focus) {
      const heading = panels[step].querySelector('h2');
      heading.focus({ preventScroll: true });
      const top = document.getElementById('journey').getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: Math.max(0, top - 16), behavior: 'instant' });
    }
  }

  function updateNotes() {
    document.getElementById('tenant-note').hidden = value('role') !== 'tenant';
    document.getElementById('tank-note').hidden = !value('tank') || value('tank') === 'yes';
  }

  function updateReview() {
    const city = value('city') === 'outside-ncr' ? 'Outside NCR' : value('city');
    const data = {
      problem: labels.problem[value('problem')],
      role: labels.role[value('role')],
      city,
      tank: labels.tank[value('tank')],
      timing: labels.timing[value('timing')]
    };
    Object.entries(data).forEach(([key, text]) => {
      document.getElementById(`review-${key}`).textContent = text;
    });
    const notes = document.getElementById('review-notes');
    notes.replaceChildren();
    const additional = [];
    if (value('role') === 'tenant') additional.push('Ipaalam muna sa may-ari ang concern. Pwede nyong ipasa ang summary para malinaw ang details.');
    if (value('tank') !== 'yes') additional.push('Ihanda ang available na location info, gaya ng property plan o detalye mula sa may-ari. Hindi kailangang buksan ang tank para sa inquiry.');
    additional.forEach((note) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = note;
      notes.append(paragraph);
    });
    summaryText.value = [
      'OCEANIDES | PRIVATE INQUIRY PREVIEW',
      ...(sourcePost ? [`Creative reference: ${sourcePost}`] : []),
      `Concern: ${data.problem}`,
      `Role sa property: ${data.role}`,
      `City: ${data.city}`,
      `Tank location: ${data.tank}`,
      `Preferred timing: ${data.timing}`,
      '',
      'Preview lang. Walang request na ipinadala. Walang booking, coverage, o schedule na nakumpirma.',
      ...additional.map((note) => `\nNote: ${note}`)
    ].join('\n');
    status.textContent = '';
  }

  function selectSummary(message) {
    summaryText.focus();
    summaryText.select();
    summaryText.setSelectionRange(0, summaryText.value.length);
    status.textContent = message;
  }

  form.addEventListener('submit', (event) => event.preventDefault());
  form.addEventListener('change', () => {
    updateNotes();
    document.getElementById('error-0').hidden = true;
    document.getElementById('error-1').hidden = true;
  });
  document.querySelectorAll('[data-next]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!validStep(currentStep)) {
        document.getElementById(`error-${currentStep}`).hidden = false;
        const groups = currentStep === 0 ? ['problem', 'role'] : ['city', 'tank', 'timing'];
        const missing = groups.find((name) => !value(name));
        const target = missing === 'city' ? document.getElementById('city') : form.querySelector(`input[name="${missing}"]`);
        target.focus();
        return;
      }
      showStep(Number(button.dataset.next));
    });
  });
  document.querySelectorAll('[data-back], [data-step]').forEach((button) => {
    button.addEventListener('click', () => showStep(Number(button.dataset.back ?? button.dataset.step)));
  });
  document.getElementById('copy-summary').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(summaryText.value);
      status.textContent = 'Na-copy ang preview summary. Walang request na ipinadala.';
    } catch {
      selectSummary('Naka-select na ang text. Gamitin ang Copy ng device nyo. Walang request na ipinadala.');
    }
  });
  document.getElementById('select-summary').addEventListener('click', () => {
    selectSummary('Naka-select na ang text. Gamitin ang Copy ng device nyo.');
  });
  document.getElementById('restart').addEventListener('click', () => {
    form.reset();
    reachedStep = 0;
    summaryText.value = '';
    status.textContent = '';
    document.getElementById('error-0').hidden = true;
    document.getElementById('error-1').hidden = true;
    updateNotes();
    showStep(0);
  });
  showStep(0, false);
})();
