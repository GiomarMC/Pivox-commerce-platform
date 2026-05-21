'use strict';

const express = require('express');
const net     = require('net');
const cors    = require('cors');
const Jimp    = require('jimp');

const PRINTER_WIDTH = 576; // 80mm @ 203 dpi

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// ── POST /test-printer ─────────────────────────────────────────────────────
app.post('/test-printer', (req, res) => {
  const { ip, puerto } = req.body;
  const client = new net.Socket();
  client.setTimeout(3000);
  client.connect(puerto, ip, () => { client.destroy(); res.json({ success: true }); });
  client.on('error',   () => { client.destroy(); res.status(500).json({ success: false }); });
  client.on('timeout', () => { client.destroy(); res.status(500).json({ success: false, error: 'timeout' }); });
});

// ── POST /print ────────────────────────────────────────────────────────────
app.post('/print', (req, res) => {
  const { ip, puerto, contenido } = req.body;
  const client = new net.Socket();
  client.connect(puerto, ip, () => {
    client.write(Buffer.from(contenido, 'binary'), () => { client.destroy(); res.json({ success: true }); });
  });
  client.on('error', err => { client.destroy(); res.status(500).json({ success: false, error: err.message }); });
});

// ── POST /print-image ──────────────────────────────────────────────────────
// Body: { data: base64PNG, ip: string, puerto: number }
// El rendering del PDF se hace en el navegador; el bridge recibe solo la imagen.
app.post('/print-image', async (req, res) => {
  const { data, ip, puerto } = req.body;
  if (!data || !ip) return res.status(400).json({ error: 'data e ip son requeridos' });
  try {
    const escData = await imageToEscPos(data);
    await enviarTcp(ip, puerto || 9100, escData);
    res.json({ success: true });
  } catch (err) {
    console.error('Error /print-image:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /discover-printer ──────────────────────────────────────────────────
// Escanea la red local buscando impresoras ESC/POS (puerto 9100)
app.get('/discover-printer', async (req, res) => {
  const os = require('os');
  const prefixes = new Set();
  for (const [name, addrs] of Object.entries(os.networkInterfaces())) {
    if (/^(lo|docker|br-|veth|virbr|zt|tun|tap)/.test(name)) continue;
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        prefixes.add(addr.address.split('.').slice(0, 3).join('.'));
      }
    }
  }

  const found = [];
  for (const prefix of prefixes) {
    const promises = Array.from({ length: 254 }, (_, i) =>
      tcpProbe(`${prefix}.${i + 1}`, 9100, 500).then(ok => ok ? `${prefix}.${i + 1}` : null)
    );
    const results = (await Promise.all(promises)).filter(Boolean);
    found.push(...results);
  }

  res.json(found.length > 0
    ? { found: true, ip: found[0], todas: found, puerto: 9100 }
    : { found: false }
  );
});

// ── Helpers ────────────────────────────────────────────────────────────────

async function imageToEscPos(base64) {
  const buffer = Buffer.from(base64, 'base64');
  const img    = await Jimp.read(buffer);

  img.resize(PRINTER_WIDTH, Jimp.AUTO).grayscale();

  const pxW       = img.bitmap.width;
  const pxH       = img.bitmap.height;
  const widthBytes = Math.ceil(pxW / 8);

  const buffers = [
    Buffer.from([0x1B, 0x40]),       // ESC @ — init
    Buffer.from([0x1B, 0x61, 0x01]), // ESC a 1 — centrar
  ];

  const bitmap = Buffer.alloc(widthBytes * pxH, 0x00);
  for (let y = 0; y < pxH; y++) {
    for (let x = 0; x < pxW; x++) {
      const rgba = Jimp.intToRGBA(img.getPixelColor(x, y));
      const lum  = (rgba.r * 299 + rgba.g * 587 + rgba.b * 114) / 1000;
      if (lum < 128) bitmap[y * widthBytes + Math.floor(x / 8)] |= (0x80 >> (x % 8));
    }
  }

  const xL = widthBytes & 0xFF, xH = (widthBytes >> 8) & 0xFF;
  const yL = pxH & 0xFF,        yH = (pxH >> 8) & 0xFF;
  buffers.push(Buffer.from([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]));
  buffers.push(bitmap);
  buffers.push(Buffer.from([0x1B, 0x64, 0x05]));       // ESC d 5 — avanzar
  buffers.push(Buffer.from([0x1D, 0x56, 0x41, 0x00])); // GS V A  — cortar

  return Buffer.concat(buffers);
}

function enviarTcp(ip, puerto, data) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.connect(puerto, ip, () => {
      client.write(data, () => { client.destroy(); resolve(); });
    });
    client.on('error', err => { client.destroy(); reject(err); });
  });
}

function tcpProbe(ip, port, timeoutMs) {
  return new Promise(resolve => {
    const socket = new net.Socket();
    let resolved = false;
    const done = (ok) => { if (!resolved) { resolved = true; socket.destroy(); resolve(ok); } };
    socket.setTimeout(timeoutMs);
    socket.connect(port, ip, () => done(true));
    socket.on('error',   () => done(false));
    socket.on('timeout', () => done(false));
  });
}

// ── GET /proxy-pdf?url=... ─────────────────────────────────────────────────
// Descarga el PDF server-side para evitar el bloqueo CORS del navegador
app.get('/proxy-pdf', (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url es requerida' });
  const protocol = url.startsWith('https') ? require('https') : require('http');
  protocol.get(url, (pdfRes) => {
    res.set('Content-Type', 'application/pdf');
    pdfRes.pipe(res);
  }).on('error', (err) => {
    res.status(500).json({ error: err.message });
  });
});

app.listen(3000, () => console.log('Printer bridge corriendo en http://localhost:3000'));
