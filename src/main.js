// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/)
import { Actor } from 'apify';
// Crawlee - web scraping and browser automation library (Read more at https://crawlee.dev)
import { HttpCrawler, Dataset } from 'crawlee';

await Actor.init();

const input = await Actor.getInput();

// Validate required inputs
if (!input.entityId) {
    throw new Error('entityId is required');
}
if (!input.checkInDate) {
    throw new Error('checkInDate is required');
}
if (!input.currency) {
    throw new Error('currency is required');
}
if (!input.days) {
    throw new Error('days is required');
}
if (!input.adults) {
    throw new Error('adults is required');
}

// Set defaults for optional inputs
const {
    entityId,
    currency,
    checkInDate,
    days,
    adults,
    maxRequestRetries = 3,
    requestTimeoutSecs = 60,
    proxyConfiguration
} = input;

function getCheckInCheckOuts(startDate, days) {
    return Array.from({ length: days }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);
        return {
            start: date.toISOString().split('T')[0].split('-').map(Number).join(','),
            end: endDate.toISOString().split('T')[0].split('-').map(Number).join(',')
        };
    });
}

const checkInCheckOuts = getCheckInCheckOuts(checkInDate, days);
console.log('checkInCheckOuts', checkInCheckOuts);

const requests = [];

for (const checkInCheckOut of checkInCheckOuts) {
    requests.push({
        url: `https://www.google.com/_/TravelFrontendUi/data/batchexecute?source-path=%2Ftravel%2Fhotels%2Fentity%2F${entityId}%2Fprices&hl=en&rt=c&f.req=%5B%5B%5B%22M0CRd%22,%22%5Bnull,%5Bnull,null,null,%5C%22${currency}%5C%22,%5B%5B${checkInCheckOut.start}%5D,%5B${checkInCheckOut.end}%5D,1,null,0%5D,null,null,null,null,null,null,null,null,%5B${adults},null,2%5D%5D,%5B1,null,1%5D,%5C%22${entityId}%5C%22,%5Bnull,null,null,null,null,null,null,null,null,null,null,null,null,%5B%5C%22%5C%22%5D%5D,1,1%5D%22,null,%22generic%22%5D%5D%5D`,
        method: 'POST',
        // The rest of headers are filled by Crawlee
        headers: {
            referer: `https://www.google.com/travel/hotels/entity/${entityId}`,
        },
    });
}

// Create proxy configuration
const proxyConfig = await Actor.createProxyConfiguration(proxyConfiguration);

const crawler = new HttpCrawler({
    proxyConfiguration: proxyConfig,
    maxRequestRetries,
    requestHandlerTimeoutSecs: requestTimeoutSecs,
    async requestHandler({ request, log, body }) { // Removed unused enqueueLinks and $
        let output; // Declare output here
        try {
            // Handle the case where body.toString() returns an object with character indices
            const bodyStr = body.toString();
            log.info('BodyStr type:', typeof bodyStr);
            log.info('BodyStr is object:', typeof bodyStr === 'object');
            
            if (typeof bodyStr === 'object' && bodyStr !== null) {
                // Convert the character-indexed object back to a string
                output = Object.values(bodyStr).join('');
                log.info('Converted from object to string');
            } else {
                output = bodyStr;
                log.info('Used bodyStr directly');
            }
            
            log.info('Final output type:', typeof output);
            log.info('Response length:', output.length);
            log.info('Response starts with:', output.substring(0, 50));
            
            const lines = output.split('\n');
            log.info('Number of lines:', lines.length);
            const targetLine = lines.find(line => line.trim().startsWith('['));
            if (targetLine) {
                const data = JSON.parse(targetLine);
                const data2 = JSON.parse(data[0][2]);
                const prices = (data2[2][21] || []).map(row => ({
                    provider: row[0][0],
                    otaUrl: row[0][2],
                    isOfficial: row[0][5],
                    price: parseInt(row[12][4][2]),
                    price2: parseInt(row[12][5][2]),
                }));
                log.info('data2[2][21][0]', data2[2][21][0]);
                log.info('prices', prices);
                await Dataset.pushData({
                    prices,
                    adults: adults,
                    currency: data2[1][3],
                    checkInDate: data2[1][4][0].join('-'),
                    checkOutDate: data2[1][4][1].join('-'),
                    entityId: entityId,
                    days: days,
                    scrapedAt: new Date().toISOString(),
                    requestUrl: request.url
                });
            } else {
                log.error('No target line found in the response for URL:', request.url);
                // Save the full body for inspection if no targetLine is found
                await Actor.setValue(`response-body-${Date.now()}-no-target-line`, output, { contentType: 'text/plain' });
            }
        } catch (error) {
            log.error(`Error parsing JSON for URL: ${request.url}`, error.message);
            log.error('Error stack:', error.stack);
            // Save the full body for inspection if JSON parsing fails
            if (output) { // Only save if output was successfully read
                await Actor.setValue(`response-body-${Date.now()}-parsing-error`, output, { contentType: 'text/plain' });
            }
        }
    },
});

await crawler.run(requests);

// Log completion
console.log('Google Travel scraper completed successfully');

// Gracefully exit the Actor process
await Actor.exit();