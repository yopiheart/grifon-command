import React from 'react';
import { motion } from 'motion/react';
import { Play, Rocket, ChevronDown, ShieldCheck, MessageSquare, Palette, Sparkles, Film, Search, Target, Type, ImageIcon, Building2, UtensilsCrossed, ShoppingBag } from 'lucide-react';
import { GoldButton } from './ui/GoldButton';
import { GlassPanel } from './ui/GlassPanel';
import { AnimatedBorder } from './ui/AnimatedBorder';
import { Aurora } from './ui/Aurora';

type LegalRoute = 'terms' | 'privacy' | 'refund' | 'support';

interface LandingPageProps {
  onEnterApp: () => void;
  onNavigatePricing: () => void;
  onNavigateLegal: (page: LegalRoute) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnterApp, onNavigatePricing, onNavigateLegal }) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans overflow-x-hidden selection:bg-[#FFCC00] selection:text-black">
      
      <Aurora intensity="marketing" />

      {/* BILLIONAIRE STICKY HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-zinc-950/80 border-b border-white/10">
        <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3 max-w-7xl mx-auto">
          {/* Left Side: Brand Logo */}
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="GRIFON Logo" className="h-8 w-auto object-contain" />
            <span className="font-black text-xl tracking-tighter text-white italic">GRIFON<span className="text-[#FFCC00]">.AI</span></span>
          </div>

          {/* Right Side: Links & CTA */}
          <div className="flex items-center gap-4 md:gap-8">
            <button onClick={onNavigatePricing} className="bg-transparent border border-white/20 text-white text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.2em] px-4 py-1.5 rounded-full hover:bg-white/10 transition-all cursor-pointer">
              PRICING
            </button>
            <button onClick={onEnterApp} className="hidden md:block text-[11px] font-mono uppercase tracking-[0.2em] text-zinc-400 hover:text-white transition-all cursor-pointer">
              LOG IN
            </button>
            <button onClick={onEnterApp} className="bg-transparent border border-[#FFCC00] text-[#FFCC00] text-[11px] font-black uppercase tracking-widest px-5 py-2 rounded-full hover:bg-[#FFCC00]/10 hover:shadow-[0_0_15px_rgba(255,204,0,0.3)] hover:scale-105 transition-all">
              START FREE
            </button>
          </div>
        </div>
      </header>

      {/* SECTION 1: THE HERO (SaaS Refinement) */}
      <section className="relative pt-32 pb-12 md:pt-40 md:pb-20 px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col justify-center overflow-hidden z-10">
        <div className="relative z-10 w-full flex flex-col items-center">
          {/* Centered headline */}
          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold uppercase tracking-tighter leading-[0.9] bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500"
          >
            CREATE YOUR ENTIRE AD CAMPAIGN IN <span className="text-[#FFCC00]">30 MINUTES.</span> NOT 3 DAYS.
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center max-w-2xl mx-auto mt-6 text-zinc-400 text-base md:text-lg"
          >
            You're spending 6 hours making one ad that doesn't convert. Your competitor just dropped 10. Grifon fixes that.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 text-center w-full sm:w-auto"
          >
            <GoldButton onClick={onEnterApp} className="w-full sm:w-auto">
              START FREE — NO CREDIT CARD NEEDED
            </GoldButton>
          </motion.div>

          {/* Massive dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="w-full max-w-6xl mx-auto mt-12 md:mt-16 relative overflow-hidden rounded-t-2xl sm:rounded-t-[40px] border-t border-l border-r border-white/10 shadow-2xl sm:shadow-[0_-20px_80px_rgba(255,204,0,0.15)]"
          >
            <div className="w-full aspect-video bg-zinc-900 flex items-center justify-center relative">
              {/* CSS Mini-Dashboard — Director AI mid-workflow preview */}
              <div className="absolute inset-0 bg-zinc-950 flex overflow-hidden">
                {/* Left Sidebar — module nav */}
                <div className="w-1/4 bg-zinc-900 border-r border-white/5 p-3 sm:p-4 flex flex-col gap-1.5 text-[8px] sm:text-[10px] font-mono uppercase tracking-widest">
                  <div className="text-[7px] sm:text-[9px] text-zinc-600 mb-1 hidden sm:block">// MODULES</div>
                  {[
                    { icon: Film,       label: 'Director AI',      active: true },
                    { icon: Search,     label: 'Market Research',  active: false },
                    { icon: Target,     label: 'Offer Optimizer',  active: false },
                    { icon: Type,       label: 'Caption & Headline', active: false },
                    { icon: ImageIcon,  label: 'Image Studio',     active: false },
                  ].map((m, i) => {
                    const Icon = m.icon;
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded ${m.active ? 'bg-[#FFCC00]/10 text-[#FFCC00] border-l-2 border-[#FFCC00]' : 'text-zinc-500'}`}
                      >
                        <Icon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{m.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Main Canvas — Director AI Step 03 / Storyboard */}
                <div className="flex-1 relative bg-zinc-950/50 p-3 sm:p-6 flex flex-col">
                  {/* Step indicator */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-[8px] sm:text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                      // DIRECTOR AI
                    </div>
                    <div className="text-[8px] sm:text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] bg-[#FFCC00]/10 border border-[#FFCC00]/25 rounded-full px-2 py-1 sm:px-3">
                      Step 03 / 08 — Storyboard
                    </div>
                  </div>

                  {/* Storyboard frame strip */}
                  <div className="flex-1 grid grid-cols-4 gap-1.5 sm:gap-3 min-h-0">
                    {[1, 2, 3, 4].map((n) => {
                      const active = n === 3;
                      return (
                        <div
                          key={n}
                          className={`relative rounded sm:rounded-md border ${active ? 'border-[#FFCC00]/50 bg-zinc-800' : 'border-white/5 bg-zinc-900'} flex items-center justify-center overflow-hidden`}
                        >
                          <div className="absolute top-1 left-1 text-[7px] sm:text-[9px] font-mono text-zinc-500 tracking-widest">
                            0{n}
                          </div>
                          {active && (
                            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#FFCC00] flex items-center justify-center shadow-[0_0_15px_rgba(255,204,0,0.5)]">
                              <Play className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-black ml-0.5" fill="currentColor" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Generation status bar */}
                  <div className="mt-3 sm:mt-4 h-8 sm:h-10 bg-zinc-900/80 border border-white/10 rounded-md sm:rounded-lg flex items-center px-2 sm:px-4 gap-2 sm:gap-3">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#FFCC00] shadow-[0_0_8px_rgba(255,204,0,0.6)] animate-pulse"></div>
                    <div className="text-[7px] sm:text-[10px] font-mono uppercase tracking-widest text-zinc-400 hidden sm:block shrink-0">
                      Generating storyboard
                    </div>
                    <div className="flex-1 h-1 sm:h-1.5 bg-white/10 rounded-full relative overflow-hidden">
                      <div className="absolute top-0 left-0 h-full w-[37%] bg-gradient-to-r from-[#FFCC00] to-[#FFCC00]/60 rounded-full shadow-[0_0_10px_rgba(255,204,0,0.4)]"></div>
                    </div>
                    <div className="text-[7px] sm:text-[10px] font-mono text-[#FFCC00] tracking-widest shrink-0">37%</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Gradient fade at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-zinc-950 to-transparent" />
          </motion.div>
        </div>
      </section>

      {/* SECTION 2: THE "WALL OF PROOF" (AI Ads That Win) */}
      <section className="py-12 md:py-24 border-y border-white/5 bg-transparent relative z-10 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">
            THESE ADS WERE MADE BY AI. THEY OUTPERFORMED AGENCIES.
          </h2>
        </div>
        
        {/* Proof Carousel — 9:16 vertical, swipeable on mobile, 3-across on desktop */}
        <div className="max-w-7xl mx-auto">
          <style>{`.proof-scroll::-webkit-scrollbar { display: none; }`}</style>
          <div
            className="proof-scroll flex gap-4 lg:gap-6 overflow-x-auto snap-x snap-proximity scroll-smooth px-4 pb-4"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {[
              { title: 'Condo Pre-Selling Ad', roas: '4.8×', time: '20 min', label: 'REAL ESTATE', icon: Building2 },
              { title: 'Food Business Launch', roas: '3.2×', time: '15 min', label: 'F&B', icon: UtensilsCrossed },
              { title: 'Online Store Campaign', roas: '5.1×', time: '25 min', label: 'E-COMMERCE', icon: ShoppingBag }
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
              <div
                key={idx}
                className="snap-center flex-shrink-0 w-[78vw] sm:w-[45vw] md:w-[31%] max-w-[340px] bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden group flex flex-col"
              >
                {/* Top section - Ad preview (9:16 to match vertical video ads) */}
                <div className="bg-gradient-to-br from-zinc-800 to-zinc-900 aspect-[9/16] flex items-center justify-center relative">
                  <div className="absolute inset-0 bg-zinc-950/20 group-hover:bg-transparent transition-colors duration-500"></div>
                  <Icon className="w-16 h-16 text-zinc-700 z-10" />
                  <div className="absolute top-4 left-4 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-[10px] font-mono text-zinc-300 tracking-widest">
                    {card.label}
                  </div>
                </div>

                {/* Bottom section */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <h3 className="text-lg font-bold text-white mb-3">{card.title}</h3>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-[#FFCC00] font-mono text-sm font-bold bg-[#FFCC00]/10 px-3 py-1 rounded-full border border-[#FFCC00]/20">
                      ROAS: {card.roas}
                    </div>
                    <div className="text-zinc-400 font-mono text-sm">
                      Made in {card.time}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
          {/* Swipe hint — mobile only */}
          <div className="md:hidden text-center text-[10px] font-mono text-zinc-600 uppercase tracking-widest mt-2">
            ← swipe →
          </div>
        </div>
        
        <div className="text-sm text-zinc-500 text-center mt-10 max-w-lg mx-auto px-4">
          Every ad above was scripted, designed, and exported inside Grifon. Zero freelancers. Zero agencies.
        </div>
      </section>

      {/* SECTION 2.5: HOW THE NEURAL PROTOCOL WORKS */}
      <section className="py-16 md:py-32 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-4">
              HOW IT WORKS
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold uppercase tracking-tight leading-tight max-w-4xl mx-auto bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">
              4 STEPS. <span className="text-[#FFCC00]">30 MINUTES.</span> ONE COMPLETE AD CAMPAIGN.
            </h2>
          </motion.div>

          {/* Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { num: '01', title: 'Tell Us Your Product', desc: 'Describe what you sell. Grifon analyzes your market, competitors, and ideal customer in seconds.', icon: MessageSquare },
              { num: '02', title: 'Pick Your Style', desc: 'Choose your ad format — video, image, carousel. Select tone, audience, and platform.', icon: Palette },
              { num: '03', title: 'Generate Everything', desc: 'Scripts, captions, images, headlines, offers — all generated in one workflow.', icon: Sparkles },
              { num: '04', title: 'Launch And Win', desc: 'Download your assets. Post them. Start converting. The whole process takes 30 minutes.', icon: Rocket }
            ].map((step, idx) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 hover:bg-zinc-800/80 transition-all duration-300 group flex flex-col h-full"
              >
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">
                  STEP {step.num}
                </div>
                <step.icon className="w-10 h-10 text-[#FFCC00] mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed flex-1">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 3: SOCIAL PROOF */}
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
            {[
              { quote: "Gumawa ako ng 5 video ads sa isang hapon. Before, 1 lang ginagawa ko per week.", name: "Mark R.", role: "Online Seller, Cebu" },
              { quote: "Yung Market Research niya, mas detailed pa sa agency na ₱30K/month ko before.", name: "Jessa L.", role: "Food Business Owner, Manila" },
              { quote: "Hindi ko kailangan mag-hire ng editor. Grifon does everything na.", name: "Carlo D.", role: "Freelance Marketer, Davao" }
            ].map((testimonial, idx) => (
              <div 
                key={idx} 
                className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 flex flex-col h-full"
              >
                <div className="px-2 flex-1 flex flex-col">
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-[#FFCC00] text-lg">★</span>
                    ))}
                  </div>
                  <p className="text-sm sm:text-base text-zinc-300 italic leading-relaxed mb-6 flex-1">
                    "{testimonial.quote}"
                  </p>
                  <div>
                    <div className="text-white font-bold text-base">{testimonial.name}</div>
                    <div className="text-zinc-500 text-sm">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 4: THE BENTO GRID */}
      <section className="py-16 md:py-32 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-center mb-4">
              WHAT'S INSIDE
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">
              Everything You Need. Nothing You Don't.
            </h2>
            <p className="text-zinc-400 text-center max-w-2xl mx-auto mb-12 text-base">
              Five battle-tested AI modules. Each one replaces a freelancer, an agency, or 6 hours of your time.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-7xl mx-auto">
            {[
              { title: 'Director AI', desc: '8-step video ad workflow. From script to shot list to finished campaign.', icon: Film, span: 'md:col-span-2' },
              { title: 'Market Research', desc: 'Deep-dive reports on your market, competitors, and dream customer.', icon: Search, span: '' },
              { title: 'Offer Optimizer', desc: 'Build irresistible offers using proven pricing psychology.', icon: Target, span: '' },
              { title: 'Caption & Headline', desc: 'Scroll-stopping copy for every platform. Generated in seconds.', icon: Type, span: '' },
              { title: 'Image Studio', desc: 'AI-generated ad images. Product shots, lifestyle, anything you need.', icon: ImageIcon, span: '' }
            ].map((module, idx) => {
              const CardContent = (
                <>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                  <module.icon className="w-8 h-8 text-[#FFCC00] mb-4 relative z-10" />
                  <h3 className="text-lg font-bold text-white mb-2 relative z-10">{module.title}</h3>
                  <p className="text-sm text-zinc-400 relative z-10">{module.desc}</p>
                </>
              );

              return idx === 0 ? (
                <motion.div
                  key={module.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                  className={module.span}
                >
                  <AnimatedBorder 
                    containerClassName="h-full w-full" 
                    className="bg-zinc-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden relative group p-8 md:p-10"
                  >
                    {CardContent}
                  </AnimatedBorder>
                </motion.div>
              ) : (
                <motion.div
                  key={module.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: idx * 0.1 }}
                  className={`bg-zinc-900/40 backdrop-blur-2xl border border-white/10 rounded-3xl overflow-hidden relative group p-8 md:p-10 ${module.span}`}
                >
                  {CardContent}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 5: THE ROI METRICS */}
      <section className="py-16 md:py-32 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto bg-zinc-900/30 backdrop-blur-xl border border-white/5 rounded-3xl sm:rounded-[40px] p-8 sm:p-12 md:p-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest text-center mb-2">
              PROOF
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 md:mb-16 uppercase tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">
              The Numbers Don't Lie.
            </h2>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
            {[
              { metric: '30', label: 'Minutes to a full campaign' },
              { metric: '₱997', label: 'Per month — not ₱30K for an agency' },
              { metric: '5×', label: 'More ad variations than manual' },
              { metric: '85%', label: 'Less time spent on content creation' }
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="flex flex-col items-center"
              >
                <div className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold text-[#FFCC00] tracking-tighter leading-none">
                  {item.metric}
                </div>
                <div className="text-xs md:text-sm text-zinc-400 mt-2 md:mt-4">
                  {item.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 6: THE UI SHOWCASE */}
      <section className="py-16 md:py-32 px-4 sm:px-6 lg:px-8 bg-transparent relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-900/40 via-zinc-950 to-zinc-950 pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">
              SEE IT IN ACTION.
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">
              No downloads. No complex timelines. No learning curve. Open your browser. Start creating.
            </p>
          </motion.div>

          <div className="relative h-[400px] md:h-[600px] w-full max-w-5xl mx-auto perspective-1000">
            <motion.div 
              initial={{ opacity: 0, rotateY: 20, x: -50, z: -100 }}
              whileInView={{ opacity: 1, rotateY: 15, x: -100, z: -50 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="absolute top-10 left-0 md:left-4 w-[55%] md:w-[58%] aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-[#FFCC00]/15 bg-zinc-900/80 backdrop-blur-md flex flex-col"
            >
              {/* Fake URL Bar */}
              <div className="h-8 bg-zinc-950/50 border-b border-white/5 flex items-center px-3 gap-2 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                <div className="ml-4 h-4 flex-1 bg-white/5 rounded-md max-w-[200px]"></div>
              </div>
              {/* Blank Dark Canvas */}
              <div className="flex-1 bg-zinc-950/80 relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#FFCC00]/5 to-transparent"></div>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, rotateY: -20, x: 50, z: -100 }}
              whileInView={{ opacity: 1, rotateY: -15, x: 100, z: -50 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.2 }}
              className="absolute top-20 right-0 md:right-4 w-[55%] md:w-[58%] aspect-video rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-[#FFCC00]/20 bg-zinc-900/80 backdrop-blur-md flex flex-col"
            >
              {/* Fake URL Bar */}
              <div className="h-8 bg-zinc-950/50 border-b border-white/5 flex items-center px-3 gap-2 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                <div className="ml-4 h-4 flex-1 bg-white/5 rounded-md max-w-[200px]"></div>
              </div>
              {/* Blank Dark Canvas */}
              <div className="flex-1 bg-zinc-950/80 relative">
                <div className="absolute inset-0 bg-gradient-to-tl from-[#FFCC00]/5 to-transparent"></div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 100, x: '-50%', z: 0 }}
              whileInView={{ opacity: 1, y: 0, x: '-50%', z: 50 }}
              viewport={{ once: true }}
              transition={{ duration: 1, delay: 0.4 }}
              className="absolute top-32 left-1/2 w-[68%] md:w-[68%] aspect-video rounded-xl overflow-hidden border border-[#FFCC00]/30 shadow-2xl shadow-[#FFCC00]/25 z-10 bg-zinc-900/80 backdrop-blur-md flex flex-col"
            >
              {/* Fake URL Bar */}
              <div className="h-8 bg-zinc-950/50 border-b border-white/5 flex items-center px-3 gap-2 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                <div className="ml-4 h-4 flex-1 bg-white/5 rounded-md max-w-[300px]"></div>
              </div>
              {/* Blank Dark Canvas */}
              <div className="flex-1 bg-zinc-950/80 relative flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/50 to-transparent"></div>
                <div className="w-1/2 h-1/2 border border-white/5 rounded-lg flex items-center justify-center bg-zinc-900/30">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white/20 ml-1" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* SECTION 7: THE FINAL CTA (Offer Stack) */}
      <section className="py-16 md:py-32 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <GlassPanel className="p-8 md:p-16 text-center bg-gradient-to-b from-zinc-900/80 to-zinc-950 border border-[#FFCC00]/20 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FFCC00] to-transparent"></div>
              
              <h2 className="text-4xl md:text-6xl font-bold uppercase tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500">
                READY TO CREATE ADS THAT ACTUALLY CONVERT?
              </h2>
              
              <div className="space-y-4 mb-12 text-left max-w-md mx-auto">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="text-zinc-400">Director AI Studio Access</span>
                  <span className="font-mono text-[#FFCC00] line-through opacity-50">₱24,000/yr</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="text-zinc-400">Market Research Engine</span>
                  <span className="font-mono text-[#FFCC00] line-through opacity-50">₱18,000/yr</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="text-zinc-400">Offer Optimizer</span>
                  <span className="font-mono text-[#FFCC00] line-through opacity-50">₱12,000/yr</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="text-zinc-400">Caption & Headline Generator</span>
                  <span className="font-mono text-[#FFCC00] line-through opacity-50">₱6,000/yr</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="text-zinc-400">Image Studio</span>
                  <span className="font-mono text-[#FFCC00] line-through opacity-50">₱6,000/yr</span>
                </div>
                <div className="flex items-center justify-between pt-4">
                  <span className="text-xl font-bold">TOTAL VALUE</span>
                  <span className="font-mono text-xl font-bold text-[#FFCC00] line-through opacity-50">₱66,000/yr</span>
                </div>
                <div className="flex items-center justify-center pt-6">
                  <span className="text-lg font-bold text-white text-center uppercase tracking-tighter">PLANS FROM FREE TO BUSINESS</span>
                </div>
              </div>

              <GoldButton onClick={onNavigatePricing} className="w-full md:w-auto text-lg md:text-xl px-12 py-6 shadow-[0_0_40px_rgba(255,204,0,0.4)]">
                SEE ALL PLANS →
              </GoldButton>
              <p className="text-[10px] font-mono text-zinc-500 mt-6 tracking-widest uppercase">
                // SECURE 256-BIT ENCRYPTION • 7-DAY GUARANTEE
              </p>
            </GlassPanel>
          </motion.div>
        </div>
      </section>

      {/* SECTION 8: THE TRUST FOOTER */}
      <section className="py-12 md:py-24 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-4xl mx-auto space-y-16">
          
          {/* The Guarantee */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <AnimatedBorder containerClassName="h-full w-full" className="p-8 md:p-12 text-center bg-zinc-900/80 backdrop-blur-xl relative overflow-hidden">
              <ShieldCheck className="w-12 h-12 text-[#FFCC00] mb-4 mx-auto" />
              <h2 className="text-3xl md:text-5xl font-bold uppercase tracking-tight mb-4 text-[#FFCC00]">
                7-DAY MONEY-BACK GUARANTEE
              </h2>
              <p className="text-zinc-300 md:text-lg max-w-2xl mx-auto">
                Subscribe to any paid plan. If Grifon doesn't save you at least 10 hours in your first week, we'll refund you 100%. No questions. No hoops.
              </p>
            </AnimatedBorder>
          </motion.div>

          {/* The FAQ */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h3 className="text-2xl font-bold uppercase tracking-tight mb-8 text-center">FREQUENTLY ASKED QUESTIONS</h3>
            {[
              { q: "DO I NEED ANY TECHNICAL SKILLS?", a: "No. If you can type what you sell, Grifon does the rest. No design skills. No copywriting experience. No video editing." },
              { q: "HOW IS THIS DIFFERENT FROM CANVA OR CHATGPT?", a: "Canva gives you templates. ChatGPT gives you generic text. Neither gives you market research, ad strategy, or a complete campaign. Grifon does all of it in one app." },
              { q: "IS THERE A LIMIT ON WHAT I CAN CREATE?", a: "Yes. Each plan has specific limits. Free gives you 3 ad workflows per month. Creator gives you 15. Pro gives you 40 plus video ads. See the pricing page for full details." },
              { q: "WHAT IF IT DOESN'T WORK FOR MY BUSINESS?", a: "Every paid plan has a 7-day money-back guarantee. If it doesn't save you time, you get a full refund." }
            ].map((faq, idx) => (
              <details key={idx} className="group bg-zinc-900/50 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between p-6 cursor-pointer font-bold uppercase tracking-wide hover:bg-white/5 transition-colors">
                  {faq.q}
                  <ChevronDown className="w-5 h-5 text-zinc-500 group-open:rotate-180 transition-transform" />
                </summary>
                <div className="p-6 pt-0 text-zinc-400 border-t border-white/5">
                  {faq.a}
                </div>
              </details>
            ))}
          </motion.div>

          {/* Viber CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div className="inline-flex flex-col items-center gap-4 p-8 border border-white/5 rounded-2xl bg-zinc-950/50 backdrop-blur-sm">
              <p className="text-zinc-400">Still have questions? Our onboarding team is standing by.</p>
              <a href="viber://chat?number=" target="_blank" rel="noopener noreferrer" className="px-6 py-3 rounded-full border border-white/20 text-white font-mono text-xs tracking-widest uppercase hover:bg-white/10 transition-colors flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.144 19.382c-.105-.084-.21-.168-.315-.252-.42-.336-.84-.672-1.26-1.008-.315-.252-.63-.504-.945-.756-.105-.084-.21-.168-.315-.252-.21-.168-.42-.252-.63-.168-.21.084-.42.252-.525.42-.21.336-.42.672-.63 1.008-.105.168-.21.336-.315.504-.105.168-.21.252-.42.252-.105 0-.21-.084-.315-.168-.42-.252-.84-.504-1.26-.756-1.155-.756-2.205-1.68-3.15-2.73-.84-.945-1.575-1.995-2.1-3.15-.105-.21-.21-.42-.315-.63-.084-.21 0-.42.168-.525.168-.105.336-.21.504-.315.336-.21.672-.42 1.008-.63.168-.105.252-.315.336-.525.084-.21 0-.42-.084-.63-.084-.105-.168-.21-.252-.315-.252-.315-.504-.63-.756-.945-.336-.42-.672-.84-1.008-1.26-.084-.105-.168-.21-.252-.315-.168-.21-.336-.21-.525-.168-.21.084-.42.252-.525.42-.21.21-.42.42-.63.63-.336.336-.672.672-.945 1.008-.21.21-.315.42-.42.63-.105.336-.105.672-.105 1.008 0 .42.105.84.21 1.26.21 1.05.525 2.1.945 3.15.84 2.1 1.995 3.99 3.36 5.67 1.47 1.785 3.15 3.36 5.145 4.62 1.47.945 3.045 1.68 4.725 2.1.63.105 1.26.21 1.89.21.42 0 .84 0 1.26-.105.42-.105.84-.21 1.155-.42.336-.21.672-.42.84-.756.21-.336.42-.672.63-1.008.105-.21.21-.42.21-.63.084-.21 0-.42-.168-.525zM24 10.038c0-5.544-4.494-10.038-10.038-10.038S3.924 4.494 3.924 10.038c0 1.68.42 3.255 1.155 4.725l-1.47 4.41 4.515-1.47c1.47.735 3.045 1.155 4.725 1.155 5.544 0 10.038-4.494 10.038-10.038zm-2.1 0c0 4.41-3.57 7.98-7.98 7.98-1.47 0-2.835-.42-4.095-1.05l-.315-.105-2.94.945.945-2.94-.21-.315c-.735-1.26-1.155-2.73-1.155-4.2 0-4.41 3.57-7.98 7.98-7.98s7.98 3.57 7.98 7.98z"/></svg>
                CHAT ON VIBER
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Mobile Login Link */}
      <div className="md:hidden text-center py-6">
        <p className="text-sm text-zinc-500">
          Already have an account? <span onClick={onEnterApp} className="text-[#FFCC00] hover:underline cursor-pointer">Log in</span>
        </p>
      </div>

      {/* PROFESSIONAL FOOTER */}
      <footer className="border-t border-white/5 bg-zinc-950 px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1 mb-8 md:mb-0">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="GRIFON Logo" className="h-8 w-auto object-contain" />
              <span className="text-white font-black italic text-xl tracking-tight">
                GRIFON<span className="text-[#FFCC00]">.AI</span>
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-3 leading-relaxed max-w-[200px]">
              AI-powered marketing studio. Built in the Philippines.
            </p>
            <p className="text-[10px] text-zinc-600 font-mono mt-4">
              © 2026 Haste Enterprises
            </p>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">PRODUCT</h4>
            <nav className="space-y-2">
              <a href="#" className="text-sm text-zinc-500 hover:text-white transition-all block">Director AI</a>
              <a href="#" className="text-sm text-zinc-500 hover:text-white transition-all block">Market Research</a>
              <a href="#" className="text-sm text-zinc-500 hover:text-white transition-all block">Offer Optimizer</a>
              <a href="#" className="text-sm text-zinc-500 hover:text-white transition-all block">Caption & Headline</a>
              <a href="#" className="text-sm text-zinc-500 hover:text-white transition-all block">Image Studio</a>
              <a href="#" className="text-sm text-zinc-500 hover:text-white transition-all block">Pricing</a>
            </nav>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">LEGAL</h4>
            <nav className="space-y-2">
              <a href="/privacy" onClick={(e) => { e.preventDefault(); onNavigateLegal('privacy'); }} className="text-sm text-zinc-500 hover:text-white transition-all block">Privacy Policy</a>
              <a href="/terms" onClick={(e) => { e.preventDefault(); onNavigateLegal('terms'); }} className="text-sm text-zinc-500 hover:text-white transition-all block">Terms of Service</a>
              <a href="/refund" onClick={(e) => { e.preventDefault(); onNavigateLegal('refund'); }} className="text-sm text-zinc-500 hover:text-white transition-all block">Refund Policy</a>
              <a href="/support" onClick={(e) => { e.preventDefault(); onNavigateLegal('support'); }} className="text-sm text-zinc-500 hover:text-white transition-all block">Support</a>
            </nav>
          </div>

          {/* Social Column */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-4">CONNECT</h4>
            <nav className="space-y-2">
              <a href="#" className="text-sm text-zinc-500 hover:text-white transition-all block">Facebook</a>
              <a href="#" className="text-sm text-zinc-500 hover:text-white transition-all block">Instagram</a>
              <a href="#" className="text-sm text-zinc-500 hover:text-white transition-all block">TikTok</a>
              <a href="#" className="text-sm text-zinc-500 hover:text-white transition-all block">Viber Community</a>
            </nav>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
