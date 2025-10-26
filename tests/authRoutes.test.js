const request = require('supertest');

const setTestEnv = () => {
  process.env.WORKOS_API_KEY = 'test-api-key';
  process.env.WORKOS_CLIENT_ID = 'client_123';
  process.env.APP_BASE_URL = 'http://localhost:3000';
  process.env.SESSION_SECRET = 'test-secret';
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'anon-key';
};

describe('Auth routes', () => {
  let app;
  let mockGetAuthorizationUrl;
  let mockAuthenticateWithCode;
  let mockFetchBooks;
  let mockGetSupabaseClient;
  let mockGetSupabaseUser;

  beforeEach(async () => {
    jest.resetModules();
    setTestEnv();

    mockGetAuthorizationUrl = jest.fn();
    mockAuthenticateWithCode = jest.fn();
    mockFetchBooks = jest.fn().mockResolvedValue([
      {
        title: 'Example Book',
        price: '£10.00',
        stock: 'In stock',
        rating: 'Five',
        link: 'https://books.toscrape.com/example-book',
      },
    ]);
    mockGetSupabaseClient = jest.fn().mockResolvedValue({
      auth: {
        setSession: jest.fn().mockResolvedValue({ data: null, error: null }),
      },
    });
    mockGetSupabaseUser = jest.fn().mockResolvedValue({
      id: 'supabase-user-123',
      email: 'user@example.com',
    });

    jest.doMock('@workos-inc/node', () => ({
      WorkOS: jest.fn().mockImplementation(() => ({
        userManagement: {
          getAuthorizationUrl: mockGetAuthorizationUrl,
          authenticateWithCode: mockAuthenticateWithCode,
        },
      })),
    }));

    jest.doMock('../src/services/scraper', () => ({
      fetchBooks: mockFetchBooks,
    }));

    jest.doMock('../src/services/supabaseClient', () => ({
      getSupabaseClient: mockGetSupabaseClient,
      getSupabaseUser: mockGetSupabaseUser,
    }));

    app = require('../src/app');
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.dontMock('@workos-inc/node');
    jest.dontMock('../src/services/scraper');
    jest.dontMock('../src/services/supabaseClient');
    delete process.env.WORKOS_API_KEY;
    delete process.env.WORKOS_CLIENT_ID;
    delete process.env.APP_BASE_URL;
    delete process.env.SESSION_SECRET;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
  });

  it('redirects to WorkOS for login', async () => {
    mockGetAuthorizationUrl.mockResolvedValue('https://auth.workos.com/login');

    await request(app)
      .get('/auth/login')
      .expect(302)
      .expect('Location', 'https://auth.workos.com/login');

    expect(mockGetAuthorizationUrl).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'client_123' })
    );
  });

  it('redirects to WorkOS for signup with screen hint', async () => {
    mockGetAuthorizationUrl.mockResolvedValue('https://auth.workos.com/signup');

    await request(app)
      .get('/auth/signup')
      .expect(302)
      .expect('Location', 'https://auth.workos.com/signup');

    expect(mockGetAuthorizationUrl).toHaveBeenCalledWith(
      expect.objectContaining({ screenHint: 'signup' })
    );
  });

  it('returns 400 when callback is missing code', async () => {
    await request(app)
      .get('/auth/callback')
      .expect(400)
      .expect((res) => {
        expect(res.text).toContain('Missing authorization code');
      });
  });

  it('stores session after successful callback and shows scraped books', async () => {
    mockGetAuthorizationUrl.mockResolvedValue('https://auth.workos.com/login');
    mockAuthenticateWithCode.mockResolvedValue({
      user: {
        id: 'user_123',
        email: 'user@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
      },
      accessToken: 'access-token',
    });

    const agent = request.agent(app);

    await agent.get('/auth/callback?code=abc123').expect(302).expect('Location', '/');

    const homeResponse = await agent.get('/');
    expect(homeResponse.status).toBe(200);
    expect(homeResponse.text).toContain('Example Book');
    expect(homeResponse.text).toContain('Ada Lovelace');
    expect(mockFetchBooks).toHaveBeenCalled();
    expect(mockGetSupabaseClient).toHaveBeenCalledWith({ accessToken: 'access-token' });
    expect(mockGetSupabaseUser).toHaveBeenCalledWith('access-token');
    expect(homeResponse.text).toContain('Supabase user ID');
  });

  it('destroys session on logout', async () => {
    mockAuthenticateWithCode.mockResolvedValue({
      user: {
        id: 'user_123',
        email: 'user@example.com',
      },
    });

    const agent = request.agent(app);

    await agent.get('/auth/callback?code=abc123');
    await agent.post('/auth/logout').expect(302).expect('Location', '/');

    const homeResponse = await agent.get('/');
    expect(homeResponse.text).toContain('Welcome!');
  });
});
