import { useState } from 'react';
import { useAuth0 } from 'react-native-auth0';

import { AddPinScreen } from '@/components/screens/add-pin-screen';
import { LoginScreen } from '@/components/screens/login-screen';

export default function HomeTab() {
  const { authorize, user, error, isLoading } = useAuth0();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleLogin = async () => {
    try {
      setIsAuthenticating(true);
      await authorize();
    } catch (e) {
      console.log('Auth0 login failed', e);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const loggedIn = !!user;

  if (!loggedIn) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        isLoading={isLoading || isAuthenticating}
        error={error?.message}
      />
    );
  }

  return <AddPinScreen />;
}
