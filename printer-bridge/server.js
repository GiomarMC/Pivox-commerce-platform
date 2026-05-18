const express = require('express');
const net = require('net');
const https = require('https');
const http = require('http');
const path = require('path');
const cors = require('cors');
const Canvas = require('canvas');

// Polyfills requeridos por pdfjs-dist en Node.js (canvas@2.x los provee, canvas@3.x solo DOMMatrix)
if (!global.DOMMatrix) global.DOMMatrix = Canvas.DOMMatrix;
if (!global.Path2D) {
  global.Path2D = class Path2D {
    constructor(d) { this._d = d || ''; }
    addPath() {}
    closePath() {}
    moveTo() {}
    lineTo() {}
    bezierCurveTo() {}
    quadraticCurveTo() {}
    arc() {}
    arcTo() {}
    ellipse() {}
    rect() {}
  };
}

const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const CMAP_URL = path.join(__dirname, 'node_modules/pdfjs-dist/cmaps/');
const STANDARD_FONT_DATA_URL = path.join(__dirname, 'node_modules/pdfjs-dist/standard_fonts/');
const PRINTER_WIDTH = 576; // 80mm @ 203dpi

// Canvas factory requerido por pdfjs-dist en Node.js
class NodeCanvasFactory {
  create(width, height) {
    const canvas = Canvas.createCanvas(width, height);
    return { canvas, context: canvas.getContext('2d') };
  }
  reset(cc, width, height) {
    cc.canvas.width = width;
    cc.canvas.height = height;
  }
  destroy(cc) {
    cc.canvas.width = 0;
    cc.canvas.height = 0;
    cc.canvas = null;
    cc.context = null;
  }
}

const app = express();
app.use(cors());
app.use(express.json());

// ── POST /test-printer ─────────────────────────────────────────────────────
app.post('/test-printer', (req, res) => {
  const { ip, puerto } = req.body;
  const client = new net.Socket();
  client.setTimeout(3000);
  client.connect(puerto, ip, () => {
    client.destroy();
    res.json({ success: true });
  });
  client.on('error', () => { client.destroy(); res.status(500).json({ success: false }); });
  client.on('timeout', () => { client.destroy(); res.status(500).json({ success: false, error: 'timeout' }); });
});

// ── POST /print ────────────────────────────────────────────────────────────
app.post('/print', (req, res) => {
  const { ip, puerto, contenido } = req.body;
  const client = new net.Socket();
  client.connect(puerto, ip, () => {
    client.write(Buffer.from(contenido, 'binary'), () => {
      client.destroy();
      res.json({ success: true });
    });
  });
  client.on('error', err => { client.destroy(); res.status(500).json({ success: false, error: err.message }); });
});

// ── POST /print-pdf ────────────────────────────────────────────────────────
// Body: { url: string, ip: string, puerto: number }
app.post('/print-pdf', async (req, res) => {
  const { url, ip, puerto } = req.body;
  if (!url || !ip) return res.status(400).json({ success: false, error: 'url e ip son requeridos' });

  try {
    const escData = await pdfAEscPos(url);
    await enviarTcp(ip, puerto || 9100, escData);
    res.json({ success: true });
  } catch (err) {
    console.error('Error /print-pdf:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /print-pdf-raw ────────────────────────────────────────────────────
// Body: { data: '<base64 PDF>', ip: string, puerto: number }
app.post('/print-pdf-raw', async (req, res) => {
  const { data, ip, puerto } = req.body;
  if (!data || !ip) return res.status(400).json({ success: false, error: 'data e ip son requeridos' });

  try {
    const pdfBytes = Buffer.from(data, 'base64');
    const escData = await pdfAEscPosFromBuffer(pdfBytes);
    await enviarTcp(ip, puerto || 9100, escData);
    res.json({ success: true });
  } catch (err) {
    console.error('Error /print-pdf-raw:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /render-pdf?url=... ────────────────────────────────────────────────
// Simulación: renderiza pág 1 y devuelve PNG para verificar sin impresora
app.get('/render-pdf', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url requerida' });

  try {
    const pdfBytes = await descargarUrl(url);
    const pdf = await cargarPdf(pdfBytes);
    const page = await pdf.getPage(1);
    const cc = await renderizarPagina(page);
    res.setHeader('Content-Type', 'image/png');
    cc.canvas.createPNGStream().pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────

async function pdfAEscPos(url) {
  const pdfBytes = await descargarUrl(url);
  return pdfAEscPosFromBuffer(pdfBytes);
}

async function pdfAEscPosFromBuffer(pdfBytes, maxPages = 1) {
  const pdf = await cargarPdf(pdfBytes);

  const buffers = [];
  buffers.push(Buffer.from([0x1B, 0x40]));       // ESC @ — init
  buffers.push(Buffer.from([0x1B, 0x61, 0x01])); // ESC a 1 — centrar

  for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, maxPages); pageNum++) {
    const page = await pdf.getPage(pageNum);
    const cc = await renderizarPagina(page);
    const { canvas, context: ctx } = cc;
    const pxW = canvas.width;
    const pxH = canvas.height;

    // Convertir a bitmap 1-bit
    const imgData = ctx.getImageData(0, 0, pxW, pxH);
    const widthBytes = Math.ceil(pxW / 8);
    const bitmap = Buffer.alloc(widthBytes * pxH, 0x00);

    for (let y = 0; y < pxH; y++) {
      for (let x = 0; x < pxW; x++) {
        const i = (y * pxW + x) * 4;
        const lum = (imgData.data[i] * 299 + imgData.data[i + 1] * 587 + imgData.data[i + 2] * 114) / 1000;
        if (lum < 128) {
          bitmap[y * widthBytes + Math.floor(x / 8)] |= (0x80 >> (x % 8));
        }
      }
    }

    // GS v 0 — raster image
    const xL = widthBytes & 0xFF;
    const xH = (widthBytes >> 8) & 0xFF;
    const yL = pxH & 0xFF;
    const yH = (pxH >> 8) & 0xFF;
    buffers.push(Buffer.from([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH]));
    buffers.push(bitmap);
  }

  buffers.push(Buffer.from([0x1B, 0x64, 0x05]));       // ESC d 5 — avanzar
  buffers.push(Buffer.from([0x1D, 0x56, 0x41, 0x00])); // GS V A  — cortar

  return Buffer.concat(buffers);
}

async function cargarPdf(pdfBytes) {
  return pdfjsLib.getDocument({
    data: new Uint8Array(pdfBytes),
    cMapUrl: CMAP_URL,
    cMapPacked: true,
    standardFontDataUrl: STANDARD_FONT_DATA_URL,
  }).promise;
}

async function renderizarPagina(page) {
  const viewport = page.getViewport({ scale: 1 });
  const scale = PRINTER_WIDTH / viewport.width;
  const scaledViewport = page.getViewport({ scale });
  const pxW = Math.floor(scaledViewport.width);
  const pxH = Math.floor(scaledViewport.height);

  const canvasFactory = new NodeCanvasFactory();
  const cc = canvasFactory.create(pxW, pxH);
  cc.context.fillStyle = '#FFFFFF';
  cc.context.fillRect(0, 0, pxW, pxH);

  await page.render({
    canvasContext: cc.context,
    viewport: scaledViewport,
    canvasFactory,
  }).promise;

  return cc;
}

function descargarUrl(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const chunks = [];
    const req = protocol.get(url, (resp) => {
      if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        return descargarUrl(resp.headers.location).then(resolve).catch(reject);
      }
      resp.on('data', chunk => chunks.push(chunk));
      resp.on('end', () => resolve(Buffer.concat(chunks)));
      resp.on('error', reject);
    });
    req.on('error', reject);
  });
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

app.listen(3000, () => console.log('Printer bridge corriendo en http://localhost:3000'));
