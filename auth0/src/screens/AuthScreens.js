// Name: Bryan Estrada-Cordoba 

import { useState } from 'react';
import { View, Button } from 'react-native';
import { auth0 } from '../auth/auth0';
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function AuthScreen() {
  const [currentUser, setCurrentUser] = useState(null);
  const createUser = useMutation(api.users.createUser);

  const authenticate = async () => {
    const credentials = await auth0.webAuth.authorize({
      scope: 'openid profile email',
    });

    const userInfo = await auth0.auth.userInfo({
      token: credentials.accessToken,
    });

    await createUser({
      auth0Id: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
    });

    setCurrentUser({
      auth0Id: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
    });
  };

  return (
    <View>
      {!currentUser ? (
        <>
          <Button title="Login" onPress={authenticate} />
          <Button title="Register" onPress={authenticate} />
        </>
      ) : (
        <>
          <Text>Welcome, {currentUser.name}</Text>
          <Text>Email: {currentUser.email}</Text>
        </>
      )}
    </View>
  );
}
