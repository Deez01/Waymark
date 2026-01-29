// Name:Bryan Estrada-Cordoba

// Auth0 Config file

import Constants from 'expo-constants';

const domain = Constants.expoConfig?.extra?.auth0Domain;
const clientId = Constants.expoConfig?.extra?.auth0ClientId;

if (!domain || !clientId) {
  console.warn(
    'Missing Auth0 configuration. Make sure AUTH0_DOMAIN and AUTH0_CLIENT_ID are set in your .env file.',
    'Received:',
    { domain, clientId, extra: Constants.expoConfig?.extra }
  );
}

export const auth0Config = {
  domain: domain ?? '',
  clientId: clientId ?? '',
};
