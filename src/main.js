// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/)
import { Actor } from 'apify';
// Crawlee - web scraping and browser automation library (Read more at https://crawlee.dev)
import { HttpCrawler, Dataset } from 'crawlee';

await Actor.init();

/**
 * @typedef {object} Input
 * @property {string} checkInDate - The check-in date in YYYY-MM-DD format (e.g., '2025-07-20').
 * @property {number} days - The number of days for the stay.
 * @property {number} adults - The number of adult guests.
 * @property {string} currency - The currency code (e.g., 'JPY', 'USD').
 * @property {string} entity - The Google Travel entity ID (e.g., 'CgsIx6il8vyxnYHRARAB').
 * @property {object} proxyConfig - Proxy configuration for the actor.
 * @property {boolean} [proxyConfig.useApifyProxy] - Whether to use Apify Proxy.
 * @property {string[]} [proxyConfig.apifyProxyGroups] - Array of Apify Proxy groups.
 * @property {string} [proxyConfig.apifyProxyCountry] - The country for Apify Proxy.
 */

/** @type {Input} */
const input = (await Actor.getInput()) || {
    // Default values for local development if no input is provided via Apify Console.
    // Ensure these values are valid for your testing!
    checkInDate: '2025-07-20', // Example: Use a date in the future
    days: 3,
    adults: 2,
    currency: 'USD',
    entity: 'CgsIx6il8vyxnYHRARAB', // <--- ENSURE THIS IS A VALID ENTITY ID FOR TESTING
    proxyConfig: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
        apifyProxyCountry: 'US', // Set a country if needed
    },
};

// Log the input to confirm it's correct right after retrieval
console.log('Actor Input:', input);
if (!input.entity) {
    throw new Error('Input "entity" is missing or undefined. Please provide a valid entity ID in the Actor input.');
}

/**
 * Generates an array of check-in and check-out date ranges.
 * @param {string} startDateStr - The starting date in YYYY-MM-DD format.
 * @param {number} numberOfDays - The number of consecutive days to generate ranges for.
 * @returns {{ start: string, end: string }[]} An array of objects, each containing formatted start and end dates.
 */
function generateDateRanges(startDateStr, numberOfDays) {
    const dateRanges = [];
    let currentDate = new Date(startDateStr);

    for (let i = 0; i < numberOfDays; i++) {
        const nextDay = new Date(currentDate);
        nextDay.setDate(currentDate.getDate() + 1);

        const checkIn = currentDate.toISOString().split('T')[0];
        const checkOut = nextDay.toISOString().split('T')[0];

        // Format: YYYY,M,D (e.g., 2025,7,20) as required by Google's API
        const formattedCheckIn = checkIn.split('-').map(Number).join(',');
        const formattedCheckOut = checkOut.split('-').map(Number).join(',');

        dateRanges.push({ start: formattedCheckIn, end: formattedCheckOut });

        currentDate = nextDay; // Move to the next day for the next iteration
    }
    return dateRanges;
}

const checkInCheckOutRanges = generateDateRanges(input.checkInDate, input.days);
console.log('Generated Check-in/Check-out Ranges:', checkInCheckOutRanges);

const requests = [];

for (const checkInCheckOut of checkInCheckOutRanges) {
    // REVERTED TO THE ORIGINAL, WORKING F.REQ STRING LITERAL
    // This string literal contains pre-escaped JSON for the f.req parameter.
    // The %5C%22 is equivalent to \" (escaped double quote).
    const fReqString = `%5B%5B%5B%22M0CRd%22,%22%5Bnull,%5Bnull,null,null,%5C%22${input.currency}%5C%22,%5B%5B${checkInCheckOut.start}%5D,%5B${checkInCheckOut.end}%5D,1,null,0%5D,null,null,null,null,null,null,null,null,%5B${input.adults},null,2%5D%5D,%5B1,null,1%5D,%5C%22${input.entity}%5C%22,%5Bnull,null,null,null,null,null,null,null,null,null,null,null,null,%5B%5C%22%5C%22%5D%5D,1,1%5D%22,null,%22generic%22%5D%5D%5D`;

    requests.push({
        url: `https://www.google.com/_/TravelFrontendUi/data/batchexecute?source-path=%2Ftravel%2Fhotels%2Fentity%2F${input.entity}%2Fprices&hl=en&rt=c&f.req=${fReqString}`,
        method: 'POST',
        headers: {
            // Corrected referer to remove the '0' prefix, as discussed previously
            referer: `http://googleusercontent.com/google.com/travel/hotels/${input.entity}`,
            // Added content-type header for POST requests
            'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'
        },
        payload: '' // Explicitly set payload to empty string if no body content is expected
    });
}

const proxyConfiguration = await Actor.createProxyConfiguration(input.proxyConfig);

const crawler = new HttpCrawler({
    proxyConfiguration,
    // Add cookie persistence if it helps with Google's anti-bot measures
    persistCookiesPerSession: true,
    async requestHandler({ request, body, log }) {
        try {
            const rawOutput = body.toString();
            // Google's batchexecute often returns multiple lines, with the actual JSON payload
            // starting with `[["` or similar. We need to find and parse that specific line.
            const lines = rawOutput.split('\n');
            const targetLine = lines.find(line => line.trim().startsWith('[') && line.trim().endsWith(']'));

            if (!targetLine) {
                log.error('No valid JSON payload line found in the response. This might indicate:', {
                    possibleReasons: [
                        'Hotel not available for the specified dates',
                        'Google Travel blocking the request',
                        'Invalid entity ID or parameters'
                    ],
                    url: request.url,
                    responseLength: rawOutput.length,
                    responsePreview: rawOutput.substring(0, 200) + '...'
                });
                return; // Skip processing if no target line
            }

            // Parse the outer JSON array
            const outerData = JSON.parse(targetLine);

            // Check if outerData has the expected structure and contains the inner JSON string
            if (!Array.isArray(outerData) || outerData.length < 1 || !Array.isArray(outerData[0]) || outerData[0].length < 3 || typeof outerData[0][2] !== 'string') {
                log.error('Unexpected outer JSON structure. This might indicate:', {
                    possibleReasons: [
                        'Hotel not available for the specified dates',
                        'Google Travel API structure changed',
                        'Rate limiting or blocking'
                    ],
                    url: request.url,
                    outerDataLength: outerData?.length,
                    firstElementType: typeof outerData?.[0],
                    hasInnerData: typeof outerData?.[0]?.[2]
                });
                return;
            }

            // Parse the inner JSON string
            const innerData = JSON.parse(outerData[0][2]);

            // Safely extract prices and related data
            const pricesData = innerData[2]?.[21] || []; // Use optional chaining and default to empty array
            const prices = pricesData.map(row => ({
                provider: row[0]?.[0],
                otaUrl: row[0]?.[2],
                isOfficial: row[0]?.[5],
                price: parseInt(row[12]?.[4]?.[2], 10), // Base 10 for parseInt
                price2: parseInt(row[12]?.[5]?.[2], 10), // Base 10 for parseInt
            }));

            // Extract other relevant data
            const currency = innerData[1]?.[3];
            const checkInDateOutput = innerData[1]?.[4]?.[0]?.join('-'); // YYYY-MM-DD
            const checkOutDateOutput = innerData[1]?.[4]?.[1]?.join('-'); // YYYY-MM-DD

            if (prices.length > 0) {
                log.info('Extracted Prices:', prices);
                log.info('Source Data Sample:', innerData[2]?.[21]?.[0]); // Log a sample for debugging
            } else {
                log.warning('No prices found for this date range. This could mean:', {
                    reason: 'No availability for the specified dates',
                    checkInDate: checkInDateOutput,
                    checkOutDate: checkOutDateOutput,
                    adults: input.adults,
                    currency: input.currency
                });
            }

            await Dataset.pushData({
                prices,
                adults: input.adults,
                currency,
                checkInDate: checkInDateOutput,
                checkOutDate: checkOutDateOutput,
            });

        } catch (error) {
            log.error('Error processing request or parsing JSON:', {
                url: request.url,
                error: error.message,
                stack: error.stack,
            });
        }
    },
});

await crawler.run(requests);

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit()
await Actor.exit();