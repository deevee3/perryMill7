const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const { WorkOS } = require('@workos-inc/node');
const { fetchBooks } = require('./services/scraper');
const { getSupabaseClient, getSupabaseUser } = require('./services/supabaseClient');

dotenv.config();

const requiredEnv = [
  'WORKOS_API_KEY',
  'WORKOS_CLIENT_ID',
  'APP_BASE_URL',
  'SESSION_SECRET',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  throw new Error(`Missing required environment variables: ${missingEnv.join(', ')}`);
}

const app = express();
const workos = new WorkOS(process.env.WORKOS_API_KEY);
const sessionCookieName = 'workos-authkit-demo';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

app.use(express.static(path.join(__dirname, '..', 'public')));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    name: sessionCookieName,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  })
);

app.locals.workos = workos;
app.locals.sessionCookieName = sessionCookieName;
app.locals.baseUrl = process.env.APP_BASE_URL;
app.locals.authContext = {
  organizationId: process.env.WORKOS_ORGANIZATION_ID,
  connectionId: process.env.WORKOS_CONNECTION_ID,
};

const authRouter = require('./routes/auth');
app.use('/auth', authRouter);

app.get('/', async (req, res, next) => {
  const user = req.session.user || null;

  if (!user) {
    return res.render('home', { user: null, books: [], supabaseUser: null });
  }

  try {
    const accessToken = req.session.authTokens?.accessToken;
    let supabaseUser = null;
    if (accessToken) {
      await getSupabaseClient({ accessToken });
      supabaseUser = await getSupabaseUser(accessToken);
    }

    const books = await fetchBooks();
    const limit = parseInt(process.env.SCRAPER_RESULT_LIMIT || '12', 10);
    const limitedBooks = Number.isNaN(limit) ? books : books.slice(0, limit);
    return res.render('home', { user, books: limitedBooks, supabaseUser });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to fetch books:', error);
    return next({ status: 502, message: 'Unable to load featured books. Please try again.' });
  }
});

app.use((err, req, res, next) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  const status = err.status || 500;
  const message = status === 500 ? 'Internal Server Error' : err.message;
  res.status(status).render('error', { message });
});

module.exports = app;
