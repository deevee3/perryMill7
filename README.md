# WorkOS AuthKit Demo

A minimal Express application demonstrating how to let users sign up, sign in, and sign out using [WorkOS AuthKit](https://workos.com/authkit). Authenticated users see a "Hello World" message and basic profile details.

## Prerequisites

- Node.js 18+
- A WorkOS account with AuthKit configured

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the values:

   ```env
   WORKOS_API_KEY=sk_test_...
   WORKOS_CLIENT_ID=client_...
   APP_BASE_URL=http://localhost:3000
   SESSION_SECRET=replace_me
   PORT=3000
   ```

   > **Note:** Never commit your real API keys. The provided `.env.example` is safe to share.

3. In the WorkOS Dashboard, configure the Redirect URI to `http://localhost:3000/auth/callback` (or match your `APP_BASE_URL`).

## Running locally

Start the dev server with automatic restarts:

```bash
npm run dev
```

Visit `http://localhost:3000` and use the **Continue with AuthKit** or **Create an account** buttons. After OAuth completes, the app will scrape featured books from [books.toscrape.com](https://books.toscrape.com) and render them for authenticated users. Use the **Log out** button to end the session.

To run the server without nodemon:

```bash
npm start
```

## Testing

Automated tests use Jest and Supertest:

```bash
npm test
```

## Project structure

```
src/
  app.js          Express app configuration
  server.js       Entry point that starts the HTTP server
  controllers/
    authController.js   AuthKit login/signup/callback handlers
  routes/
    auth.js             Auth routes
  services/
    scraper.js    Puppeteer-powered book scraper with caching
views/
  home.ejs        Home page showing login/signup or Hello World
  error.ejs       Error fallback
.env.example      Template environment variables
```

## Deployment notes

- Keep `SESSION_SECRET` secure and unique per environment.
- Set `APP_BASE_URL` to your deployment hostname.
- Ensure HTTPS in production so secure cookies work.
- If you rotate WorkOS credentials, update the environment variables accordingly.
- `SCRAPER_MAX_PAGES`, `SCRAPER_RESULT_LIMIT`, and `SCRAPER_CACHE_TTL_MS` (optional) can tune scraping volume and cache window.
