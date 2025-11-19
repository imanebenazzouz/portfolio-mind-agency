const DEFAULT_CONTACT_ENDPOINT = '/api/contact';

function getEndpoint(config){
  // Permet de surcharger l’endpoint via le JSON d’inline config
  var ep = (config && config.endpoint) ? String(config.endpoint).trim() : '';
  if (ep) return ep;
  return DEFAULT_CONTACT_ENDPOINT;
}

function getConfig() {
  const script = document.getElementById('contact-config');
  if (!script) return null;
  try {
    return JSON.parse(script.textContent || '{}');
  } catch (error) {
    console.warn('Impossible de parser la configuration Brevo', error);
    return null;
  }
}

function setStatus(statusEl, message, type) {
  if (!statusEl) return;
  statusEl.textContent = message || '';
  statusEl.dataset.state = type || '';
}

function serializeForm(form) {
  const data = new FormData(form);
  return {
    name: (data.get('name') || '').trim(),
    email: (data.get('email') || '').trim(),
    subject: (data.get('subject') || '').trim(),
    message: (data.get('message') || '').trim(),
    to: (data.get('to') || '').trim() // optionnel: permet de router vers un destinataire spécifique
  };
}

async function sendBrevoEmail(config, payload) {
  const endpoint = getEndpoint(config);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...payload,
      to: config?.to || undefined,
      senderEmail: config?.senderEmail || undefined,
      senderName: config?.senderName || undefined
    })
  });
  if (!response.ok) {
    let message = response.statusText || 'Erreur inconnue';
    try{
      const error = await response.json();
      message = error?.message || message;
    }catch(e){}
    if (response.status === 404) {
      message = 'API de contact introuvable. Lancez un serveur avec fonctions (/api) ou déployez le site.';
    } else if (response.status === 405) {
        message = 'Méthode non autorisée. Votre serveur statique ne gère pas les fonctions. Lancez votre serveur API ou définissez config.endpoint vers l’URL de votre API.';
    }
    throw new Error(message);
  }
}

function buildPayload(config, formData) {
  const subject = formData.subject || 'Nouveau message du site';
  const intro = [
    `<strong>Nom :</strong> ${formData.name || '—'}`,
    `<strong>Email :</strong> ${formData.email || '—'}`
  ].join('<br>');

  return {
    subject: `[Contact] ${subject}`,
    htmlContent: `<p>${intro}</p><p>${(formData.message || '').replace(/\n/g, '<br>')}</p>`,
    textContent: `Nom: ${formData.name || '—'}\nEmail: ${formData.email || '—'}\n\n${formData.message || ''}`,
    to: formData.to || undefined,
    replyTo: {
      email: formData.email,
      name: formData.name || formData.email
    }
  };
}

(function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const statusEl = form.querySelector('.form-status');
  const submitBtn = form.querySelector('[type="submit"]');
  const config = getConfig();
  const debug = !!(config && config.debug);

  // Plus besoin de clé API côté client. On s’appuie sur la fonction /api/contact.

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = serializeForm(form);
    const payload = buildPayload(config, formData);

    // Mode simple: forcer l’ouverture du client mail si demandé via config
    try{
      var endpointMode = (config && String(config.endpoint || '').toLowerCase()) || '';
      if (endpointMode === 'mailto') {
        var directTo = (payload && payload.to) || (config && config.to) || '';
        var first = Array.isArray(directTo) ? directTo[0] : String(directTo).split(',')[0];
        first = (first || '').trim();
        if (first) {
          var mailtoUrl = 'mailto:' + encodeURIComponent(first)
            + '?subject=' + encodeURIComponent(payload.subject || 'Contact')
            + '&body=' + encodeURIComponent(payload.textContent || '');
          setStatus(statusEl, 'Ouverture de votre client mail…', 'success');
          window.location.href = mailtoUrl;
          return;
        } else {
          setStatus(statusEl, 'Aucune adresse destinataire définie (config.to).', 'error');
          return;
        }
      }
    }catch(e){}

    setStatus(statusEl, 'Envoi en cours…', 'loading');
    submitBtn.disabled = true;

    try {
      await sendBrevoEmail(config, payload);
      form.reset();
      setStatus(statusEl, 'Merci ! Votre message a bien été envoyé.', 'success');
    } catch (error) {
      console.error(error);
      const msg = (error && error.message) ? String(error.message) : '';
      let friendly = 'Impossible d’envoyer le message. Réessayez plus tard.';
      if (/API de contact introuvable/i.test(msg) || /Failed to fetch/i.test(msg) || /NetworkError/i.test(msg) || /Load failed/i.test(msg)) {
        friendly = 'Service indisponible. En local, lancez votre serveur API (route /api/contact) ou renseignez config.endpoint vers l’URL de votre API.';
      }
      // Fallback mailto (désactivable via config.disableMailtoFallback)
      try{
        var disableMailto = !!(config && config.disableMailtoFallback);
        if (!disableMailto) {
          var fallbackTo = payload && (payload.to || (config && config.to));
          if (fallbackTo && (/API de contact introuvable/i.test(msg) || /Failed to fetch/i.test(msg) || /NetworkError/i.test(msg) || /Méthode non autorisée/i.test(msg) || /Load failed/i.test(msg))) {
            var toEmail = Array.isArray(fallbackTo) ? fallbackTo[0] : String(fallbackTo).split(',')[0];
            toEmail = (toEmail || '').trim();
            if (toEmail) {
              var mailto = 'mailto:' + encodeURIComponent(toEmail)
                + '?subject=' + encodeURIComponent(payload.subject || 'Contact')
                + '&body=' + encodeURIComponent(payload.textContent || '');
              setStatus(statusEl, 'Service indisponible — ouverture de votre client mail…', 'error');
              window.location.href = mailto;
              return;
            }
          }
        }
      }catch(e){}
      if (debug && msg) friendly += ' — Détails: ' + msg;
      setStatus(statusEl, friendly, 'error');
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
