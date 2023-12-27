const puppeteer = require('puppeteer');

/**
 * Article ID.
 * @type {number}
 */
const ARTICLE_ID = 146972802;

/**
 * URL for article details.
 * @type {string}
 */
const URL = `https://www.wildberries.ru/catalog/${ARTICLE_ID}/detail.aspx`;

/**
 * To initiate web data retrieval.
 * @returns {Promise<{ art: number, stock: {[key: string]: number}[] }>} Result object containing article ID and stock information.
 */
async function main() {
  let result = { art: ARTICLE_ID, stock: {} };
  let browser;

  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.setRequestInterception(true);

    page.on('request', (request) => request.continue());

    await page.goto(URL);

    result = await fetchDataFromResponse(page);
  } catch (error) {
    console.error(`Error launching Browser`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return result;
}

/**
 * Fetches data from the response.
 * @param {import('puppeteer').Page} page - Puppeteer page instance.
 * @returns {Promise<{art: number, stock: {[key: string]: number}[]}[]>} Promise that resolves to an array of product information.
 */
function fetchDataFromResponse(page) {
  return new Promise((resolve) => {
    page.on('response', async (response) => {
      if (response.url().includes('/cards/v1/detail')) {
        const products = (await response.json()).data?.products;

        resolve(products?.map(buildProductInfo));
      }
    });
  });
}

/**
 * Calculates the total quantity from an array of sizes.
 * @param {{qty: number}[]} arr - Array of sizes.
 * @returns {number} Total quantity.
 */
function calcQuantity(arr) {
  return arr?.reduce((res, el) => res + +el.qty, 0) || 0;
}

/**
 * Builds product information object.
 * @param {{id: number; sizes: {origName: string; stocks:{qty: number}[]}[]}} product - Product data.
 * @returns {{art: number, stock: {[key: string]: number}[]}} Product information object.
 */
function buildProductInfo(product) {
  return {
    art: product.id,
    stock: {
      ...product.sizes?.reduce((acc, size) => {
        acc[size.origName] = calcQuantity(size.stocks);
        return acc;
      }, {}),
    },
  };
}

main().then(console.log);
