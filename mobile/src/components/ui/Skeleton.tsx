import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { theme } from '../../shared/theme';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 18,
  borderRadius = 6,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeletonBase,
        {
          width: width as any,
          height: height as any,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const CaseCardSkeleton: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <View style={[styles.cardContainer, style]}>
    <View style={styles.rowBetween}>
      <Skeleton width="65%" height={20} borderRadius={6} />
      <Skeleton width={70} height={22} borderRadius={11} />
    </View>
    <View style={[styles.rowAlign, { marginTop: 12 }]}>
      <Skeleton width={16} height={16} borderRadius={8} />
      <Skeleton width="45%" height={14} borderRadius={4} style={{ marginLeft: 8 }} />
    </View>
    <View style={[styles.rowBetween, { marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' }]}>
      <Skeleton width={90} height={12} borderRadius={4} />
      <Skeleton width={60} height={12} borderRadius={4} />
    </View>
  </View>
);

export const NotificationItemSkeleton: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <View style={[styles.itemContainer, style]}>
    <Skeleton width={42} height={42} borderRadius={21} style={{ marginRight: 12 }} />
    <View style={{ flex: 1 }}>
      <Skeleton width="60%" height={16} borderRadius={4} style={{ marginBottom: 6 }} />
      <Skeleton width="90%" height={13} borderRadius={4} style={{ marginBottom: 6 }} />
      <Skeleton width="30%" height={11} borderRadius={4} />
    </View>
  </View>
);

export const ProfileSkeleton: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <View style={[styles.profileContainer, style]}>
    <View style={styles.centerBox}>
      <Skeleton width={84} height={84} borderRadius={42} style={{ marginBottom: 14 }} />
      <Skeleton width="50%" height={22} borderRadius={6} style={{ marginBottom: 6 }} />
      <Skeleton width="35%" height={14} borderRadius={4} style={{ marginBottom: 20 }} />
    </View>
    <View style={styles.sectionCard}>
      <Skeleton width="40%" height={18} borderRadius={4} style={{ marginBottom: 16 }} />
      <View style={{ gap: 14 }}>
        <Skeleton width="100%" height={16} borderRadius={4} />
        <Skeleton width="100%" height={16} borderRadius={4} />
        <Skeleton width="85%" height={16} borderRadius={4} />
      </View>
    </View>
  </View>
);

export const MessageThreadSkeleton: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <View style={[styles.itemContainer, style]}>
    <Skeleton width={48} height={48} borderRadius={24} style={{ marginRight: 12 }} />
    <View style={{ flex: 1 }}>
      <View style={[styles.rowBetween, { marginBottom: 6 }]}>
        <Skeleton width="45%" height={16} borderRadius={4} />
        <Skeleton width={40} height={11} borderRadius={4} />
      </View>
      <Skeleton width="75%" height={13} borderRadius={4} />
    </View>
  </View>
);

export const DocumentCardSkeleton: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <View style={[styles.cardContainer, style]}>
    <View style={[styles.rowAlign, { marginBottom: 10 }]}>
      <Skeleton width={36} height={36} borderRadius={8} style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Skeleton width="70%" height={16} borderRadius={4} style={{ marginBottom: 4 }} />
        <Skeleton width="40%" height={12} borderRadius={4} />
      </View>
    </View>
    <Skeleton width="100%" height={13} borderRadius={4} style={{ marginBottom: 4 }} />
    <Skeleton width="80%" height={13} borderRadius={4} />
  </View>
);

const styles = StyleSheet.create({
  skeletonBase: {
    backgroundColor: '#E2E8F0',
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...theme.shadows.soft,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  profileContainer: {
    padding: 16,
  },
  centerBox: {
    alignItems: 'center',
    marginVertical: 12,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 12,
    ...theme.shadows.soft,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
