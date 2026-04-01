// API Configuration
export const API_CONFIG = {
  // Dynamic IP selection based on environment
  BASE_URL: (() => {
    if (!__DEV__) {
      return 'https://nonfluctuating-uniaxially-laylah.ngrok-free.dev/api'; // Production Ngrok
    }
    
    // Development - prioritize Ngrok for outdoor testing
    const possibleIPs = [
      'https://nonfluctuating-uniaxially-laylah.ngrok-free.dev/api', // Ngrok Tunnel
      'http://192.168.1.16:5000/api',     // Current WiFi IP
      'http://10.0.2.2:5000/api',        // Android Emulator
      'http://localhost:5000/api',       // iOS Simulator / Web
    ];
    
    // Use Ngrok as the primary URL
    return possibleIPs[0];
  })(),
  
  // Alternative URLs for different environments:
  EMULATOR_IP: 'http://10.0.2.2:5000/api',
  LOCALHOST: 'http://localhost:5000/api',
  WIFI_IP: 'http://192.168.1.16:5000/api',
  NGROK: 'https://nonfluctuating-uniaxially-laylah.ngrok-free.dev/api',
  
  TIMEOUT: 10000, // 10 seconds timeout
};

// Helper function to get the correct API URL
export const getApiUrl = () => {
  const url = API_CONFIG.BASE_URL;
  console.log('🔗 Using API URL:', url);
  return url;
};

// Helper function to test different API URLs
export const getAlternativeApiUrls = () => {
  return [
    'https://nonfluctuating-uniaxially-laylah.ngrok-free.dev/api',
    'http://192.168.1.16:5000/api',
    'http://10.0.2.2:5000/api',
  ];
};