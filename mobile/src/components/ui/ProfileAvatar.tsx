import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

type Props = {
  uri?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

/** Initials remain visible while a photo loads, and when its URL is missing or fails. */
export function ProfileAvatar({ uri, firstName, lastName, style, textStyle }: Props) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const photoUri = uri?.trim() || '';
  const initials = [firstName, lastName]
    .map(name => Array.from(name?.trim() || '')[0] || '')
    .join('').toUpperCase() || '?';

  return (
    <View style={[styles.container, style]} accessibilityLabel={`${[firstName, lastName].filter(Boolean).join(' ') || 'User'} profile picture`}>
      <Text style={[styles.initials, textStyle]}>{initials}</Text>
      {!!photoUri && photoUri !== failedUri && (
        <Image
          key={photoUri}
          source={{ uri: photoUri }}
          style={styles.photo}
          resizeMode="cover"
          onError={() => setFailedUri(photoUri)}
          accessible={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#E0E7FF' },
  initials: { color: '#4F46E5', fontWeight: '800', fontSize: 24 },
  photo: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
});
