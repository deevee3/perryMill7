# News Aggregator Setup Guide

## Architecture Overview

1. **Python RSS Parser** - Fetches and aggregates RSS feeds
2. **Puppeteer Scraper API** - Scrapes full article content
3. **Frontend Dashboard** - Bloomberg-style news interface
4. **WorkOS AuthKit** - Authentication (your existing setup)

## Installation

### 1. Python RSS Parser Setup

```bash
pip install feedparser requests
```

Create `rss_aggregator.py` and run:
```bash
python rss_aggregator.py
```

This generates `articles.json` with all RSS feed data.

### 2. Puppeteer Scraper Setup

```bash
npm install express cors puppeteer
```

Create `scraper.js` and run:
```bash
node scraper.js
```

API will run on `http://localhost:3001`

### 3. Integration with Your App

#### Option A: Add to Your Existing Express/Node App

```javascript
// In your main server file
const scraperRouter = require('./scraper');
app.use('/scraper', scraperRouter);

// Serve articles.json
app.get('/api/articles', (req, res) => {
  res.sendFile(__dirname + '/articles.json');
});
```

#### Option B: Separate Microservices

Keep the scraper as a separate service and call it from your main app.

## Connecting with WorkOS AuthKit

### Protected Route Example

```javascript
const { WorkOS } = require('@workos-inc/node');

const workos = new WorkOS(process.env.WORKOS_API_KEY);

// Middleware to protect routes
async function requireAuth(req, res, next) {
  const session = await workos.userManagement.loadSealedSession({
    sessionData: req.cookies.wos_session,
    cookiePassword: process.env.WORKOS_COOKIE_PASSWORD
  });
  
  if (!session) {
    return res.redirect('/login');
  }
  
  req.user = session.user;
  next();
}

// Protected news dashboard route
app.get('/dashboard', requireAuth, (req, res) => {
  res.sendFile(__dirname + '/news-dashboard.html');
});

// Protected scraper API
app.post('/api/scrape', requireAuth, async (req, res) => {
  // Your scraping logic here
});
```

## Automated RSS Updates

### Cron Job for Regular Updates

**Using node-cron:**
```javascript
const cron = require('node-cron');
const { exec } = require('child_process');

// Run Python RSS parser every 15 minutes
cron.schedule('*/15 * * * *', () => {
  exec('python rss_aggregator.py', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error updating feeds: ${error}`);
      return;
    }
    console.log('RSS feeds updated successfully');
  });
});
```

**Using system cron (Linux/Mac):**
```bash
# Edit crontab
crontab -e

# Add this line (runs every 15 minutes)
*/15 * * * * cd /path/to/project && python rss_aggregator.py
```

## Frontend Integration

### Loading RSS Articles

```javascript
// In your news-dashboard.html
async function loadArticles() {
  try {
    const response = await fetch('/api/articles');
    const articles = await response.json();
    
    // Render articles
    if (articles.length > 0) {
      document.getElementById('featured').innerHTML = renderFeatured(articles[0]);
      document.getElementById('articles').innerHTML = 
        articles.slice(1).map(renderArticle).join('');
    }
  } catch (error) {
    console.error('Error loading articles:', error);
  }
}

loadArticles();
```

### Real-time Updates

```javascript
// Poll for new articles every 5 minutes
setInterval(loadArticles, 5 * 60 * 1000);

// Or use WebSockets for instant updates
const socket = io();
socket.on('articles-updated', () => {
  loadArticles();
});
```

## Customizing RSS Feeds

Edit the `feed_urls` array in `rss_aggregator.py`:

```python
feed_urls = [
    'https://feeds.bloomberg.com/markets/news.rss',
    'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
    'https://techcrunch.com/feed/',
    # Add your feeds here
]
```

## Environment Variables

Create a `.env` file:

```env
# WorkOS
WORKOS_API_KEY=sk_...
WORKOS_CLIENT_ID=client_...
WORKOS_COOKIE_PASSWORD=your-secure-password

# Scraper
PORT=3001
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Optional
NODE_ENV=production
```

## Deployment

### Docker Compose Example

```yaml
version: '3.8'
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - WORKOS_API_KEY=${WORKOS_API_KEY}
      - SCRAPER_URL=http://scraper:3001
    depends_on:
      - scraper

  scraper:
    build: ./scraper
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production

  rss-updater:
    build: ./rss-parser
    command: sh -c "while true; do python rss_aggregator.py; sleep 900; done"
    volumes:
      - ./data:/app/data
```

## Security Considerations

1. **Rate Limiting**: Add rate limiting to prevent abuse
2. **CORS**: Configure CORS properly for production
3. **Sanitization**: Sanitize scraped content to prevent XSS
4. **Error Handling**: Implement proper error handling and logging
5. **Caching**: Cache scraped articles to reduce load

## Performance Tips

1. Use Redis to cache scraped articles
2. Implement lazy loading for images
3. Add pagination for large article lists
4. Use a CDN for static assets
5. Consider using a queue system (Bull, RabbitMQ) for scraping jobs

## Troubleshooting

### Puppeteer Issues
```bash
# Install dependencies
apt-get install -y chromium chromium-driver

# Or use puppeteer with bundled Chromium
npm install puppeteer
```

### CORS