// Apify SDK - toolkit for building Apify Actors (Read more at https://docs.apify.com/sdk/js/)
import { Actor } from 'apify';
// Crawlee - web scraping and browser automation library (Read more at https://crawlee.dev)
import { HttpCrawler, Dataset } from 'crawlee';

await Actor.init();

const currency = 'JPY';
const checkInCheckOuts = [
    { start: '2025,5,19', end: '2025,5,20'},
    { start: '2025,5,20', end: '2025,5,21'},
]
const hotelIds = ['CgoI4L-j9bjz1IVpEAE']

const requests = [];

for (const hotelId of hotelIds) {
    for (const checkInCheckOut of checkInCheckOuts) {
        requests.push({
            url: `https://www.google.com/_/TravelFrontendUi/data/batchexecute?source-path=%2Ftravel%2Fhotels%2Fentity%2F${hotelId}&hl=en&rt=c&f.req=%5B%5B%5B%22M0CRd%22,%22%5Bnull,%5Bnull,null,null,%5C%22${currency}%5C%22,%5B%5B${checkInCheckOut.start}%5D,%5B${checkInCheckOut.end}%5D,1,1%5D%5D,%5B1,%5C%22%5C%22,2%5D,%5C%22${hotelId}%5C%22,%5Bnull,null,null,null,null,null,null,null,null,null,null,null,null,%5B%5C%22%5C%22%5D%5D,1,2%5D%22,null,%22generic%22%5D%5D%5D`,
            method: 'POST',
            // The rest of headers are filled by Crawlee
            headers: {
                referer: `https://www.google.com/travel/hotels/entity/${hotelId}`,
            },
        })
    }
}

const proxyConfiguration = await Actor.createProxyConfiguration();

const crawler = new HttpCrawler({
    proxyConfiguration,
    async requestHandler({ enqueueLinks, request, $, log, body }) {
        const output = body.toString()
        log.info(`Loaded with body length:\n ${output}`)
        await Actor.setValue('BODY', output)
    },
});

await crawler.run(requests);

// Gracefully exit the Actor process. It's recommended to quit all Actors with an exit()
await Actor.exit();