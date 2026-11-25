import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActionButton, BrandLogo, Screen } from '../../components/AppUI';
import { colors } from '../../constants/theme';

const featureSlides = [
  {
    icon: 'document-text-outline',
    title: 'Resume insights',
    description: 'Get a clearer view of your experience, strengths, and next improvements.',
  },
  {
    icon: 'checkmark-done-outline',
    title: 'Skill verification',
    description: 'Show your knowledge through focused questions based on your resume.',
  },
  {
    icon: 'briefcase-outline',
    title: 'Jobs and interview practice',
    description: 'Explore relevant openings and rehearse interview answers.',
  },
] as const;

type HomeProps = {
  navigation: {
    navigate: (screen: 'Login' | 'Register') => void;
  };
};

export default function Home({ navigation }: HomeProps) {
  const compact = useWindowDimensions().width < 700;
  const carouselRef = useRef<ScrollView | null>(null);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const [activeFeature, setActiveFeature] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);

  useEffect(() => {
    if (!autoAdvance || carouselWidth === 0) return undefined;

    const interval = setInterval(() => {
      const nextFeature = (activeFeature + 1) % featureSlides.length;
      setActiveFeature(nextFeature);
      carouselRef.current?.scrollTo?.({ x: nextFeature * carouselWidth, y: 0, animated: true });
    }, 5000);

    return () => clearInterval(interval);
  }, [activeFeature, autoAdvance, carouselWidth]);

  const selectFeature = (index: number) => {
    const nextFeature = (index + featureSlides.length) % featureSlides.length;
    setActiveFeature(nextFeature);
    setAutoAdvance(false);
    carouselRef.current?.scrollTo?.({ x: nextFeature * carouselWidth, y: 0, animated: true });
  };

  return (
    <Screen scroll>
      <View style={styles.page}>
        <View style={[styles.nav, compact && styles.compactNav]}>
          <View style={styles.brand}>
            <BrandLogo size={42} />
            <View>
              <Text style={styles.brandName}>Galila</Text>
              <Text style={styles.brandCaption}>AI RESUME WORKSPACE</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Login')}
            style={({ pressed }) => [styles.navSignIn, pressed && styles.pressed]}
          >
            <Ionicons name="log-in-outline" size={18} color={colors.primary} />
            <Text style={styles.navSignInText}>Sign in</Text>
          </Pressable>
        </View>

        <View style={[styles.hero, compact && styles.compactHero]}>
          <View style={styles.heroCopy}>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrowMark} />
              <Text style={styles.eyebrow}>CAREER READINESS, MADE PERSONAL</Text>
            </View>
            <Text accessibilityRole="header" style={[styles.heroTitle, compact && styles.compactHeroTitle]}>
              Make your next career move with confidence.
            </Text>
            <Text style={styles.heroSubtitle}>
              Get useful resume insights, verify your skills, and practice interviews, all in one place.
            </Text>
            <View style={[styles.actions, compact && styles.compactActions]}>
              <View style={[styles.action, compact && styles.compactAction]}>
                <ActionButton
                  title="Create applicant account"
                  icon="arrow-forward-outline"
                  onPress={() => navigation.navigate('Register')}
                />
              </View>
            </View>
            <View style={styles.privacyNote}>
              <Ionicons name="shield-checkmark-outline" size={17} color={colors.accent} />
              <Text style={styles.privacyText}>Your account and career information stay private.</Text>
            </View>
          </View>

          <View style={[styles.toolkit, compact && styles.compactToolkit]}>
            <View style={styles.toolkitBadge}>
              <Ionicons name="sparkles-outline" size={15} color={colors.accent} />
              <Text style={styles.toolkitBadgeText}>YOUR CAREER TOOLKIT</Text>
            </View>
            <Text style={styles.toolkitTitle}>Small steps. Stronger applications.</Text>
            <ToolkitStep
              icon="document-text-outline"
              title="Understand your resume"
              subtitle="See strengths and practical suggestions."
            />
            <ToolkitStep
              icon="checkmark-circle-outline"
              title="Show what you know"
              subtitle="Answer questions about your skills."
            />
            <ToolkitStep
              icon="chatbubbles-outline"
              title="Practice with confidence"
              subtitle="Prepare for interviews at your pace."
              last
            />
          </View>
        </View>

        <View style={styles.featuresSection}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>Everything you need for your next step</Text>
          <Text style={styles.sectionSubtitle}>
            Move from preparing your resume to exploring opportunities with guided tools.
          </Text>
          <View
            testID="feature-carousel"
            style={styles.carousel}
            onLayout={(event) => setCarouselWidth(event.nativeEvent.layout.width)}
          >
            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              onScrollBeginDrag={() => setAutoAdvance(false)}
              onMomentumScrollEnd={(event) => {
                if (carouselWidth === 0) return;
                const index = Math.round(event.nativeEvent.contentOffset.x / carouselWidth);
                setActiveFeature(Math.max(0, Math.min(index, featureSlides.length - 1)));
              }}
            >
              {featureSlides.map((feature) => (
                <View key={feature.title} style={[styles.featureSlide, { width: carouselWidth || '100%' }]}>
                  <FeatureCard {...feature} />
                </View>
              ))}
            </ScrollView>
            <View style={styles.carouselControls}>
              <Text accessibilityLiveRegion="polite" style={styles.slideCount}>
                Slide {activeFeature + 1} of {featureSlides.length}
              </Text>
              <View style={styles.carouselButtons}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous feature"
                  onPress={() => selectFeature(activeFeature - 1)}
                  style={styles.carouselButton}
                >
                  <Ionicons name="chevron-back" size={18} color={colors.ink} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={autoAdvance ? 'Pause automatic carousel' : 'Resume automatic carousel'}
                  onPress={() => setAutoAdvance((enabled) => !enabled)}
                  style={[styles.carouselButton, styles.autoAdvanceButton]}
                >
                  <Ionicons name={autoAdvance ? 'pause' : 'play'} size={15} color={colors.ink} />
                  <Text style={styles.autoAdvanceText}>{autoAdvance ? 'Pause' : 'Play'}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next feature"
                  onPress={() => selectFeature(activeFeature + 1)}
                  style={styles.carouselButton}
                >
                  <Ionicons name="chevron-forward" size={18} color={colors.ink} />
                </Pressable>
              </View>
            </View>
            <View style={styles.carouselDots}>
              {featureSlides.map((feature, index) => (
                <Pressable
                  key={feature.title}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${feature.title} slide`}
                  accessibilityState={{ selected: activeFeature === index }}
                  onPress={() => selectFeature(index)}
                  style={[styles.carouselDot, activeFeature === index && styles.activeCarouselDot]}
                />
              ))}
            </View>
          </View>
        </View>

        <View style={styles.reviewNote}>
          <Ionicons name="people-outline" size={19} color={colors.primary} />
          <Text style={styles.reviewText}>
            Helpful AI tools support your preparation. Hiring decisions remain with the review team.
          </Text>
        </View>
      </View>
    </Screen>
  );
}

function ToolkitStep({
  icon,
  title,
  subtitle,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.toolkitStep, !last && styles.toolkitStepDivider]}>
      <View style={styles.stepIcon}>
        <Ionicons name={icon} size={19} color={colors.primary} />
      </View>
      <View style={styles.stepCopy}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={21} color={colors.primary} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  );
}

const styles: Record<string, any> = {
  page: { width: '100%', maxWidth: 1040, alignSelf: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  compactNav: { marginBottom: 18 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandName: { color: colors.ink, fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  brandCaption: { color: '#8795a8', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 3 },
  navSignIn: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 9, backgroundColor: colors.surface },
  navSignInText: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.8 },
  hero: { flexDirection: 'row', alignItems: 'stretch', gap: 24, padding: 32, borderRadius: 22, borderWidth: 1, borderColor: '#d9e8fb', backgroundColor: '#eaf3ff' },
  compactHero: { flexDirection: 'column', gap: 22, padding: 20, borderRadius: 18 },
  heroCopy: { flex: 1, justifyContent: 'center' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyebrowMark: { width: 18, height: 3, borderRadius: 2, backgroundColor: colors.accent },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { maxWidth: 590, color: colors.ink, fontSize: 42, lineHeight: 49, fontWeight: '800', letterSpacing: -1.2, marginTop: 15 },
  compactHeroTitle: { fontSize: 32, lineHeight: 38, letterSpacing: -0.7 },
  heroSubtitle: { maxWidth: 570, color: colors.muted, fontSize: 15, lineHeight: 23, marginTop: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 23 },
  compactActions: { flexDirection: 'column' },
  action: { width: 260, maxWidth: '100%' },
  compactAction: { width: '100%' },
  privacyNote: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 18 },
  privacyText: { flexShrink: 1, color: colors.muted, fontSize: 11 },
  toolkit: { width: 315, flexShrink: 0, alignSelf: 'center', padding: 22, borderRadius: 17, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#e3eaf3' },
  compactToolkit: { width: '100%', padding: 18 },
  toolkitBadge: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 7, backgroundColor: colors.accentSoft },
  toolkitBadgeText: { color: colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  toolkitTitle: { color: colors.ink, fontSize: 18, lineHeight: 24, fontWeight: '800', marginTop: 14, marginBottom: 8 },
  toolkitStep: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 13 },
  toolkitStepDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  stepIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  stepCopy: { flex: 1 },
  stepTitle: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  stepSubtitle: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  featuresSection: { marginTop: 34 },
  sectionTitle: { color: colors.ink, fontSize: 23, lineHeight: 30, fontWeight: '800', letterSpacing: -0.4 },
  sectionSubtitle: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 5, marginBottom: 16 },
  carousel: { width: '100%' },
  carouselContent: { flexDirection: 'row' },
  featureSlide: { paddingHorizontal: 2 },
  featureCard: { minHeight: 172, justifyContent: 'center', padding: 22, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  featureIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, marginBottom: 13 },
  featureTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  featureDescription: { maxWidth: 600, color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },
  carouselControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 },
  slideCount: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  carouselButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  carouselButton: { minWidth: 38, height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  autoAdvanceButton: { minWidth: 78 },
  autoAdvanceText: { color: colors.ink, fontSize: 11, fontWeight: '700' },
  carouselDots: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 11 },
  carouselDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#c4cfdd' },
  activeCarouselDot: { width: 21, backgroundColor: colors.primary },
  reviewNote: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 15, marginTop: 16, borderRadius: 11, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line },
  reviewText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 17 },
};
