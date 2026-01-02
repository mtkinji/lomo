import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';
import { Logo } from '../../ui/Logo';
import { getAiProxyBaseUrl, getSupabasePublishableKey, getSupabaseUrl } from '../../utils/getEnv';

type Props = {
  title?: string;
  message: string;
};

export function ConfigErrorScreen({ title = 'App misconfigured', message }: Props) {
  const supabaseUrl = getSupabaseUrl();
  const supabaseKeyPresent = Boolean(getSupabasePublishableKey()?.trim());
  const aiProxyBaseUrl = getAiProxyBaseUrl();

  return (
    <View style={styles.root}>
      <Logo size={44} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      <ScrollView style={styles.debug} contentContainerStyle={styles.debugContent}>
        <Text style={styles.debugHeader}>Debug</Text>
        <Text style={styles.debugLine}>supabaseUrl: {supabaseUrl ? supabaseUrl : '(missing)'}</Text>
        <Text style={styles.debugLine}>supabasePublishableKey: {supabaseKeyPresent ? '(present)' : '(missing)'}</Text>
        <Text style={styles.debugLine}>aiProxyBaseUrl: {aiProxyBaseUrl ? aiProxyBaseUrl : '(missing)'}</Text>
        <Text style={styles.debugHint}>
          Fix: set EAS env/secrets for SUPABASE_URL and SUPABASE_ANON_KEY (or EXPO_PUBLIC_* variants)
          so they get embedded into Expo extra config at build time. Expected Supabase URL:
          {'\n'}- https://auth.kwilt.app (custom auth domain)
          {'\n'}(In Expo Go, system auth prompts may still show “Expo”. In dev/prod builds they show “Kwilt”.)
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.shell,
    paddingHorizontal: 20,
    paddingTop: 64,
    gap: 12,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 20,
  },
  debug: {
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: colors.canvas,
  },
  debugContent: {
    padding: 14,
    gap: 8,
  },
  debugHeader: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  debugLine: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  debugHint: {
    marginTop: 4,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
});


