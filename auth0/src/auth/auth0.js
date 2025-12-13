// Name:Bryan Estrada-Cordoba 

// Auth0 Config file

import Auth0 from 'react-native-auth0';
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID } from '@env.local';

export const auth0 = new Auth0 ({
	domain: AUTH0_DOMAIN, 
	clientId: AUTH0_CLIENT_ID,
});
