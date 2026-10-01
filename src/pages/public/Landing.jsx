import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Button from '../../components/common/Button';
import Icon from '../../components/common/Icon';
import LandingNav from '../../components/landing/LandingNav';
import Hero from '../../components/landing/Hero';
import PlansSection from '../../components/landing/PlansSection';
import TrainersSection from '../../components/landing/TrainersSection';
import ScheduleSection from '../../components/landing/ScheduleSection';
import Testimonials from '../../components/landing/Testimonials';
import LandingFooter from '../../components/landing/LandingFooter';
import Reveal from '../../components/landing/Reveal';
import useAuth from '../../hooks/useAuth';
import { ROLE_HOME } from '../../utils/constants';
import styles from '../../styles/Landing.module.css';

const PERKS = [
  { icon: 'calendar', title: 'Book in seconds', text: 'Live class capacity, instant confirmations and one-tap cancellations.' },
  { icon: 'clipboard', title: 'Coach-built plans', text: 'Week-by-week programmes from your trainer, right in your pocket.' },
  { icon: 'chart', title: 'Progress you can see', text: 'Weight, body fat, measurements and PRs charted over time.' },
  { icon: 'bolt', title: 'Workout logging', text: 'Log sets, reps and kilos fast — between sets, not after.' },
];

export default function Landing() {
  const { user, isAuthenticated } = useAuth();
  const { hash } = useLocation();

  useEffect(() => {
    document.title = 'FitVerse · Train louder. Track smarter.';
  }, []);

  // Support deep links like /#plans when arriving from another route.
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) requestAnimationFrame(() => el.scrollIntoView({ block: 'start' }));
  }, [hash]);

  return (
    <div className={styles.page}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <LandingNav />

      <main id="main">
        <Hero />

        <section className={styles.perks} aria-label="Why FitVerse">
          <ul className={styles.perkGrid}>
            {PERKS.map((p, i) => (
              <Reveal as="li" key={p.title} delay={i * 70} className={styles.perk}>
                <span className={styles.perkIcon}>
                  <Icon name={p.icon} size={22} />
                </span>
                <h2 className={styles.perkTitle}>{p.title}</h2>
                <p className={styles.perkText}>{p.text}</p>
              </Reveal>
            ))}
          </ul>
        </section>

        <PlansSection />
        <TrainersSection />
        <ScheduleSection />
        <Testimonials />

        <section className={styles.ctaWrap} aria-labelledby="cta-title">
          <Reveal className={styles.cta}>
            <div className={styles.ctaArt} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className={styles.ctaCopy}>
              <h2 id="cta-title" className={styles.ctaTitle}>
                Your strongest self is one session away.
              </h2>
              <p className={styles.ctaText}>
                Join FitVerse today — first class is on us. No contracts, cancel anytime.
              </p>
            </div>
            <div className={styles.ctaActions}>
              {isAuthenticated ? (
                <Button
                  to={ROLE_HOME[user?.role] || '/home'}
                  variant="secondary"
                  size="lg"
                  iconRight="arrowRight"
                  className={styles.ctaPrimary}
                >
                  Go to dashboard
                </Button>
              ) : (
                <>
                  <Button to="/register" variant="secondary" size="lg" iconRight="arrowRight" className={styles.ctaPrimary}>
                    Join now
                  </Button>
                  <Button to="/login" variant="ghost" size="lg" className={styles.ctaGhost}>
                    Log in
                  </Button>
                </>
              )}
            </div>
          </Reveal>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
