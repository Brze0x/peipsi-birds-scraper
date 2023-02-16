import { chromium } from 'playwright';
import fs from 'fs';


/**
 * @desc Expands all hidden content on the page by clicking on the corresponding buttons
 * @param {Object} page - A Playwright Page object that represents the page to operate on
 * @return {Promise<void>}
 */
const expands = async (page) => {
    return await page.evaluate(() => {
        for (let elem of document.getElementsByClassName('sym')) {
            elem.click();
        }
    });
}

/**
 * @desc Retrieves an array of URLs from the page
 * @param {Object} page - A Playwright Page object that represents the page to operate on
 * @return {Promise<Array<string>>}
 */
const getItems = async (page) => {
    const urls = await page.evaluate(() => {
        const elements = document.getElementsByTagName('a');
        return Array.from(elements, (elem) => {
            if (elem.href.match(/\/(?!reference|en)[a-z]+\/\w+\/[a-z-0-9]+?\/$/)) {
                return elem.href;
            }
            if (elem.href.match(/(reference)\/\w+\/$/)) {
                return elem.textContent;
            }
            if (elem.href.match(/(reference)\/\w+\/[a-z-]+\/$/)) {
                return elem.textContent;
            }
            return null;
        }).filter((url) => url !== null && url !== undefined);
    });
    return urls;
};

/**
 * @desc Extracts the order of a bird from a given URL
 * @param {string} url - A URL to extract the bird order from
 * @return {Promise<string|null>}
 */
const extractOrder = async (url) => {
    if (url === url.toUpperCase()) {
        return url;
    }
    return null;
};

/**
 * @desc Extracts the family of a bird from a given URL
 * @param {string} url - A URL to extract the bird family from
 * @return {Promise<string|null>}
 */
const extractFamily = async (url) => {
    if (url[0] === url[0].toUpperCase()) {
      return url;
    }
    return null;
};

/**
 * @desc Extracts the Russian name of a bird from a given page
 * @param {Object} page - A Playwright Page object that represents the page to extract from
 * @return {Promise<string>}
 */
const extractRusName = async (page) => {
    const regExpRusName = RegExp(/[А-Яа-яё-]+\s*[А-Яа-яё\s]*(\((?:[А-Яа-яё\s]+)\))?/);
    const title = await page.$eval('article h1', el => el.textContent);
    const rusName = title.match(regExpRusName)[0].trim();
    return rusName;
};

/**
 * @desc Extracts the Latin name of a bird from a given page
 * @param {Object} page - A Playwright Page object that represents the page to extract from
 * @return {Promise<string>}
 */
const extractLatName = async (page) => {
    const regExpLatName = RegExp(/[a-zA-Z]+\s?[a-zA-Z]+/);
    const title = await page.$eval('article h1', el => el.textContent);
    const latName = title.match(regExpLatName)[0].trim();
    return latName;
};

/**
 * @desc Extracts the characteristics of a bird from a given page
 * @param {Object} page - A Playwright Page object that represents the page to extract from
 * @return {Promise<string>} The employee situation based on the review's properties
 */
const extractSigns = async (page) => {
    const signs = await page.$eval('article p:nth-of-type(1)', el => el.textContent);
    return signs.replace('Признаки. ', '');
};

/**
 * @desc Extracts the habitat of a bird from a given page
 * @param {Object} page - A Playwright Page object that represents the page to extract from
 * @return {Promise<string>}
 */
const extractHabitat = async (page) => {
    const habitat = await page.$eval('article p:nth-of-type(2)', el => el.textContent);
    return habitat.replace('Местообитание. ', '');
};

/**
 * @desc Retrieves data for all birds on the page
 * @param {Object} page - A Playwright Page object that represents the page to extract from
 * @return {Promise<Array<Object>>} Array of objects containing information about birds
 */
const getBirdsData = async (page) => {
    const items = await getItems(page);
    const birdsData = [];
    const birdClassification = {};
    
    for (const item of items) {
        const birdDetails = {};
        const order = await extractOrder(item);
        const family = await extractFamily(item);
        if (order) {
            birdClassification.order = order;
            continue;
        }
        if (family) {
            birdClassification.family = family;
            continue;
        }
        await page.goto(item);
        birdDetails.rusName = await extractRusName(page);
        birdDetails.latName = await extractLatName(page);
        birdDetails.signs = await extractSigns(page);
        birdDetails.habitat = await extractHabitat(page);
        birdsData.push({...birdClassification, ...birdDetails});
    }
    return birdsData;
};

/**
 * @desc Writes the given object to a JSON file
 * @param {string} name - The name of the JSON file to write to
 * @param {Object} obj - The object to write to the JSON file
 * @return {Promise<void>}
 */
const saveToJson = async (name, obj) => {
    fs.writeFile(`./${name}.json`, JSON.stringify(obj, null, 4), (err) => {
        if (err) {
          console.error(err.message);
          return;
        }
        console.log(`Data written to ${name}.json`);
    });
}


const browser = await chromium.launch({headless: true});
const page = await browser.newPage();
await page.goto('https://birds.peipsi.org/');

await expands(page);
await saveToJson('peipsi-birds', await getBirdsData(page))

await browser.close();
