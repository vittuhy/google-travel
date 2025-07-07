// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/)
import { Actor } from 'apify';
// Crawlee - web scraping and browser automation library (Read more at https://crawlee.dev)
import { HttpCrawler, Dataset } from 'crawlee';

await Actor.init();

// Get input from the user
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

// Validate date format
const checkInDateObj = new Date(checkInDate);
if (isNaN(checkInDateObj.getTime())) {
    throw new Error('Invalid checkInDate format. Use YYYY-MM-DD');
}

// Calculate check-out date
const checkOutDateObj = new Date(checkInDateObj);
checkOutDateObj.setDate(checkOutDateObj.getDate() + days);

// Format dates for Google API (YYYY,M,D format)
const formatDateForGoogle = (date) => {
    return `${date.getFullYear()},${date.getMonth() + 1},${date.getDate()}`;
};

// Create multiple check-in/check-out combinations for better data coverage
const checkInCheckOuts = [
    { start: formatDateForGoogle(checkInDateObj), end: formatDateForGoogle(checkOutDateObj) }
];

// Add additional date ranges if days > 1
if (days > 1) {
    // Add a few days before and after for better coverage
    for (let i = 1; i <= Math.min(3, days); i++) {
        const earlyCheckIn = new Date(checkInDateObj);
        earlyCheckIn.setDate(earlyCheckIn.getDate() - i);
        const earlyCheckOut = new Date(earlyCheckIn);
        earlyCheckOut.setDate(earlyCheckOut.getDate() + days);
        
        checkInCheckOuts.push({
            start: formatDateForGoogle(earlyCheckIn),
            end: formatDateForGoogle(earlyCheckOut)
        });
    }
}

// Create the request URL with proper parameters
const createRequestUrl = (checkInFormatted, checkOutFormatted) => {
    return `https://www.google.com/_/TravelFrontendUi/data/batchexecute?source-path=%2Ftravel%2Fhotels%2Fentity%2F${entityId}%2Fprices&hl=en&rt=c&f.req=%5B%5B%5B%22M0CRd%22,%22%5Bnull,%5Bnull,null,null,%5C%22${currency}%5C%22,%5B%5B${checkInFormatted}%5D,%5B${checkOutFormatted}%5D,1,null,0%5D,null,null,null,null,null,null,null,null,%5B${adults},null,2%5D%5D,%5B1,null,1%5D,%5C%22${entityId}%5C%22,%5Bnull,null,null,null,null,null,null,null,null,null,null,null,null,%5B%5C%22%5C%22%5D%5D,1,1%5D%22,null,%22generic%22%5D%5D%5D`;
};

// Create multiple requests for different check-in/check-out dates
const requests = [];

for (const checkInCheckOut of checkInCheckOuts) {
    requests.push({
        url: createRequestUrl(checkInCheckOut.start, checkInCheckOut.end),
        method: 'POST',
        // The rest of headers are filled by Crawlee
        headers: {
            referer: `https://www.google.com/travel/hotels/entity/${entityId}`,
        },
        userData: {
            checkInDate: checkInCheckOut.start,
            checkOutDate: checkInCheckOut.end
        }
    });
}

// Create proxy configuration
const proxyConfig = await Actor.createProxyConfiguration(proxyConfiguration);

// Create crawler
const crawler = new HttpCrawler({
    proxyConfiguration: proxyConfig,
    maxRequestRetries,
    requestHandlerTimeoutSecs: requestTimeoutSecs,
    maxConcurrency: 1,
    async requestHandler({ request, log, body }) {
        const requestCheckInDate = request.userData.checkInDate;
        const requestCheckOutDate = request.userData.checkOutDate;
        
        log.info(`Processing request for entity: ${entityId} (${requestCheckInDate} to ${requestCheckOutDate})`);
        
        try {
            const responseText = body.toString();
            
            // Log response length for debugging
            log.info(`Response received, length: ${responseText.length} characters`);
            
            // Try to parse the response
            let parsedData = null;
            try {
                // Google's batch execute API returns data in a specific format
                // The response might be wrapped in )]}' or similar
                let cleanResponse = responseText;
                if (cleanResponse.startsWith(")]}'")) {
                    cleanResponse = cleanResponse.substring(4);
                }
                
                // Try to parse as JSON
                const jsonData = JSON.parse(cleanResponse);
                
                // Extract the actual data from Google's response structure
                if (jsonData && Array.isArray(jsonData) && jsonData.length > 0) {
                    parsedData = jsonData[0];
                } else {
                    parsedData = jsonData;
                }
            } catch (parseError) {
                log.warning('Failed to parse response as JSON, storing raw response');
                parsedData = {
                    rawResponse: responseText,
                    parseError: parseError.message
                };
            }
            
            // Prepare the output data
            const outputData = {
                entityId,
                currency,
                checkInDate: requestCheckInDate,
                checkOutDate: requestCheckOutDate,
                days,
                adults,
                scrapedAt: new Date().toISOString(),
                requestUrl: request.url,
                responseData: parsedData,
                rawResponseLength: responseText.length
            };
            
            // Save to dataset
            await Dataset.pushData(outputData);
            
            log.info('Data successfully saved to dataset');
            
        } catch (error) {
            log.error('Error processing response', { error: error.message });
            
            // Save error information
            await Dataset.pushData({
                entityId,
                currency,
                checkInDate: requestCheckInDate,
                checkOutDate: requestCheckOutDate,
                days,
                adults,
                scrapedAt: new Date().toISOString(),
                requestUrl: request.url,
                error: error.message,
                rawResponse: body.toString()
            });
        }
    },
    
    async failedRequestHandler({ request, log, error }) {
        const requestCheckInDate = request.userData.checkInDate;
        const requestCheckOutDate = request.userData.checkOutDate;
        
        log.error(`Request failed for ${request.url}`, { error: error.message });
        
        // Save failed request information
        await Dataset.pushData({
            entityId,
            currency,
            checkInDate: requestCheckInDate,
            checkOutDate: requestCheckOutDate,
            days,
            adults,
            scrapedAt: new Date().toISOString(),
            requestUrl: request.url,
            error: error.message,
            status: 'FAILED'
        });
    }
});

// Run the crawler
await crawler.run(requests);

// Log completion
console.log('Google Travel scraper completed successfully');

// Gracefully exit the Actor process
await Actor.exit();