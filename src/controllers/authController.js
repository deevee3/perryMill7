const createAuthRedirect = (options = {}) => async (req, res, next) => {
  try {
    const redirectUri = new URL('/auth/callback', process.env.APP_BASE_URL).toString();
    const authContext = req.app.locals.authContext || {};
    const params = {
      clientId: process.env.WORKOS_CLIENT_ID,
      provider: 'authkit',
      redirectUri,
      ...options,
    };

    if (authContext.organizationId) {
      params.organizationId = authContext.organizationId;
    }

    if (authContext.connectionId) {
      params.connectionId = authContext.connectionId;
    }

    const authUrl = await req.app.locals.workos.userManagement.getAuthorizationUrl(params);

    return res.redirect(authUrl);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Authorization redirect failed:', error);
    return next(error);
  }
};

const login = createAuthRedirect();
const signup = createAuthRedirect({ screenHint: 'signup' });

const callback = async (req, res, next) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).render('error', { message: 'Missing authorization code.' });
  }

  try {
    const { user } = await req.app.locals.workos.userManagement.authenticateWithCode({
      clientId: process.env.WORKOS_CLIENT_ID,
      code,
    });

    req.session.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    return res.redirect('/');
  } catch (error) {
    return next(error);
  }
};

const logout = (req, res, next) => {
  req.session.destroy((destroyErr) => {
    if (destroyErr) {
      return next(destroyErr);
    }

    res.clearCookie(req.app.locals.sessionCookieName);
    return res.redirect('/');
  });
};

module.exports = {
  login,
  signup,
  callback,
  logout,
};
