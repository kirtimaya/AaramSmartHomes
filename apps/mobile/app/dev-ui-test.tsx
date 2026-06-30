import { ScrollView, Text } from 'react-native';
import { NeoSurface } from '@aaram/ui';

export default function DevUiTestScreen() {
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 24 }}>
      <NeoSurface variant="out">
        <Text style={{ padding: 24 }}>out</Text>
      </NeoSurface>
      <NeoSurface variant="out-sm">
        <Text style={{ padding: 24 }}>out-sm</Text>
      </NeoSurface>
      <NeoSurface variant="in">
        <Text style={{ padding: 24 }}>in</Text>
      </NeoSurface>
    </ScrollView>
  );
}
