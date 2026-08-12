export const theme = {
  colors: {
    primary: '#2563EB', // Blue 600
    primaryLight: '#EFF6FF', // Blue 50
    secondary: '#F1F5F9', // Slate 100
    background: '#F8FAFC', // Slate 50
    surface: '#FFFFFF', // Pure White
    textPrimary: '#1E293B', // Slate 800
    textSecondary: '#64748B', // Slate 500
    border: '#E2E8F0', // Slate 200
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 9999,
  },
  shadows: {
    soft: {
      shadowColor: '#94A3B8',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    medium: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 4,
    },
  },
  typography: {
    heading: {
      fontFamily: 'Inter_800ExtraBold',
      fontSize: 24,
      color: '#1E293B',
    },
    subheading: {
      fontFamily: 'Inter_700Bold',
      fontSize: 18,
      color: '#1E293B',
    },
    body: {
      fontFamily: 'Inter_500Medium',
      fontSize: 15,
      lineHeight: 22,
      color: '#475569',
    },
    caption: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      color: '#94A3B8',
    },
  },
};
