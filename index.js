const puppeteer = require('puppeteer');
const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

app.post('/', async (req, res) => {
  const { firstName, lastName, username, password, dob } = req.body;
  const mobileNumber = process.env.MOBILE_NUMBER;
  const [year, month, day] = dob.split('-');
  
  try {
    await createGoogleAccount(firstName, lastName, username, password, day, month, year, mobileNumber);
    res.status(200).send({ message: 'User registered successfully!' });
  } catch (error) {
    res.status(500).send({ error: 'User registration failed!' });
  }
});

async function createGoogleAccount(firstName, lastName, username, password, day, month, year, mobileNumber) {
  const browser = await puppeteer.launch({ 
    headless: false, 
    args: ['--no-sandbox', '--disable-setuid-sandbox'] 
  });
  const page = await browser.newPage();
  await page.setDefaultNavigationTimeout(90000);
  
  try {
    console.log('Navigating to the signup page...');
    await page.goto('https://accounts.google.com/signup', { waitUntil: 'networkidle2' });

    // Fill first name
    await page.type('input[name="firstName"]', firstName);
    await page.type('input[name="lastName"]', lastName);
    
    // Go to next step
    await page.click('#collectNameNext');
    await page.waitForNavigation();

    // Fill date of birth and gender
    await page.select('#month', month);
    await page.type('input[name="day"]', day);
    await page.type('#year', year);
    await page.select('#gender', '1'); // Male
    await page.click('#birthdaygenderNext');
    await page.waitForNavigation();

    // Set username
    await page.type('input[name="Username"]', username);
    await page.click('#next');
    await page.waitForNavigation();

    // Set password
    await page.type('input[name="Passwd"]', password);
    await page.type('input[name="PasswdAgain"]', password);
    await page.click('#createpasswordNext');
    await page.waitForNavigation();

    // Enter mobile number
    await page.type('#phoneNumberId', mobileNumber);
    await page.click('#next');
    await page.waitForNavigation();

    // Wait for the verification code (for demo, skipping the actual code input)
    await page.type('#code', '112233');
    await page.click('#next');

    // Final step - Accept terms and conditions
    await page.waitForSelector('div[data-primary-action-label="Next"] button');
    await page.click('div[data-primary-action-label="Next"] button');
    await page.waitForNavigation();

    console.log('Google account created successfully!');
  } catch (error) {
    console.error('Error creating account:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

module.exports = app;  // Vercel uses this as a serverless function
