import Avatar from '../common/Avatar';
import Icon from '../common/Icon';
import SectionHeading from './SectionHeading';
import Reveal from './Reveal';
import styles from '../../styles/LandingSections.module.css';

const TESTIMONIALS = [
  {
    name: 'Priya Raman',
    role: 'Member since 2023',
    quote:
      "I used to dread planning workouts. Now my coach's plan is waiting every morning and I just tick the boxes. Down 9 kg and deadlifting more than ever.",
    stat: '−9 kg',
  },
  {
    name: 'Marcus Lee',
    role: 'HIIT regular',
    quote:
      'Booking a 6 AM class takes literally five seconds. The progress charts are addictive — watching that line climb keeps me coming back.',
    stat: '140 classes',
  },
  {
    name: 'Sofia Alvarez',
    role: 'Yoga & mobility',
    quote:
      "The trainers actually know my name and my goals. FitVerse feels less like an app and more like a crew that's got my back.",
    stat: '1 yr streak',
  },
];

export default function Testimonials() {
  return (
    <section id="stories" className={`${styles.section} ${styles.sectionAlt}`} aria-labelledby="stories-title">
      <div className={styles.container}>
        <SectionHeading
          id="stories-title"
          eyebrow="Member stories"
          title="Real people. Real progress."
          subtitle="Don't take our word for it — here's what the crew says."
        />
        <ul className={styles.quoteGrid}>
          {TESTIMONIALS.map((t, i) => (
            <Reveal as="li" key={t.name} delay={i * 100}>
              <figure className={`${styles.quote} ${i === 1 ? styles.quoteFeatured : ''}`}>
                <div className={styles.quoteTop}>
                  <span className={styles.quoteMark}>
                    <Icon name="quote" size={22} strokeWidth={2.4} />
                  </span>
                  <span className={styles.quoteStat}>{t.stat}</span>
                </div>
                <div className={styles.stars} role="img" aria-label="Rated 5 out of 5">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Icon key={s} name="star" size={16} />
                  ))}
                </div>
                <blockquote className={styles.quoteText}>
                  <p>&ldquo;{t.quote}&rdquo;</p>
                </blockquote>
                <figcaption className={styles.quoteBy}>
                  <Avatar name={t.name} size={40} />
                  <span>
                    <strong>{t.name}</strong>
                    <small>{t.role}</small>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
