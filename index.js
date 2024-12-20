
const express = require('express');
// const hashedPassword = await bcrypt.hash(password, 10);
      // const user = new User({ username, password: hashedPassword });
      // await user.save();
      /**
      * Fetches SMS from the specified API endpoint for the provided number.
      * @param {string} number - The mobile number to fetch the verification code for.
      * @return {string} The extracted verification code.
      */
     // function fetchLatestSMS(number = '8483310905') {
     //   const apiEndpoint = sms/${number};
     //   let code = '';
     //   const result = callApi('GET', apiEndpoint);
     
     //   for (let sms of result.results) {
     //     let message = sms.message;
     //     if (message.includes('Google verification ')) {
     //       code = message.replace(/.?(\d+)./, '$1'); // Extract the verification code
     //       break;
     //     }
     //   }
     //   console.log(Verification Code: ${code});
     //   return code;
     // }
     
     /**
      * Makes an API call to the specified endpoint with given options.
      * @param {string} method - HTTP method (GET, POST, etc.).
      * @param {string} apiEndpoint - The API endpoint to call.
      * @param {Object} [payload=null] - Optional payload for POST/PUT requests.
      * @return {Object} Parsed JSON response.
      */
     // function callApi(method, apiEndpoint, payload = null) {
     //   const url = https://dp33c1xwtxufgln-db202204160934.adb.us-phoenix-1.oraclecloudapps.com/ords/tardigrade_api/api/v1/${apiEndpoint};
     //   const headers = {
     //     accept: 'application/json',
     //     'api-id': '34686896304275515009619259576594128842',
     //     'api-key': '7RCL9PDNQH5M1KF4LRCJP760Q60ZKI'
     //   };
     
     //   const options = {
     //     method: method.toUpperCase(),
     //     headers: headers
     //   };
     
     //   if (payload && (method === 'POST' || method === 'PUT')) {
     //     options.payload = JSON.stringify(payload);
     //     options.contentType = 'application/json';
     //   }
     
     //   try {
     //     const response = UrlFetchApp.fetch(url, options);
     //     return JSON.parse(response.getContentText());
     //   } catch (error) {
     //     console.error(Error calling API at ${apiEndpoint}:, error.message);
     //     throw error;
     //   }
     // }
     
     
     /**
      * Automates Google Account signup and handles SMS verification.
      * @param {string} firstName - First name of the account.
      * @param {string} lastName - Last name of the account.
      * @param {string} username - Desired username (must be unique).
      * @param {string} password - Password for the account.
      * @param {string} day - Day of birth.
      * @param {string} month - Month of birth (1 for January, 2 for February, etc.).
      * @param {string} year - Year of birth.
      * @param {string} mobileNumber - Mobile number for SMS verification.
      */
     const bodyParser = require('body-parser');
    
      const puppeteer = require('puppeteer');

const app = express();

app.use(bodyParser.json());

const PORT = 8000;


app.post('/', async (req, res) => {
  const { firstName, lastName, dob, username, password } = req.body;
  const mobileNumber = '+919990304777';
  const [year, month, day] = dob.split('-');
  
  try {
      
     async function createGoogleAccount(firstName, lastName, username, password, day, month, year, mobileNumber) {
       const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
       const page = await browser.newPage();
       await page.setDefaultNavigationTimeout(90000);
     
       try {
         console.log('Navigating to the signup page...');
         await page.goto('https://accounts.google.com/signup', { waitUntil: 'networkidle2' });
     
         console.log('Filling in the first and last names...');
         await page.waitForSelector('input[name="firstName"]');
         await page.type('input[name="firstName"]', firstName, { delay: 50 });
         await new Promise(resolve => setTimeout(resolve, 2000)); // 1 second
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
         
         await new Promise(resolve => setTimeout(resolve, 3000)); // 1 second
         
         await page.waitForSelector('input[name="day"]',  { visible: true });    
         await page.type('input[name="day"]', day, { delay: 50 }); 
         
         await new Promise(resolve => setTimeout(resolve, 2000)); // 1 second  
        
         await page.waitForSelector('#year', { delay: 50 });
         await page.type('#year', year);
         
         await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second
     
         await page.waitForSelector('#gender', { delay: 50 });
         await page.select('#gender', '1'); // male    
         
         await new Promise(resolve => setTimeout(resolve, 3000)); // 1 second
     
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
         await new Promise(resolve => setTimeout(resolve, 2000)); // 1 second
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
         
         await page.waitForNavigation({ waitUntil: 'networkidle2' });
         
         await new Promise(resolve => setTimeout(resolve, 2000)); // 1 second
         await page.waitForSelector('#phoneNumberId',  { visible: true });
         console.log('Entering the mobile number...');
         await page.type('#phoneNumberId', mobileNumber,   { delay: 50} );
         
         await new Promise(resolve => setTimeout(resolve, 2000)); // 1 second
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
         
         await new Promise(resolve => setTimeout(resolve, 2000)); // 1 second
         console.log('Waiting for Google to send the verification code...');
         // const verificationCode = await waitForVerificationCode(mobileNumber);
         const verificationCode = "112211"
         console.log('Entering the verification code...');
         
         await page.waitForSelector('#code',  { visible: true });
         await page.type('input[id="code"]', verificationCode);
     
         await new Promise(resolve => setTimeout(resolve, 15000)); // 10 seconds
         
         // const nextButtonCodeSelector = 'div[id="Next"] div button';
         // // Wait for the "Next" button to be clickable
         // await page.waitForSelector(nextButtonCodeSelector, { state: 'visible', timeout: 10000 });
         // // Scroll the "Next" button into view to ensure it's interactable
         // await page.evaluate((selector) => {
         //   const button = document.querySelector(selector);
         //   if (button) {
         //     button.scrollIntoView({ behavior: 'smooth', block: 'center' });
         //   }
         // }, nextButtonCodeSelector);
         // Click the "Next" button
         
     
     
     
         await page.waitForSelector('#next');
         await page.click('#next');
     
         console.log('Next Code button clicked!');
        
         await page.waitForSelector('#recoverySkip');
     
         await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
         await page.click('#recoverySkip');
         
         await page.waitForNavigation({ waitUntil: 'networkidle2' });
     
         await page.waitForSelector('div[data-primary-action-label="Next"] button');
         
         await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds
         await page.click('div[data-primary-action-label="Next"] button');
     
         await page.waitForNavigation({ waitUntil: 'networkidle2' });
         await page.waitForSelector('div [data-primary-action-label="I agree"] button');
         
         await new Promise(resolve => setTimeout(resolve, 1000)); // 2 seconds
         await page.click('div [data-primary-action-label="I agree"] button');
     
         console.log('Google account creation completed successfully!');
       } catch (error) {
         console.error('An error occurred:', error.message);
       } finally {
         console.log('Closing the browser...');
         // await browser.close();
       }
     }
     
     /**
      * Selects the "Create your own Gmail address" option if it exists, 
      * or directly checks for the username input field if no radiogroup is present.
      * @param {puppeteer.Page} page - The Puppeteer page object.
      * @return {Promise<boolean>} - True if successful, false otherwise.
      */
     
     
     /**
      * Selects the "Create your own Gmail address" option if it exists, 
      * or directly checks for the username input field if no radiogroup is present.
      * @param {puppeteer.Page} page - The Puppeteer page object.
      * @return {Promise<boolean>} - True if successful, false otherwise.
      */
     
     
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
     
     /**
      * Waits for the verification code and fetches it using the API.
      * @param {string} mobileNumber - The mobile number for SMS verification.
      * @return {string} The verification code.
      */
     // async function waitForVerificationCode(mobileNumber) {
     //   console.log(Fetching verification code for mobile number: ${mobileNumber});
     //   let verificationCode = '';
     
     //   for (let i = 0; i < 6; i++) {
     //     console.log(Attempt ${i + 1}: Checking for SMS...);
     //     verificationCode = fetchLatestSMS(mobileNumber);
     //     if (verificationCode) break;
     //     console.log('Verification code not received yet. Retrying in 10 seconds...');
     //     await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait for 10 seconds
     //   }
     
     //   if (!verificationCode) throw new Error('Failed to retrieve verification code.');
     //   return verificationCode;
     // }
     
     /**
      * Test function to execute the account creation.
      */








async function test(){
  await createGoogleAccount(firstName, lastName, username, password, day, month, year, mobileNumber);

}
   test()   

      res.status(200).send({ message: 'User registered successfully!' });
  } catch (error) {
      res.status(400).send({ error: 'User registration failed!' });
  }
});

// Server Start
app.listen(PORT, () => {
  console.log(`'Server is running on http://localhost:${PORT}`);
});
