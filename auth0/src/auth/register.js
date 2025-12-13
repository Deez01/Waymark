// Name: Bryan Estrada-Cordoba 

// Auth0 automatically creates the user if they don’t already exist.

import { auth0 } from '../auth/auth0';

const login = async () => {
  try {
    const credentials = await auth0.webAuth.authorize({
      scope: 'openid profile email',
    });
    console.log(credentials);
  } catch (e) {
    console.log(e);
  }
};