await page.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('Setting up the password...');

    await page.waitForSelector('input[name="Passwd"]',  { visible: true });    
    await sleep(500);; // 1 second
    await page.waitForSelector('input[name="PasswdAgain"]',  { visible: true });
    console.log('Entering the password...');

    const passInput = await page.$('input[name="Passwd"]');
    await passInput.click({ clickCount: 3}); // Select the entire text field
    await passInput.type(password,{ delay: 30})
    
    // await page.type('input[name="Passwd"]', password);
    await page.type('input[name="PasswdAgain"]', password);
    console.log('Password entered click submit button.......');  
    await sleep(2000);; // 1 second
    await page.waitForSelector('#createpasswordNext');
    await page.click('#createpasswordNext');    
       
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
      
    await sleep(1000);
    await page.waitForSelector('#phoneNumberId',  { visible: true });
    console.log(`Entering the mobile number... : ${mobileNumber}`)
    await page.type('#phoneNumberId', mobileNumber, { delay: 50 });

    await sleep(2000);
    const enteredValue = await page.evaluate(() => {
        const input = document.querySelector('#phoneNumberId');
        return input ? input.value : null;
    });
    
    if (enteredValue === mobileNumber) {
        console.log("Mobile number successfully entered:", enteredValue);
    } else {
        console.error("Mobile number not entered properly. Found value:", enteredValue);
    }

    await page.waitForSelector('[data-is-touch-wrapper="true"] button');
    await page.click('[data-is-touch-wrapper="true"] button'); 
        
    console.log("next Button clicked!");

    console.log('Next button clicked! waiting for CODE page');

    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // await sleep(1000);; // 1 second
    console.log('Waiting for Google to send the verification code...');
    await page.waitForSelector('#code',  { visible: true });
    console.log('Code Selector found...');
    // await page.type('#code', "112211");
    
    // await sleep(1000);; // 1 second
    // await page.waitForSelector('[data-is-touch-wrapper="true"] button');
    // await page.click('[data-is-touch-wrapper="true"] button'); 
  

    const verificationCode = await waitForVerificationCode(mobile, apiKey, email);
    if(verificationCode && verificationCode!=null){
     console.log(`Code ${verificationCode} found and Entering the verification code now`);
     await page.waitForSelector('#code',  { visible: true });
     await page.type('#code', verificationCode);
 
     // await sleep(500); // Wait 2 seconds before the next attempt
     
    await page.waitForSelector('[data-is-touch-wrapper="true"] button');
    await page.click('[data-is-touch-wrapper="true"] button');  
     console.log('Next button on Code page clicked!');
           
     await page.waitForNavigation({ waitUntil: 'networkidle2' }); 
     await page.waitForSelector('div[data-primary-action-label="Next"] button');   
     // await sleep(500); 
     await page.click('div[data-primary-action-label="Next"] button');  
     console.log('Recovery Skipped');
     
     await page.waitForNavigation({ waitUntil: 'networkidle2' });
     await page.waitForSelector('div [data-primary-action-label="I agree"] button');
     console.log('Wating for agreement Policy');
     // await sleep(500); 
     await page.click('div [data-primary-action-label="I agree"] button');
     console.log('Agreed Policy Done'); 
      // close proxy chain
     // await proxyChain.closeAnonymizedProxy(newProxyUrl, true);
     return 'Google account creation completed successfully!';
    }else{
      return "code not received within timeout, so closed";
    }
  } catch (error) {
    console.error('An error occurred:', error.message);
  } finally {
    // console.log('Closing the browser...');
    // if (browser) {    
    // close proxy chain
    // await proxyChain.closeAnonymizedProxy(newProxyUrl, true);
    //   await browser.close();
    //   browser = null;     
    // }
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
    verificationCode = await fetchSMS(mobile, apiKey, email); // readCodeFromSheet(mobile) // 
    if (verificationCode && verificationCode!=null) break;
    console.log('Verification code not received yet. Retrying in 10 seconds...');
    await sleep(1000); // Wait for 10 seconds
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
      return res.status(404).json({ error: content });
    }
  } catch (error) {
    console.error('Scraping failed:', error.message);
    return res.status(500).json({
      error: 'Internal Server Error',
      details: error.message
    });
  } finally {
    // Optionally close the browser if not reusing
    if (browser) {
      await browser.close();
      browser = null;
    }
  }
};

// Server Start
app.listen(port, () => {
  console.log(`'Server is running on http://localhost:${port}`);
});
