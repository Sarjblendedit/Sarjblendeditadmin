import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '../components/ui';

export default function About() {
  const callSARJ = async () => {
    try {
      await Linking.openURL('tel:+260975616716');
    } catch (error) {
      console.error('Unable to open phone:', error);
    }
  };

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

        <View style={styles.hero}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>S</Text>
          </View>

          <Text style={styles.kicker}>ABOUT</Text>

          <Text style={styles.title}>SARJ BLENDED IT</Text>

          <Text style={styles.subtitle}>
            Premium mobile grooming brought directly to your home, office,
            hotel or event.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Our service</Text>

          <Text style={styles.cardText}>
            SARJ BLENDED IT makes it easier to book professional grooming
            services wherever you are. Use the app to manage your account,
            browse services and keep track of your appointments.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your SARJ account</Text>

          <Text style={styles.cardText}>
            Your account gives you a central place to manage your profile,
            appointments and preferences.
          </Text>
        </View>

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Contact SARJ</Text>

          <Text style={styles.contactText}>
            For questions or assistance, contact the SARJ team directly.
          </Text>

          <Pressable
            onPress={callSARJ}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.buttonText}>CALL +260 9756 16716</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>SARJ BLENDED IT</Text>

        <Text style={styles.footer}>
          Your grooming. Your location. Your time.
        </Text>
      </ScrollView>
    </SafeAreaView>
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

  hero: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },

  logo: {
    width: 76,
    height: 76,
    borderRadius: 25,
    backgroundColor: theme.goldSurface,
    borderWidth: 1,
    borderColor: theme.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  logoText: {
    color: theme.gold,
    fontSize: 34,
    fontWeight: '900',
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
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '900',
    textAlign: 'center',
  },

  subtitle: {
    color: theme.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 8,
  },

  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    marginBottom: 12,
  },

  cardTitle: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 7,
  },

  cardText: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 19,
  },

  contactCard: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    marginTop: 2,
  },

  contactTitle: {
    color: theme.text,
    fontSize: 18,
    fontWeight: '900',
  },

  contactText: {
    color: theme.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },

  button: {
    height: 50,
    borderRadius: 15,
    backgroundColor: theme.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 17,
  },

  buttonText: {
    color: theme.bg,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  version: {
    color: theme.goldSoft,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginTop: 22,
  },

  footer: {
    color: theme.mutedDark,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 7,
  },

  pressed: {
    opacity: 0.68,
  },
});