const express = require('express');     
const bodyParser = require('body-parser');    
const puppeteer = require('puppeteer');
const chromium = require('@sparticuz/chromium');

const app = express();
app.use(bodyParser.json());

const port = process.env.PORT || 3001;

// Global variable to store the API token
let apiToken = '';
/**
 * Sleeps for the specified number of milliseconds.
 * @param {number} ms - Milliseconds to sleep.
 * @returns {Promise} A promise that resolves after the specified time.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches SMS containing a Google verification code for the specified mobile number.
 * 
 * @param {string} mobile - The mobile number to fetch SMS for.
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
            console.log(`Received SMS: ${message}`);

            if (message.includes('Google verification ')) {
              // Extract the first sequence of digits from the message
              const match = message.match(/Google verification (\d+)/);
              if (match && match[1]) {
                code = match[1];
                console.log(`SMS Content Found: ${code}`);
                smsContentFound = true;
                break; // Exit the loop if content is found
              }
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
 * @returns {Promise<boolean>} True if token is successfully obtained, else false.
 */
async function getToken(apiKey, email) {
  const url = 'https://www.textverified.com/api/pub/v2/auth';
  const headers = {
    'Accept': 'application/json',
    'X-API-KEY': apiKey,
    'X-API-USERNAME': email,
  };

  try {
    const response = await axios.post(url, {}, { headers });

    if (response.status === 200 && response.data && response.data.token) {
      apiToken = response.data.token;
      console.log('Successfully obtained API token.');
      return true;
    } else {
      console.error('Failed to obtain API token. Response:', response.data);
      return false;
    }

  } catch (error) {
    if (error.response) {
      console.error(`API responded with status ${error.response.status}:`, error.response.data);
    } else {
      console.error('Error while calling API:', error.message);
    }
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
  const url = apiEndpoint.startsWith(baseUrl) ? apiEndpoint : `${baseUrl}${apiEndpoint}`;
  
  const headers = {
    'Accept': 'application/json',
    'Authorization': `Bearer ${apiToken}`,
  };

  const options = {
    method: method.toUpperCase(),
    url,
    headers,
    // Timeout after 30 seconds
    timeout: 30000,
    validateStatus: function (status) {
      // Resolve only if the status code is less than 500
      return status < 500;
    }
  };

  // Add payload and Content-Type header if applicable
  if (payload && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
    options.data = payload;
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await axios(options);
    console.log(`API Response Status: ${response.status}`);
    console.log(`API Response Data: ${JSON.stringify(response.data)}`);
    
    if (response.status >= 200 && response.status < 300) {
      return response.data;
    } else {
      throw new Error(`API Error: ${response.status} - ${JSON.stringify(response.data)}`);
    }

  } catch (error) {
    if (error.response) {
      console.error(`Error calling API at ${apiEndpoint}:`, `Status ${error.response.status} -`, error.response.data);
    } else {
      console.error(`Error calling API at ${apiEndpoint}:`, error.message);
    }
    throw error;
  }
}

/**
 *  Function to create Google account
 * @param {
 * } body 
 * return status :200 or error
 */

async function createGoogleAccount(body) {
  const { firstName, lastName, username, password, gender, day, month, year, mobile, apiKey, email} = body;
  console.log(firstName, lastName, username, password, gender, day, month, year, mobile, apiKey, email)
  console.log('Launching Puppeteer with Chromium...');
  try {
    console.log('Navigating to the signup page...');
    const browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      // headless: false,
    });
  
    const url = 'https://accounts.google.com/signup'
  
    const page = await browser.newPage();
    console.log('Navigating to URL:', url);
  
    // Set a user agent to avoid bot detection
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    );
  
    // Navigate to the URL
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log('Filling in the first and last names...');
    await page.waitForSelector('input[name="firstName"]');
    await page.type('input[name="firstName"]', firstName, { delay: 50 });
    await sleep(2000); // Wait 2 seconds before the next attempt
    await page.waitForSelector('input[name="lastName"]');
    await page.type('input[name="lastName"]', lastName, { delay: 50 });

    console.log('Clicking the "Next" button...');
    await page.waitForSelector('#collectNameNext');
    await page.click('#collectNameNext');

    console.log('Waiting for the Basic Information page to load...');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });

    console.log('Filling in birth date and gender...');
    await page.waitForSelector('#month', { delay: 50 });
    await page.select('#month', month);
    
    await sleep(2000); // Wait 2 seconds before the next attempt
    
    await page.waitForSelector('input[name="day"]',  { visible: true });    
    await page.type('input[name="day"]', day, { delay: 50 }); 
    
    await sleep(2000); // Wait 2 seconds before the next attempt
   
    await page.waitForSelector('#year', { delay: 50 });
    await page.type('#year', year);
    
    await sleep(1000); // Wait 1 seconds before the next attempt

    await page.waitForSelector('#gender', { delay: 50 });
    await page.select('#gender', gender); // male    
    
    await sleep(2000); // Wait 2 seconds before the next attempt

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
    await page.type('input[name="Username"]', username, { delay: 50 });  
    await sleep(2000); // Wait 2 seconds before the next attempt
    console.log('Clicking the "Next" button...');
    await page.click('#next');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Setting up the password...');

    await page.waitForSelector('input[name="Passwd"]',  { visible: true });    
    await new Promise(resolve => setTimeout(resolve, 3000)); // 1 second
    await page.waitForSelector('input[name="PasswdAgain"]',  { visible: true });
    console.log('Entering the password...');

    const passInput = await page.$('input[name="Passwd"]');
    await passInput.click({ clickCount: 3}); // Select the entire text field
    await passInput.type(password,{ delay: 50})
    
    // await page.type('input[name="Passwd"]', password);
    await page.type('input[name="PasswdAgain"]', password);
    console.log('Password entered click submit button.......');
    await page.waitForSelector('#createpasswordNext');
    await page.click('#createpasswordNext');    
   //  return { "message": "Half Code working Properly"}
    await page.waitForNavigation({ waitUntil: 'networkidle2' });        
    
    await sleep(2000); // Wait 2 seconds before the next attempt
    await page.waitForSelector('#phoneNumberId',  { visible: true });
    console.log('Entering the mobile number...');
    await page.type('#phoneNumberId', mobile,   { delay: 50} );
    
    await sleep(2000); // Wait 2 seconds before the next attempt
    // === Step 3: Click the "Next" Button ===
    // Method 1: Using a stable attribute (e.g., data-primary-action-label)
    const nextButtonSelector = 'div[data-primary-action-label="Next"] button';
    // Wait for the "Next" button to be clickable
    await page.waitForSelector(nextButtonSelector, { state: 'visible', timeout: 10000 });
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

    await sleep(2000); // Wait 2 seconds before the next attempt
    console.log('Waiting for Google to send the verification code...');
    const verificationCode = await waitForVerificationCode(mobile, apiKey, email);
    if(verificationCode){
     //  const verificationCode = "112211"
     console.log('Entering the verification code...');
     
     await page.waitForSelector('#code',  { visible: true });
     await page.type('input[id="code"]', verificationCode);
 
     await sleep(2000); // Wait 2 seconds before the next attempt
 
     await page.waitForSelector('#next');
     await page.click('#next');
 
     console.log('Next Code button clicked!');
     
     await page.waitForSelector('#recoverySkip');
 
     await sleep(2000);
     await page.click('#recoverySkip');
     
     await page.waitForNavigation({ waitUntil: 'networkidle2' });
 
     await page.waitForSelector('div[data-primary-action-label="Next"] button');
     
     await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
     await page.click('div[data-primary-action-label="Next"] button');
 
     await page.waitForNavigation({ waitUntil: 'networkidle2' });
     await page.waitForSelector('div [data-primary-action-label="I agree"] button');
     
     await new Promise(resolve => setTimeout(resolve, 1000)); // 2 seconds
     await page.click('div [data-primary-action-label="I agree"] button');
 
     return 'Google account creation completed successfully!';
    }else{
      return 'Verification code failed';
    }
  } catch (error) {
    console.error('An error occurred:', error.message);
  } finally {
    console.log('Closing the browser...');
    await browser.close();
  }
}

/** Heloper function to createGoogleAccount */
async function selectCreateYourOwnGmailAddress(page) {
         
  try {
    console.log('Waiting for Gmail address selection options...');
    await page.waitForSelector('div[role="radiogroup"]', { timeout: 20000 });
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
          await page.waitForSelector('input[name="Username"]', { visible: true, timeout: 50000 });
          
          console.log('Username field is now visible.');
          return true;
      } else {        
          console.log('"Create your own Gmail address" option not found.');
      }
   }
   else{
      await page.waitForSelector('input[name="Username"]', { visible: true, timeout: 10000 });
   }
  } catch (error) {
    await page.waitForSelector('input[name="Username"]', { visible: true, timeout: 10000 });
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
  console.log(`Fetching verification code for mobile number: ${mobileNumber}`);
  let verificationCode = '';

  for (let i = 0; i < 6; i++) {
    console.log(`Attempt ${i + 1}: Checking for SMS...`);
    verificationCode = fetchSMS(mobile, apiKey, email);
    if (verificationCode) break;
    console.log('Verification code not received yet. Retrying in 10 seconds...');
    await sleep(10000); // Wait for 10 seconds
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
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    console.log('Starting gmail creations');    
    const content = await createGoogleAccount(req.body);
    if(content =='Google account creation completed successfully!'){
      return res.status(200).json({ status:'true' });
    }else{
      return res.stutus(404).json({error: content})
    }    
  } catch (error) {
    console.error('Scraping failed:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message,
    });
  }
}

// Server Start
app.listen(port, () => {
  console.log(`'Server is running on http://localhost:${port}`);
});
