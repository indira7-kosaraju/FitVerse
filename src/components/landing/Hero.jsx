import Button from '../common/Button';
import Icon from '../common/Icon';
import useAuth from '../../hooks/useAuth';
import { ROLE_HOME } from '../../utils/constants';
import styles from '../../styles/LandingHero.module.css';

const HERO_STATS = [
  { icon: 'users', value: '2,400+', label: 'members training' },
  { icon: 'calendar', value: '60+', label: 'classes every week' },
  { icon: 'star', value: '4.9', label: 'average coach rating' },
];

const MARQUEE = ['HIIT', 'Strength', 'Yoga', 'Boxing', 'Cycling', 'Pilates', 'CrossFit', 'Mobility', 'Dance'];

export default function Hero() {
  const { user, isAuthenticated } = useAuth();

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.pill}>
            <span className={styles.liveDot} aria-hidden="true" />
            New: smarter progress tracking is live
          </p>

          <h1 id="hero-title" className={styles.title}>
            Train <span className={styles.louder}>louder.</span>
            <br />
            Track <span className={styles.smarter}>smarter.</span>
          </h1>

          <p className={styles.lede}>
            FitVerse is your gym in your pocket — book classes in seconds, follow plans built by real coaches,
            and see every PR, inch and kilo add up.
          </p>

          <div className={styles.ctas}>
            {isAuthenticated ? (
              <Button to={ROLE_HOME[user?.role] || '/home'} size="lg" iconRight="arrowRight">
                Go to dashboard
              </Button>
            ) : (
              <Button to="/register" size="lg" iconRight="arrowRight">
                Start training today
              </Button>
            )}
            <Button href="#plans" variant="secondary" size="lg" icon="card">
              See plans
            </Button>
          </div>

          <ul className={styles.stats}>
            {HERO_STATS.map((s, i) => (
              <li key={s.label} className={styles.statChip} style={{ animationDelay: `${200 + i * 120}ms` }}>
                <span className={styles.statIcon}>
                  <Icon name={s.icon} size={18} />
                </span>
                <span>
                  <strong>{s.value}</strong>
                  <small>{s.label}</small>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.visual} aria-hidden="true">
          <div className={styles.disc}>
            <span className={styles.discInner} />
          </div>
          <span className={styles.orangeBlob} />
          <span className={styles.ring} />
          <span className={styles.grid} />

          <div className={`${styles.floatCard} ${styles.cardHeart}`}>
            <span className={styles.floatIcon} data-tone="accent">
              <Icon name="heart" size={18} />
            </span>
            <div>
              <small>Heart rate</small>
              <strong>142 bpm</strong>
            </div>
            <span className={styles.pulse}>
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          </div>

          <div className={`${styles.floatCard} ${styles.cardStreak}`}>
            <span className={styles.floatIcon}>
              <Icon name="flame" size={18} />
            </span>
            <div>
              <small>Streak</small>
              <strong>12 days</strong>
            </div>
          </div>

          <div className={`${styles.floatCard} ${styles.cardClass}`}>
            <span className={styles.floatIcon}>
              <Icon name="bolt" size={18} />
            </span>
            <div>
              <small>Next class · 6:30 PM</small>
              <strong>Power HIIT</strong>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.marquee} aria-hidden="true">
        <div className={styles.track}>
          {[...MARQUEE, ...MARQUEE].map((m, i) => (
            <span key={`${m}-${i}`}>
              {m}
              <Icon name="star" size={14} />
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
