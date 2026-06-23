import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{
            headerShown: true,
            title: 'Sign In',
            headerBackTitle: 'Back',
            headerStyle: { backgroundColor: '#F2EEE6' },
            headerTintColor: '#D67D61',
            headerTitleStyle: { fontWeight: '700', color: '#3D3D3D' },
          }}
        />
      </Stack>
    </>
  );
}
