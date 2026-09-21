import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OperationalHero, theme } from '../components/ui';

export default function Privacy() {
  return (
    <SafeAreaView style={styles.page} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>ACCOUNT</Text>
        </Pressable>

        <OperationalHero eyebrow="YOUR INFORMATION" title="Privacy" copy="Understand how your account information is used within SARJ." icon="◌" />

        <InfoCard
          title="Your account information"
          text="Your account contains information such as your name and email address so SARJ can identify your account and provide account-related services."
        />

        <InfoCard
          title="Your bookings"
          text="Booking information is associated with your account so you can view and manage your appointments."
        />

        <InfoCard
          title="Your information"
          text="Keep your account details accurate and avoid sharing your password or other private account information with other people."
        />

        <InfoCard
          title="Need help?"
          text="If you have a privacy question or need assistance with your account information, contact SARJ BLENDED IT through the support section."
        />

        <Pressable
          onPress={() => router.push('/help')}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.buttonText}>HELP & SUPPORT</Text>
        </Pressable>

        <Text style={styles.footer}>SARJ BLENDED IT</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>•</Text>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.bg,
  },

  content: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 100,
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    minHeight: 42,
    paddingRight: 14,
  },

  backArrow: {
    color: theme.gold,
    fontSize: 30,
    lineHeight: 30,
    marginRight: 7,
  },

  backText: {
    color: theme.goldSoft,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  header: {
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
  },

  subtitle: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },

  card: {
    flexDirection: 'row',
    padding: 18,
    borderRadius: 20,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    marginBottom: 12,
  },

  icon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: theme.goldSurface,
    borderWidth: 1,
    borderColor: theme.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  iconText: {
    color: theme.gold,
    fontSize: 18,
    fontWeight: '900',
  },

  cardContent: {
    flex: 1,
  },

  cardTitle: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 5,
  },

  cardText: {
    color: theme.muted,
    fontSize: 11,
    lineHeight: 18,
  },

  button: {
    height: 50,
    borderRadius: 15,
    backgroundColor: theme.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5,
  },

  buttonText: {
    color: theme.bg,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  footer: {
    color: theme.mutedDark,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 22,
  },

  pressed: {
    opacity: 0.68,
  },
});
