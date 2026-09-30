import { useEffect, useState, useRef, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ClipboardList, BookOpen, FileSignature, HeartHandshake, FolderOpen, Target, Eye, ArrowRight } from 'lucide-react';
import styles from './LandingView.module.css';
import SpotlightCard from '../components/SpotlightCard';
import BlurText from '../components/BlurText';
import { MagicBentoCard } from '../components/MagicBento';
import JusticeIllustration from '../components/JusticeIllustration';

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
            <img src="/logo-mark.png" alt="LAYA bird and justice scales emblem" className={styles.logoIcon} style={{ width: '52px', height: '44px', objectFit: 'contain' }} />
            <span className={styles.logoText}>LAYA</span>
          </div>
          <div className={styles.navLinks}>
            <Link to="/#about">About</Link>
            <Link to="/#services">Services</Link>
            <Link to="/#impact">Impact</Link>
            <Link to="/#contact">Contact Us</Link>
          </div>
          <div className={styles.navActions}>
            <Link to="/login" className={styles.authLink}>Sign In</Link>
            <Link to="/register" className={styles.navButton}>Get Legal Help</Link>
          </div>
        </nav>

        <div className={styles.heroBody}>
          <div className={styles.heroContent}>
            <FadeIn delay={0.1}>
              <div className={styles.badge}>LEGAL SUPPORT, MADE MORE ACCESSIBLE</div>
            </FadeIn>

            <BlurText
              text="A clearer path to legal support"
              animateBy="words"
              direction="top"
              delay={120}
              stepDuration={0.4}
              className={styles.heroTitleBlur}
            />

            <FadeIn delay={0.4}>
              <p className={styles.heroSubtitle}>
                Explore your options, find guidance in the Legal Library, and connect with an attorney through pro bono or private assistance.
              </p>
            </FadeIn>
            <FadeIn delay={0.55}>
              <div className={styles.heroActions}>
                <Link to="/register" className={styles.primaryButton}>
                  Get Legal Help <ArrowRight size={18} style={{ marginLeft: '0.5rem' }} />
                </Link>
                <Link to="/login" className={styles.secondaryHeroBtn}>
                  For Attorneys
                </Link>
              </div>
            </FadeIn>
            <div className={styles.heroTrust}><span /> Guidance and legal support in one place</div>
          </div>

          <FadeIn delay={0.35} direction="up" className={styles.heroArtwork}>
            <JusticeIllustration className={styles.justiceIllustration} />
            <div className={styles.artworkCaption}>
              <span className={styles.captionIcon}><BookOpen size={17} /></span>
              <span><strong>Guidance. Connection. Action.</strong><small>You choose the next step.</small></span>
            </div>
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
            LAYA brings together legal guides, case-matching tools, and a network of participating attorneys. Depending on a user's needs, eligibility, and availability, pro bono or private legal assistance may be available. The platform does not guarantee case acceptance or free services.
          </p>
        </FadeIn>

        {/* Mission & Vision as SpotlightCards */}
        <div className={styles.missionVisionGrid}>
          <FadeIn delay={0.4} direction="up">
            <SpotlightCard className={styles.missionCard} spotlightColor="rgba(37, 99, 235, 0.2)">
              <div className={styles.cardIcon}><Target size={32} /></div>
              <h3 className={styles.cardTitle}>Mission</h3>
              <p className={styles.cardText}>
                To make legal information and attorney connections easier to access, with pro bono and private assistance options based on each user's needs and availability.
              </p>
            </SpotlightCard>
          </FadeIn>

          <FadeIn delay={0.5} direction="up">
            <SpotlightCard className={styles.visionCard} spotlightColor="rgba(37, 99, 235, 0.2)">
              <div className={styles.cardIcon}><Eye size={32} /></div>
              <h3 className={styles.cardTitle}>Vision</h3>
              <p className={styles.cardText}>
                A society where every Filipino can understand their rights and choose a suitable path to legal support, empowered by accessible tools and a compassionate network of legal professionals.
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
                    <h3>Legal Help Assessment</h3>
                    <p>Answer a few questions to explore next steps and find pro bono or private legal assistance that may fit your needs.</p>
                  </div>
                </MagicBentoCard>
              </FadeIn>
              <FadeIn delay={0.3} direction="up">
                <MagicBentoCard glowColor="37, 99, 235">
                  <div className={styles.serviceCardInner}>
                    <div className={styles.iconWrapper}><BookOpen size={24} /></div>
                    <h3>Legal Library</h3>
                    <p>Explore plain-language guides about your rights under laws such as the Rent Control Act and Labor Code.</p>
                  </div>
                </MagicBentoCard>
              </FadeIn>
              <FadeIn delay={0.4} direction="up">
                <MagicBentoCard glowColor="37, 99, 235">
                  <div className={styles.serviceCardInner}>
                    <div className={styles.iconWrapper}><FileSignature size={24} /></div>
                    <h3>Document Generator</h3>
                    <p>Prepare formal legal letters, demand notices, and barangay complaints with guided templates.</p>
                  </div>
                </MagicBentoCard>
              </FadeIn>
            </div>
          </div>

          {/* Legal Professional Services */}
          <div>
            <FadeIn delay={0.2} direction="right">
              <div className={styles.badgeOrange} style={{ marginBottom: '1rem', backgroundColor: 'rgba(37,99,235,0.1)', color: '#2563eb' }}>FOR LAWYERS</div>
              <h2 className={styles.sectionTitle} style={{ textAlign: 'left', marginBottom: '2rem' }}>Flexible case matching</h2>
            </FadeIn>
            <div className={styles.serviceCards}>
              <FadeIn delay={0.3} direction="up">
                <MagicBentoCard glowColor="37, 99, 235">
                  <div className={styles.serviceCardInner}>
                    <div className={styles.iconWrapper} style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}><HeartHandshake size={24} /></div>
                    <h3>Case Matching Options</h3>
                    <p>Review cases that fit your legal expertise, availability, and the assistance arrangement you offer.</p>
                  </div>
                </MagicBentoCard>
              </FadeIn>
              <FadeIn delay={0.4} direction="up">
                <MagicBentoCard glowColor="37, 99, 235">
                  <div className={styles.serviceCardInner}>
                    <div className={styles.iconWrapper} style={{ background: 'rgba(37,99,235,0.1)', color: '#2563eb' }}><FolderOpen size={24} /></div>
                    <h3>Client & Case Management</h3>
                    <p>Manage active cases, communicate securely, and track pro bono hours where applicable.</p>
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
            <div className={styles.impactJourney}>
              <div className={styles.journeyEyebrow}>HOW LAYA HELPS</div>
              <div className={styles.journeyStep}>
                <span className={styles.journeyIcon}><ClipboardList size={20} /></span>
                <span><strong>Share your concern</strong><small>Start with what happened, in your own words.</small></span>
                <span className={styles.journeyNumber}>01</span>
              </div>
              <div className={styles.journeyStep}>
                <span className={styles.journeyIcon}><BookOpen size={20} /></span>
                <span><strong>Understand your options</strong><small>Explore plain-language legal guides and research.</small></span>
                <span className={styles.journeyNumber}>02</span>
              </div>
              <div className={styles.journeyStep}>
                <span className={styles.journeyIcon}><HeartHandshake size={20} /></span>
                <span><strong>Choose what comes next</strong><small>Request a connection with a lawyer when you are ready.</small></span>
                <span className={styles.journeyNumber}>03</span>
              </div>
              <div className={styles.journeyNote}>You stay in control of the next step.</div>
            </div>
          </FadeIn>
          <div className={styles.impactText}>
            <FadeIn delay={0.2} direction="left">
              <h2 className={styles.sectionTitle} style={{ textAlign: 'left', color: '#fff', marginBottom: '0.5rem' }}>
                A clearer path from concern to support
              </h2>
              <p className={styles.impactDescription}>LAYA helps people understand their options, find reliable legal information, and decide whether they want to connect with an attorney.</p>
            </FadeIn>

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
                <img src="/logo-mark.png" alt="LAYA bird and justice scales emblem" className={styles.logoIcon} style={{ width: '52px', height: '44px', objectFit: 'contain' }} />
                <span className={styles.logoText}>LAYA</span>
              </div>
              <p className={styles.footerDesc}>A legal support platform with guided triage, research tools, and attorney connections through available pro bono or private assistance options.</p>
            </div>
            <div className={styles.footerLinks}>
              <div className={styles.linkColumn}>
                <h4>Platform</h4>
                <Link to="/login">Legal Help Assessment</Link>
                <Link to="/login">Legal Library</Link>
                <Link to="/login">Document Generator</Link>
              </div>
              <div className={styles.linkColumn}>
                <h4>Legal</h4>
                <Link to="/login">Attorney Dashboard</Link>
                <Link to="/login">Case Matching</Link>
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
