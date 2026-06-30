import { ScrollView, Text } from 'react-native';
import { MotiView } from 'moti';
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
      <MotiView
        from={{ opacity: 0, translateY: 12 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 300 }}
      >
        <NeoSurface variant="out">
          <Text style={{ padding: 24 }}>moti fade-in</Text>
        </NeoSurface>
      </MotiView>
    </ScrollView>
  );
}
