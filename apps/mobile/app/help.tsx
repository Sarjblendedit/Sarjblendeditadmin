import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OperationalHero, theme } from '../components/ui';

const PHONE = '+260975616716';
const EMAIL = 'sarjblendedit@gmail.com';

export default function HelpScreen() {
  const callSupport = async () => {
    await Linking.openURL(`tel:${PHONE}`);
  };

  const openWhatsApp = async () => {
    await Linking.openURL(`https://wa.me/${PHONE.replace(/\D/g, '')}`);
  };

  const sendEmail = async () => {
    await Linking.openURL(
      `mailto:${EMAIL}?subject=${encodeURIComponent('SARJ BLENDED IT Support')}`,
    );
  };

  return (
    <SafeAreaView style={styles.page} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.replace('/account')}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>ACCOUNT</Text>
        </Pressable>

        <OperationalHero eyebrow="SUPPORT" title="Help & support" copy="Need help with bookings, payments or your account? Contact the SARJ team directly." icon="?" />

        <View style={styles.card}>
          <SupportButton
            icon="☎"
            title="Call SARJ"
            detail={PHONE}
            onPress={callSupport}
          />

          <View style={styles.divider} />

          <SupportButton
            icon="✉"
            title="Email Support"
            detail={EMAIL}
            onPress={sendEmail}
          />

          <View style={styles.divider} />

          <SupportButton
            icon="◉"
            title="WhatsApp"
            detail="Chat with SARJ on WhatsApp"
            onPress={openWhatsApp}
          />
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What can we help with?</Text>

          <Text style={styles.infoItem}>• Booking and appointment issues</Text>
          <Text style={styles.infoItem}>• Payment questions</Text>
          <Text style={styles.infoItem}>• Account and password assistance</Text>
          <Text style={styles.infoItem}>• General SARJ enquiries</Text>
        </View>

        <Text style={styles.footer}>SARJ BLENDED IT</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SupportButton({
  icon,
  title,
  detail,
  onPress,
}: {
  icon: string;
  title: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.supportButton,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>

      <View style={styles.supportContent}>
        <Text style={styles.supportTitle}>{title}</Text>
        <Text style={styles.supportDetail}>{detail}</Text>
      </View>

      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.bg,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 60,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingRight: 12,
  },

  backArrow: {
    color: theme.gold,
    fontSize: 28,
    lineHeight: 28,
    marginRight: 6,
  },

  backText: {
    color: theme.goldSoft,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  intro: {
    marginTop: 20,
    marginBottom: 22,
  },

  kicker: {
    color: theme.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 7,
  },

  title: {
    color: theme.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    letterSpacing: -0.7,
  },

  subtitle: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
    maxWidth: 340,
  },

  card: {
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
  },

  supportButton: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
  },

  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: theme.goldSurface,
    borderWidth: 1,
    borderColor: theme.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  icon: {
    color: theme.gold,
    fontSize: 18,
    fontWeight: '900',
  },

  supportContent: {
    flex: 1,
  },

  supportTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '900',
  },

  supportDetail: {
    color: theme.muted,
    fontSize: 10,
    marginTop: 4,
  },

  arrow: {
    color: theme.mutedDark,
    fontSize: 25,
    marginLeft: 8,
  },

  divider: {
    height: 1,
    backgroundColor: theme.lineSoft,
  },

  infoCard: {
    marginTop: 16,
    padding: 18,
    borderRadius: 20,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
  },

  infoTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 12,
  },

  infoItem: {
    color: theme.muted,
    fontSize: 11,
    lineHeight: 20,
  },

  footer: {
    color: theme.mutedDark,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 24,
  },

  pressed: {
    opacity: 0.68,
  },
});
