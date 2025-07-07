# Google Travel Hotel Scraper

This Apify Actor scrapes hotel pricing and availability data from Google Travel using their internal API.

## Features

- Scrapes hotel pricing and availability from Google Travel
- Supports multiple currencies (100+ currencies available)
- Configurable check-in/check-out dates
- Adjustable number of guests (adults and children)
- Multiple room support
- Language localization
- Built-in proxy support via Apify
- Comprehensive error handling and logging

## Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `entityId` | String | Yes | The Google Travel entity ID of the hotel/facility to scrape |
| `currency` | String | Yes | Currency code for pricing (e.g., USD, EUR, JPY) |
| `checkInDate` | String | Yes | Check-in date in YYYY-MM-DD format |
| `days` | Integer | Yes | Number of days to stay (1-30) |
| `adults` | Integer | Yes | Number of adult guests (1-10) |
| `maxRequestRetries` | Integer | No | Maximum retries for failed requests (default: 3) |
| `requestTimeoutSecs` | Integer | No | Request timeout in seconds (default: 60) |
| `proxyGroups` | Array | No | Proxy groups to use (default: ["RESIDENTIAL"]) |
| `proxyCountryCode` | String | No | Country code for proxy location (e.g., "US", "GB") |

## Output

The Actor outputs data to the default dataset with the following structure:

```json
{
    "entityId": "CgoI4L-j9bjz1IVpEAE",
    "currency": "USD",
    "checkInDate": "2025-05-19",
    "checkOutDate": "2025-05-20",
    "days": 1,
    "adults": 1,
    "scrapedAt": "2025-01-27T10:30:00.000Z",
    "requestUrl": "https://www.google.com/_/TravelFrontendUi/data/batchexecute?...",
    "responseData": { /* Parsed Google API response */ },
    "rawResponseLength": 12345
}
```

## How to Use

1. **Deploy the Actor** to your Apify account
2. **Configure the input parameters**:
   - Set the `entityId` (found in Google Travel hotel URLs)
   - Choose your preferred `currency`
   - Set the `checkInDate`
   - Adjust other parameters as needed
3. **Run the Actor**
4. **Download the results** from the dataset

## Finding Hotel Entity IDs

To find a hotel's entity ID:
1. Go to Google Travel (https://www.google.com/travel)
2. Search for a hotel
3. Click on the hotel
4. Look at the URL: `https://www.google.com/travel/hotels/entity/{ENTITY_ID}`
5. Copy the entity ID from the URL

## Example Input

```json
{
    "entityId": "CgoI4L-j9bjz1IVpEAE",
    "currency": "USD",
    "checkInDate": "2025-05-19",
    "days": 2,
    "adults": 2
}
```

## Supported Currencies

The Actor supports 100+ currencies including:
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- JPY (Japanese Yen)
- CAD (Canadian Dollar)
- AUD (Australian Dollar)
- And many more...



## Error Handling

The Actor includes comprehensive error handling:
- Invalid input validation
- Network request retries
- Response parsing error recovery
- Failed request logging
- All errors are saved to the dataset for debugging

## Rate Limiting and Proxies

- The Actor uses Apify's built-in proxy support
- Configure proxy settings in your Apify account
- Built-in request retry mechanism
- Configurable timeouts

### Proxy Configuration

The Actor uses Apify's standard proxy configuration:

```json
{
    "proxyGroups": ["RESIDENTIAL"],
    "proxyCountryCode": "US"
}
```

**Available Proxy Groups:**
- `RESIDENTIAL` - Residential IP addresses (most reliable)
- `DATACENTER` - Datacenter IP addresses (faster, cheaper)
- `MOBILE` - Mobile IP addresses
- `SERPSERP` - Specialized for search engines

**Country Codes:**
- Use ISO 3166-1 alpha-2 country codes (e.g., "US", "GB", "JP")
- Leave empty to use any available location

## Development

To run this Actor locally:

```bash
npm install
npm start
```

## Legal Notice

This Actor is for educational and research purposes. Please ensure you comply with Google's Terms of Service and respect rate limits when using this tool.

## Support

For support, please refer to the Apify documentation or contact Apify support.