const puppeteer = require('puppeteer');

const BASE_URL = 'https://books.toscrape.com';
const MAX_PAGES = parseInt(process.env.SCRAPER_MAX_PAGES || '2', 10);
const CACHE_TTL_MS = parseInt(process.env.SCRAPER_CACHE_TTL_MS || `${5 * 60 * 1000}`, 10);

let cachedBooks = null;
let cachedAt = 0;

const isCacheValid = () => cachedBooks && Date.now() - cachedAt < CACHE_TTL_MS;

async function scrapeBooks() {
  if (isCacheValid()) {
    return cachedBooks;
  }

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  const collected = [];

  try {
    for (let currentPage = 1; currentPage <= MAX_PAGES; currentPage += 1) {
      const url = `${BASE_URL}/catalogue/page-${currentPage}.html`;
      await page.goto(url, { waitUntil: 'domcontentloaded' });

      const books = await page.evaluate(() => {
        const catalogBase = 'https://books.toscrape.com/catalogue/';
        return Array.from(document.querySelectorAll('.product_pod')).map((book) => {
          const anchor = book.querySelector('h3 a');
          const title = anchor?.getAttribute('title') ?? 'Untitled';
          const relativeLink = anchor?.getAttribute('href') ?? '#';
          const price = book.querySelector('.price_color')?.textContent ?? '£0.00';
          const stock = book.querySelector('.instock.availability')
            ? book.querySelector('.instock.availability').textContent.trim()
            : 'Unknown';
          const ratingClass = book.querySelector('.star-rating')?.className ?? 'star-rating Zero';
          const [, rating = 'Zero'] = ratingClass.split(' ');

          return {
            title,
            price,
            stock,
            rating,
            link: new URL(relativeLink, catalogBase).toString(),
          };
        });
      });

      collected.push(...books);
    }
  } finally {
    await browser.close();
  }

  cachedBooks = collected;
  cachedAt = Date.now();
  return cachedBooks;
}

module.exports = {
  fetchBooks: scrapeBooks,
};
