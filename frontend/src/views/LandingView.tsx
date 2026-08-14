import { useEffect, useState, useRef, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ClipboardList, BookOpen, FileSignature, HeartHandshake, FolderOpen, Target, Eye, ArrowRight } from 'lucide-react';
import styles from './LandingView.module.css';
import SpotlightCard from '../components/SpotlightCard';
import BlurText from '../components/BlurText';
import ShinyText from '../components/ShinyText';
import CountUp from '../components/CountUp';
import { MagicBentoCard } from '../components/MagicBento';

// Simple FadeIn for non-text elements
type FadeDirection = 'up' | 'down' | 'left' | 'right' | 'none';
type FadeInProps = { children: ReactNode; delay?: number; direction?: FadeDirection; className?: string; };

const FadeIn = ({ children, delay = 0, direction = 'up', className = '' }: FadeInProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const domRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(entry.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    const current = domRef.current;
    if (current) observer.observe(current);
    return () => { if (current) observer.unobserve(current); };
  }, []);
  const getTransform = (): string => {
    switch (direction) {
      case 'up': return 'translateY(40px)';
      case 'down': return 'translateY(-40px)';
      case 'left': return 'translateX(-40px)';
      case 'right': return 'translateX(40px)';
      case 'none': return 'none';
      default: return 'translateY(40px)';
    }
  };
  return (
    <div ref={domRef} className={className} style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translate(0,0)' : getTransform(), transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}s`, willChange: 'opacity, transform' }}>
      {children}
    </div>
  );
};

const LandingView = () => {
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.substring(1));
      if (element) element.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  return (
    <div className={styles.landingContainer}>

      {/* ── HERO SECTION ─────────────────────────────────────────────── */}
      <section className={styles.heroSection}>
        <nav className={styles.navbar}>
          <div className={styles.logo}>
            <img src="/logo.png" alt="LAYA Logo" className={styles.logoIcon} style={{ width: '48px', height: '48px' }} />
            <span className={styles.logoText}>LAYA</span>
          </div>
          <div className={styles.navLinks}>
            <Link to="/#about">About</Link>
            <Link to="/#services">Services</Link>
            <Link to="/#impact">Impact</Link>
            <Link to="/#contact">Contact Us</Link>
          </div>
          <div className={styles.navActions}>
            <Link to="/login" className={styles.authLink}>Mag-Sign In (Para sa Laban)</Link>
            <Link to="/register" className={styles.navButton}>Humingi ng Tulong</Link>
          </div>
        </nav>

        <div className={styles.heroContent}>
          <FadeIn delay={0.1}>
            <div className={styles.badge}>BRIDGING THE JUSTICE GAP</div>
          </FadeIn>

          {/* BlurText for the main hero title */}
          <BlurText
            text="Libreng legal help para sa bawat Pilipino"
            animateBy="words"
            direction="top"
            delay={120}
            stepDuration={0.4}
            className={styles.heroTitleBlur}
          />

          <FadeIn delay={0.4}>
            <p className={styles.heroSubtitle}>
              Direktang koneksyon para sa ating mga Kababayang nangangailangan ng tulong mula sa mga volunteer lawyers.
              Libreng legal resources, document generators, at smart triage para sa iyong karapatan.
            </p>
          </FadeIn>
          <FadeIn delay={0.55}>
            <div className={styles.heroActions}>
              <Link to="/register" className={styles.primaryButton}>
                Humingi ng Libreng Tulong <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
              </Link>
              <Link to="/login" className={styles.secondaryHeroBtn}>
                Para sa mga Lawyers
              </Link>
            </div>
          </FadeIn>
        </div>

        <div className={styles.heroImages}>
          <FadeIn delay={0.5} direction="up" className={styles.imageCard}>
            <div className={styles.realImg} style={{ backgroundImage: "url('/landing_page/lawyer_1.jpg')" }} aria-label="Lawyer discussing documents with a client" />
          </FadeIn>
          <FadeIn delay={0.65} direction="up" className={styles.imageCard}>
            <div className={styles.realImg} style={{ backgroundImage: "url('/landing_page/lawyer_2.jpg')" }} aria-label="Two professionals shaking hands" />
          </FadeIn>
        </div>
      </section>

      {/* ── ABOUT SECTION ────────────────────────────────────────────── */}
      <section className={styles.infoSection} id="about">
        <div className={styles.aboutDecor}>
          <svg width="360" height="360" viewBox="0 0 360 360" className={styles.decorRingLeft}>
            <circle cx="180" cy="180" r="160" fill="none" stroke="rgba(37,99,235,0.15)" strokeWidth="2"/>
            <circle cx="180" cy="180" r="110" fill="none" stroke="rgba(37,99,235,0.08)" strokeWidth="1.5"/>
            <circle cx="180" cy="180" r="60" fill="none" stroke="rgba(37,99,235,0.04)" strokeWidth="1"/>
          </svg>
          <svg width="280" height="280" viewBox="0 0 280 280" className={styles.decorRingRight}>
            <circle cx="140" cy="140" r="120" fill="none" stroke="rgba(37,99,235,0.12)" strokeWidth="2"/>
            <circle cx="140" cy="140" r="70" fill="none" stroke="rgba(37,99,235,0.06)" strokeWidth="1.5"/>
          </svg>
          <svg width="100%" height="100%" className={styles.decorLine}>
            <line x1="0" y1="100%" x2="100%" y2="0" stroke="rgba(37,99,235,0.05)" strokeWidth="1" strokeDasharray="8 12"/>
            <line x1="0" y1="0" x2="100%" y2="100%" stroke="rgba(37,99,235,0.03)" strokeWidth="1" strokeDasharray="6 16"/>
          </svg>
        </div>

        <FadeIn delay={0.2}>
          <h2 className={styles.sectionTitle}>Who are we</h2>
        </FadeIn>
        <FadeIn delay={0.3}>
          <p className={styles.sectionSubtitle}>
            Our dedicated team of volunteer Filipino lawyers is committed to providing <strong>expert, client-focused legal services</strong> across the country. With deep experience in Philippine Law and a results-driven approach, we deliver strategic solutions tailored to each Kababayan's needs, completely free of charge.
          </p>
        </FadeIn>

        {/* Mission & Vision as SpotlightCards */}
        <div className={styles.missionVisionGrid}>
          <FadeIn delay={0.4} direction="up">
            <SpotlightCard className={styles.missionCard} spotlightColor="rgba(37, 99, 235, 0.2)">
              <div className={styles.cardIcon}><Target size={32} /></div>
              <h3 className={styles.cardTitle}>Mission</h3>
              <p className={styles.cardText}>
                To bridge the justice gap in the Philippines by providing every Filipino with free, accessible, and expert legal support, regardless of their background or means.
              </p>
            </SpotlightCard>
          </FadeIn>

          <FadeIn delay={0.5} direction="up">
            <SpotlightCard className={styles.visionCard} spotlightColor="rgba(37, 99, 235, 0.2)">
              <div className={styles.cardIcon}><Eye size={32} /></div>
              <h3 className={styles.cardTitle}>Vision</h3>
              <p className={styles.cardText}>
                A society where every Filipino can assert their rights and access justice, empowered by technology and a compassionate network of volunteer legal professionals.
              </p>
            </SpotlightCard>
          </FadeIn>
        </div>
      </section>

      {/* ── SERVICES SECTION ─────────────────────────────────────────── */}
      <section className={styles.servicesSection} id="services">
        <div className={styles.servicesGrid}>
          {/* Public Services */}
          <div>
            <FadeIn delay={0.1} direction="left">
              <div className={styles.badgeOrange} style={{ marginBottom: '1rem' }}>FOR THE PUBLIC</div>
              <h2 className={styles.sectionTitle} style={{ textAlign: 'left', marginBottom: '2rem' }}>Accessible legal tools</h2>
            </FadeIn>
            <div className={styles.serviceCards}>
              <FadeIn delay={0.2} direction="up">
                <MagicBentoCard glowColor="37, 99, 235">
                  <div className={styles.serviceCardInner}>
                    <div className={styles.iconWrapper}><ClipboardList size={24} /></div>
                    <h3>Smart Legal Triage</h3>
                    <p>Sagutin ang ilang katanungan para mai-match ka sa tamang pro-bono attorney na expert sa iyong problema (Labor, Housing, VAWC, etc.).</p>
                  </div>
                </MagicBentoCard>
              </FadeIn>
              <FadeIn delay={0.3} direction="up">
                <MagicBentoCard glowColor="37, 99, 235">
                  <div className={styles.serviceCardInner}>
                    <div className={styles.iconWrapper}><BookOpen size={24} /></div>
                    <h3>Know Your Rights Library</h3>
                    <p>Alamin ang iyong mga karapatan. Basahin ang aming mga guides tungkol sa Rent Control Act, Labor Code, at iba pa.</p>
                  </div>
                </MagicBentoCard>
              </FadeIn>
              <FadeIn delay={0.4} direction="up">
                <MagicBentoCard glowColor="37, 99, 235">
                  <div className={styles.serviceCardInner}>
                    <div className={styles.iconWrapper}><FileSignature size={24} /></div>
                    <h3>Document Generator</h3>
                    <p>Gumawa ng mga formal legal letters, demand notices, o sa Barangay complaints gamit ang aming subok na templates.</p>
                  </div>
                </MagicBentoCard>
              </FadeIn>
            </div>
          </div>

          {/* Legal Professional Services */}
          <div>
            <FadeIn delay={0.2} direction="right">
              <div className={styles.badgeOrange} style={{ marginBottom: '1rem', backgroundColor: 'rgba(37,99,235,0.1)', color: '#2563eb' }}>FOR LAWYERS</div>
              <h2 className={styles.sectionTitle} style={{ textAlign: 'left', marginBottom: '2rem' }}>Streamlined pro-bono</h2>
            </FadeIn>
            <div className={styles.serviceCards}>
              <FadeIn delay={0.3} direction="up">
                <MagicBentoCard glowColor="37, 99, 235">
                  <div className={styles.serviceCardInner}>
                    <div className={styles.iconWrapper} style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}><HeartHandshake size={24} /></div>
                    <h3>Pro-Bono Matchmaking Hub</h3>
                    <p>Browse pre-vetted, triaged cases that fit your exact expertise and availability.</p>
                  </div>
                </MagicBentoCard>
              </FadeIn>
              <FadeIn delay={0.4} direction="up">
                <MagicBentoCard glowColor="37, 99, 235">
                  <div className={styles.serviceCardInner}>
                    <div className={styles.iconWrapper} style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}><FolderOpen size={24} /></div>
                    <h3>Client & Case Management</h3>
                    <p>Manage your active docket, communicate securely, and track your pro-bono hours for Bar compliance.</p>
                  </div>
                </MagicBentoCard>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ── IMPACT SECTION ───────────────────────────────────────────── */}
      <section className={styles.impactSection} id="impact">
        <div className={styles.impactContent}>
          <FadeIn delay={0.1} direction="right">
            <div className={styles.impactImage} style={{ backgroundImage: "url('/landing_page/lawyer_1.jpg')" }} />
          </FadeIn>
          <div className={styles.impactText}>
            <FadeIn delay={0.2} direction="left">
              {/* ShinyText for a premium heading shimmer */}
              <h2 className={styles.sectionTitle} style={{ textAlign: 'left', color: '#fff', marginBottom: '0.5rem' }}>
                Delivering practical solutions through{' '}
                <ShinyText text="pro-bono" speed={4} className={styles.shinyAccent} />
              </h2>
            </FadeIn>

            <div className={styles.impactStats}>
              <FadeIn delay={0.3} direction="up">
                <div className={styles.statBox}>
                  <h4>
                    <CountUp to={25000} separator="," suffix="+" duration={2.5} className={styles.statNumber} />
                  </h4>
                  <p>Hours Volunteered</p>
                </div>
              </FadeIn>
              <FadeIn delay={0.4} direction="up">
                <div className={styles.statBox}>
                  <h4>
                    <CountUp to={5000} separator="," suffix="+" duration={2.5} className={styles.statNumber} />
                  </h4>
                  <p>Cases Resolved</p>
                </div>
              </FadeIn>
              <FadeIn delay={0.5} direction="up">
                <div className={styles.statBox}>
                  <h4>
                    <CountUp to={200} prefix="₱" suffix="M+" duration={2.5} className={styles.statNumber} />
                  </h4>
                  <p>In Recovered Claims</p>
                </div>
              </FadeIn>
              <FadeIn delay={0.6} direction="up">
                <div className={styles.statBox}>
                  <h4>
                    <CountUp to={98} suffix="%" duration={2.5} className={styles.statNumber} />
                  </h4>
                  <p>Evictions Halted</p>
                </div>
              </FadeIn>
            </div>

            <FadeIn delay={0.75} direction="up">
              <Link to="/register" className={styles.primaryButton} style={{ display: 'inline-flex', width: 'auto', marginTop: '2rem' }}>
                Join the Platform <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
              </Link>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────── */}
      <footer className={styles.footer} id="contact">
        <FadeIn delay={0.1} direction="none">
          <div className={styles.footerContent}>
            <div className={styles.footerBrand}>
              <div className={styles.logo}>
                <img src="/logo.png" alt="LAYA Logo" className={styles.logoIcon} style={{ width: '48px', height: '48px' }} />
                <span className={styles.logoText}>LAYA</span>
              </div>
              <p className={styles.footerDesc}>A secure triage and matching engine that connects marginalized Filipinos directly with volunteer legal professionals.</p>
            </div>
            <div className={styles.footerLinks}>
              <div className={styles.linkColumn}>
                <h4>Platform</h4>
                <Link to="/login">Smart Triage</Link>
                <Link to="/login">Rights Library</Link>
                <Link to="/login">Document Generator</Link>
              </div>
              <div className={styles.linkColumn}>
                <h4>Legal</h4>
                <Link to="/login">Attorney Dashboard</Link>
                <Link to="/login">Pro-Bono Hub</Link>
                <Link to="#">Terms of Service</Link>
                <Link to="#">Privacy Policy</Link>
              </div>
              <div className={styles.linkColumn}>
                <h4>Contact</h4>
                <a href="mailto:support@justicelink.ph">support@justicelink.ph</a>
                <a href="tel:02-8555-1234">(02) 8555-1234</a>
                <p>Unit 1204, High Street South<br/>BGC, Taguig, Philippines</p>
              </div>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>&copy; {new Date().getFullYear()} LAYA Philippines. All rights reserved.</p>
          </div>
        </FadeIn>
      </footer>
    </div>
  );
};

export default LandingView;
