import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '../../shared/theme';

type Props = { steps: string[]; current: number };

export function WorkflowProgress({ steps, current }: Props) {
  return (
    <View style={styles.container} accessibilityLabel={`Step ${current + 1} of ${steps.length}: ${steps[current]}`}>
      <View style={styles.track}>
        {steps.map((step, index) => (
          <React.Fragment key={step}>
            <View style={[styles.dot, index <= current && styles.dotActive]}>
              <Text style={[styles.number, index <= current && styles.numberActive]}>{index + 1}</Text>
            </View>
            {index < steps.length - 1 && <View style={[styles.line, index < current && styles.lineActive]} />}
          </React.Fragment>
        ))}
      </View>
      <Text style={styles.label}>Step {current + 1} of {steps.length} · {steps[current]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: theme.colors.surface, paddingHorizontal: 24, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  track: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.secondary, borderWidth: 1, borderColor: theme.colors.border },
  dotActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  number: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '800' },
  numberActive: { color: '#FFFFFF' },
  line: { flex: 1, height: 2, backgroundColor: theme.colors.border, marginHorizontal: 6 },
  lineActive: { backgroundColor: theme.colors.primary },
  label: { color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700', marginTop: 7 },
});
