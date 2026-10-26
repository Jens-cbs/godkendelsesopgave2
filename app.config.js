// her importeres app.json-filen, som indeholder konfigurationen for Expo-appen
const appJson = require('./app.json');

module.exports = {
  ...appJson.expo,
  plugins: [
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Tillad $(PRODUCT_NAME) at bruge din lokation.',
      },
    ],
    [
      'react-native-maps',
      {
        iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
        androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
      },
    ],
  ],
};
