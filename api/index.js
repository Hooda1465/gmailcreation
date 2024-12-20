const puppeteer = require('puppeteer-core');
const chrome = require('chrome-aws-lambda');
const bodyParser = require('body-parser');

module.exports = async (req, res) => {
  const { firstName, lastName, dob, username, password } = req.body;
  const mobileNumber = '+919990304777';
  const [year, month, day] = dob.split('-');

  try {
    // Puppeteer function to create Google account
    async function createGoogleAccount(firstName, lastName, username, password, day, month, year, mobileNumber) {
      const browser = await puppeteer.launch({
        args: chrome.args, // Vercel-specific arguments
        executablePath: await chrome.executablePath, // Vercel's Chromium executable
        headless: chrome.headless, // Headless mode for Vercel deployment
      });

      const page = await browser.newPage();
      await page.setDefaultNavigationTimeout(90000); // Increase timeout

      try {
        console.log('Navigating to the signup page...');
        await page.goto('https://accounts.google.com/signup', { waitUntil: 'networkidle2' });

        console.log('Filling in the first and last names...');
        await page.waitForSelector('input[name="firstName"]');
        await page.type('input[name="firstName"]', firstName, { delay: 50 });
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
        
        await page.waitForSelector('input[name="day"]');
        await page.type('input[name="day"]', day, { delay: 50 });

        await page.waitForSelector('#year');
        await page.type('#year', year);

        await page.waitForSelector('#gender');
        await page.select('#gender', '1'); // male    

        await page.waitForSelector('#birthdaygenderNext');
        await page.click('#birthdaygenderNext');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        console.log('Handling Gmail address selection...');
        const optionSelected = await selectCreateYourOwnGmailAddress(page);
        if (!optionSelected) {
          throw new Error('Failed to select "Create your own Gmail address".');
        }

        console.log('Waiting for the Username page...');
        await page.waitForSelector('input[name="Username"]');
        await page.type('input[name="Username"]', username, { delay: 50 });

        console.log('Clicking the "Next" button...');
        await page.click('#next');
        
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        console.log('Setting up the password...');
        await page.waitForSelector('input[name="Passwd"]');
        await page.waitForSelector('input[name="PasswdAgain"]');
        await page.type('input[name="Passwd"]', password, { delay: 50 });
        await page.type('input[name="PasswdAgain"]', password);

        console.log('Password entered click submit button.......');
        await page.waitForSelector('#createpasswordNext');
        await page.click('#createpasswordNext');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        console.log('Waiting for Google to send the verification code...');
        const verificationCode = "112211"; // Dummy code for now
        console.log('Entering the verification code...');
        
        await page.waitForSelector('#code');
        await page.type('input[id="code"]', verificationCode);

        await page.waitForSelector('#next');
        await page.click('#next');

        console.log('Next Code button clicked!');
        await page.waitForSelector('#recoverySkip');
        
        await page.click('#recoverySkip');
        
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        await page.waitForSelector('div[data-primary-action-label="Next"] button');
        await page.click('div[data-primary-action-label="Next"] button');
        
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
        await page.waitForSelector('div [data-primary-action-label="I agree"] button');
        await page.click('div [data-primary-action-label="I agree"] button');
        
        console.log('Google account creation completed successfully!');
      } catch (error) {
        console.error('An error occurred:', error.message);
      } finally {
        console.log('Closing the browser...');
        await browser.close();
      }
    }

    // Call function to create account
    await createGoogleAccount(firstName, lastName, username, password, day, month, year, mobileNumber);
    res.status(200).json({ message: 'User registered successfully!' });
  } catch (error) {
    console.error('Error during registration:', error.message);
    res.status(400).json({ error: 'User registration failed!' });
  }
};

// Helper function for selecting the option to create a custom Gmail address
async function selectCreateYourOwnGmailAddress(page) {
  const selector = '#username-choice';
  try {
    await page.waitForSelector(selector, { visible: true });
    await page.click(selector);
    return true;
  } catch (error) {
    console.error('Failed to select "Create your own Gmail address":', error);
    return false;
  }
}
