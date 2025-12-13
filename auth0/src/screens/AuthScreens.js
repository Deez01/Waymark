// Name: Bryan Estrada-Cordoba 

import React from 'react';
import { View, Button } from 'react-native';
import { auth0 } from '../auth/auth0';

export default function AuthScreen() {
  const login = async () => {
    await auth0.webAuth.authorize({
      scope: 'openid profile email',
    });
  };

  return (
    <View>
      <Button title="Login / Sign In" onPress={login} />
    </View>
  );
}
