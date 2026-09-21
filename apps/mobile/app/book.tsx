import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from '../lib/supabase';

import {
  PrimaryButton,
  SectionHeading,
  Skeleton,
  theme,
  spacing,
  radius,
  typography,
} from '../components/ui';

type Service = {
  id: string;
  name: string;
  base_price: number;
  duration_minutes: number | null;
};

type PaymentMethod = 'cash' | 'airtel_money' | 'mtn_momo' | 'zamtel_kwacha' | 'card';

export default function Book() {
  const { service: initial } =
    useLocalSearchParams<{ service?: string }>();

  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState(initial ?? '');

  const [date, setDate] = useState(
    new Date(Date.now() + 86400000)
      .toISOString()
      .slice(0, 10),
  );

  const [time, setTime] = useState('10:00');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadServices = async () => {
      try {
        const [{ data, error }, { data: { user } }] = await Promise.all([
          supabase
          .from('services')
          .select(
            'id,name,base_price,duration_minutes',
          )
          .eq('is_active', true)
          .order('sort_order'),
          supabase.auth.getUser(),
        ]);

        if (cancelled) {
          return;
        }

        if (error) {
          console.warn(
            'Book services failed:',
            error,
          );

          setServices([]);
          return;
        }

        setServices(data ?? []);

        if (user) {
          const [{ data: preference }, { data: savedAddress }] = await Promise.all([
            supabase
              .from('customer_preferences')
              .select('payment_preference')
              .eq('customer_id', user.id)
              .maybeSingle(),
            supabase
              .from('customer_saved_addresses')
              .select('address')
              .eq('customer_id', user.id)
              .eq('is_default', true)
              .maybeSingle(),
          ]);

          if (!cancelled) {
            if (preference?.payment_preference) {
              setPaymentMethod(preference.payment_preference as PaymentMethod);
            }
            if (savedAddress?.address) {
              setAddress(savedAddress.address);
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.warn(
            'Book services failed:',
            error,
          );

          setServices([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadServices();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (
      initial &&
      services.some(
        service => service.id === initial,
      )
    ) {
      setServiceId(initial);
    }
  }, [initial, services]);

  const selected = services.find(
    service => service.id === serviceId,
  );

  const confirm = async () => {
    if (
      !serviceId ||
      !address.trim() ||
      !date ||
      !time
    ) {
      Alert.alert(
        'Almost there',
        'Choose a service and enter your appointment location.',
      );

      return;
    }

    setBusy(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert(
          'Sign in required',
          'Create your account to confirm this appointment.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Sign in',
              onPress: () =>
                router.push('/login'),
            },
          ],
        );

        return;
      }

      const scheduledAt = new Date(
        `${date}T${time}:00`,
      ).toISOString();

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          customer_id: user.id,
          service_id: serviceId,
          scheduled_at: scheduledAt,
          address: address.trim(),
          notes: notes.trim() || null,
          payment_method: paymentMethod,
          status: 'received',
          quoted_price:
            selected?.base_price ?? null,
        })
        .select('id')
        .single();

      if (error) {
        Alert.alert(
          'Unable to book',
          error.message,
        );

        return;
      }

      if (!data?.id) {
        Alert.alert(
          'Unable to book',
          'The appointment was created but no booking ID was returned.',
        );

        return;
      }

      /*
       * Location sharing is intentionally NOT started here.
       *
       * The booking must exist first. The customer can
       * enable live location from /bookings/[id], where
       * startLocationSharing() verifies the booking and
       * creates the booking_location_shares record.
       */
      router.replace({
        pathname: '/bookings/[id]',
        params: {
          id: data.id,
        },
      });
    } catch (error) {
      console.warn(
        'Confirm booking failed:',
        error,
      );

      Alert.alert(
        'Unable to book',
        error instanceof Error
          ? error.message
          : 'Something went wrong while creating your appointment.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView
      style={s.page}
      edges={[
        'left',
        'right',
        'bottom',
      ]}
    >
      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.bookingHero}>
          <View style={s.heroGlowOne} />
          <View style={s.heroGlowTwo} />
          <View style={s.heroMark}>
            <Text style={s.heroMarkIcon}>✂</Text>
            <Text style={s.heroMarkText}>SARJ</Text>
          </View>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={({ pressed }) => [
            s.backButton,
            pressed && s.pressed,
          ]}
        >
          <Text style={s.backArrow}>
            ‹
          </Text>

          <Text style={s.backText}>
            BACK
          </Text>
        </Pressable>

        <Text style={s.kicker}>
          NEW APPOINTMENT
        </Text>

        <Text style={s.title}>
          Book your{'\n'}
          <Text style={s.titleGold}>
            fresh look.
          </Text>
        </Text>
        <Text style={s.heroHelper}>Mobile barber service · Your place · Your time</Text>
        </View>

        {/* STEPS */}

        <View style={s.steps}>
          <Step
            n="01"
            text="DETAILS"
            active
          />

          <View style={s.stepLine} />

          <Step
            n="02"
            text="CONFIRM"
          />

          <View style={s.stepLine} />

          <Step
            n="03"
            text="READY"
          />
        </View>

        {/* SERVICE */}

        <View style={s.section}>
          <SectionHeading
            eyebrow="SERVICE"
            title="Choose your look"
          />

          {loading ? (
            <View style={s.skeletonRow}>
              <Skeleton
                width={158}
                height={104}
              />

              <Skeleton
                width={158}
                height={104}
              />
            </View>
          ) : services.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                s.serviceList
              }
            >
              {services.map(
                (item, index) => {
                  const isSelected =
                    item.id === serviceId;

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() =>
                        setServiceId(
                          item.id,
                        )
                      }
                      style={({
                        pressed,
                      }) => [
                        s.service,
                        isSelected &&
                          s.serviceSelected,
                        pressed &&
                          s.pressed,
                      ]}
                    >
                      <View
                        style={s.serviceTop}
                      >
                        <View
                          style={[
                            s.serviceIcon,
                            isSelected &&
                              s.serviceIconSelected,
                          ]}
                        >
                          <Text
                            style={[
                              s.serviceIconText,
                              isSelected &&
                                s.serviceIconTextSelected,
                            ]}
                          >
                            S
                          </Text>
                        </View>

                        <Text
                          style={[
                            s.serviceNumber,
                            isSelected &&
                              s.serviceNumberSelected,
                          ]}
                        >
                          {String(
                            index + 1,
                          ).padStart(
                            2,
                            '0',
                          )}
                        </Text>
                      </View>

                      <Text
                        style={s.serviceName}
                        numberOfLines={2}
                      >
                        {item.name}
                      </Text>

                      <View
                        style={
                          s.serviceMetaRow
                        }
                      >
                        <Text
                          style={[
                            s.servicePrice,
                            isSelected &&
                              s.servicePriceSelected,
                          ]}
                        >
                          K{item.base_price}
                        </Text>

                        <Text
                          style={
                            s.serviceDuration
                          }
                        >
                          ·{' '}
                          {item.duration_minutes ??
                            45}{' '}
                          min
                        </Text>
                      </View>

                      {isSelected ? (
                        <View
                          style={
                            s.selectedMark
                          }
                        >
                          <Text
                            style={
                              s.selectedMarkText
                            }
                          >
                            ✓
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  );
                },
              )}
            </ScrollView>
          ) : (
            <View style={s.emptyService}>
              <Text
                style={
                  s.emptyServiceTitle
                }
              >
                No services available
              </Text>

              <Text
                style={
                  s.emptyServiceCopy
                }
              >
                Please check again shortly.
              </Text>
            </View>
          )}
        </View>

        {/* SCHEDULE */}

        <View style={s.section}>
          <SectionHeading
            eyebrow="SCHEDULE"
            title="When should we come?"
          />

          <View style={s.pair}>
            <Field
              label="DATE"
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
            />

            <Field
              label="TIME"
              value={time}
              onChangeText={setTime}
              placeholder="10:00"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* LOCATION */}

        <View style={s.section}>
          <SectionHeading
            eyebrow="LOCATION"
            title="Where are you?"
          />

          <Field
            value={address}
            onChangeText={setAddress}
            placeholder="Home, office, hotel or event address"
            autoCapitalize="sentences"
          />

          <View style={s.field}>
            <Text style={s.label}>
              SPECIAL REQUEST
              <Text style={s.optional}>
                {' '}· OPTIONAL
              </Text>
            </Text>

            <TextInput
              style={[
                s.input,
                s.note,
              ]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Anything we should know?"
              placeholderTextColor={
                theme.mutedDark
              }
              multiline
              textAlignVertical="top"
              autoCapitalize="sentences"
            />
          </View>
        </View>

        {/* SUMMARY */}

        <View style={s.summary}>
          <View style={s.summaryTop}>
            <Text style={s.summaryLabel}>
              YOUR SESSION
            </Text>

            <View
              style={s.summaryStatus}
            >
              <View
                style={s.summaryDot}
              />

              <Text
                style={
                  s.summaryStatusText
                }
              >
                READY
              </Text>
            </View>
          </View>

          <Text style={s.summaryName}>
            {selected?.name ??
              'Select a service'}
          </Text>

          <View
            style={s.summaryBottom}
          >
            <Text style={s.summaryPrice}>
              {selected
                ? `K${selected.base_price}`
                : '—'}
            </Text>

            <Text style={s.cash}>
              · Pay cash after service
            </Text>
          </View>
        </View>

        {/* CONFIRM */}

        <PrimaryButton
          title="CONFIRM APPOINTMENT  →"
          onPress={confirm}
          disabled={busy}
          loading={busy}
        />

        <View style={s.helpBox}>
          <Text style={s.helpIcon}>
            i
          </Text>

          <Text style={s.help}>
            You will receive updates as your
            booking progresses.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Step({
  n,
  text,
  active,
}: {
  n: string;
  text: string;
  active?: boolean;
}) {
  return (
    <View style={s.step}>
      <View
        style={[
          s.stepNumber,
          active &&
            s.stepNumberActive,
        ]}
      >
        <Text
          style={[
            s.stepN,
            active && s.active,
          ]}
        >
          {n}
        </Text>
      </View>

      <Text
        style={[
          s.stepText,
          active && s.active,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'none',
}: {
  label?: string;
  value: string;
  onChangeText: (
    value: string,
  ) => void;
  placeholder: string;
  autoCapitalize?:
    | 'none'
    | 'sentences'
    | 'words'
    | 'characters';
}) {
  return (
    <View style={s.field}>
      {label ? (
        <Text style={s.label}>
          {label}
        </Text>
      ) : null}

      <TextInput
        style={s.input}
        value={value}
        onChangeText={
          onChangeText
        }
        placeholder={
          placeholder
        }
        placeholderTextColor={
          theme.mutedDark
        }
        autoCapitalize={
          autoCapitalize
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.bg,
  },

  content: {
    paddingHorizontal:
      spacing.page,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },

  bookingHero: {
    minHeight: 196,
    padding: spacing.lg,
    overflow: 'hidden',
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: '#5D4B1D',
    backgroundColor: '#17140B',
    position: 'relative',
  },

  heroGlowOne: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -70,
    top: -68,
    backgroundColor: '#5B4214',
  },

  heroGlowTwo: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    right: 26,
    bottom: -66,
    backgroundColor: '#173F50',
  },

  heroMark: {
    position: 'absolute',
    top: 20,
    right: 21,
    alignItems: 'center',
  },

  heroMarkIcon: { color: theme.goldSoft, fontSize: 31, fontWeight: '900' },
  heroMarkText: { color: theme.text, fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginTop: 3 },

  heroHelper: {
    maxWidth: '70%',
    marginTop: 8,
    color: theme.textSoft,
    fontSize: 11,
    lineHeight: 16,
  },

  /* HEADER */

  backButton: {
    alignSelf: 'flex-start',
    minHeight: 42,
    paddingRight: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },

  backArrow: {
    color: theme.goldSoft,
    fontSize: 25,
    lineHeight: 27,
    fontWeight: '300',
    marginRight: 4,
  },

  backText: {
    color: theme.goldSoft,
    fontSize:
      typography.caption,
    fontWeight: '900',
    letterSpacing: 0.9,
  },

  kicker: {
    color: theme.gold,
    fontSize:
      typography.caption,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: spacing.lg,
  },

  title: {
    color: theme.text,
    fontSize:
      typography.hero,
    lineHeight: 39,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 7,
  },

  titleGold: {
    color: theme.goldSoft,
  },

  /* STEPS */

  steps: {
    marginTop: spacing.xl,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.line,
    flexDirection: 'row',
    alignItems: 'center',
  },

  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  stepNumber: {
    width: 23,
    height: 23,
    borderRadius: 12,
    backgroundColor:
      theme.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepNumberActive: {
    backgroundColor:
      theme.goldSurface,
    borderWidth: 1,
    borderColor:
      theme.goldDark,
  },

  stepN: {
    color: theme.mutedDark,
    fontSize: 8,
    fontWeight: '900',
  },

  stepText: {
    color: theme.mutedDark,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  active: {
    color: theme.gold,
  },

  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor:
      theme.lineSoft,
    marginHorizontal: 7,
  },

  /* SECTIONS */

  section: {
    marginTop:
      spacing.section,
  },

  /* SERVICES */

  skeletonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  serviceList: {
    gap: spacing.md,
    paddingRight: spacing.xs,
  },

  service: {
    width: 174,
    minHeight: 142,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor:
      theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    position: 'relative',
    justifyContent:
      'space-between',
  },

  serviceSelected: {
    backgroundColor:
      theme.goldSurface,
    borderColor:
      theme.gold,
  },

  serviceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  serviceIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor:
      theme.surface3,
    borderWidth: 1,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
  },

  serviceIconSelected: {
    backgroundColor: '#3A3014',
    borderColor:
      theme.goldDark,
  },

  serviceIconText: {
    color: theme.muted,
    fontSize:
      typography.body,
    fontWeight: '900',
  },

  serviceIconTextSelected: {
    color: theme.goldSoft,
  },

  serviceNumber: {
    color: theme.mutedDark,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  serviceNumberSelected: {
    color: theme.goldDark,
  },

  serviceName: {
    color: theme.text,
    fontSize:
      typography.bodyLarge,
    lineHeight: 20,
    fontWeight: '900',
    marginTop: 15,
  },

  serviceMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 9,
  },

  servicePrice: {
    color: theme.textSoft,
    fontSize:
      typography.bodySmall,
    fontWeight: '900',
  },

  servicePriceSelected: {
    color: theme.goldSoft,
  },

  serviceDuration: {
    color: theme.muted,
    fontSize: 10,
    marginLeft: 3,
  },

  selectedMark: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor:
      theme.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedMarkText: {
    color: theme.bg,
    fontSize: 11,
    fontWeight: '900',
  },

  emptyService: {
    minHeight: 100,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor:
      theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    justifyContent: 'center',
  },

  emptyServiceTitle: {
    color: theme.text,
    fontSize:
      typography.body,
    fontWeight: '900',
  },

  emptyServiceCopy: {
    color: theme.muted,
    fontSize:
      typography.bodySmall,
    marginTop: 4,
  },

  /* FIELDS */

  pair: {
    flexDirection: 'row',
    gap: spacing.md,
  },

  field: {
    flex: 1,
    marginBottom: spacing.md,
  },

  label: {
    color: theme.goldSoft,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 7,
  },

  optional: {
    color: theme.mutedDark,
  },

  input: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: radius.md,
    backgroundColor:
      theme.surface2,
    paddingHorizontal:
      spacing.md,
    color: theme.text,
    fontSize:
      typography.body,
  },

  note: {
    height: 105,
    paddingTop: spacing.md,
  },

  /* SUMMARY */

  summary: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: '#17140B',
    borderWidth: 1,
    borderColor: '#4A3B18',
  },

  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  summaryLabel: {
    color: '#9A8442',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  summaryStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  summaryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor:
      theme.gold,
  },

  summaryStatusText: {
    color: theme.goldDark,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  summaryName: {
    color: theme.text,
    fontSize:
      typography.titleSmall,
    fontWeight: '900',
    marginTop: 8,
  },

  summaryBottom: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 5,
  },

  summaryPrice: {
    color: theme.goldSoft,
    fontSize:
      typography.bodyLarge,
    fontWeight: '900',
  },

  cash: {
    color: theme.muted,
    fontSize: 10,
    marginLeft: 5,
  },

  /* HELP */

  helpBox: {
    minHeight: 40,
    paddingHorizontal:
      spacing.sm,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  helpIcon: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor:
      theme.surface3,
    color: theme.muted,
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 17,
    marginRight: 7,
  },

  help: {
    color: theme.mutedDark,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.7,
  },
});
