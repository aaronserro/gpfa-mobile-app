import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Moon, Sun } from '../ds/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DisplayHead, Input, RadialWash } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, sans, topPad } from '../ds/tokens';
import { useAuth } from '../auth/AuthProvider';

import bannerLogo from '../../assets/banner-logo-white.png';

export default function SignInScreen({ onSignedIn }: { onSignedIn: () => void }) {
  const { t, isDark, toggle } = useTheme();
  const insets = useSafeAreaInsets();
  const { signIn, busy, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    if (busy) return;
    if (await signIn(email.trim(), password)) onSignedIn();
  };

  return (
    <View style={[styles.fill, { backgroundColor: t.surfaceAnchor }]}>
      <RadialWash
        washes={[
          { color: t.brandBlue, o: 0.14, cx: '0.85', cy: '0', rx: '1.2', ry: '1', stop: '0.55' },
          { color: t.brandBrick, o: 0.1, cx: '0.08', cy: '1', rx: '1', ry: '0.8', stop: '0.5' },
        ]}
      />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: topPad(insets.top, 70), paddingBottom: Math.max(insets.bottom, 34) },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.toggleRow}>
            <Pressable
              onPress={toggle}
              accessibilityLabel="Toggle dark mode"
              style={[styles.iconBtn, { borderColor: t.ruleOnAnchor }]}
            >
              {isDark ? <Sun size={19} color="#fff" /> : <Moon size={19} color="#fff" />}
            </Pressable>
          </View>

          <View style={styles.center}>
            <Image source={bannerLogo} style={styles.logo} resizeMode="contain" />

            <DisplayHead size={28} onAnchor em="sign-in." style={styles.head}>
              Member{' '}
            </DisplayHead>

            <Text style={[styles.lede, { color: alpha(t.inkInverse, 0.72) }]}>
              Access is limited to employees of GPFA member organizations.
            </Text>

            <View style={styles.form}>
              <Input
                onAnchor
                value={email}
                onChangeText={setEmail}
                placeholder="Work email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                style={styles.field}
              />
              <Input
                onAnchor
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                returnKeyType="go"
                onSubmitEditing={() => void submit()}
                style={styles.field}
              />
              <Pressable
                onPress={() => void submit()}
                disabled={busy}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: t.brandGreenOnDark, opacity: busy ? 0.7 : 1 },
                  pressed && styles.pressed,
                ]}
              >
                {busy ? (
                  <ActivityIndicator color="#07171b" />
                ) : (
                  <Text style={styles.primaryBtnText}>Sign in</Text>
                )}
              </Pressable>
              {!!error && <Text style={[styles.error, { color: t.brandBrickInk }]}>{error}</Text>}
            </View>

            <Pressable hitSlop={8}>
              <Text style={[styles.forgot, { color: t.brandGreenOnDark }]}>Forgot password?</Text>
            </Pressable>
          </View>

          <Text style={[styles.disclaimer, { color: alpha(t.inkInverse, 0.45) }]}>
            Content on this network reflects member discussion{'\n'}and is not investment advice.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    width: 150,
    height: 40,
  },
  head: { marginTop: 8 },
  lede: {
    marginTop: 8,
    fontFamily: sans(400),
    fontSize: 13,
    lineHeight: 20,
  },
  form: {
    gap: 10,
    marginTop: 26,
  },
  field: { height: 48, paddingHorizontal: 14 },
  primaryBtn: {
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: sans(600),
    fontSize: 15,
    color: '#07171b',
  },
  pressed: { transform: [{ translateY: 1 }], opacity: 0.9 },
  error: {
    fontFamily: sans(500),
    fontSize: 12.5,
    textAlign: 'center',
  },
  forgot: {
    marginTop: 18,
    textAlign: 'center',
    fontFamily: sans(400),
    fontSize: 12.5,
  },
  disclaimer: {
    textAlign: 'center',
    fontFamily: sans(400),
    fontSize: 9.5,
    lineHeight: 14,
  },
});
