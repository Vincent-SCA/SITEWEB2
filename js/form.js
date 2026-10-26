// js/form.js — formulaires Démo et Contact (même script, même /send_email).
// Validation en ligne, jeton reCAPTCHA v3, envoi en fetch, puis remplacement du
// formulaire par le message de confirmation. Les messages d'erreur sont affichés
// sous le champ ou en bas du formulaire, jamais en alert().

(function () {
  const RECAPTCHA_SITE_KEY = '6LdX3Y4rAAAAAA9YxfBTz-aKpWvq_djNaNFvvFE9'; // clé publique, sans risque ici
  const form = document.getElementById('leadForm');
  if (!form) return;

  const submitBtn = form.querySelector('[type="submit"]');
  const status = document.getElementById('formStatus');
  const success = document.getElementById('formSuccess');

  // Horodatage anti-robot : posé au chargement (les pages .html ne passent pas par PHP).
  form.elements.form_time.value = Math.floor(Date.now() / 1000);

  const messages = {
    valueMissing: 'Ce champ est requis.',
    typeMismatch: 'Entrez une adresse courriel valide.',
    rangeUnderflow: 'Entrez un nombre positif.'
  };

  function fieldError(input) {
    for (const key in messages) if (input.validity[key]) return messages[key];
    return input.validationMessage;
  }

  function showError(input, text) {
    const group = input.closest('.field');
    let el = group.querySelector('.field-error');
    if (!el) {
      el = document.createElement('p');
      el.className = 'field-error';
      el.id = input.id + '-error';
      group.appendChild(el);
    }
    el.textContent = text;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', el.id);
  }

  function clearError(input) {
    const el = input.closest('.field').querySelector('.field-error');
    if (el) el.remove();
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }

  // Les espaces seuls ne comptent pas comme une réponse.
  function validate(input) {
    if (input.required && !input.value.trim()) input.value = '';
    if (input.checkValidity()) { clearError(input); return true; }
    showError(input, fieldError(input));
    return false;
  }

  const inputs = [...form.querySelectorAll('input:not([type="hidden"]):not([name="website"]), textarea')];
  inputs.forEach(input => {
    input.addEventListener('blur', () => { if (input.value) validate(input); });
    input.addEventListener('input', () => { if (input.hasAttribute('aria-invalid')) validate(input); });
  });

  function setStatus(text) {
    status.textContent = text;
    status.hidden = !text;
  }

  function setBusy(busy) {
    submitBtn.disabled = busy;
    submitBtn.classList.toggle('is-busy', busy);
  }

  function getToken() {
    return new Promise((resolve, reject) => {
      if (!window.grecaptcha) return reject(new Error('reCAPTCHA indisponible'));
      grecaptcha.ready(() => grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: 'submit' }).then(resolve, reject));
    });
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    setStatus('');

    const invalid = inputs.filter(input => !validate(input));
    if (invalid.length) { invalid[0].focus(); return; }

    setBusy(true);
    try {
      const data = new FormData(form);
      data.set('g-recaptcha-response', await getToken());
      const res = await fetch('/send_email', { method: 'POST', body: data });
      const text = (await res.text()).trim();
      if (text !== 'success') throw new Error(text || 'Réponse vide du serveur.');

      form.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (err) {
      setStatus('L’envoi n’a pas fonctionné : ' + err.message + ' Vous pouvez aussi nous joindre au (581) 629-1058 ou à info@solutions-ca.com.');
    } finally {
      setBusy(false);
    }
  });
})();
