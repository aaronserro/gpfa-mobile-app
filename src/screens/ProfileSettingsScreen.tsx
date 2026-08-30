import { useEffect, useState } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { OwnProfile, OwnProfileUpdateInput } from '../api/types';
import { Avatar, ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { sans, trackDisplay } from '../ds/tokens';

export default function ProfileSettingsScreen({
  profile,
  onBack,
  onSave,
  onUploadAvatar,
  onRemoveAvatar,
  onImportLinkedInAvatar,
}: {
  profile: OwnProfile;
  onBack: () => void;
  onSave: (input: OwnProfileUpdateInput) => Promise<void>;
  onUploadAvatar: (uri: string, byteSize: number) => Promise<void>;
  onRemoveAvatar: () => Promise<void>;
  onImportLinkedInAvatar: () => Promise<void>;
}) {
  const { t } = useTheme();
  const [fullName, setFullName] = useState(profile.name);
  const [roleTitle, setRoleTitle] = useState(profile.role ?? '');
  const [country, setCountry] = useState(profile.country);
  const [bio, setBio] = useState(profile.bio);
  const [skills, setSkills] = useState(profile.skills.join(', '));
  const [saving, setSaving] = useState(false);
  const [avatarPending, setAvatarPending] = useState(false);

  useEffect(() => {
    setFullName(profile.name);
    setRoleTitle(profile.role ?? '');
    setCountry(profile.country);
    setBio(profile.bio);
    setSkills(profile.skills.join(', '));
  }, [profile]);

  const submit = async () => {
    if (!fullName.trim() || !roleTitle.trim() || !country.trim()) {
      Alert.alert('Check your profile', 'Name, role and country are required.');
      return;
    }
    setSaving(true);
    try {
      await onSave({
        fullName: fullName.trim(),
        roleTitle: roleTitle.trim(),
        country: country.trim(),
        bio: bio.trim(),
        skills: skills.split(',').map((value) => value.trim()).filter(Boolean),
      });
      Alert.alert('Profile updated', 'Your member profile has been saved.');
    } catch (error) {
      Alert.alert('Could not update profile', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo-library access to choose a profile photo.');
      return;
    }
    const selection = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (selection.canceled || !selection.assets[0]) return;

    setAvatarPending(true);
    try {
      const normalized = await ImageManipulator.manipulateAsync(
        selection.assets[0].uri,
        [{ resize: { width: 512, height: 512 } }],
        { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG }
      );
      const file = new File(normalized.uri);
      if (!file.exists || file.size <= 0 || file.size > 512 * 1024) {
        throw new Error('Choose a photo that can be compressed below 512 KB.');
      }
      await onUploadAvatar(normalized.uri, file.size);
    } catch (error) {
      Alert.alert('Could not update photo', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setAvatarPending(false);
    }
  };

  const importLinkedIn = async () => {
    setAvatarPending(true);
    try {
      await onImportLinkedInAvatar();
    } catch (error) {
      Alert.alert('Could not import LinkedIn photo', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setAvatarPending(false);
    }
  };

  const confirmRemovePhoto = () => {
    Alert.alert('Remove profile photo?', 'Your initials will be shown instead.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setAvatarPending(true);
          void onRemoveAvatar()
            .catch((error) => Alert.alert('Could not remove photo', error instanceof Error ? error.message : 'Please try again.'))
            .finally(() => setAvatarPending(false));
        },
      },
    ]);
  };

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <ScreenHeader title="Edit profile" onBack={onBack} backLabel="Back to account" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarRow}>
          <Avatar initials={profile.initials ?? ''} photoUrl={profile.avatarUrl ?? undefined} size={72} />
          <View style={styles.flex}>
            <Text style={[styles.name, { color: t.inkStrong }]}>{profile.name}</Text>
            <Text style={[styles.help, { color: t.inkMuted }]}>@{profile.mentionHandle}</Text>
          </View>
        </View>
        <View style={styles.photoActions}>
          <SecondaryButton label="Choose photo" disabled={avatarPending} onPress={() => void choosePhoto()} />
          <SecondaryButton label="Import from LinkedIn" disabled={avatarPending} onPress={() => void importLinkedIn()} />
          {!!profile.avatarUrl && (
            <SecondaryButton label="Remove photo" destructive disabled={avatarPending} onPress={confirmRemovePhoto} />
          )}
        </View>

        <Field label="Full name" value={fullName} onChangeText={setFullName} />
        <Field label="Role" value={roleTitle} onChangeText={setRoleTitle} />
        <Field label="Country" value={country} onChangeText={setCountry} />
        <Field label="Biography" value={bio} onChangeText={setBio} multiline />
        <Field
          label="Skills"
          value={skills}
          onChangeText={setSkills}
          helper="Separate skills with commas."
        />

        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={() => void submit()}
          style={({ pressed }) => [
            styles.save,
            { backgroundColor: t.brandGreen, opacity: saving ? 0.6 : pressed ? 0.82 : 1 },
          ]}
        >
          {saving && <ActivityIndicator size="small" color="#fff" />}
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save profile'}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function SecondaryButton({ label, disabled, destructive = false, onPress }: { label: string; disabled: boolean; destructive?: boolean; onPress: () => void }) {
  const { t } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.secondaryButton,
        { borderColor: t.ruleHairline, backgroundColor: pressed ? t.surfaceSoft : t.surfacePaper, opacity: disabled ? 0.55 : 1 },
      ]}
    >
      <Text style={[styles.secondaryText, { color: destructive ? t.brandRed : t.inkStrong }]}>{label}</Text>
    </Pressable>
  );
}

function Field({
  label,
  helper,
  multiline = false,
  ...props
}: {
  label: string;
  helper?: string;
  multiline?: boolean;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const { t } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: t.inkStrong }]}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline && styles.multiline,
          { color: t.inkStrong, borderColor: t.ruleHairline, backgroundColor: t.surfacePaper },
        ]}
        placeholderTextColor={t.inkFaint}
      />
      {!!helper && <Text style={[styles.help, { color: t.inkMuted }]}>{helper}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  scroll: { padding: 20, paddingBottom: 40 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  photoActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -12, marginBottom: 24 },
  secondaryButton: { minHeight: 38, borderWidth: 1, borderRadius: 7, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: sans(600), fontSize: 12 },
  name: { fontFamily: sans(600), fontSize: 17, letterSpacing: trackDisplay(17) },
  field: { marginBottom: 16 },
  label: { fontFamily: sans(600), fontSize: 13, marginBottom: 7 },
  help: { marginTop: 5, fontFamily: sans(400), fontSize: 12, lineHeight: 17 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, fontFamily: sans(400), fontSize: 15 },
  multiline: { minHeight: 112, paddingTop: 12 },
  save: { minHeight: 50, borderRadius: 8, marginTop: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveText: { color: '#fff', fontFamily: sans(600), fontSize: 15 },
});
