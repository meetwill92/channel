const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const UserAgent = require('user-agents');
const { faker } = require('@faker-js/faker');
const fs = require('fs');
const axios = require('axios');
const { HttpProxyAgent } = require('http-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');

// Apply stealth plugin
puppeteer.use(StealthPlugin());

let current = Math.floor(Math.random() * 4270);;

// Domain imports
const insuranceDomains = require('./domains/insurance');
const healthDomains = require('./domains/health');
educationDomains = require('./domains/education');
const businessDomains = require('./domains/business');

const categories = ['insurance', 'health', 'education', 'business'];
const categoryDomains = {
  insurance: insuranceDomains,
  health: healthDomains,
  education: educationDomains,
  business: businessDomains,
};

function getRandomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCookies(category) {
  const domain = getRandomFromArray(categoryDomains[category]);
  const now = Math.floor(Date.now() / 1000);
  const oneYearLater = now + 60 * 60 * 24 * 365;

  const baseCookies = [
    {
      name: 'interest',
      value: category,
      domain,
      path: '/',
      expirationDate: oneYearLater,
      sameSite: 'Lax',
      httpOnly: false,
      secure: false,
      session: false,
      storeId: '0',
    },
    {
      name: 'session_id',
      value: faker.string.uuid(),
      domain,
      path: '/',
      sameSite: 'Lax',
      httpOnly: true,
      secure: true,
      session: true,
      storeId: '0',
    },
  ];

  const extraCookies = {
    insurance: {
      name: 'policy_num',
      value: 'PN-' + faker.number.int({ min: 100000, max: 999999 }),
    },
    health: {
      name: 'health_session',
      value: faker.string.alphanumeric(24),
    },
    education: {
      name: 'edu_user',
      value: faker.internet.username(),
    },
    business: {
      name: 'biz_visitor',
      value: faker.string.uuid(),
    },
  };

  const extra = extraCookies[category];
  if (extra) {
    baseCookies.push({
      ...extra,
      domain,
      path: '/',
      expirationDate: oneYearLater,
      sameSite: 'Lax',
      secure: true,
      session: category !== 'health',
      httpOnly: category === 'health',
      storeId: '0',
    });
  }
  return baseCookies;
}

function getCustomUserAgent() {
  const isMobile = Math.random() < 0.45;
  return new UserAgent({ deviceCategory: isMobile ? 'mobile' : 'desktop' }).toString();
}

async function humanScroll(page, minTime = 5000, maxTime = 10000) {
  if (page.isClosed()) return;
  await page.waitForFunction(() => document && document.documentElement !== null);

  let hasMore = true;
  while (hasMore) {
    hasMore = await page.evaluate(() => {
      const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
      window.scrollBy(0, clientHeight / 2);
      return scrollTop + clientHeight < scrollHeight;
    });
    await new Promise(r => setTimeout(r, Math.random() * 500 + 200));
  }
  await new Promise(r => setTimeout(r, Math.random() * 23000 + 15000));

  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.scrollBy(0, -window.innerHeight));
    await new Promise(r => setTimeout(r, Math.random() * 400 + 200));
  }
  await new Promise(r => setTimeout(r, Math.random() * 25000 + 15000));

  const midTarget = await page.evaluate(() => document.documentElement.scrollHeight * 0.25);
  for (let i = 0; i < 5; i++) {
    await page.evaluate((target, step, index) => {
      const current = window.scrollY;
      const targetStep = current + (target - current) / (step - index);
      window.scrollTo(0, targetStep);
    }, midTarget, 5, i);
    await new Promise(r => setTimeout(r, Math.random() * 400 + 200));
  }
  await new Promise(r => setTimeout(r, Math.random() * (maxTime - minTime) + minTime));

  await new Promise(r => setTimeout(r, Math.random() * 25000 + 15000));
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFromArray(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function visitRandomTechnologymaniasLinks(page, browser) {
  const repeatCount = getRandomInt(3, 6);
  console.log(`🔁 Visiting up to ${repeatCount} technologymanias.com links`);

  for (let i = 0; i < repeatCount; i++) {
    console.log(`\n➡️  Iteration ${i + 1}/${repeatCount} starting...`);

    // Extract all valid technologymanias.com links
    const links = await page.$$eval('a', anchors =>
      anchors
        .filter(a =>
          a.offsetParent !== null &&
          a.href &&
          a.href !== '#' &&
          a.href.startsWith('https://www.technologymanias.com')
        )
        .map((a, i) => ({ index: i, href: a.href }))
    );

    console.log(`🔗 Found ${links.length} valid technologymanias.com links`);

    if (links.length) {
      const handles = await page.$$('a');
      const randomLink = getRandomFromArray(links);
      const targetHandle = handles[randomLink.index];

      console.log(`🎯 Clicking link: ${randomLink.href} (index ${randomLink.index})`);

      const pagesBefore = await browser.pages();

      await targetHandle.click({
        modifiers: [process.platform === 'darwin' ? 'Meta' : 'Control'],
        delay: 100
      });

      const pagesAfter = await browser.pages();
      const newPage = pagesAfter.find(p => !pagesBefore.includes(p));

      if (newPage) {
        console.log(`🆕 New tab opened.`);

        await newPage.bringToFront();
        try {
          await newPage.waitForNavigation({ timeout: 15000, waitUntil: 'domcontentloaded' });
          console.log(`✅ New tab URL: ${newPage.url()}`);
        } catch (e) {
          console.warn(`⚠️  New tab navigation error: ${e.message}`);
        }

        // Scroll main page to simulate activity
        console.log(`📜 Scrolling on main page...`);
        await humanScroll(page, 5000, 10000);

        // Random wait between 40s to 60s
        const delay = Math.random() * 20000 + 40000;
        console.log(`⏱️ Waiting ${Math.round(delay / 1000)} seconds before next iteration...`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        console.warn(`❌ No new tab was opened.`);
      }

    } else {
      console.log('🚫 No valid technologymanias.com links found on this page.');
    }
  }

  console.log(`🏁 Finished visiting technologymanias links.`);
}

function getNextStatus1Proxy(proxies) {
  const total = proxies.length;
  let count = 0;

  while (count < total) {
    if (current >= total) current = 0; // wrap around

    const proxyObj = proxies[current];
    current++;

    if (proxyObj.status === 1) {
      return {
        proxy: proxyObj.proxy,
        latency: proxyObj.latency
      };
    }

    count++;
  }

  throw new Error('No proxies with status 1 found');
}
function updateProxyStatus(proxies, targetProxy, newStatus, proxyJsonFile) {
  // Find proxy index
  const index = proxies.findIndex(p => p.proxy === targetProxy);
  
  if (index === -1) {
    console.log(`Proxy "${targetProxy}" not found.`);
    return false;
  }

  proxies[index].status = newStatus;

  // Save updated JSON back to file
  if(proxyJsonFile)
  {
  fs.writeFileSync(proxyJsonFile, JSON.stringify(proxies, proxies[index].country, newStatus, proxies[index].latency));
  }
  
  console.log(`Updated proxy "${targetProxy}" status to ${newStatus}.`);
  return true;
}

 async function run() {
  const proxyJsonFile = 'proxies.json';
  console.log('📁 Loading proxies from', proxyJsonFile);

  // const proxies = JSON.parse(fs.readFileSync(proxyJsonFile, 'utf-8'));

  // let proxy, latency;
  // try {
  //   ({ proxy, latency } = getNextStatus1Proxy(proxies));
  // } catch (err) {
  //   console.error('🚫 No available working proxies (status 1). Exiting.');
  //   return;
  // }

  // console.log(`🌐 Using proxy: ${proxy}`);
  // console.log(`⏱️ Latency: ${latency ?? 'unknown'}ms`);

  // current = (current + 1) % proxies.length;

  const proxyLines = fs.readFileSync('proxies.txt', 'utf-8')
  .split('\n')
  .map(line => line.trim())
  .filter(line => line.length > 0);
//proxy.toolip.io:331***:8c5906b99fbd1c0***:iuz5k7bp***
  const proxy = getRandomFromArray(proxyLines);
  //= "proxy.toolip.io:31111";
  // const proxyUsername = "tl-afab7eeaa5f7b19a796b3d4b38f93ad48ea41c63a68b3afb2fff7d079c78c39b-country-us-session-754c2";
  // const proxyPassword = "a62bx4w5zgc5";
  //getRandomFromArray(proxyLines);
  console.log(proxy);

  const userAgent = getCustomUserAgent();
  const category = getRandomFromArray(categories);
  const cookies = generateCookies(category);

  console.log(`🧠 Selected category: ${category}`);
  console.log(`🕵️‍♂️ Using User-Agent: ${userAgent}`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [`--proxy-server=${proxy}`, '--no-sandbox', '--disable-setuid-sandbox','--ignore-certificate-errors'],
  });

  try {
    const page = await browser.newPage();
    console.log('🧭 Opening new page...');

  //   await page.authenticate({
  //   username: proxyUsername,
  //   password: proxyPassword,
  // });

    await page.setUserAgent(userAgent);
    await page.setCookie(...cookies);
    await page.setExtraHTTPHeaders({
      'accept-language': 'en-US,en;q=0.9',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'upgrade-insecure-requests': '1',
    });

    console.log('🚀 Navigating to technologymanias.com...');
    await page.goto('https://www.technologymanias.com', {
       waitUntil: 'load',
      timeout: 60000,
    });

    //  await page.setContent(`<a href="https://www.technologymanias.com/" id="myLink">Visit Tech Site</a>`);
    // await page.waitForSelector('#myLink');

    // // Simulate human-like click
    // await page.click('#myLink', { delay: 200 });

    //await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

    console.log('📜 Scrolling through page like a human...');
    await humanScroll(page);

    console.log('🔗 Clicking random internal links...');
    await visitRandomTechnologymaniasLinks(page, browser);

    // await wait(30000);

    // await page.evaluate(() => {
    //   const video = document.querySelector('video');
    //   if (video) {
    //     video.muted = true;
    //     video.play();
    //   }
    // });

  } catch (err) {
    console.error('❌ Error during navigation:', err.message);

  } finally {
    await browser.close();
    const delay = Math.random() * 1500 + 500;
    console.log(`⏳ Waiting ${delay.toFixed(0)}ms before next run...`);
    await new Promise(r => setTimeout(r, delay));
    return run(); // ⚠️ Caution: this is recursive and never ends
  }
}

run();

// (async () => {
//   const numInstances = 2; // Number of browsers to run in parallel
//   const runs = [];

//   for (let i = 0; i < numInstances; i++) {
//     runs.push(run());
//   }

//   await Promise.all(runs);
// })();
