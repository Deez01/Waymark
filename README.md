# Waymark

## QuickStart
```bash 
npm install
```
```bash 
npx expo start
```
```bash
npx convex dev

```
## Frontend Setup 
The frontend is a React Native frontend and it should hot reload when you are updating the UI also donwload the expo app to run this frontend

## Backend Setup
The backend is using convex. This will keep it simple when using it be wary about the size of imgs you guys upload make sure none of them are png's if they are not important because it could cost us money. Dont make an account for convex either `npm convex dashboard` will be for testing any of the backend stuff you can use console.log and see those in the dashboard.

## Auth0 + Expo Configuration

1. Create a `.env` file in the project root with the following variables:
   ```
   AUTH0_DOMAIN=your-tenant.us.auth0.com
   AUTH0_CLIENT_ID=your-auth0-client-id
   EXPO_IOS_BUNDLE_IDENTIFIER=com.example.waymark
   EXPO_ANDROID_PACKAGE=com.example.waymark
   ```
   Replace the placeholders with the values from your Auth0 tenant and desired bundle identifiers.

2. Install dependencies and generate native projects (required for `react-native-auth0`):
   ```bash
   npm install
   npx expo prebuild
   ```

3. Build or run a custom development client (Expo Go does **not** include the Auth0 native module):
   ```bash
   npx expo run:ios
   # or
   npx expo run:android
   ```
   Alternatively, use EAS Build/Dev Clients if you prefer cloud builds.

After these steps, the login button in the app will use your Auth0 tenant without the TurboModule errors.
