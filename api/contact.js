export default async function handler(req, res) {
  // CORS de base pour permettre les appels depuis un serveur statique (Live Server)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Méthode non autorisée' });
    return;
  }
  try {
    const {
      subject,
      htmlContent,
      textContent,
      replyTo,
      to: toFromBody,
      senderEmail: senderEmailBody,
      senderName: senderNameBody
    } = req.body || {};

    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || senderEmailBody;
    const senderName = process.env.BREVO_SENDER_NAME || senderNameBody || senderEmail;
    let to = process.env.CONTACT_TO || toFromBody;
    if (Array.isArray(to)) {
      // ok
    } else if (typeof to === 'string') {
      // supporte "a@x.com,b@y.com"
      to = to.split(',').map(s => String(s).trim()).filter(Boolean);
    } else {
      to = [];
    }

    if (!apiKey) {
      res.status(500).json({ message: 'Configuration manquante: BREVO_API_KEY' });
      return;
    }
    if (!senderEmail || !to.length) {
      res.status(400).json({ message: 'Paramètres manquants (senderEmail, to)' });
      return;
    }

    const payload = {
      sender: { email: senderEmail, name: senderName || senderEmail },
      to: to.map(email => ({ email })),
      subject: subject || '[Contact] Nouveau message',
      htmlContent: htmlContent || '',
      textContent: textContent || '',
      replyTo: replyTo?.email ? replyTo : undefined
    };

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const message = err?.message || response.statusText || 'Erreur inconnue Brevo';
      res.status(502).json({ message });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: error?.message || 'Erreur serveur' });
  }
}

