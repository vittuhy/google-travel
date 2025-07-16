# Google Travel Hotel Price Scraper

A powerful Apify actor that scrapes hotel pricing data from Google Travel. This actor extracts real-time pricing information for hotels across multiple dates and provides comprehensive price comparisons from various booking providers.

## 🏨 What it does

This actor scrapes Google Travel's hotel pricing data by:

- **Multi-date scraping**: Generates price data for consecutive days starting from your check-in date
- **Provider comparison**: Extracts prices from multiple booking providers (OTAs)
- **Real-time data**: Gets current pricing directly from Google Travel's API
- **Comprehensive output**: Provides detailed pricing information including provider names, URLs, and official vs third-party rates

## 📊 Output Format

The actor outputs structured data for each date range:

```json
{
  "prices": [
    {
      "provider": "Booking.com",
      "otaUrl": "https://booking.com/hotel/...",
      "isOfficial": false,
      "price": 150,
      "price2": 180
    }
  ],
  "adults": 2,
  "currency": "USD",
  "checkInDate": "2025-07-20",
  "checkOutDate": "2025-07-21"
}
```

## 🔧 Input Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `checkInDate` | string | ✅ | Check-in date in YYYY-MM-DD format |
| `days` | integer | ✅ | Number of consecutive days to scrape (minimum: 1) |
| `adults` | integer | ✅ | Number of adult guests (minimum: 1) |
| `currency` | string | ✅ | Currency code (e.g., USD, EUR, JPY) |
| `entity` | string | ✅ | Google Travel entity ID (hotel identifier) |
| `proxyConfig` | object | ❌ | Proxy configuration settings |

### Proxy Configuration

```json
{
  "useApifyProxy": true,
  "apifyProxyGroups": ["RESIDENTIAL"],
  "apifyProxyCountry": "US"
}
```

## 🆔 How to Find Entity IDs

Entity IDs are unique identifiers for hotels in Google Travel. Here's how to find them:

### Method 1: From Google Travel URL
1. Go to [Google Travel](https://www.google.com/travel/hotels)
2. Search for your desired hotel
3. Click on the hotel to view its page
4. Look at the URL - the entity ID is in the path:

```
https://www.google.com/travel/hotels/entity/ChgIw-i9jd_587w3GgwvZy8xcHR4cWI4OTIQAQ
                                                      ↑
                                              Entity ID here
```

**Example**: From the URL `https://www.google.com/travel/hotels/entity/ChgIw-i9jd_587w3GgwvZy8xcHR4cWI4OTIQAQ`, the entity ID is `ChgIw-i9jd_587w3GgwvZy8xcHR4cWI4OTIQAQ`

### Method 2: Using Browser Developer Tools
1. Open Google Travel in your browser
2. Navigate to a hotel page
3. Open Developer Tools (F12)
4. Go to Network tab
5. Look for API requests containing the entity ID
6. The entity ID will appear in request URLs or response data

### Method 3: From Google Maps
1. Search for a hotel on Google Maps
2. Click on the hotel listing
3. Look for the "View on Google Travel" link
4. Follow the link to get the entity ID from the URL

## 🚀 Usage Examples

### Basic Usage
```json
{
  "checkInDate": "2025-07-20",
  "days": 3,
  "adults": 2,
  "currency": "USD",
  "entity": "ChgIw-i9jd_587w3GgwvZy8xcHR4cWI4OTIQAQ"
}
```

### With Proxy Configuration
```json
{
  "checkInDate": "2025-07-20",
  "days": 5,
  "adults": 1,
  "currency": "EUR",
  "entity": "ChgIw-i9jd_587w3GgwvZy8xcHR4cWI4OTIQAQ",
  "proxyConfig": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"],
    "apifyProxyCountry": "DE"
  }
}
```

## 📈 Use Cases

- **Price monitoring**: Track hotel prices over time
- **Competitive analysis**: Compare prices across different booking platforms
- **Travel planning**: Find the best rates for your dates
- **Market research**: Analyze pricing trends in the hospitality industry
- **Revenue optimization**: Help hotels understand their competitive positioning

## 🔒 Rate Limiting & Best Practices

- **Respectful scraping**: The actor uses proper delays and headers
- **Proxy rotation**: Use Apify Proxy to avoid IP blocks
- **Session management**: Maintains cookies for better success rates
- **Error handling**: Gracefully handles API errors and timeouts

## 🛠️ Technical Details

- **Built with**: Apify SDK v3.2.6, Crawlee v3.11.5
- **Target**: Google Travel's internal API endpoints
- **Data format**: JSON with structured pricing information
- **Rate limiting**: Built-in delays and proxy support
- **Error recovery**: Automatic retry logic for failed requests

## 📋 Supported Currencies

The actor supports all major ISO 4217 currency codes including:
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- JPY (Japanese Yen)
- CAD (Canadian Dollar)
- AUD (Australian Dollar)
- And 70+ more currencies

## ⚠️ Important Notes

- **Entity ID validity**: Ensure your entity ID is current and valid
- **Date ranges**: Avoid scraping too many consecutive days to prevent rate limiting
- **Proxy usage**: Recommended for production use to avoid IP blocks
- **Data accuracy**: Prices are real-time but may vary based on availability

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

This project is licensed under the ISC License.

---

**Note**: This actor is designed for legitimate business use cases. Please respect Google's terms of service and use responsibly.