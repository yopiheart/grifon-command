import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Check as CheckIcon, X as XIcon, Lock as LockIcon, Star as StarIcon, Film as FilmIcon } from "lucide-react";
import { toast } from "sonner";
import { AnimatedBorder } from "./ui/AnimatedBorder";
import { SiteHeader, type SiteNavLink } from "./ui/SiteHeader";
import { UrgencyBar } from "./ui/UrgencyBar";
import { startCheckout, type PlanId, type BillingCycle } from "../services/billingService";
import { PLAN_FEATURES } from "../config/planFeatures";

const Check = () => <CheckIcon size={16} strokeWidth={2.5} className="text-[#FFCC00]" />;
const X = () => <XIcon size={14} strokeWidth={1.5} className="text-zinc-600" />;
const Lock = () => <LockIcon size={14} strokeWidth={1.2} className="text-[#FFCC00]" />;
const Star = () => <StarIcon size={14} strokeWidth={0} fill="#FFCC00" className="text-[#FFCC00]" />;

type Plan = {
  price: string;
  period: string;
  label: string;
  savings?: string;
};

const plans: Record<string, Plan[]> = {
  monthly: [
    { price: "0", period: "/forever", label: "Free" },
    { price: "997", period: "/mo", label: "Creator" },
    { price: "2,497", period: "/mo", label: "Pro" },
    { price: "4,997", period: "/mo", label: "Business" },
  ],
  annual: [
    { price: "0", period: "/forever", label: "Free" },
    { price: "831", period: "/mo", label: "Creator", savings: "Save ₱1,992/yr" },
    { price: "2,081", period: "/mo", label: "Pro", savings: "Save ₱4,992/yr" },
    { price: "4,164", period: "/mo", label: "Business", savings: "Save ₱9,996/yr" },
  ],
};

const testimonials = [
  { name: "Mark R.", biz: "Online Seller, Cebu", text: "Gumawa ako ng 5 video ads sa isang hapon. Before, 1 lang ginagawa ko per week." },
  { name: "Jessa L.", biz: "Food Business Owner, Manila", text: "Yung Market Research niya, mas detailed pa sa agency na ₱30K/month ko before." },
  { name: "Carlo M.", biz: "Freelance Marketer, Davao", text: "Nag-cancel na ko sa Canva, CapCut, at ChatGPT. Grifon lang sapat na." },
];

type LegalRoute = 'terms' | 'privacy' | 'refund' | 'support';

export default function GrifonPricing({ onEnterApp, onNavigateHome, onNavigateLegal }: { onEnterApp: () => void, onNavigateHome: () => void, onNavigateLegal: (page: LegalRoute) => void }) {
  const [billing, setBilling] = useState("monthly");
  const [loaded, setLoaded] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(2); // Default to Pro
  const [isCheckingOut, setIsCheckingOut] = useState<PlanId | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const PLAN_IDS: Array<'free' | PlanId> = ['free', 'creator', 'pro', 'business'];

  const handleCtaClick = async (index: number) => {
    const planId = PLAN_IDS[index];
    if (planId === 'free' || index === 3) {
      // Free tier goes straight into the app. Business tier = Contact sales;
      // for now send them to signup too (ship first, add contact form later).
      onEnterApp();
      return;
    }
    const cycle: BillingCycle = billing === 'annual' ? 'annual' : 'monthly';
    setIsCheckingOut(planId);
    try {
      await startCheckout(planId, cycle);
    } catch (err: any) {
      if (err?.message === 'NOT_AUTHENTICATED') {
        toast.info('Sign in to continue', { description: 'We\u2019ll resume your upgrade after you sign in.' });
        onEnterApp();
      } else {
        toast.error('Checkout failed', { description: err?.message ?? 'Please try again.' });
      }
    } finally {
      setIsCheckingOut(null);
    }
  };

  useEffect(() => { 
    setTimeout(() => setLoaded(true), 100);
    
    // Scroll to Pro card on load only on smaller screens
    setTimeout(() => {
      if (scrollRef.current && window.innerWidth < 1024) {
        const container = scrollRef.current;
        const cards = container.children;
        if (cards.length > 2) {
          const proCard = cards[2] as HTMLElement;
          const scrollLeft = proCard.offsetLeft - (container.clientWidth / 2) + (proCard.clientWidth / 2);
          container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
      }
    }, 150);
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    const scrollPosition = container.scrollLeft + container.clientWidth / 2;
    
    let closestIndex = 0;
    let minDistance = Infinity;
    
    Array.from(container.children).forEach((child, index) => {
      const childElement = child as HTMLElement;
      const childCenter = childElement.offsetLeft + childElement.clientWidth / 2;
      const distance = Math.abs(scrollPosition - childCenter);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    
    setActiveCardIndex(closestIndex);
  };

  const current = plans[billing as keyof typeof plans];

  const valueStack = [
    { item: "40 AI Video Ad Scripts", value: "₱20,000" },
    { item: "15 Deep Market Research Reports", value: "₱22,500" },
    { item: "15 Offer Optimizations", value: "₱15,000" },
    { item: "300 Ad Captions & Headlines", value: "₱15,000" },
    { item: "150 AI Ad Images", value: "₱15,000" },
    { item: "15 AI Video Ads", value: "₱75,000" },
    { item: "Monthly Strategy Call", value: "₱5,000" },
    { item: "Private Community Access", value: "₱2,500" },
  ];

  const totalValue = "₱170,000";

  const navLinks: SiteNavLink[] = [
    { label: 'Home', onClick: onNavigateHome },
  ];

  return (
    <div className="font-sans" style={{
      minHeight: "100vh",
      background: "#09090b",
      color: "#fff",
      overflowX: "hidden",
      position: "relative",
    }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        .gold-glow { 
          box-shadow: 0 0 40px rgba(255,204,0,0.15), 0 0 80px rgba(255,204,0,0.05);
          border-color: #FFCC00 !important;
        }
        
        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 0 30px rgba(255,204,0,0.12), 0 0 60px rgba(255,204,0,0.05);
        }
        
        .gold-btn {
          background: #FFCC00;
          color: #000;
          border: none;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.2s;
        }
        .gold-btn:hover {
          box-shadow: 0 0 30px rgba(255,204,0,0.4);
          transform: scale(1.02);
        }
        
        .ghost-btn {
          background: transparent;
          color: #a1a1aa;
          border: 1px solid rgba(255,255,255,0.1);
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          cursor: pointer;
          transition: all 0.2s;
        }
        .ghost-btn:hover {
          border-color: #FFCC00;
          color: #fff;
        }
        
        .value-line {
          text-decoration: line-through;
          color: #71717a;
        }
        
        .fade-up {
          opacity: 0;
          transform: translateY(30px);
          animation: fadeUp 0.7s ease forwards;
        }
        @keyframes fadeUp {
          to { opacity: 1; transform: translateY(0); }
        }
        
        .grid-bg {
          background-image: radial-gradient(rgba(255,204,0,0.08) 1px, transparent 1px);
          background-size: 32px 32px;
        }

        .marquee {
          display: flex;
          animation: scroll 20s linear infinite;
        }
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .table-row:nth-child(even) { background: rgba(255,255,255,0.02); }
        .table-row:hover { background: rgba(255,204,0,0.03); }
      `}</style>

      {/* Ambient background (Synced with LandingPage) */}
      <div className="fixed inset-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ 
            x:[0, 50, -30, 0], 
            y: [0, -50, 30, 0],
            scale: [1, 1.1, 0.9, 1] 
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] w-[500px] md:w-[800px] aspect-square bg-[#FFCC00]/8 rounded-full blur-[100px] md:blur-[150px] opacity-60"
        />
        <motion.div 
          animate={{ 
            x: [0, -40, 20, 0], 
            y:[0, 40, -20, 0],
            scale:[1, 0.9, 1.1, 1] 
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] right-[-10%] w-[400px] md:w-[600px] aspect-square bg-[#FFCC00]/15 rounded-full blur-[100px] md:blur-[150px] opacity-60"
        />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>

      {/* STICKY TOP — founding urgency bar + nav */}
      <div className="sticky top-0 z-50">
        <UrgencyBar />
        <SiteHeader onEnterApp={onEnterApp} navLinks={navLinks} onLogoClick={onNavigateHome} showLogin={false} />
      </div>

        {/* ===== HERO SECTION ===== */}
        <section className="grid-bg" style={{ 
          padding: "80px 20px 60px", 
          textAlign: "center",
          maxWidth: 900, margin: "0 auto",
        }}>
          <div className={loaded ? "fade-up" : ""} style={{ animationDelay: "0.1s" }}>
          </div>

          <h1 className={loaded ? "fade-up uppercase bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500" : "uppercase bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500"} style={{
            animationDelay: "0.2s",
            fontSize: "clamp(28px, 5vw, 52px)",
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            marginBottom: 20,
          }}>
            Stop Spending 6 Hours<br/>
            Making One Ad That<br/>
            <span style={{ color: "#FFCC00" }}>Doesn't Convert.</span>
          </h1>

          <p className={loaded ? "fade-up" : ""} style={{ 
            animationDelay: "0.3s",
            fontSize: "clamp(15px, 2.5vw, 19px)", 
            color: "#a1a1aa", 
            maxWidth: 560, 
            margin: "0 auto 32px",
            lineHeight: 1.6,
          }}>
            Grifon creates your entire ad campaign — scripts, videos, images,
            captions, market research — in 30 minutes. Not 3 days.
          </p>

          <div className={loaded ? "fade-up" : ""} style={{ 
            animationDelay: "0.4s",
            display: "flex", gap: 24, justifyContent: "center", flexWrap: "wrap",
            fontSize: 13, color: "#71717a",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Lock /> No credit card for Free plan
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Check /> Free forever — no time limit
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Check /> Cancel anytime
            </span>
          </div>
        </section>

        {/* ===== SOCIAL PROOF PILL ===== */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <div className="inline-flex items-center gap-3 bg-zinc-800/60 border border-white/10 rounded-full px-4 py-2">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-white">MR</div>
              <div className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-zinc-600 flex items-center justify-center text-[10px] font-bold text-white">JL</div>
              <div className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-zinc-500 flex items-center justify-center text-[10px] font-bold text-white">CM</div>
            </div>
            <span className="text-sm text-zinc-300 font-semibold">
              Trusted by <span className="text-[#FFCC00] font-bold">100+</span> Filipino Business Owners
            </span>
          </div>
        </div>

        {/* ===== BILLING TOGGLE ===== */}
        <div style={{ 
          display: "flex", justifyContent: "center", alignItems: "center", 
          gap: 12, marginBottom: 48, padding: "0 20px",
        }}>
          <div style={{
            display: "flex",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, padding: 4,
          }}>
            {["monthly", "annual"].map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{
                padding: "10px 24px",
                borderRadius: 10,
                border: "none",
                background: billing === b ? "#FFCC00" : "transparent",
                color: billing === b ? "#000" : "#71717a",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}>
                {b === "monthly" ? "Monthly" : "Annual"}
              </button>
            ))}
          </div>
          {billing === "annual" && (
            <span className="font-mono" style={{
              background: "rgba(255,204,0,0.1)",
              color: "#FFCC00",
              border: "1px solid rgba(255,204,0,0.25)",
              fontSize: 11,
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: 999,
              letterSpacing: "0.1em",
            }}>
              2 MONTHS FREE
            </span>
          )}
        </div>

        {/* ===== PRICING CARDS ===== */}
        <div className="relative max-w-[1440px] mx-auto mb-8">
          <style>{`
            .hide-scrollbar::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-4 px-4 pt-6 pb-4 overflow-x-auto snap-x snap-proximity scroll-smooth hide-scrollbar"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {current.map((plan, i) => {
              const isPro = i === 2;
              const isFree = i === 0;
              const tierColors = ["#71717a", "#a1a1aa", "#FFCC00", "#e4e4e7"];
              const tierDescs = [
                "Test the waters. No risk.",
                "For business owners ready to create.",
                "For marketers who want to dominate.",
                "For agencies managing multiple brands.",
              ];
              const ctas = ["Get Started Free", "Start Creating", "Start Dominating", "Contact Us"];

              return (
                <div
                  key={i}
                  className={`card-hover snap-center flex-shrink-0 w-[85vw] max-w-[340px] ${isPro ? "gold-glow" : ""}`}
                  style={{
                    position: "relative",
                    background: isPro 
                      ? "linear-gradient(180deg, rgba(255,204,0,0.08) 0%, rgba(9,9,11,0.95) 40%)" 
                      : "rgba(24,24,27,0.6)",
                    backdropFilter: "blur(20px)",
                    border: `1px solid ${isPro ? "#FFCC00" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 20,
                    padding: "32px 24px",
                    transition: "all 0.3s ease",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                {isPro && (
                  <div className="font-mono" style={{
                    position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)",
                    background: "#FFCC00", color: "#000",
                    fontSize: 10, fontWeight: 900,
                    padding: "5px 16px", borderRadius: 100,
                    textTransform: "uppercase", letterSpacing: "0.15em",
                    display: "flex", alignItems: "center", gap: 4,
                    whiteSpace: "nowrap",
                  }}>
                    <Star /> Most Popular
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <span className="font-mono" style={{
                    fontSize: 11, fontWeight: 700, 
                    color: tierColors[i],
                    textTransform: "uppercase", letterSpacing: "0.15em",
                  }}>
                    {plan.label}
                  </span>
                </div>

                <div style={{ marginBottom: 8, display: "flex", alignItems: "baseline", gap: 4 }}>
                  <span style={{ 
                    fontSize: isFree ? 36 : 14, 
                    color: isFree ? "#a1a1aa" : "#71717a",
                    fontWeight: 600,
                  }}>
                    {isFree ? "" : "₱"}
                  </span>
                  <span style={{
                    fontSize: "clamp(32px, 4vw, 42px)",
                    fontWeight: 900,
                    color: isPro ? "#FFCC00" : "#fff",
                    letterSpacing: "-0.02em",
                  }}>
                    {isFree ? "Free" : plan.price}
                  </span>
                  {!isFree && (
                    <span style={{ fontSize: 13, color: "#52525b", fontWeight: 600 }}>
                      {plan.period}
                    </span>
                  )}
                </div>

                {plan.savings && (
                  <span style={{
                    fontSize: 11, color: "#FFCC00", fontWeight: 600,
                    opacity: 0.75,
                    marginBottom: 8, display: "block",
                  }}>
                    {plan.savings}
                  </span>
                )}

                <p style={{ 
                  fontSize: 13, color: "#71717a", 
                  marginBottom: 24, lineHeight: 1.5,
                  minHeight: 36,
                }}>
                  {tierDescs[i]}
                </p>

                <button
                  className={isPro || isFree ? "gold-btn" : "ghost-btn"}
                  style={{
                    width: "100%", padding: "14px 0",
                    borderRadius: 12, fontSize: 13,
                    marginBottom: 24,
                    opacity: isCheckingOut === PLAN_IDS[i] ? 0.7 : 1,
                    cursor: isCheckingOut ? "wait" : "pointer",
                  }}
                  disabled={isCheckingOut !== null}
                  onClick={() => handleCtaClick(i)}
                >
                  {isCheckingOut === PLAN_IDS[i] ? "Redirecting\u2026" : ctas[i]}
                </button>

                <div style={{ 
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  paddingTop: 20,
                  flex: 1,
                }}>
                  <p className="font-mono" style={{ 
                    fontSize: 10, color: "#52525b", 
                    textTransform: "uppercase", letterSpacing: "0.15em",
                    marginBottom: 12,
                  }}>
                    {i === 0 ? "Includes:" : `Everything in ${i === 1 ? "Free" : current[i-1].label}, plus:`}
                  </p>

                  {[
                    // Free highlights
                    ...(i === 0 ? [
                      "3 video ad workflows",
                      "1 market research report",
                      "10 caption generations",
                      "5 AI images (watermarked)",
                      "Email support",
                    ] : []),
                    // Creator / Pro / Business — shared source of truth (config/planFeatures.ts)
                    ...(i === 1 ? PLAN_FEATURES.creator : []),
                    ...(i === 2 ? PLAN_FEATURES.pro : []),
                    ...(i === 3 ? PLAN_FEATURES.business : []),
                  ].map((f, fi) => (
                    <div key={fi} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      fontSize: 13, color: "#d4d4d8",
                      marginBottom: 10,
                      lineHeight: 1.4,
                    }}>
                      <span style={{ flexShrink: 0 }}><Check /></span>
                      <span>{f}</span>
                    </div>
                  ))}

                  {i === 2 && (
                    <div className="font-mono flex items-center justify-center gap-1.5" style={{
                      marginTop: 16, padding: "10px 12px",
                      background: "rgba(255,204,0,0.06)",
                      border: "1px solid rgba(255,204,0,0.15)",
                      borderRadius: 10, fontSize: 11,
                      color: "#FFCC00",
                    }}>
                      <FilmIcon size={12} strokeWidth={2} /> VIDEO ADS UNLOCKED ON PRO
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
          
          {/* Dot Indicators */}
          <div className="flex justify-center gap-2 mt-4">
            {current.map((_, i) => (
              <div 
                key={i}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  activeCardIndex === i ? "bg-[#FFCC00]" : "bg-zinc-700"
                }`}
              />
            ))}
          </div>
        </div>

        {/* ===== VALUE STACK SECTION (Pro) ===== */}
        <section style={{
          maxWidth: 700,
          margin: "0 auto 80px",
          padding: "0 20px",
        }}>
          <div style={{
            background: "rgba(24,24,27,0.8)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,204,0,0.2)",
            borderRadius: 24,
            padding: "clamp(24px, 4vw, 48px)",
            position: "relative",
            overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 0, right: 0,
              width: 200, height: 200,
              background: "radial-gradient(circle, rgba(255,204,0,0.08) 0%, transparent 70%)",
            }}/>

            <p className="font-mono" style={{
              fontSize: 10, color: "#FFCC00",
              textTransform: "uppercase", letterSpacing: "0.2em",
              marginBottom: 8,
            }}>
              // PRO PLAN VALUE BREAKDOWN
            </p>

            <h2 className="bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500" style={{
              fontSize: "clamp(22px, 3.5vw, 32px)",
              fontWeight: 900,
              marginBottom: 32,
              lineHeight: 1.1,
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
            }}>
              Here's What You're Actually Getting<br/>
              <span style={{ color: "#FFCC00" }}>Every Single Month.</span>
            </h2>

            {valueStack.map((item, i) => (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Check />
                  <span style={{ fontSize: 14, color: "#d4d4d8" }}>{item.item}</span>
                </div>
                <span className="value-line" style={{ fontSize: 14, fontWeight: 600 }}>
                  {item.value}
                </span>
              </div>
            ))}

            <div style={{
              marginTop: 32, textAlign: "center",
              paddingTop: 24,
              borderTop: "1px solid rgba(255,255,255,0.1)",
            }}>
              <p style={{ fontSize: 13, color: "#71717a", marginBottom: 4 }}>
                Total value if you hired freelancers:
              </p>
              <p style={{
                fontSize: 36, fontWeight: 900,
                color: "#52525b",
                textDecoration: "line-through",
                letterSpacing: "-0.02em",
                marginBottom: 8,
              }}>
                {totalValue}/mo
              </p>
              <p style={{ fontSize: 13, color: "#a1a1aa", marginBottom: 4 }}>
                Your price with Grifon Pro:
              </p>
              <p style={{
                fontSize: 48, fontWeight: 900,
                color: "#FFCC00",
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}>
                ₱2,497<span style={{ fontSize: 16, color: "#71717a" }}>/mo</span>
              </p>
              <p style={{
                fontSize: 14, color: "#a1a1aa", fontWeight: 700,
                marginTop: 8, marginBottom: 24,
              }}>
                That's <span style={{ color: "#FFCC00", fontWeight: 900 }}>99%</span> less than doing it the old way.
              </p>
              <button
                className="gold-btn"
                style={{
                  padding: "16px 48px", borderRadius: 999,
                  fontSize: 15,
                  opacity: isCheckingOut === 'pro' ? 0.7 : 1,
                  cursor: isCheckingOut ? "wait" : "pointer",
                }}
                disabled={isCheckingOut !== null}
                onClick={() => handleCtaClick(2)}
              >
                {isCheckingOut === 'pro' ? 'Redirecting\u2026' : 'Start Pro \u2014 Unlock Video Ads'}
              </button>
            </div>
          </div>
        </section>

        {/* ===== COMPARISON: OLD WAY vs GRIFON ===== */}
        <section style={{
          maxWidth: 800,
          margin: "0 auto 80px",
          padding: "0 20px",
        }}>
          <h2 className="bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500" style={{
            textAlign: "center",
            fontSize: "clamp(22px, 3.5vw, 32px)",
            fontWeight: 900,
            marginBottom: 32,
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
          }}>
            The Old Way vs. <span style={{ color: "#FFCC00" }}>The Grifon Way</span>
          </h2>

          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
          }}>
            {/* Old Way */}
            <div style={{
              background: "rgba(24,24,27,0.5)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: "clamp(16px, 3vw, 32px)",
            }}>
              <p className="font-mono flex items-center gap-1.5" style={{
                fontSize: 10, color: "#71717a",
                textTransform: "uppercase", letterSpacing: "0.15em",
                marginBottom: 16,
              }}>
                <XIcon size={12} strokeWidth={2} /> THE OLD WAY
              </p>
              {[
                "₱5,000/video × freelancer",
                "4-5 apps open at once",
                "6+ hours per ad creative",
                "Generic scripts from ChatGPT",
                "No market research",
                "No strategy — just guessing",
                "₱30K+/month for an agency",
              ].map((x, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: 13, color: "#a1a1aa", marginBottom: 8,
                }}>
                  <X /> {x}
                </div>
              ))}
            </div>

            {/* Grifon Way */}
            <div style={{
              background: "rgba(255,204,0,0.04)",
              border: "1px solid rgba(255,204,0,0.15)",
              borderRadius: 16, padding: "clamp(16px, 3vw, 32px)",
            }}>
              <p className="font-mono flex items-center gap-1.5" style={{
                fontSize: 10, color: "#FFCC00",
                textTransform: "uppercase", letterSpacing: "0.15em",
                marginBottom: 16,
              }}>
                <CheckIcon size={12} strokeWidth={2.5} /> THE GRIFON WAY
              </p>
              {[
                "15 video ads/month for ₱2,497",
                "Everything in ONE app",
                "30 minutes per campaign",
                "AI scripts using proven frameworks",
                "Deep market research built in",
                "Offer optimization + strategy calls",
                "99% cheaper than an agency",
              ].map((x, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: 13, color: "#d4d4d8", marginBottom: 8,
                }}>
                  <Check /> {x}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== SOCIAL PROOF ===== */}
        <section className="py-12 md:py-24 border-y border-white/5 bg-transparent backdrop-blur-sm relative z-10">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#FFCC00] text-center mb-2">
              // WHAT EARLY USERS ARE SAYING
            </p>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-center mb-8 bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">
              TRUSTED BY FILIPINO BUSINESS OWNERS
            </h2>
            
            {/* Testimonials Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mt-8">
              {testimonials.map((testimonial, idx) => (
                <div 
                  key={idx} 
                  className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col h-full"
                >
                  <div className="px-2 flex-1 flex flex-col">
                    <div className="flex gap-1 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarIcon key={star} size={16} strokeWidth={0} fill="#FFCC00" className="text-[#FFCC00]" />
                      ))}
                    </div>
                    <p className="text-sm sm:text-base text-zinc-300 italic leading-relaxed mb-6 flex-1">
                      "{testimonial.text}"
                    </p>
                    <div>
                      <div className="text-white font-bold text-base">{testimonial.name}</div>
                      <div className="text-zinc-500 text-sm">{testimonial.biz}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== GUARANTEE ===== */}
        <section className="max-w-[600px] mx-auto mb-20 px-5 text-center">
          <AnimatedBorder containerClassName="h-full w-full" className="p-10 md:p-12 text-center bg-zinc-900/80 backdrop-blur-xl relative overflow-hidden">
            <ShieldCheck className="w-12 h-12 text-[#FFCC00] mx-auto mb-4" />
            <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">
              7-Day Money-Back Guarantee
            </h3>
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-[440px] mx-auto">
              Subscribe to any paid plan. If Grifon doesn't save you at least 10 hours in 
              your first week, we'll refund you 100%. No questions asked. No hoops. 
              No "talk to a manager." Just a refund.
            </p>
          </AnimatedBorder>
        </section>

        {/* ===== FAQ ===== */}
        <section style={{
          maxWidth: 650, margin: "0 auto 80px",
          padding: "0 20px",
        }}>
          <h2 className="bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500" style={{
            textAlign: "center",
            fontSize: 24, fontWeight: 800,
            marginBottom: 32,
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
          }}>
            Questions? We've got answers.
          </h2>

          {[
            { 
              q: "How does the Free plan work?", 
              a: "Sign up, start creating immediately. No credit card needed. You get 3 ad workflows, 1 research report, 10 captions, and 5 watermarked images every month — forever. When you want more, upgrade to Creator or Pro." 
            },
            { 
              q: "Can I switch plans later?", 
              a: "Absolutely. Upgrade, downgrade, or cancel anytime from your dashboard. Your unused credits carry over when you upgrade." 
            },
            { 
              q: "Why can't I get video ads on Creator?", 
              a: "AI video generation is expensive to run. To keep Creator affordable at ₱997/month, video is exclusive to Pro and Business. You get everything else — scripts, research, images, captions — on Creator." 
            },
            { 
              q: "What payment methods do you accept?", 
              a: "GCash, Maya, credit/debit cards, and bank transfer via PayMongo. For global users, we accept Visa, Mastercard, and international cards via Stripe." 
            },
            { 
              q: "Is this just another AI tool that produces garbage?", 
              a: "We built Grifon for ourselves first. We used it to run our own clients' ad campaigns in 2025. Every module uses proven marketing frameworks — Sabri Suby copywriting, Cialdini psychology, MrBeast hooks. It's not random AI output. It's structured, strategy-driven content." 
            },
          ].map((faq, i) => (
            <details key={i} style={{
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              padding: "16px 0",
            }}>
              <summary style={{
                fontSize: 15, fontWeight: 600,
                cursor: "pointer", color: "#e4e4e7",
                listStyle: "none",
                display: "flex", justifyContent: "space-between",
              }}>
                {faq.q}
                <span style={{ color: "#FFCC00", fontSize: 18, flexShrink: 0, marginLeft: 12 }}>+</span>
              </summary>
              <p style={{
                fontSize: 14, color: "#a1a1aa",
                lineHeight: 1.7, marginTop: 12,
                paddingRight: 24,
              }}>
                {faq.a}
              </p>
            </details>
          ))}
        </section>

        {/* ===== FINAL CTA ===== */}
        <section style={{
          textAlign: "center",
          padding: "60px 20px 80px",
          maxWidth: 600,
          margin: "0 auto",
        }}>
          <h2 className="bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500" style={{
            fontSize: "clamp(24px, 4vw, 36px)",
            fontWeight: 900,
            marginBottom: 16,
            lineHeight: 1.1,
            textTransform: "uppercase",
            letterSpacing: "-0.02em",
          }}>
            Your competitors are creating<br/>
            10 ads while you make <span style={{ color: "#FFCC00" }}>one.</span>
          </h2>
          <p style={{
            fontSize: 15, color: "#a1a1aa",
            marginBottom: 32, lineHeight: 1.6,
          }}>
            The question isn't whether you can afford Grifon.<br/>
            It's whether you can afford to keep doing it the old way.
          </p>
          <button
            className="gold-btn"
            style={{
              padding: "18px 48px", borderRadius: 999,
              fontSize: 15, marginBottom: 16,
            }}
            onClick={onEnterApp}
          >
            Start Free — No Credit Card Needed
          </button>
          <p style={{ fontSize: 12, color: "#52525b" }}>
            Join Filipino business owners switching to Grifon
          </p>
        </section>

        {/* ===== FOOTER ===== */}
        <footer className="font-mono" style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "24px 20px",
          textAlign: "center",
          fontSize: 11, color: "#3f3f46",
        }}>
          <div style={{ marginBottom: 12, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px 20px" }}>
            <a href="/terms" onClick={(e) => { e.preventDefault(); onNavigateLegal('terms'); }} style={{ color: "#71717a", textDecoration: "none" }}>Terms</a>
            <a href="/privacy" onClick={(e) => { e.preventDefault(); onNavigateLegal('privacy'); }} style={{ color: "#71717a", textDecoration: "none" }}>Privacy</a>
            <a href="/refund" onClick={(e) => { e.preventDefault(); onNavigateLegal('refund'); }} style={{ color: "#71717a", textDecoration: "none" }}>Refund</a>
            <a href="/support" onClick={(e) => { e.preventDefault(); onNavigateLegal('support'); }} style={{ color: "#71717a", textDecoration: "none" }}>Support</a>
          </div>
          GRIFON.AI © 2026 — Haste Enterprises — Built in the Philippines
        </footer>
      </div>
    </div>
  );
}
