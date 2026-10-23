import fs from 'fs';
import puppeteer from 'puppeteer-core';

const CHROMIUM_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';

/**
 * Converte um arquivo HTML de relatório (o mesmo exibido/impresso no menu Relatórios) em PDF A4.
 * Usa o Chromium headless do contêiner com a mesma regra de impressão (@media print).
 */
export async function htmlFileToPdfBuffer(htmlFilePath: string): Promise<Buffer> {
  if (!fs.existsSync(CHROMIUM_PATH)) {
    throw new Error('Gerador de PDF indisponível no servidor (Chromium não instalado).');
  }

  const html = fs.readFileSync(htmlFilePath, 'utf-8');
  const browser = await puppeteer.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    await page.setContent(html, { waitUntil: 'load', timeout: 60000 });
    await page.emulateMediaType('print');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: false,
      margin: { top: '12mm', bottom: '12mm', left: '10mm', right: '10mm' }
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => {});
  }
}
