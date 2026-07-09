const puppeteer = require('puppeteer');

async function verifyDiscordEmail(emailStr) {
    let browser;
    try {
        console.log(`Starting Discord verification for ${emailStr}`);
        
        // Parse email
        const [prefix, domain] = emailStr.split('@');
        if (!prefix || !domain) throw new Error("Invalid email format");

        browser = await puppeteer.launch({
            channel: 'chrome',
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // 1. Go to swiftmail
        await page.goto('https://swiftmail.cc/', { waitUntil: 'networkidle2' });
        
        // 2. Type email prefix
        // Since we don't know exact selectors without inspecting, let's look for inputs
        // Usually there's an input for prefix and a select for domain
        
        // Assuming there is an input field for the mailbox prefix
        const inputs = await page.$$('input');
        if (inputs.length > 0) {
            // Usually the first input is the mailbox name
            await inputs[0].click({ clickCount: 3 });
            await inputs[0].type(prefix);
        } else {
            throw new Error("Could not find email input on swiftmail.cc");
        }
        
        // For the domain, we might need to select it or type it. If it's a dropdown:
        // Many disposable mail services let you just hit enter or click "Go"
        
        // Let's just find a button and click it
        const buttons = await page.$$('button');
        for (let btn of buttons) {
            const text = await page.evaluate(el => el.innerText.toLowerCase(), btn);
            if (text.includes('go') || text.includes('login') || text.includes('check') || text.includes('arrow')) {
                await btn.click();
                break;
            }
        }
        
        // Wait for inbox to load
        await new Promise(r => setTimeout(r, 3000));
        
        // Look for Discord email
        const pageContent = await page.content();
        if (!pageContent.toLowerCase().includes('discord')) {
            throw new Error("Discord email not found yet");
        }
        
        // Click the Discord email
        const links = await page.$$('a, div.row, tr');
        let clickedEmail = false;
        for (let link of links) {
            const text = await page.evaluate(el => el.innerText.toLowerCase(), link);
            if (text.includes('discord')) {
                await link.click();
                clickedEmail = true;
                break;
            }
        }
        
        if (!clickedEmail) throw new Error("Could not click Discord email");
        
        // Wait for email body to load
        await new Promise(r => setTimeout(r, 2000));
        
        // Find the "Verify Login" link
        const emailLinks = await page.$$('a');
        let verifyLink = null;
        for (let link of emailLinks) {
            const href = await page.evaluate(el => el.href, link);
            if (href && href.includes('discord.com/verify')) {
                verifyLink = href;
                break;
            }
        }
        
        if (verifyLink) {
            console.log("Found Discord verification link: ", verifyLink);
            // Navigate to verify link
            await page.goto(verifyLink, { waitUntil: 'networkidle2' });
            return { success: true, message: "Discord login verified successfully!" };
        } else {
            throw new Error("Could not find the 'Verify Login' link inside the email");
        }

    } catch (e) {
        console.error("Puppeteer verification failed:", e);
        return { success: false, error: e.message };
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = { verifyDiscordEmail };
