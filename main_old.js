// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/)
import { Actor } from 'apify';
// Crawlee - web scraping and browser automation library (Read more at https://crawlee.dev)
import { HttpCrawler, Dataset } from 'crawlee';

await Actor.init();

/*
const defaultInput = {
    checkInDate: '2025-05-25',
    days: 1,
    adults: 2,
    currency: 'JPY',
    entity: 'CgsIx6il8vyxnYHRARAB',
    proxyConfig: {
        useApifyProxy: true,
        apifyProxyGroups: [ 'RESIDENTIAL' ],
        apifyProxyCountry: 'JP',
    }
};
*/

const input = await Actor.getInput();
// const input = defaultInput; // for local development
if (!input || !input.checkInDate || !input.days || !input.adults || !input.currency || !input.entity || !input.proxyConfig) {
    throw new Error('Missing required input fields.');
}

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
const checkInCheckOuts = getCheckInCheckOuts(input.checkInDate, input.days);
console.log('checkInCheckOuts', checkInCheckOuts)

const requests = [];

for (const checkInCheckOut of checkInCheckOuts) {
    requests.push({
        url: `https://www.google.com/_/TravelFrontendUi/data/batchexecute?source-path=%2Ftravel%2Fhotels%2Fentity%2F${input.entity}%2Fprices&hl=en&rt=c&f.req=%5B%5B%5B%22M0CRd%22,%22%5Bnull,%5Bnull,null,null,%5C%22${input.currency}%5C%22,%5B%5B${checkInCheckOut.start}%5D,%5B${checkInCheckOut.end}%5D,1,null,0%5D,null,null,null,null,null,null,null,null,%5B${input.adults},null,2%5D%5D,%5B1,null,1%5D,%5C%22${input.entity}%5C%22,%5Bnull,null,null,null,null,null,null,null,null,null,null,null,null,%5B%5C%22%5C%22%5D%5D,1,1%5D%22,null,%22generic%22%5D%5D%5D`,
        method: 'POST',
        // The rest of headers are filled by Crawlee
        headers: {
            referer: `https://www.google.com/travel/hotels/entity/${input.entity}`,
        },
    })
}

const proxyConfiguration = await Actor.createProxyConfiguration(input.proxyConfig);

const crawler = new HttpCrawler({
    proxyConfiguration,
    async requestHandler({ enqueueLinks, request, $, log, body }) {
        try {
            const output = body.toString();
            const lines = output.split('\n');
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
                log.info('data2[2][21][0]', data2[2][21][0])
                log.info('prices', prices)
                await Dataset.pushData({ prices, adults: input.adults, currency: data2[1][3], checkInDate: data2[1][4][0].join('-'), checkOutDate: data2[1][4][1].join('-') })
            } else {
                log.error('No target line found in the response');
            }
            // await Actor.setValue('BODY', output)
        } catch (error) {
            log.error('Error parsing JSON:', error);
        }
    },
});

await crawler.run(requests);

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit()
await Actor.exit();