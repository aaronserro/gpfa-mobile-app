import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowUp, CaretLeft, ChartBar, ChatCircle, CheckCircle, DownloadSimple, FileXls, Paperclip } from '../ds/icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, DisplayHead, Eyebrow, Input, MastheadMeta } from '../ds/primitives';
import { useTheme } from '../ds/ThemeProvider';
import { alpha, mono, sans, topPad, trackDisplay, wgRule } from '../ds/tokens';
import { GROUPS, initials } from '../data/portal';

export default function GroupsScreen({
  groupIndex,
  onPickGroup,
  threadId,
  onOpenThread,
  onCloseThread,
  extraReplies,
  onReply,
  votes,
  onVote,
}) {
  const { t } = useTheme();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState('');

  const group = GROUPS[groupIndex];
  const thread = threadId ? GROUPS.flatMap((g) => g.threads).find((x) => x.id === threadId) : null;

  const repliesFor = (id) => {
    const base = GROUPS.flatMap((g) => g.threads).find((x) => x.id === id)?.replies ?? [];
    return [...base, ...(extraReplies[id] ?? [])];
  };

  /* ── thread detail ───────────────────────────────────────────────────── */
  if (thread) {
    const replies = repliesFor(thread.id);
    const voted = votes[thread.id] !== undefined;
    const counts = thread.poll?.options.map((o, i) => o.votes + (votes[thread.id] === i ? 1 : 0)) ?? [];
    const total = counts.reduce((a, b) => a + b, 0);

    const send = () => {
      const text = draft.trim();
      if (!text) return;
      onReply(thread.id, { a: 'Robert Goobie', org: 'HOOPP', time: 'Just now', initials: 'RG', text });
      setDraft('');
    };

    return (
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            styles.detailBar,
            { backgroundColor: t.surfacePaper, borderBottomColor: t.ruleHairline, paddingTop: topPad(insets.top, 58) },
          ]}
        >
          <Pressable onPress={onCloseThread} style={styles.backBtn} hitSlop={6}>
            <CaretLeft size={17} color={t.brandGreen} />
            <Text style={[styles.backText, { color: t.brandGreen }]}>{group.n}</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.fill} showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.post,
              { backgroundColor: t.surfacePaper, borderBottomColor: t.ruleHairline, borderLeftColor: wgRule(t, group.cls) },
            ]}
          >
            <View style={styles.byline}>
              <Avatar initials={initials(thread.author)} size={32} />
              <View>
                <Text style={[styles.author, { color: t.inkStrong }]}>{thread.author}</Text>
                <MastheadMeta size={10}>
                  {thread.org.toUpperCase()} · {thread.time.toUpperCase()}
                </MastheadMeta>
              </View>
            </View>

            <Text style={[styles.postTitle, { color: t.inkStrong }]}>{thread.title}</Text>
            <Text style={[styles.postBody, { color: t.inkBody }]}>{thread.body}</Text>

            {!!thread.file && (
              <Pressable
                style={({ pressed }) => [
                  styles.attachment,
                  { borderColor: pressed ? t.ruleStrong : t.ruleHairline, backgroundColor: t.surfacePage },
                ]}
              >
                <FileXls size={22} color={t.brandGreen} />
                <View style={styles.attachmentBody}>
                  <Text style={[styles.attachmentName, { color: t.inkStrong }]}>{thread.file}</Text>
                  <MastheadMeta size={9.5}>{thread.fileMeta}</MastheadMeta>
                </View>
                <DownloadSimple size={17} color={t.inkFaint} />
              </Pressable>
            )}

            {!!thread.poll && (
              <View style={[styles.poll, { borderColor: t.ruleHairline }]}>
                <View style={styles.pollQRow}>
                  <ChartBar size={15} color={t.brandAmber} />
                  <Text style={[styles.pollQ, { color: t.inkStrong }]}>{thread.poll.q}</Text>
                </View>
                <View style={styles.pollOptions}>
                  {thread.poll.options.map((o, i) => {
                    const chosen = votes[thread.id] === i;
                    const pct = voted ? Math.round((counts[i] / total) * 100) : 0;
                    return (
                      <Pressable
                        key={o.label}
                        onPress={() => onVote(thread.id, i)}
                        style={[
                          styles.pollOption,
                          {
                            borderColor: chosen ? t.brandGreen : t.ruleHairline,
                            backgroundColor: t.surfacePaper,
                          },
                        ]}
                      >
                        {voted && (
                          <View
                            style={[
                              styles.pollFill,
                              {
                                width: `${pct}%`,
                                backgroundColor: chosen ? t.brandGreenSoft : alpha(t.surfaceSoft, 0.6),
                              },
                            ]}
                          />
                        )}
                        <View style={styles.pollLabelRow}>
                          <Text
                            style={[styles.pollLabel, { color: t.inkStrong, fontFamily: sans(chosen ? 600 : 500) }]}
                          >
                            {o.label}
                          </Text>
                          {chosen && <CheckCircle size={15} weight="fill" color={t.brandLeaf} />}
                        </View>
                        {voted && <Text style={[styles.pollPct, { color: t.inkMuted }]}>{pct}%</Text>}
                      </Pressable>
                    );
                  })}
                </View>
                <MastheadMeta size={9.5} style={styles.pollMeta}>
                  {(voted ? `${total} VOTES · ` : '') + thread.poll.closes.toUpperCase()}
                </MastheadMeta>
              </View>
            )}
          </View>

          <Eyebrow size={10} style={styles.repliesHead}>
            Replies · {replies.length}
          </Eyebrow>

          {replies.map((r, i) => (
            <View
              key={`${r.a}-${i}`}
              style={[styles.reply, { backgroundColor: t.surfacePaper, borderTopColor: t.ruleHairline }]}
            >
              <Avatar initials={r.initials || initials(r.a)} size={24} style={styles.replyAvatar} />
              <View style={styles.replyBody}>
                <View style={styles.replyByline}>
                  <Text style={[styles.replyAuthor, { color: t.inkStrong }]}>{r.a}</Text>
                  <MastheadMeta size={9.5}>
                    {r.org.toUpperCase()} · {r.time.toUpperCase()}
                  </MastheadMeta>
                </View>
                <Text style={[styles.replyText, { color: t.inkBody }]}>
                  {!!r.mention && <Text style={{ color: t.brandGreen, fontFamily: sans(600) }}>{r.mention} </Text>}
                  {r.text}
                </Text>
              </View>
            </View>
          ))}

          <View style={styles.tail} />
        </ScrollView>

        <View style={[styles.composer, { borderTopColor: t.ruleHairline, backgroundColor: t.surfacePaper }]}>
          <Input
            value={draft}
            onChangeText={setDraft}
            placeholder="Reply — @ to mention a member"
            style={styles.composerInput}
            returnKeyType="send"
            onSubmitEditing={send}
          />
          <Pressable
            onPress={send}
            accessibilityLabel="Post reply"
            style={({ pressed }) => [styles.send, { backgroundColor: pressed ? t.brandGreenStrong : t.brandGreen }]}
          >
            <ArrowUp size={18} color={t.primaryForeground} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    );
  }

  /* ── thread list ─────────────────────────────────────────────────────── */
  return (
    <View style={styles.fill}>
      <View style={[styles.listHeader, { backgroundColor: t.surfacePaper, paddingTop: topPad(insets.top, 66) }]}>
        <Eyebrow size={10}>Discussion board</Eyebrow>
        <DisplayHead size={22} em="groups." style={styles.head}>
          Working{' '}
        </DisplayHead>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={styles.chipScroller}
        >
          {GROUPS.map((g, i) => {
            const on = i === groupIndex;
            return (
              <Pressable
                key={g.id}
                onPress={() => onPickGroup(i)}
                style={[
                  styles.chip,
                  {
                    borderColor: on ? t.surfaceAnchor : t.ruleHairline,
                    backgroundColor: on ? t.surfaceAnchor : t.surfacePaper,
                  },
                ]}
              >
                <Text style={[styles.chipText, { color: on ? t.inkInverse : t.inkMuted }]}>{g.short}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.groupMetaRow}>
        <Text style={[styles.groupTitle, { color: t.inkStrong }]}>{group.n}</Text>
        <MastheadMeta size={10}>{group.meta.toUpperCase()}</MastheadMeta>
      </View>

      <ScrollView style={[styles.fill, { borderTopWidth: 1, borderTopColor: t.ruleHairline }]} showsVerticalScrollIndicator={false}>
        {group.threads.map((th) => {
          const replyCount = repliesFor(th.id).length;
          return (
            <Pressable
              key={th.id}
              onPress={() => onOpenThread(th.id)}
              style={({ pressed }) => [
                styles.threadRow,
                {
                  backgroundColor: pressed ? alpha(t.surfaceSoft, 0.45) : t.surfacePaper,
                  borderBottomColor: t.ruleHairline,
                  borderLeftColor: wgRule(t, group.cls),
                },
              ]}
            >
              <Text style={[styles.threadTitle, { color: t.inkStrong }]}>{th.title}</Text>
              <View style={styles.threadMetaRow}>
                <Avatar initials={initials(th.author)} size={24} />
                <Text style={[styles.threadMeta, { color: t.inkMuted }]} numberOfLines={1}>
                  {th.author} · {th.org} · {th.time}
                </Text>
                <View style={styles.threadIcons}>
                  {!!th.poll && <ChartBar size={14} color={t.brandAmber} />}
                  {!!th.file && <Paperclip size={14} color={t.inkFaint} />}
                  <View style={styles.replyCount}>
                    <ChatCircle size={14} color={t.inkFaint} />
                    <Text style={[styles.replyCountText, { color: t.inkFaint }]}>{replyCount}</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          );
        })}
        <Text style={[styles.listDisclaimer, { color: t.inkFaint }]}>
          Content reflects member discussion and is not investment advice.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },

  listHeader: { paddingHorizontal: 20 },
  head: { marginTop: 4 },
  chipScroller: { marginHorizontal: -20 },
  chips: {
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  chip: {
    minHeight: 38,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 32,
    borderWidth: 1,
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: mono(400),
    fontSize: 10.5,
    textTransform: 'uppercase',
    letterSpacing: 0.74,
  },
  groupMetaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  groupTitle: {
    fontFamily: sans(600),
    fontSize: 15,
    letterSpacing: trackDisplay(15),
  },
  threadRow: {
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    paddingVertical: 14,
    paddingRight: 20,
    paddingLeft: 17,
  },
  threadTitle: {
    fontFamily: sans(600),
    fontSize: 14,
    lineHeight: 19.6,
  },
  threadMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  threadMeta: {
    flex: 1,
    fontFamily: sans(400),
    fontSize: 11.5,
  },
  threadIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  replyCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  replyCountText: {
    fontFamily: sans(400),
    fontSize: 11.5,
  },
  listDisclaimer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    fontFamily: sans(400),
    fontSize: 10.5,
  },

  detailBar: {
    paddingHorizontal: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 8,
  },
  backText: {
    fontFamily: sans(500),
    fontSize: 14,
  },
  post: {
    borderBottomWidth: 1,
    borderLeftWidth: 3,
    paddingVertical: 18,
    paddingRight: 20,
    paddingLeft: 17,
  },
  byline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  author: {
    fontFamily: sans(600),
    fontSize: 13.5,
  },
  postTitle: {
    marginTop: 14,
    fontFamily: sans(600),
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: trackDisplay(17),
  },
  postBody: {
    marginTop: 10,
    fontFamily: sans(400),
    fontSize: 13.5,
    lineHeight: 21.6,
  },
  attachment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  attachmentBody: { flex: 1 },
  attachmentName: {
    fontFamily: sans(600),
    fontSize: 12.5,
  },
  poll: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
  },
  pollQRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pollQ: {
    flex: 1,
    fontFamily: sans(600),
    fontSize: 13,
  },
  pollOptions: {
    gap: 7,
    marginTop: 11,
  },
  pollOption: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  pollFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
  },
  pollLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
  },
  pollLabel: { fontSize: 13 },
  pollPct: {
    fontFamily: sans(600),
    fontSize: 12,
  },
  pollMeta: { marginTop: 10 },
  repliesHead: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  reply: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  replyAvatar: { marginTop: 2 },
  replyBody: { flex: 1 },
  replyByline: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 7,
    flexWrap: 'wrap',
  },
  replyAuthor: {
    fontFamily: sans(600),
    fontSize: 12.5,
  },
  replyText: {
    marginTop: 4,
    fontFamily: sans(400),
    fontSize: 13,
    lineHeight: 20,
  },
  tail: { height: 16 },
  composer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  composerInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
