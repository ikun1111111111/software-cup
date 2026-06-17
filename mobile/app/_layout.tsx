import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import { useEffect } from 'react';
import PhoneFrame from '@/components/ui/PhoneFrame';
import { InkOverlay } from '@/components/ui/InkTransition';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'MaShanZheng': require('../assets/fonts/MaShanZheng-Regular.ttf'),
    'LongCang': require('../assets/fonts/LongCang-Regular.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <PhoneFrame>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="attractions/index"
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="attractions/[id]"
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="routes/index"
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="routes/[id]"
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="history/index"
            options={{ animation: 'fade' }}
          />
          <Stack.Screen
            name="map"
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="guide-demo"
            options={{ animation: 'slide_from_right' }}
          />
        </Stack>
        <InkOverlay />
      </PhoneFrame>
    </SafeAreaProvider>
  );
}
