import { Redirect } from 'expo-router';

export default function Index() {
  // This will be handled by _layout.tsx auth logic
  return <Redirect href="/(tabs)" />;
}
