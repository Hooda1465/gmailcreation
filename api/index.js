const express = require('express');     
const bodyParser = require('body-parser');    
const puppeteer = require('puppeteer');
const chromium = require('@sparticuz/chromium');

const app = express();
app.use(bodyParser.json());

const port = process.env.PORT || 3001;
// Global variable to store the API token
let apiToken = '';
let outputcontent='';
/**
 * Sleeps for the specified number of milliseconds.
 * @param {number} ms - Milliseconds to sleep.
 * @returns {Promise} A promise that resolves after the specified time.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const currentDateTime = new Date(Date.now() - 5000);
const smsDateTime = datetimeStr => {
  const [date, time] = datetimeStr.split('.');
  const milliseconds = time.slice(0, 3);
  const timezoneMatch = time.match(/([+-]\d{2}:\d{2})$/);
  const timezone = timezoneMatch ? timezoneMatch[1] : 'Z';
  return `${date}.${milliseconds}${timezone}`;
};

/**
 * Fetches SMS containing a Google verification code for the specified mobile number.
 * 
 * @param {string} mobile - The mobile number to fetch SMS for.
 * @param {string} apiKey - The API key for authentication.
 * @param {string} email - The email associated with the API key.
 * @returns {Promise<string>} The extracted verification code.
 * @throws Will throw an error if fetching SMS fails.
 */
async function fetchSMS(mobile, apiKey, email) {
  if (!await getToken(apiKey, email)) {
    throw new Error('Failed to obtain API token.');
  }

  const apiEndpoint = `/api/pub/v2/sms?to=${encodeURIComponent(mobile)}`;
  let smsContentFound = false;
  let code = '';

  console.log(`Starting to fetch SMS for mobile number: ${mobile}`);

  while (!smsContentFound) {
    try {
      const response = await callTextVerified('GET', apiEndpoint);
      
      if (response && response.data && Array.isArray(response.data) && response.data.length > 0) {
        for (const sms of response.data) {
          if (sms.smsContent) {
            const message = sms.smsContent;
            const msgDtTime = new Date(sms.createdAt).getTime();
            console.log(`Received SMS: ${message}`);
            console.log(msgDtTime, currentDateTime, msgDtTime > currentDateTime)
            if (message.includes('Google verification') && msgDtTime > currentDateTime) {
              // Extract the first sequence of digits from the message
              code = message.replace(/.*?(\d+).*/, '$1')
              console.log(`SMS Content Found: ${code}`);
              smsContentFound = true;
              break; // Exit the loop if content is found
            }
          }
        }
      }

      if (!smsContentFound) {
        console.log('Verification SMS not found. Waiting for 5 seconds before retrying...');
        await sleep(5000); // Wait 5 seconds before the next attempt
      }

    } catch (error) {
      console.error('Error while fetching SMS:', error.message);
      // Depending on requirements, you might want to break the loop or retry
      throw error;
    }
  }

  console.log(`Completed checking SMS. Verification code: ${code}`);
  return code;
}

/**
 * Obtains an authentication token from the TextVerified API.
 * 
 * @param {string} apiKey - The API key for authentication.
 * @param {string} email - The email associated with the API key.
 * @returns {Promise<boolean>} True if token is successfully obtained, else false.
 */
async function getToken(apiKey, email) {
  const url = 'https://www.textverified.com/api/pub/v2/auth';
  
  const headers = {
    'Accept': 'application/json',
    'X-API-KEY': apiKey,
    'X-API-USERNAME': email,
    'Content-Type': 'application/json', // Ensure Content-Type is set
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({}), // Sending an empty JSON body
      timeout: 30000, // Note: Native fetch doesn't support timeout directly
    });

    if (!response.ok) { // response.ok is true for status in the range 200-299
      const errorData = await response.json().catch(() => ({}));
      console.error('Failed to obtain API token. Response:', errorData);
      return false;
    }

    const data = await response.json();
    if (data && data.token) {
      apiToken = data.token;
      console.log('Successfully obtained API token.');
      return true;
    } else {
      console.error('Failed to obtain API token. Response:', data);
      return false;
    }

  } catch (error) {
    console.error('Error while calling API:', error.message);
    return false;
  }
}

/**
 * Makes an API call to the TextVerified service.
 * 
 * @param {string} method - HTTP method ('GET', 'POST', etc.).
 * @param {string} apiEndpoint - The API endpoint path (e.g., '/api/pub/v2/sms').
 * @param {Object} [payload=null] - Optional payload for POST/PUT requests.
 * @returns {Promise<Object>} The response data from the API.
 * @throws Will throw an error if the API call fails.
 */
async function callTextVerified(method, apiEndpoint, payload = null) {
  const baseUrl = 'https://www.textverified.com';
  const url = apiEndpoint.startsWith('http') ? apiEndpoint : `${baseUrl}${apiEndpoint}`;
  
  const headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${apiToken}`,
  };

  // Initialize fetch options
  const options = {
    method: method.toUpperCase(),
    headers: headers,
    // Note: fetch does not support timeout directly. To implement timeout, you'd need to use AbortController.
  };

  // Add payload and Content-Type header if applicable
  if (payload && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
    options.body = JSON.stringify(payload);
    headers['Content-Type'] = 'application/json';
  }

  // Implementing timeout using AbortController
  const controller = new AbortController();
  const timeout = 30000; // 30 seconds

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  options.signal = controller.signal;

  try {
    const response = await fetch(url, options);
    clearTimeout(timeoutId); // Clear the timeout once response is received

    console.log(`API Response Status: ${response.status}`);

    let responseData;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    console.log(`API Response Data: ${JSON.stringify(responseData)}`);

    if (response.ok) { // Status code is in the range 200-299
      return responseData;
    } else {
      throw new Error(`API Error: ${response.status} - ${JSON.stringify(responseData)}`);
    }

  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`Error calling API at ${apiEndpoint}: Request timed out after ${timeout / 1000} seconds.`);
    } else {
      console.error(`Error calling API at ${apiEndpoint}:`, error.message);
    }
    throw error;
  }
}

// At the top of your createGoogleAccount.js
let browser = null;

/**
 * Initializes and returns a Puppeteer browser instance.
 * Reuses the existing instance if available.
 * @returns {Promise<puppeteer.Browser>}
 */
async function getBrowser() {
  if (!browser) {
    console.log('Launching Puppeteer with Chromium...');
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
    console.log('Browser launched.');
  }
  return browser;
}



/**
 *  Function to create Google account
 * @param {
 * } body 
 * return status :200 or error
 */

async function createGoogleAccount(body) {
  const { firstName, lastName, username, password, gender, dob, mobile, apiKey, email} = body;
  const [ year, month, day] = dob.split('-');
  console.log(firstName, lastName, username, password, gender, day, month, year, mobile, apiKey, email)
  console.log('Launching Puppeteer with Chromium...');
  try {
    console.log('Navigating to the signup page...');
    const browserInstance = await getBrowser();
    const page = await browserInstance.newPage();

    // Block unnecessary resources to speed up page loading
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const resourceType = req.resourceType();
      if (['image', 'stylesheet', 'font'].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });
  
  
    // Set a user agent to avoid bot detection
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    );
  
    const url = 'https://accounts.google.com/signup'
    console.log('Navigating to URL:', url);
    // Navigate to the URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });

    console.log('Filling in the first and last names...');
    await page.waitForSelector('input[name="firstName"]');
    await page.type('input[name="firstName"]', firstName, { delay: 10 });
    await sleep(2000); // Wait 2 seconds before the next attempt
    await page.waitForSelector('input[name="lastName"]');
    await page.type('input[name="lastName"]', lastName, { delay: 10 });

    console.log('Clicking the "Next" button...');
    await page.waitForSelector('#collectNameNext');
    await page.click('#collectNameNext');

    console.log('Waiting for the Basic Information page to load...');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('Filling in birth date and gender...');
    await page.waitForSelector('#month', { delay: 10 });
    await page.select('#month',String(month));
    
    await sleep(500); // Wait 2 seconds before the next attempt
    
    await page.waitForSelector('input[name="day"]',  { visible: true });    
    await page.type('input[name="day"]', String(day), { delay: 10 }); 
    
    await sleep(500); // Wait 2 seconds before the next attempt
   
    await page.waitForSelector('#year', { delay: 10 });
    await page.type('#year', String(year));
    
    await sleep(500); // Wait 1 seconds before the next attempt

    await page.waitForSelector('#gender', { delay: 10 });
    await page.select('#gender', String(gender)); // male    
    
    await sleep(500); // Wait 2 seconds before the next attempt

    await page.waitForSelector('#birthdaygenderNext');
    await page.click('#birthdaygenderNext');

    console.log('button clicked birthdaygenderNext');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('Handling Gmail address selection...');
    const optionSelected = await selectCreateYourOwnGmailAddress(page);
    if (!optionSelected) {
    //   throw new Error('Failed to select "Create your own Gmail address".');
    }
    console.log('Waiting for the Username page...');
    await page.waitForSelector('input[name="Username"]', { visible: true });
    await page.type('input[name="Username"]', username, { delay: 10 });  
    await sleep(500); // Wait hald seconds before the next attempt
    console.log('Clicking the "Next" button...');
    await page.click('#next');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Setting up the password...');

    await page.waitForSelector('input[name="Passwd"]',  { visible: true });    
    await new Promise(resolve => setTimeout(resolve, 2000)); // 1 second
    await page.waitForSelector('input[name="PasswdAgain"]',  { visible: true });
    console.log('Entering the password...');

    const passInput = await page.$('input[name="Passwd"]');
    await passInput.click({ clickCount: 3}); // Select the entire text field
    await passInput.type(password,{ delay: 50})
    
    // await page.type('input[name="Passwd"]', password);
    await page.type('input[name="PasswdAgain"]', password);
    console.log('Password entered click submit button.......');
    await page.waitForSelector('#createpasswordNext');
    outputcontent = await page.content();
    await page.click('#createpasswordNext');    
   //  return { "message": "Half Code working Properly"}
    await page.waitForNavigation({ waitUntil: 'networkidle2' });        
    
    await sleep(1000); // Wait 2 seconds before the next attempt
    outputcontent = await page.content();
    await page.waitForSelector('#phoneNumberId',  { visible: true });
    console.log('Entering the mobile number...');
    await page.type('#phoneNumberId', '+1 ' + mobile,   { delay: 10} );
    
    await sleep(500); // Wait 2 seconds before the next attempt
    // === Step 3: Click the "Next" Button ===
    // Method 1: Using a stable attribute (e.g., data-primary-action-label)
    const nextButtonSelector = 'div[data-primary-action-label="Next"] button';
    // Wait for the "Next" button to be clickable
    await page.waitForSelector(nextButtonSelector, { state: 'visible', timeout: 1000 });
    // Scroll the "Next" button into view to ensure it's interactable
    await page.evaluate((selector) => {
      const button = document.querySelector(selector);
      if (button) {
        button.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, nextButtonSelector);
    // Click the "Next" button
    await page.click(nextButtonSelector);

    console.log('Next button clicked!');

    await sleep(500); // Wait 2 seconds before the next attempt
    console.log('Waiting for Google to send the verification code...');
    const verificationCode = await waitForVerificationCode(mobile, apiKey, email);
    if(verificationCode){
     console.log('Entering the verification code...');
     await page.waitForSelector('#code',  { visible: true });
     await page.type('input[id="code"]', verificationCode);
 
     await sleep(500); // Wait 2 seconds before the next attempt
 
     await page.waitForSelector('#next');
     await page.click('#next');
 
     console.log('Next Code button clicked!');
     
     await page.waitForSelector('#recoverySkip');
 
     await sleep(500);
     await page.click('#recoverySkip');
     
     console.log('Recovery Skipped');
     await page.waitForNavigation({ waitUntil: 'networkidle2' });
 
     await page.waitForSelector('div[data-primary-action-label="Next"] button');     
     console.log('Recovery Skipped');
     await sleep(500); 
     await page.click('div[data-primary-action-label="Next"] button');
     
     await page.waitForNavigation({ waitUntil: 'networkidle2' });
     await page.waitForSelector('div [data-primary-action-label="I agree"] button');
     console.log('Wating for agreement Policy');
     await sleep(500); 
     await page.click('div [data-primary-action-label="I agree"] button');
     console.log('Agreed Policy Done'); 
     return 'Google account creation completed successfully!';
    }else{
      return await page.content();
    }
  } catch (error) {
    console.error('An error occurred:', error.message);
  } finally {
    console.log('Closing the browser...');
    return await page.content()
    // await browser.close();
  }
}

/** Heloper function to createGoogleAccount */
async function selectCreateYourOwnGmailAddress(page) {
         
  try {
    console.log('Waiting for Gmail address selection options...');
    await page.waitForSelector('div[role="radiogroup"]', { timeout: 5000 });
    const radio = await page.$('div[role="radiogroup"]');
    console.log(radio)
    if(radio!=null){

      console.log('Searching for "Create your own Gmail address" option...');
      
      const createYourOwnOption = await page.evaluateHandle(() => {
          const radios = document.querySelectorAll('div[role="radio"]');
          return Array.from(radios).find(radio =>
          radio.getAttribute('data-value') === 'custom' || radio.innerText.includes('Create your own Gmail address')
          );
      });
  
      
      if (createYourOwnOption) {
  
          console.log('Found "Create your own Gmail address" option. Triggering click...');
  
          // Set aria-checked to true manually (simulating the selection)
          await page.evaluate((element) => {
          element.setAttribute('aria-checked', 'true');
          }, createYourOwnOption);
  
          // Scroll the element into view (if needed)
          await page.evaluate((element) => {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, createYourOwnOption);
  
          // Wait for the element to be visible and interactable
          await page.waitForFunction(element => {
          return element.offsetHeight > 0 && element.offsetWidth > 0 && !element.disabled;
          }, {}, createYourOwnOption);
  
          // Dispatch the click event manually
          await page.evaluate((element) => {
          const clickEvent = new MouseEvent('click', {
              bubbles: true,
              cancelable: true,
              view: window,
          });
          element.dispatchEvent(clickEvent);
          }, createYourOwnOption);
  
          // Optional: Wait for some feedback after the click, e.g., for the username field to appear
          console.log('Waiting for the username field to appear...');
          await page.waitForSelector('input[name="Username"]', { visible: true, timeout: 5000 });
          
          console.log('Username field is now visible.');
          return true;
      } else {        
          console.log('"Create your own Gmail address" option not found.');
      }
   }
   else{
      await page.waitForSelector('input[name="Username"]', { visible: true, timeout: 5000 });
   }
  } catch (error) {
    await page.waitForSelector('input[name="Username"]', { visible: true, timeout: 5000 });
    console.error('Error selecting "Create your own Gmail address":', error.message);
  //    return false;
  }
  return false;
}

/** Helper function to createGoogle Account 
 * (to get mobile verification code using api with WAIT) 
 * return: verificationCode
 * */
async function waitForVerificationCode(mobile, apiKey, email) {
  console.log(`Fetching verification code for mobile number: ${mobile}`);
  let verificationCode = '';

  for (let i = 0; i < 6; i++) {
    console.log(`Attempt ${i + 1}: Checking for SMS...`);
    verificationCode = fetchSMS(mobile, apiKey, email);
    if (verificationCode) break;
    console.log('Verification code not received yet. Retrying in 10 seconds...');
    await sleep(5000); // Wait for 10 seconds
  }
  // if (!verificationCode) throw new Error('Failed to retrieve verification code.');
  return verificationCode;
}

/**
 * Function to run from outer api calls to createGoogleAccount
 * @param {} req 
 * @param {*} res 
 * @returns 
 */
module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const content = await createGoogleAccount(req.body);
    if (content === 'Google account creation completed successfully!') {
      return res.status(200).json({ status: 'true' });
    } else {
      return res.status(404).json({ error: outputcontent });
    }
  } catch (error) {
    console.error('Scraping failed:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message,
      content: outputcontent
    });
  } finally {
    // Optionally close the browser if not reusing
    if (browser) {
      await browser.close();
      browser = null;
    }
  }
};

// module.exports = async (req, res) => {
  
//   if (req.method === 'OPTIONS') {
//     return res.status(204).end();
//   }

//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method Not Allowed' });
//   }

//   try {
//     console.log('Starting gmail creations');    
//     const content = await createGoogleAccount(req.body);
//     if(content =='Google account creation completed successfully!'){
//       return res.status(200).json({ status:'true' });
//     }else{
//       return res.stutus(404).json({error: content})
//     }    
//   } catch (error) {
//     console.error('Scraping failed:', error.message);
//     return res.status(500).json({
//       error: 'Internal Server Error',
//       details: error.message,
//     });
//   }
// }

// Server Start
app.listen(port, () => {
  console.log(`'Server is running on http://localhost:${port}`);
});
