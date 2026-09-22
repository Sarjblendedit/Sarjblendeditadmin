import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';

import { supabase } from '../lib/supabase';
import {
  Card,
  Logo,
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
  description: string | null;
  base_price: number;
};

type GalleryItem = {
  id: string;
  title: string | null;
  media_url: string;
  media_type: string;
  category: string | null;
  is_published: boolean;
  created_at: string;
};

type BusinessStats = {
  serviceCount: number;
  clientCount: number;
  rating: number;
  reviewCount: number;
};

const cash = (n: number) => `K${Number(n).toFixed(0)}`;

export default function Home() {
  const {
    width,
    height: screenHeight,
  } = useWindowDimensions();

  const screenWidth = width;

  const [services, setServices] = useState<Service[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [name, setName] = useState('Guest');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryError, setGalleryError] = useState<string | null>(null);

  const [stats, setStats] = useState<BusinessStats>({
    serviceCount: 0,
    clientCount: 0,
    rating: 0,
    reviewCount: 0,
  });

  const [galleryVisible, setGalleryVisible] = useState(false);
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(0);

  /*
   * IMPORTANT:
   * This ref is ONLY used by the full-screen preview.
   * The main showcase slider uses its own FlatList.
   */
  const galleryListRef = useRef<FlatList<GalleryItem>>(null);

  const fade = useRef(new Animated.Value(0)).current;
  const heroScale = useRef(new Animated.Value(0.985)).current;
  const serviceSlide = useRef(new Animated.Value(0)).current;

  const pageHorizontalPadding =
    width >= 600 ? 28 : spacing.page;

  const isSmall = width < 380;

  /*
   * Showcase card sizing.
   * One large card is visible with part of the next card
   * showing on the right.
   */
  const showcaseCardWidth =
    width < 380
      ? width * 0.82
      : width * 0.78;

  const showcaseCardHeight =
    width < 380 ? 350 : 390;

  const showcaseSnapInterval =
    showcaseCardWidth + 14;

  const loadHomeData = useCallback(async () => {
    try {
      setLoading(true);
      setGalleryLoading(true);
      setGalleryError(null);

      const [
        {
          data: serviceData,
          error: serviceError,
          count: serviceCount,
        },
        {
          data: galleryData,
          error: galleryFetchError,
        },
        {
          data: reviewData,
          error: reviewError,
        },
        {
          count: clientCount,
          error: clientCountError,
        },
        {
          data: { user },
        },
      ] = await Promise.all([
        supabase
          .from('services')
          .select(
            'id,name,description,base_price',
            { count: 'exact' },
          )
          .eq('is_active', true)
          .order('sort_order'),

        supabase
          .from('gallery_items')
          .select(
            'id,title,media_url,media_type,category,is_published,created_at',
          )
          .eq('is_published', true)
          .eq('media_type', 'image')
          .order('created_at', { ascending: false })
          .limit(30),

        supabase
          .from('reviews')
          .select('rating'),

        supabase
          .from('profiles')
          .select('id', {
            count: 'exact',
            head: true,
          }),

        supabase.auth.getUser(),
      ]);

      if (serviceError) {
        console.warn(
          'Home services failed:',
          serviceError,
        );
      }

      if (galleryFetchError) {
        console.warn(
          'Home gallery failed:',
          galleryFetchError,
        );

        setGalleryError(
          'Gallery is temporarily unavailable. Please try again.',
        );
      }

      if (reviewError) {
        console.warn(
          'Home reviews failed:',
          reviewError,
        );
      }

      if (clientCountError) {
        console.warn(
          'Home client count failed:',
          clientCountError,
        );
      }

      const cleanGallery = (
        galleryData ?? []
      ).filter(
        (item) =>
          typeof item.media_url === 'string' &&
          item.media_url.trim().length > 0,
      );

      setServices(serviceData ?? []);
      setGallery(cleanGallery);

      const ratings = (reviewData ?? [])
        .map(
          (review: {
            rating: number | null;
          }) => Number(review.rating),
        )
        .filter(
          (rating) =>
            Number.isFinite(rating) &&
            rating > 0,
        );

      const averageRating =
        ratings.length > 0
          ? ratings.reduce(
              (total, rating) =>
                total + rating,
              0,
            ) / ratings.length
          : 0;

      setStats({
        serviceCount:
          serviceCount ??
          serviceData?.length ??
          0,

        clientCount: clientCount ?? 0,

        rating: averageRating,

        reviewCount: ratings.length,
      });

      if (user?.user_metadata?.full_name) {
        setName(
          user.user_metadata.full_name.split(
            ' ',
          )[0],
        );
      } else if (user) {
        const { data: profile } =
          await supabase
            .from('profiles')
            .select(
              'first_name, full_name',
            )
            .eq('id', user.id)
            .maybeSingle();

        const profileName =
          profile?.first_name ||
          profile?.full_name?.split(' ')[0];

        if (profileName) {
          setName(profileName);
        }
      }
    } catch (error) {
      console.warn(
        'Home loading failed:',
        error,
      );

      setGalleryError(
        'Some home content could not be loaded. Please try again.',
      );
    } finally {
      setLoading(false);
      setGalleryLoading(false);

      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),

        Animated.spring(heroScale, {
          toValue: 1,
          tension: 55,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.timing(serviceSlide, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }).start();
    }
  }, [fade, heroScale]);

  useEffect(() => {
    void loadHomeData();
  }, [loadHomeData]);

  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        'change',
        (nextState) => {
          if (nextState === 'active') {
            void loadHomeData();
          }
        },
      );

    return () => {
      subscription.remove();
    };
  }, [loadHomeData]);

  const book = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    router.push(user ? '/book' : '/login');
  };

  const refreshHome = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  /*
   * Opens the full-screen gallery preview.
   */
  const openGallery = (index: number) => {
    setSelectedGalleryIndex(index);
    setGalleryVisible(true);

    requestAnimationFrame(() => {
      setTimeout(() => {
        galleryListRef.current?.scrollToIndex({
          index,
          animated: false,
        });
      }, 50);
    });
  };

  return (
    <SafeAreaView
      style={s.page}
      edges={['left', 'right']}
    >
      <Animated.View
        style={[
          s.flex,
          {
            opacity: fade,
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: spacing.sm,
            paddingHorizontal:
              pageHorizontalPadding,
            // Leave room for the persistent navigation and chat launcher.
            paddingBottom: 112,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void refreshHome()}
              tintColor={theme.gold}
              colors={[theme.gold]}
            />
          }
        >
          {/* =================================================
              COMPACT HERO
          ================================================= */}

          <Animated.View
            style={[
              s.hero,
              {
                transform: [
                  { perspective: 900 },
                  {
                    rotateX: heroScale.interpolate({
                      inputRange: [0.985, 1],
                      outputRange: ['1.4deg', '0deg'],
                    }),
                  },
                  {
                    scale: heroScale,
                  },
                ],
              },
            ]}
          >
            <View style={s.heroOrbLarge} />
            <View style={s.heroOrbSmall} />
            <View style={s.heroGlowLine} />

            <View style={s.heroHeader}>
              <View style={s.brandWrap}>
                <Logo small />

                <View style={s.liveIndicator}>
                  <View style={s.liveDot} />

                  <Text style={s.liveText}>
                    MOBILE GROOMING
                  </Text>
                </View>
              </View>

              <View style={s.heroIndex}>
                <Text style={s.heroIndexText}>
                  01
                </Text>
              </View>
            </View>

            <View style={s.heroMain}>
              <View style={s.heroGreetingRow}>
                <View style={s.heroAccent} />

                <Text style={s.kicker}>
                  GOOD DAY, {name.toUpperCase()}
                </Text>
              </View>

              <Text
                style={[
                  s.heroTitle,
                  isSmall &&
                    s.heroTitleSmall,
                ]}
              >
                  Your next sharp look,
              </Text>

              <Text
                style={[
                  s.heroTitleGold,
                  isSmall &&
                    s.heroTitleGoldSmall,
                ]}
              >
                  on your schedule.
              </Text>

              <Text style={s.heroCopy}>
                Book a professional barber to your home, office or event.
              </Text>

              <View style={s.heroActions}>
                <PrimaryButton
                  title="BOOK NOW  →"
                  onPress={book}
                />

                <Pressable
                  onPress={() =>
                    router.push('/book')
                  }
                  hitSlop={8}
                  style={({ pressed }) => [
                    s.exploreButton,
                    pressed &&
                      s.buttonPressed,
                  ]}
                >
                  <Text
                    style={s.exploreText}
                  >
                    EXPLORE SERVICES
                  </Text>

                  <Text
                    style={s.exploreArrow}
                  >
                    ↓
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={s.heroFooter}>
              <View style={s.heroFooterItem}>
                <Text
                  style={s.heroFooterValue}
                >
                  7 DAYS
                </Text>

                <Text
                  style={s.heroFooterLabel}
                >
                  AVAILABLE
                </Text>
              </View>

              <View
                style={s.heroFooterDivider}
              />

              <View style={s.heroFooterItem}>
                <Text
                  style={s.heroFooterValue}
                >
                  ON-DEMAND
                </Text>

                <Text
                  style={s.heroFooterLabel}
                >
                  MOBILE SERVICE
                </Text>
              </View>

              <View
                style={s.heroFooterDivider}
              />

              <View style={s.heroFooterItem}>
                <Text
                  style={s.heroFooterValue}
                >
                  PREMIUM
                </Text>

                <Text
                  style={s.heroFooterLabel}
                >
                  EXPERIENCE
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* A compact command deck keeps the most useful customer actions
              immediately available instead of leaving dead space below hero. */}
          <View style={s.commandDeck}>
            <Pressable onPress={book} style={({ pressed }) => [s.commandCard, s.commandPrimary, pressed && s.commandPressed]}>
              <View style={s.commandIcon}><Text style={s.commandIconText}>＋</Text></View>
              <View style={s.commandCopy}><Text style={[s.commandTitle, s.commandPrimaryTitle]}>Book a service</Text><Text style={[s.commandText, s.commandPrimaryText]}>Choose a time and place</Text></View>
              <Text style={[s.commandArrow, s.commandPrimaryArrow]}>→</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/bookings')} style={({ pressed }) => [s.commandCard, s.commandDark, pressed && s.commandPressed]}>
              <View style={[s.commandIcon, s.commandIconBlue]}><Text style={s.commandIconText}>◷</Text></View>
              <View style={s.commandCopy}><Text style={s.commandTitle}>My appointments</Text><Text style={s.commandText}>Track every booking</Text></View>
              <Text style={s.commandArrow}>→</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/account')} style={({ pressed }) => [s.commandCard, s.commandDark, pressed && s.commandPressed]}>
              <View style={[s.commandIcon, s.commandIconGreen]}><Text style={s.commandIconText}>◎</Text></View>
              <View style={s.commandCopy}><Text style={s.commandTitle}>Your account</Text><Text style={s.commandText}>Settings and support</Text></View>
              <Text style={s.commandArrow}>→</Text>
            </Pressable>
          </View>

          {/* =================================================
              REAL BUSINESS STATS
          ================================================= */}

          <View style={s.valueStrip}>
            <View style={s.valueItem}>
              <Text style={s.valueNumber}>
                {stats.serviceCount}
              </Text>

              <Text style={s.valueLabel}>
                SERVICES
              </Text>
            </View>

            <View style={s.valueDivider} />

            <View style={s.valueItem}>
              <Text style={s.valueNumber}>
                {stats.clientCount}
              </Text>

              <Text style={s.valueLabel}>
                CLIENTS
              </Text>
            </View>

            <View style={s.valueDivider} />

            <View style={s.valueItem}>
              <Text style={s.valueNumber}>
                {stats.rating > 0
                  ? `${stats.rating.toFixed(1)}★`
                  : '—'}
              </Text>

              <Text style={s.valueLabel}>
                CLIENT RATING
              </Text>
            </View>
          </View>

          {/* =================================================
              SERVICES
          ================================================= */}

          <View style={s.section}>
            <SectionHeading
              eyebrow="SIGNATURE SERVICES"
              title="Choose your look"
              action="VIEW ALL"
              onAction={book}
            />

            {loading ? (
              <View style={s.skeletonRow}>
                <Skeleton
                  width={154}
                  height={172}
                />

                <Skeleton
                  width={154}
                  height={172}
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
                decelerationRate="fast"
              >
                {services
                  .slice(0, 6)
                  .map((item, index) => (
                    <Animated.View
                      key={item.id}
                       style={{
                         opacity: serviceSlide,
                         transform: [{
                           translateX: serviceSlide.interpolate({
                             inputRange: [0, 1],
                             outputRange: [28 + index * 8, 0],
                           }),
                         }, {
                           perspective: 800,
                         }, {
                           rotateY: serviceSlide.interpolate({
                             inputRange: [0, 1],
                             outputRange: ['5deg', '0deg'],
                           }),
                         }],
                       }}
                     >
                      <Link
                        href={{ pathname: '/book', params: { service: item.id } }}
                        asChild
                      >
                       <Pressable
                         style={({ pressed }) => [
                           s.service,
                           index % 3 === 0 && s.serviceBlue,
                           index % 3 === 1 && s.serviceGold,
                           index % 3 === 2 && s.serviceGreen,
                           pressed && s.cardPressed,
                         ]}
                       >
                         <View
                           style={[
                             s.serviceColorBand,
                             index % 3 === 0 && s.serviceBlueBand,
                             index % 3 === 1 && s.serviceGoldBand,
                             index % 3 === 2 && s.serviceGreenBand,
                           ]}
                         />
                         <View
                          style={
                            s.serviceTop
                          }
                        >
                          <View
                            style={
                              s.serviceIcon
                            }
                          >
                            <Text
                              style={
                                s.serviceIconText
                              }
                            >
                              {String(
                                index + 1,
                              ).padStart(
                                2,
                                '0',
                              )}
                            </Text>
                          </View>

                          <View
                            style={
                              s.serviceArrowCircle
                            }
                          >
                            <Text
                              style={
                                s.serviceArrow
                              }
                            >
                              ↗
                            </Text>
                          </View>
                        </View>

                        <View
                          style={
                            s.serviceBody
                          }
                        >
                          <Text style={s.serviceLabel}>
                            SIGNATURE SERVICE
                          </Text>
                          <Text
                            style={
                              s.serviceName
                            }
                            numberOfLines={2}
                          >
                            {item.name}
                          </Text>

                          <Text
                            style={s.desc}
                            numberOfLines={2}
                          >
                            {item.description ??
                              'Premium mobile grooming service.'}
                          </Text>
                        </View>

                        <View
                          style={
                            s.serviceBottom
                          }
                        >
                          <View style={s.pricePill}>
                            <Text style={s.priceLabel}>STARTING AT</Text>
                            <Text style={s.price}>{cash(item.base_price)}</Text>
                          </View>

                          <View
                            style={
                              s.serviceLine
                            }
                          />
                        </View>
                       </Pressable>
                      </Link>
                     </Animated.View>
                  ))}
              </ScrollView>
            ) : (
              <Card
                style={s.emptyCard}
              >
                <View
                  style={s.emptyIcon}
                >
                  <Text
                    style={
                      s.emptyIconText
                    }
                  >
                    S
                  </Text>
                </View>

                <View
                  style={
                    s.emptyContent
                  }
                >
                  <Text
                    style={
                      s.emptyTitle
                    }
                  >
                    Services coming soon
                  </Text>

                  <Text
                    style={s.emptyCopy}
                  >
                    Our available grooming
                    services will appear here.
                  </Text>
                </View>
              </Card>
            )}
          </View>

          {/* =================================================
              CHOOSE YOUR LOOK / SHOWCASE SLIDER
          ================================================= */}

          <View style={s.section}>
            <View style={s.showcaseHeading}>
              <View style={s.showcaseHeadingText}>
                <Text
                  style={s.sectionEyebrow}
                >
                  SARJ SHOWCASE
                </Text>

                <Text
                  style={s.sectionTitle}
                >
                  Choose Your Look
                </Text>

                <Text
                  style={
                    s.sectionSubtitle
                  }
                >
                  Swipe through our latest
                  styles and finishes.
                </Text>
              </View>

              {gallery.length > 0 ? (
                <View
                  style={s.photoCount}
                >
                  <Text
                    style={
                      s.photoCountText
                    }
                  >
                    {gallery.length} PHOTOS
                  </Text>
                </View>
              ) : null}
            </View>

            {galleryLoading ? (
              <View
                style={s.galleryLoading}
              >
                <ActivityIndicator
                  size="small"
                  color={theme.gold}
                />

                <Text
                  style={
                    s.galleryLoadingText
                  }
                >
                  Loading showcase…
                </Text>
              </View>
            ) : galleryError ? (
              <Card
                style={s.galleryMessage}
              >
                <View
                  style={s.messageIcon}
                >
                  <Text
                    style={
                      s.messageIconText
                    }
                  >
                    !
                  </Text>
                </View>

                <View
                  style={
                    s.messageContent
                  }
                >
                  <Text
                    style={
                      s.galleryMessageTitle
                    }
                  >
                    Gallery unavailable
                  </Text>

                  <Text
                    style={
                      s.galleryMessageCopy
                    }
                  >
                    {galleryError}
                  </Text>

                  <Pressable
                    onPress={() =>
                      void loadHomeData()
                    }
                    hitSlop={8}
                    style={({
                      pressed,
                    }) => [
                      s.retryButton,
                      pressed &&
                        s.buttonPressed,
                    ]}
                  >
                    <Text
                      style={s.retryText}
                    >
                      TRY AGAIN
                    </Text>
                  </Pressable>
                </View>
              </Card>
            ) : gallery.length === 0 ? (
              <Card
                style={s.galleryMessage}
              >
                <View
                  style={s.messageIcon}
                >
                  <Text
                    style={
                      s.messageIconText
                    }
                  >
                    S
                  </Text>
                </View>

                <View
                  style={
                    s.messageContent
                  }
                >
                  <Text
                    style={
                      s.galleryMessageTitle
                    }
                  >
                    The showcase is coming soon
                  </Text>

                  <Text
                    style={
                      s.galleryMessageCopy
                    }
                  >
                    New SARJ work will appear
                    here when it is published.
                  </Text>
                </View>
              </Card>
            ) : (
              <FlatList
                data={gallery}
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                keyExtractor={(item) =>
                  item.id
                }
                decelerationRate="fast"
                snapToInterval={
                  showcaseSnapInterval
                }
                snapToAlignment="start"
                disableIntervalMomentum
                contentContainerStyle={
                  s.galleryList
                }
                ItemSeparatorComponent={() => (
                  <View
                    style={{
                      width: 14,
                    }}
                  />
                )}
                renderItem={({
                  item,
                  index,
                }) => (
                  <Pressable
                    onPress={() =>
                      openGallery(index)
                    }
                    style={({
                      pressed,
                    }) => [
                      s.galleryItem,
                      {
                        width:
                          showcaseCardWidth,
                        height:
                          showcaseCardHeight,
                      },
                      pressed &&
                        s.cardPressed,
                    ]}
                  >
                    <Image
                      source={{
                        uri: item.media_url,
                      }}
                      style={
                        s.galleryImage
                      }
                      resizeMode="cover"
                    />

                    <View
                      style={
                        s.galleryShade
                      }
                    />

                    <View
                      style={
                        s.galleryTopBadge
                      }
                    >
                      <Text
                        style={
                          s.galleryNumber
                        }
                      >
                        {String(
                          index + 1,
                        ).padStart(
                          2,
                          '0',
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        s.galleryOverlay
                      }
                    >
                      {item.category ? (
                        <Text
                          style={
                            s.galleryCategory
                          }
                          numberOfLines={1}
                        >
                          {item.category}
                        </Text>
                      ) : null}

                      <Text
                        style={
                          s.galleryTitle
                        }
                        numberOfLines={2}
                      >
                        {item.title ||
                          'SARJ BLENDED IT'}
                      </Text>

                      <View
                        style={
                          s.galleryBottomLine
                        }
                      >
                        <Text
                          style={
                            s.galleryViewText
                          }
                        >
                          VIEW LOOK
                        </Text>

                        <View
                          style={
                            s.galleryArrowCircle
                          }
                        >
                          <Text
                            style={
                              s.galleryArrow
                            }
                          >
                            →
                          </Text>
                        </View>
                      </View>
                    </View>
                  </Pressable>
                )}
              />
            )}
          </View>

          {/* =================================================
              WHY SARJ
          ================================================= */}

          <View style={s.section}>
            <View style={s.showcaseHeading}>
              <View>
                <Text
                  style={s.sectionEyebrow}
                >
                  WHY SARJ
                </Text>

                <Text
                  style={s.sectionTitle}
                >
                  Grooming, simplified.
                </Text>
              </View>
            </View>

            <View style={s.benefits}>
              <Benefit
                number="01"
                title="We come to you"
                copy="Home, office, hotel or event."
              />

              <Benefit
                number="02"
                title="Book in minutes"
                copy="Choose a service, time and location."
              />

              <Benefit
                number="03"
                title="Premium detail"
                copy="A clean finish, every single time."
              />
            </View>
          </View>

          {/* =================================================
              QUICK BOOK PANEL
          ================================================= */}

          <View style={s.quickBook}>
            <View style={s.quickBookGlow} />

            <View style={s.quickBookTop}>
              <View style={s.quickBookBadge}>
                <View
                  style={s.quickBookDot}
                />

                <Text
                  style={
                    s.quickBookBadgeText
                  }
                >
                  READY WHEN YOU ARE
                </Text>
              </View>

              <Text
                style={s.quickBookNumber}
              >
                04
              </Text>
            </View>

            <Text style={s.quickBookTitle}>
              Your next look
              <Text
                style={
                  s.quickBookTitleGold
                }
              >
                {' '}
                starts here.
              </Text>
            </Text>

            <Text style={s.quickBookCopy}>
              Pick your service and let SARJ
              bring the experience directly to
              you.
            </Text>

            <Pressable
              onPress={book}
              hitSlop={8}
              style={({ pressed }) => [
                s.quickBookButton,
                pressed &&
                  s.quickBookButtonPressed,
              ]}
            >
              <Text
                style={
                  s.quickBookButtonText
                }
              >
                SCHEDULE YOUR CUT
              </Text>

              <View
                style={
                  s.quickBookButtonArrow
                }
              >
                <Text
                  style={s.quickBookArrow}
                >
                  →
                </Text>
              </View>
            </Pressable>
          </View>

          {/* =================================================
              FOOTER
          ================================================= */}

          <View style={s.footer}>
            <Logo small />

            <Text style={s.footerText}>
              SARJ BLENDED IT
            </Text>

            <View style={s.footerRule} />

            <Text style={s.footerPhone}>
              +260 9756 16716
            </Text>

            <Text style={s.footerCopy}>
              Premium mobile grooming.
            </Text>

            <Text
              style={s.footerCopyright}
            >
              © SARJ BLENDED IT
            </Text>
          </View>
        </ScrollView>
      </Animated.View>

      {/* =====================================================
          FULL SCREEN GALLERY PREVIEW
      ===================================================== */}

      <Modal
        visible={galleryVisible}
        animationType="fade"
        transparent={false}
        onRequestClose={() =>
          setGalleryVisible(false)
        }
      >
        <View style={s.previewModal}>
          <Pressable
            style={s.previewClose}
            onPress={() =>
              setGalleryVisible(false)
            }
            hitSlop={10}
          >
            <Text
              style={s.previewCloseText}
            >
              ×
            </Text>
          </Pressable>

          <View
            style={s.previewCounter}
          >
            <Text
              style={
                s.previewCounterText
              }
            >
              {selectedGalleryIndex + 1} /{' '}
              {gallery.length}
            </Text>
          </View>

          <FlatList
            ref={galleryListRef}
            data={gallery}
            keyExtractor={(item) =>
              item.id
            }
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={
              false
            }
            initialScrollIndex={
              selectedGalleryIndex
            }
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset:
                screenWidth * index,
              index,
            })}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent
                  .contentOffset.x /
                  screenWidth,
              );

              setSelectedGalleryIndex(
                index,
              );
            }}
            onScrollToIndexFailed={(
              info,
            ) => {
              setTimeout(() => {
                galleryListRef.current?.scrollToIndex(
                  {
                    index: info.index,
                    animated: false,
                  },
                );
              }, 100);
            }}
            renderItem={({ item }) => (
              <View
                style={{
                  width: screenWidth,
                  height: screenHeight,
                  alignItems: 'center',
                  justifyContent:
                    'center',
                }}
              >
                <Image
                  source={{
                    uri: item.media_url,
                  }}
                  style={[
                    s.previewImage,
                    {
                      width: screenWidth,
                      height:
                        screenHeight * 0.82,
                    },
                  ]}
                  resizeMode="contain"
                />

                {item.title ? (
                  <Text
                    style={
                      s.previewTitle
                    }
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                ) : null}
              </View>
            )}
          />

          <View style={s.previewDots}>
            {gallery.map(
              (item, index) => (
                <View
                  key={item.id}
                  style={[
                    s.previewDot,
                    index ===
                      selectedGalleryIndex &&
                      s.previewDotActive,
                  ]}
                />
              ),
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Benefit({
  number,
  title,
  copy,
}: {
  number: string;
  title: string;
  copy: string;
}) {
  return (
    <Card style={s.benefit}>
      <View style={s.benefitNumber}>
        <Text
          style={
            s.benefitNumberText
          }
        >
          {number}
        </Text>
      </View>

      <View
        style={s.benefitContent}
      >
        <Text style={s.benefitTitle}>
          {title}
        </Text>

        <Text style={s.benefitCopy}>
          {copy}
        </Text>
      </View>

      <View style={s.benefitArrow}>
        <Text style={s.chevron}>
          ↗
        </Text>
      </View>
    </Card>
  );
}

const s = StyleSheet.create({
  flex: {
    flex: 1,
  },

  page: {
    flex: 1,
    backgroundColor: theme.bg,
  },

  /* =================================================
     HERO
  ================================================= */

  hero: {
    minHeight: 258,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: '#12110D',
    borderWidth: 1,
    borderColor:
      'rgba(215,184,75,0.20)',
    position: 'relative',
    justifyContent: 'space-between',
  },

  heroOrbLarge: {
    position: 'absolute',
    width: 270,
    height: 270,
    borderRadius: 135,
    right: -135,
    top: -125,
    backgroundColor: '#28200B',
    opacity: 0.9,
  },

  heroOrbSmall: {
    position: 'absolute',
    width: 145,
    height: 145,
    borderRadius: 73,
    left: -90,
    bottom: -100,
    backgroundColor: '#211B0B',
  },

  heroGlowLine: {
    position: 'absolute',
    width: 120,
    height: 1,
    right: 30,
    top: 80,
    backgroundColor:
      'rgba(241,214,123,0.25)',
  },

  heroHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  liveIndicator: {
    minHeight: 27,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor:
      'rgba(241,214,123,0.18)',
    backgroundColor:
      'rgba(0,0,0,0.16)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: theme.gold,
  },

  liveText: {
    color: theme.goldSoft,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  heroIndex: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroIndexText: {
    color: theme.mutedDark,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  heroMain: {
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 10,
  },

  heroGreetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },

  heroAccent: {
    width: 18,
    height: 2,
    backgroundColor: theme.gold,
    marginRight: 8,
    borderRadius: 1,
  },

  kicker: {
    color: theme.gold,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.35,
  },

  heroTitle: {
    color: theme.text,
    fontSize: 27,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -1.1,
  },

  heroTitleSmall: {
    fontSize: 29,
    lineHeight: 32,
  },

  heroTitleGold: {
    color: theme.goldSoft,
    fontSize: 27,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -1.1,
  },

  heroTitleGoldSmall: {
    fontSize: 29,
    lineHeight: 32,
  },

  heroCopy: {
    maxWidth: 400,
    color: theme.textSoft,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 7,
    marginBottom: 12,
  },

  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },

  exploreButton: {
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.11)',
    backgroundColor:
      'rgba(255,255,255,0.035)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  exploreText: {
    color: theme.textSoft,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  exploreArrow: {
    color: theme.gold,
    fontSize: 13,
    fontWeight: '800',
  },

  heroFooter: {
    minHeight: 55,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor:
      'rgba(255,255,255,0.07)',
    backgroundColor:
      'rgba(0,0,0,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
  },

  heroFooterItem: {
    flex: 1,
  },

  heroFooterValue: {
    color: theme.text,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.6,
  },

  heroFooterLabel: {
    color: theme.mutedDark,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.65,
    marginTop: 3,
  },

  heroFooterDivider: {
    width: 1,
    height: 23,
    backgroundColor:
      'rgba(255,255,255,0.08)',
    marginHorizontal: 10,
  },

  /* =================================================
     CUSTOMER COMMAND DECK
  ================================================= */
  commandDeck: {
    marginTop: 12,
    gap: 9,
  },

  commandCard: {
    minHeight: 68,
    paddingHorizontal: 13,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },

  commandPrimary: {
    borderColor: '#e6c650',
    backgroundColor: '#d9b950',
  },

  commandDark: {
    borderColor: '#2e3940',
    backgroundColor: '#171d21',
  },

  commandPressed: {
    transform: [{ scale: 0.975 }, { translateY: 2 }],
    opacity: 0.9,
  },

  commandIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(41,31,4,0.16)',
  },

  commandIconBlue: { backgroundColor: '#164d73' },
  commandIconGreen: { backgroundColor: '#175d4b' },
  commandIconText: { color: theme.text, fontSize: 18, fontWeight: '900' },
  commandCopy: { flex: 1, marginLeft: 11 },
  commandTitle: { color: theme.text, fontSize: 13, fontWeight: '900' },
  commandText: { marginTop: 2, color: theme.muted, fontSize: 10 },
  commandArrow: { color: theme.goldSoft, fontSize: 18, fontWeight: '800' },
  commandPrimaryTitle: { color: '#18130a' },
  commandPrimaryText: { color: '#5c4c13' },
  commandPrimaryArrow: { color: '#18130a' },

  /* =================================================
     VALUE STRIP
  ================================================= */

  valueStrip: {
    height: 68,
    marginTop: 10,
    paddingHorizontal: 4,
    borderRadius: radius.lg,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    flexDirection: 'row',
    alignItems: 'center',
  },

  valueItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  valueNumber: {
    color: theme.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },

  valueLabel: {
    color: theme.muted,
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.65,
    marginTop: 3,
  },

  valueDivider: {
    width: 1,
    height: 25,
    backgroundColor: theme.line,
  },

  /* =================================================
     SECTIONS
  ================================================= */

  section: {
    marginTop: 22,
  },

  sectionEyebrow: {
    color: theme.gold,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.35,
    marginBottom: 4,
  },

  sectionTitle: {
    color: theme.text,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  sectionSubtitle: {
    color: theme.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 6,
  },

  showcaseHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 15,
  },

  showcaseHeadingText: {
    flex: 1,
    paddingRight: 12,
  },

  photoCount: {
    minHeight: 25,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.surface2,
    justifyContent: 'center',
  },

  photoCountText: {
    color: theme.muted,
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  /* =================================================
     SERVICES
  ================================================= */

  skeletonRow: {
    flexDirection: 'row',
    gap: 10,
  },

  serviceList: {
    gap: 10,
    paddingRight: spacing.xs,
  },

  service: {
    width: 202,
    height: 214,
    padding: 17,
    borderRadius: radius.lg,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    justifyContent: 'space-between',
  },

  serviceBlue: {
    backgroundColor: '#155079',
    borderColor: '#67C8FA',
  },

  serviceGold: {
    backgroundColor: '#755719',
    borderColor: '#F1D67B',
  },

  serviceGreen: {
    backgroundColor: '#176550',
    borderColor: '#6FE0BA',
  },

  serviceColorBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },

  serviceBlueBand: { backgroundColor: '#65C5FF' },
  serviceGoldBand: { backgroundColor: '#F1D67B' },
  serviceGreenBand: { backgroundColor: '#61D8B5' },

  serviceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  serviceIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.24)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  serviceIconText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  serviceArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  serviceArrow: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  serviceBody: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 11,
  },

  serviceName: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '900',
    letterSpacing: -0.25,
  },

  desc: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 5,
  },

  serviceBottom: {
    paddingTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  price: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },

  serviceLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.05,
    marginBottom: 5,
  },

  pricePill: {
    minWidth: 94,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.30)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },

  priceLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 2,
  },

  serviceLine: {
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },

  emptyCard: {
    minHeight: 98,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },

  emptyIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: theme.goldSurface,
    borderWidth: 1,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  emptyIconText: {
    color: theme.gold,
    fontSize: typography.body,
    fontWeight: '900',
  },

  emptyContent: {
    flex: 1,
  },

  emptyTitle: {
    color: theme.text,
    fontSize: typography.body,
    fontWeight: '900',
  },

  emptyCopy: {
    color: theme.muted,
    fontSize: typography.bodySmall,
    lineHeight: 17,
    marginTop: 4,
  },

  /* =================================================
     GALLERY / CHOOSE YOUR LOOK
  ================================================= */

  galleryList: {
    paddingRight: spacing.xs,
  },

  galleryItem: {
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    position: 'relative',

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 7,
  },

  galleryImage: {
    width: '100%',
    height: '100%',
  },

  galleryShade: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor:
      'rgba(0,0,0,0.20)',
  },

  galleryTopBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor:
      'rgba(0,0,0,0.48)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  galleryNumber: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  galleryOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 20,
    backgroundColor:
      'rgba(0,0,0,0.68)',
  },

  galleryCategory: {
    color: theme.goldSoft,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  galleryTitle: {
    color: '#fff',
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '900',
    letterSpacing: -0.3,
  },

  galleryBottomLine: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  galleryViewText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },

  galleryArrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },

  galleryArrow: {
    color: theme.bg,
    fontSize: 18,
    fontWeight: '900',
  },

  galleryLoading: {
    minHeight: 116,
    borderRadius: radius.lg,
    backgroundColor: theme.surface2,
    borderWidth: 1,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
  },

  galleryLoadingText: {
    color: theme.muted,
    fontSize: typography.bodySmall,
    marginTop: 8,
  },

  galleryMessage: {
    minHeight: 112,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },

  messageIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: theme.goldSurface,
    borderWidth: 1,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  messageIconText: {
    color: theme.gold,
    fontSize: typography.body,
    fontWeight: '900',
  },

  messageContent: {
    flex: 1,
  },

  galleryMessageTitle: {
    color: theme.text,
    fontSize: typography.body,
    fontWeight: '900',
  },

  galleryMessageCopy: {
    color: theme.muted,
    fontSize: typography.bodySmall,
    lineHeight: 17,
    marginTop: 5,
  },

  retryButton: {
    alignSelf: 'flex-start',
    minHeight: 35,
    marginTop: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: theme.goldSurface,
    borderWidth: 1,
    borderColor: theme.goldDark,
    justifyContent: 'center',
  },

  retryText: {
    color: theme.goldSoft,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.9,
  },

  /* =================================================
     FULL SCREEN GALLERY PREVIEW
  ================================================= */

  previewModal: {
    flex: 1,
    backgroundColor: '#000',
  },

  previewClose: {
    position: 'absolute',
    top: 52,
    right: 20,
    zIndex: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  previewCloseText: {
    color: '#fff',
    fontSize: 27,
    lineHeight: 30,
    fontWeight: '300',
  },

  previewCounter: {
    position: 'absolute',
    top: 62,
    left: 20,
    zIndex: 20,
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor:
      'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.12)',
    justifyContent: 'center',
  },

  previewCounterText: {
    color: theme.textSoft,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },

  previewImage: {
    width: '100%',
    height: '82%',
  },

  previewTitle: {
    position: 'absolute',
    bottom: 120,
    left: 24,
    right: 24,
    color: theme.text,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '900',
  },

  previewDots: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },

  previewDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor:
      'rgba(255,255,255,0.28)',
  },

  previewDotActive: {
    width: 18,
    backgroundColor: theme.gold,
  },

  /* =================================================
     BENEFITS
  ================================================= */

  benefits: {
    gap: 8,
  },

  benefit: {
    minHeight: 70,
    padding: 12,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
  },

  benefitNumber: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: theme.goldSurface,
    borderWidth: 1,
    borderColor:
      'rgba(215,184,75,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  benefitNumberText: {
    color: theme.gold,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.4,
  },

  benefitContent: {
    flex: 1,
    paddingHorizontal: 12,
  },

  benefitTitle: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '900',
  },

  benefitCopy: {
    color: theme.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
  },

  benefitArrow: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor:
      'rgba(255,255,255,0.025)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  chevron: {
    color: theme.mutedDark,
    fontSize: 15,
    fontWeight: '700',
  },

  /* =================================================
     QUICK BOOK
  ================================================= */

  quickBook: {
    marginTop: 22,
    minHeight: 232,
    padding: spacing.xl,
    borderRadius: radius.xl,
    backgroundColor: theme.gold,
    borderWidth: 1,
    borderColor: theme.gold,
    overflow: 'hidden',
    position: 'relative',
  },

  quickBookGlow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    right: -105,
    top: -100,
    backgroundColor: theme.goldSoft,
    opacity: 0.4,
  },

  quickBookTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  quickBookBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  quickBookDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#5E4B0F',
  },

  quickBookBadgeText: {
    color: '#5E4B0F',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
  },

  quickBookNumber: {
    color: 'rgba(40,31,7,0.32)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },

  quickBookTitle: {
    color: theme.bg,
    fontSize: 27,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: -0.7,
    marginTop: 20,
  },

  quickBookTitleGold: {
    color: '#312807',
  },

  quickBookCopy: {
    maxWidth: 360,
    color: '#5E4B0F',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 9,
  },

  quickBookButton: {
    alignSelf: 'flex-start',
    minHeight: 43,
    marginTop: 17,
    paddingLeft: 15,
    paddingRight: 7,
    borderRadius: radius.sm,
    backgroundColor: theme.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  quickBookButtonPressed: {
    opacity: 0.72,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  quickBookButtonText: {
    color: theme.text,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.85,
  },

  quickBookButtonArrow: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor:
      'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickBookArrow: {
    color: theme.goldSoft,
    fontSize: 14,
    fontWeight: '800',
  },

  /* =================================================
     INTERACTIONS
  ================================================= */

  cardPressed: {
    opacity: 0.82,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  buttonPressed: {
    opacity: 0.72,
    transform: [
      {
        scale: 0.985,
      },
    ],
  },

  /* =================================================
     FOOTER
  ================================================= */

  footer: {
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: theme.lineSoft,
    backgroundColor: theme.surface,
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },

  footerText: {
    color: theme.goldSoft,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginTop: 10,
  },

  footerRule: {
    width: 30,
    height: 1,
    backgroundColor: theme.gold,
    opacity: 0.55,
    marginTop: 11,
  },

  footerPhone: {
    color: theme.goldSoft,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginTop: 10,
  },

  footerCopy: {
    color: theme.mutedDark,
    fontSize: 8,
    letterSpacing: 0.4,
    marginTop: 4,
  },

  footerCopyright: {
    color: 'rgba(255,255,255,0.22)',
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginTop: 14,
  },
});
