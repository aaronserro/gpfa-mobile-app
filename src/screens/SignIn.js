import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { FadeIn, Logo, PopIn } from '../components/common';
import { colors, mono } from '../theme';

export default function SignIn({ onContinue }) {
  const [email, setEmail] = useState('');

  return (
    <LinearGradient colors={[colors.bgTop, colors.bg]} locations={[0, 0.55]} style={styles.fill}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <PopIn duration={600}>
              <Logo size={44} />
            </PopIn>
            <FadeIn delay={100}>
              <Text style={styles.eyebrow}>MEMBER PORTAL</Text>
            </FadeIn>
            <FadeIn delay={180}>
              <Text style={styles.title}>
                Welcome <Text style={styles.accent}>back.</Text>
              </Text>
            </FadeIn>
            <FadeIn delay={260}>
              <Text style={styles.blurb}>
                A closed community of institutional asset owners advancing practice in securities finance.
              </Text>
            </FadeIn>
            <FadeIn delay={340}>
              <View style={styles.stats}>
                <View>
                  <Text style={styles.statNum}>40+</Text>
                  <Text style={styles.statLabel}>Asset-owner orgs</Text>
                </View>
                <View>
                  <Text style={styles.statNum}>$15T+</Text>
                  <Text style={styles.statLabel}>Assets represented</Text>
                </View>
              </View>
            </FadeIn>
          </View>

          <FadeIn delay={420} style={styles.form}>
            <Text style={styles.formEyebrow}>SIGN IN</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Work email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="name@organization.org"
                placeholderTextColor={colors.dim}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
              <Text style={styles.help}>Use the email tied to your GPFA member profile.</Text>
            </View>
            <Pressable style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]} onPress={onContinue}>
              <Text style={styles.ctaText}>Continue</Text>
            </Pressable>
            <Text style={styles.footer}>
              Not a member? <Text style={styles.link}>Apply for membership</Text>
            </Text>
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: {
    paddingTop: 96,
    paddingHorizontal: 28,
    gap: 20,
  },
  eyebrow: {
    fontFamily: mono,
    fontSize: 12,
    letterSpacing: 2.6,
    color: colors.muted,
  },
  title: {
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 43,
    letterSpacing: -0.8,
    color: colors.text,
  },
  accent: { color: colors.green },
  blurb: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
  },
  stats: {
    flexDirection: 'row',
    gap: 28,
    paddingTop: 6,
  },
  statNum: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.green,
  },
  statLabel: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  form: {
    paddingHorizontal: 28,
    paddingTop: 26,
    paddingBottom: 60,
    gap: 14,
  },
  formEyebrow: {
    fontFamily: mono,
    fontSize: 11,
    letterSpacing: 2,
    color: colors.dim,
  },
  field: { gap: 8 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.sub,
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.fill,
    color: colors.text,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  help: {
    fontSize: 12,
    color: colors.dim,
  },
  cta: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: { transform: [{ scale: 0.97 }] },
  ctaText: {
    color: colors.greenInk,
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    textAlign: 'center',
    fontSize: 13,
    color: colors.muted,
  },
  link: {
    color: colors.green,
    textDecorationLine: 'underline',
  },
});
