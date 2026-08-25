import { useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { ArrowRight, CalendarDots, CheckCircle, FileText, MapPin } from '../ds/icons';
import { Badge, MastheadMeta, ScreenHeader } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, mono, sans, trackDisplay } from '../ds/tokens';

export interface AnnualMeetingPreview {
  title: string;
  subtitle: string;
  dateLabel: string;
  location: string;
  timezone: string;
  summary: string;
  registrationStatus: 'Registered' | 'Not registered' | 'Waitlisted';
  registrationOpen: boolean;
  agenda: {
    id: string;
    label: string;
    date: string;
    sessions: { time: string; title: string; detail: string; location: string }[];
  }[];
  logistics: { title: string; detail: string }[];
}

export default function AnnualMeetingScreen({
  meeting,
  onBack,
}: {
  meeting: AnnualMeetingPreview;
  onBack: () => void;
}) {
  const { t } = useTheme();
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [expandedDay, setExpandedDay] = useState(meeting.agenda[0]?.id ?? '');
  const [registered, setRegistered] = useState(meeting.registrationStatus === 'Registered');

  if (registrationOpen) {
    return (
      <RegistrationForm
        meeting={meeting}
        registered={registered}
        onBack={() => setRegistrationOpen(false)}
        onSubmit={() => {
          setRegistered(true);
          setRegistrationOpen(false);
        }}
      />
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <ScreenHeader title="Annual Meeting" onBack={onBack} backLabel="Back to More" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: t.surfaceAnchor }]}>
          <MastheadMeta size={10} color={t.brandGreenOnDark}>MEMBER MEETING · 2026</MastheadMeta>
          <Text style={styles.heroTitle}>{meeting.title}</Text>
          <Text style={[styles.heroSubtitle, { color: alpha(t.inkInverse, 0.78) }]}>{meeting.subtitle}</Text>
          <View style={styles.heroFacts}>
            <View style={styles.heroFact}>
              <CalendarDots size={18} color={t.brandGreenOnDark} />
              <Text style={styles.heroFactText}>{meeting.dateLabel}</Text>
            </View>
            <View style={styles.heroFact}>
              <MapPin size={18} color={t.brandGreenOnDark} />
              <Text style={styles.heroFactText}>{meeting.location}</Text>
            </View>
          </View>
          <View style={styles.heroActions}>
            <Pressable
              onPress={() => setRegistrationOpen(true)}
              style={[styles.heroPrimary, { backgroundColor: t.brandGreenOnDark }]}
            >
              <Text style={styles.heroPrimaryText}>{registered ? 'View registration' : 'Register now'}</Text>
              <ArrowRight size={15} color="#07171b" />
            </Pressable>
            <Badge variant="tag-green" size={9.5}>{registered ? 'Registered' : 'Registration open'}</Badge>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={[styles.summary, { color: t.inkBody }]}>{meeting.summary}</Text>

          <View style={[styles.quickGrid, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
            <QuickFact label="Dates" value={meeting.dateLabel} />
            <QuickFact label="Timezone" value={meeting.timezone} divided />
            <QuickFact label="Location" value={meeting.location} divided />
            <QuickFact label="Your status" value={registered ? 'Registered' : meeting.registrationStatus} divided />
          </View>

          <SectionHeading label="Program" detail="Tap a day to expand" />
          <View style={[styles.agenda, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
            {meeting.agenda.map((day, index) => {
              const expanded = day.id === expandedDay;
              return (
                <View key={day.id} style={index > 0 ? { borderTopWidth: 1, borderTopColor: t.ruleHairline } : undefined}>
                  <Pressable onPress={() => setExpandedDay(expanded ? '' : day.id)} style={styles.dayHeader}>
                    <View style={styles.flex}>
                      <Text style={[styles.dayLabel, { color: t.inkStrong }]}>{day.label}</Text>
                      <MastheadMeta size={9.5}>{day.date}</MastheadMeta>
                    </View>
                    <Text style={[styles.expandMark, { color: t.brandGreen }]}>{expanded ? '−' : '+'}</Text>
                  </Pressable>
                  {expanded && (
                    <View style={[styles.sessions, { borderTopColor: t.ruleHairline }]}>
                      {day.sessions.map((session) => (
                        <View key={`${session.time}-${session.title}`} style={styles.session}>
                          <Text style={[styles.sessionTime, { color: t.brandGreen }]}>{session.time}</Text>
                          <View style={styles.flex}>
                            <Text style={[styles.sessionTitle, { color: t.inkStrong }]}>{session.title}</Text>
                            <Text style={[styles.sessionDetail, { color: t.inkMuted }]}>{session.detail}</Text>
                            <Text style={[styles.sessionLocation, { color: t.brandAmber }]}>{session.location}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <SectionHeading label="Location & logistics" />
          <View style={[styles.logistics, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
            {meeting.logistics.map((item, index) => (
              <View key={item.title} style={[styles.logisticsRow, index > 0 && { borderTopWidth: 1, borderTopColor: t.ruleHairline }]}>
                <MapPin size={18} color={t.brandGreen} />
                <View style={styles.flex}>
                  <Text style={[styles.logisticsTitle, { color: t.inkStrong }]}>{item.title}</Text>
                  <Text style={[styles.logisticsDetail, { color: t.inkMuted }]}>{item.detail}</Text>
                </View>
              </View>
            ))}
          </View>

          <SectionHeading label="Meeting materials" />
          <Pressable style={[styles.document, { backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}>
            <View style={[styles.documentIcon, { backgroundColor: t.surfaceSoft }]}>
              <FileText size={21} color={t.brandGreen} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.documentTitle, { color: t.inkStrong }]}>2026 member agenda</Text>
              <Text style={[styles.documentMeta, { color: t.inkMuted }]}>PDF · Updated August 20</Text>
            </View>
            <ArrowRight size={16} color={t.brandGreen} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function RegistrationForm({
  meeting,
  registered,
  onBack,
  onSubmit,
}: {
  meeting: AnnualMeetingPreview;
  registered: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const { t } = useTheme();
  const [attendance, setAttendance] = useState(registered ? 'In person' : '');
  const [arrival, setArrival] = useState('');
  const [dietary, setDietary] = useState('');
  const dirty = !!attendance || !!arrival || !!dietary;

  const leave = () => {
    if (!dirty) return onBack();
    Alert.alert('Leave registration?', 'Your preview answers will not be saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: onBack },
    ]);
  };

  return (
    <View style={[styles.fill, { backgroundColor: t.surfacePage }]}>
      <ScreenHeader title={registered ? 'Your registration' : 'Register'} onBack={leave} backLabel="Back to Annual Meeting" />
      <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
        <MastheadMeta size={10}>{meeting.dateLabel.toUpperCase()}</MastheadMeta>
        <Text style={[styles.formTitle, { color: t.inkStrong }]}>{meeting.title}</Text>
        <Text style={[styles.formIntro, { color: t.inkMuted }]}>Your name, work email and organization come from your GPFA member profile.</Text>

        <FormQuestion label="How will you attend?" required>
          <ChoiceGroup value={attendance} options={['In person', 'Virtual']} onChange={setAttendance} />
        </FormQuestion>

        <FormQuestion label="When do you expect to arrive?" required>
          <ChoiceGroup value={arrival} options={['September 16', 'September 17', 'Not sure yet']} onChange={setArrival} />
        </FormQuestion>

        <FormQuestion label="Dietary or accessibility requirements">
          <TextInput
            value={dietary}
            onChangeText={setDietary}
            multiline
            placeholder="Optional"
            placeholderTextColor={t.inkFaint}
            style={[styles.textArea, { color: t.inkStrong, backgroundColor: t.surfacePaper, borderColor: t.ruleHairline }]}
          />
        </FormQuestion>

        <View style={[styles.receiptNote, { backgroundColor: t.surfaceSoft }]}>
          <CheckCircle size={18} color={t.brandGreen} />
          <Text style={[styles.receiptCopy, { color: t.inkBody }]}>A registration receipt and any later status updates will appear here in the app.</Text>
        </View>
      </ScrollView>

      <View style={[styles.formFooter, { backgroundColor: t.surfacePaper, borderTopColor: t.ruleHairline }]}>
        <View style={styles.flex}>
          <Text style={[styles.formFooterTitle, { color: t.inkStrong }]}>{registered ? 'Registered' : 'Registration open'}</Text>
          <Text style={[styles.formFooterMeta, { color: t.inkMuted }]}>{meeting.dateLabel}</Text>
        </View>
        <Pressable
          disabled={!attendance || !arrival}
          onPress={onSubmit}
          style={[styles.submitButton, { backgroundColor: attendance && arrival ? t.surfaceAnchor : t.surfaceSoft }]}
        >
          <Text style={[styles.submitLabel, { color: attendance && arrival ? t.inkInverse : t.inkFaint }]}>
            {registered ? 'Update response' : 'Submit registration'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function FormQuestion({ label, required = false, children }: { label: string; required?: boolean; children: ReactNode }) {
  const { t } = useTheme();
  return (
    <View style={styles.formQuestion}>
      <Text style={[styles.formLabel, { color: t.inkStrong }]}>{label}{required ? ' *' : ''}</Text>
      {children}
    </View>
  );
}

function ChoiceGroup({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  const { t } = useTheme();
  return (
    <View style={styles.choiceList}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[styles.choice, { backgroundColor: selected ? t.brandGreenSoft : t.surfacePaper, borderColor: selected ? t.brandGreen : t.ruleHairline }]}
          >
            <View style={[styles.radio, { borderColor: selected ? t.brandGreen : t.ruleStrong }]}>
              {selected && <View style={[styles.radioFill, { backgroundColor: t.brandGreen }]} />}
            </View>
            <Text style={[styles.choiceLabel, { color: t.inkStrong }]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function QuickFact({ label, value, divided = false }: { label: string; value: string; divided?: boolean }) {
  const { t } = useTheme();
  return (
    <View style={[styles.quickFact, divided && { borderTopWidth: 1, borderTopColor: t.ruleHairline }]}>
      <MastheadMeta size={9.5}>{label.toUpperCase()}</MastheadMeta>
      <Text style={[styles.quickValue, { color: t.inkStrong }]}>{value}</Text>
    </View>
  );
}

function SectionHeading({ label, detail }: { label: string; detail?: string }) {
  const { t } = useTheme();
  return (
    <View style={styles.sectionHeadingRow}>
      <Text style={[styles.sectionHeading, { color: t.inkStrong }]}>{label}</Text>
      {!!detail && <Text style={[styles.sectionDetail, { color: t.inkMuted }]}>{detail}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  scroll: { paddingBottom: 40 },
  hero: { padding: 24 },
  heroTitle: { marginTop: 9, fontFamily: sans(600), fontSize: 29, lineHeight: 34, letterSpacing: trackDisplay(29), color: '#fff' },
  heroSubtitle: { marginTop: 7, fontFamily: sans(400), fontSize: 14, lineHeight: 21 },
  heroFacts: { gap: 8, marginTop: 22 },
  heroFact: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  heroFactText: { flex: 1, fontFamily: sans(500), fontSize: 13, color: '#fff' },
  heroActions: { marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroPrimary: { minHeight: 44, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  heroPrimaryText: { fontFamily: sans(600), fontSize: 13, color: '#07171b' },
  content: { padding: 20 },
  summary: { fontFamily: sans(400), fontSize: 14.5, lineHeight: 23 },
  quickGrid: { marginTop: 20, borderWidth: 1, borderRadius: 9 },
  quickFact: { paddingHorizontal: 14, paddingVertical: 12 },
  quickValue: { marginTop: 3, fontFamily: sans(600), fontSize: 13 },
  sectionHeadingRow: { marginTop: 26, marginBottom: 10, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  sectionHeading: { fontFamily: sans(600), fontSize: 17, letterSpacing: trackDisplay(17) },
  sectionDetail: { fontFamily: sans(400), fontSize: 11.5 },
  agenda: { borderWidth: 1, borderRadius: 9, overflow: 'hidden' },
  dayHeader: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  dayLabel: { fontFamily: sans(600), fontSize: 14 },
  expandMark: { fontFamily: sans(500), fontSize: 23 },
  sessions: { borderTopWidth: 1, paddingHorizontal: 14, paddingBottom: 4 },
  session: { flexDirection: 'row', gap: 12, paddingVertical: 13 },
  sessionTime: { width: 58, fontFamily: mono(600), fontSize: 10 },
  sessionTitle: { fontFamily: sans(600), fontSize: 13.5, lineHeight: 18 },
  sessionDetail: { marginTop: 3, fontFamily: sans(400), fontSize: 12, lineHeight: 17 },
  sessionLocation: { marginTop: 4, fontFamily: sans(600), fontSize: 10.5 },
  logistics: { borderWidth: 1, borderRadius: 9 },
  logisticsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14 },
  logisticsTitle: { fontFamily: sans(600), fontSize: 13.5 },
  logisticsDetail: { marginTop: 3, fontFamily: sans(400), fontSize: 12, lineHeight: 18 },
  document: { minHeight: 68, borderWidth: 1, borderRadius: 9, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  documentIcon: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  documentTitle: { fontFamily: sans(600), fontSize: 13.5 },
  documentMeta: { marginTop: 3, fontFamily: sans(400), fontSize: 11.5 },
  formScroll: { padding: 20, paddingBottom: 120 },
  formTitle: { marginTop: 8, fontFamily: sans(600), fontSize: 23, lineHeight: 28, letterSpacing: trackDisplay(23) },
  formIntro: { marginTop: 8, fontFamily: sans(400), fontSize: 13, lineHeight: 19 },
  formQuestion: { marginTop: 26 },
  formLabel: { marginBottom: 10, fontFamily: sans(600), fontSize: 14 },
  choiceList: { gap: 8 },
  choice: { minHeight: 50, borderWidth: 1, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13 },
  radio: { width: 20, height: 20, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  radioFill: { width: 10, height: 10, borderRadius: 5 },
  choiceLabel: { fontFamily: sans(500), fontSize: 13 },
  textArea: { minHeight: 100, borderWidth: 1, borderRadius: 8, padding: 12, textAlignVertical: 'top', fontFamily: sans(400), fontSize: 13 },
  receiptNote: { marginTop: 24, borderRadius: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 13 },
  receiptCopy: { flex: 1, fontFamily: sans(400), fontSize: 12, lineHeight: 18 },
  formFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12 },
  formFooterTitle: { fontFamily: sans(600), fontSize: 12.5 },
  formFooterMeta: { marginTop: 2, fontFamily: sans(400), fontSize: 10.5 },
  submitButton: { minHeight: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15 },
  submitLabel: { fontFamily: sans(600), fontSize: 12.5 },
});
