import chromium from '@sparticuz/chromium-min'

// Detect if running on Vercel/serverless
const isVercel = process.env.VERCEL === '1' || process.env.AWS_LAMBDA_FUNCTION_NAME

// URL to download Chromium from (hosted on GitHub releases)
const CHROMIUM_PACK_URL = 'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar'

export async function launchBrowser() {
  console.log('launchBrowser called, isVercel:', isVercel)

  if (isVercel) {
    // Serverless environment (Vercel)
    console.log('Using puppeteer-core with @sparticuz/chromium-min')
    const puppeteer = await import('puppeteer-core')

    const execPath = await chromium.executablePath(CHROMIUM_PACK_URL)
    console.log('Chromium executable path:', execPath)

    return puppeteer.default.launch({
      args: chromium.args,
      executablePath: execPath,
      headless: 'shell',
    })
  } else {
    // Local development - use full puppeteer
    console.log('Using full puppeteer for local development')
    const puppeteer = await import('puppeteer')
    return puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }
}
