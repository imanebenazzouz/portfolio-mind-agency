import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import handler from './api/contact.js';

loadEnv();

const PORT = Number(process.env.CONTACT_API_PORT || 3000);
const mask = (v) => (typeof v === 'string' && v.length > 8) ? (v.slice(0, 4) + '…' + v.slice(-4)) : (v ? 'set' : 'ABSENT');
console.log(`Config: BREVO_API_KEY=${mask(process.env.BREVO_API_KEY)} | SENDER=${process.env.BREVO_SENDER_EMAIL || 'unset'} | TO=${process.env.CONTACT_TO || 'from body/config'}`);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host || 'localhost'}`);

  if (url.pathname !== '/api/contact') {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Not Found');
    return;
  }

  req.query = Object.fromEntries(url.searchParams.entries());

  try {
    req.body = await readBody(req);
  } catch (error) {
    res.statusCode = error.statusCode || 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ message: error.message || 'Corps JSON invalide' }));
    return;
  }

  try {
    await handler(req, wrapResponse(res));
  } catch (error) {
    console.error('Erreur dans /api/contact:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: error?.message || 'Erreur serveur' }));
    }
  }
});

server.listen(PORT, () => {
  console.log(`Contact API dispo sur http://localhost:${PORT}/api/contact`);
});

function wrapResponse(res) {
  return {
    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(payload) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'application/json');
      }
      res.end(JSON.stringify(payload));
    },
    end(payload) {
      res.end(payload);
    }
  };
}

function readBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return Promise.resolve({});
  }
  return new Promise((resolve, reject) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1e6) {
        const error = new Error('Corps trop volumineux');
        error.statusCode = 413;
        req.destroy(error);
      }
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        const error = new Error('Corps JSON invalide');
        error.statusCode = 400;
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      return;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    if (!key) return;
    if (process.env[key]) return;
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  });
}
