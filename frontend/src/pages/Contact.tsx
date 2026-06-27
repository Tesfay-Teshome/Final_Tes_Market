import { useState } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageSquare,
  Clock,
  Shield,
  Verified,
  Truck,
  Check,
  Headphones,
} from 'lucide-react';

const LUX = {
  ink: '#04130E',
  emeraldDeep: '#022C22',
  emerald: '#064E3B',
  emeraldSoft: '#065F46',
  gold: '#C9A24B',
  goldSoft: '#E6CE91',
  cream: '#F7F3EC',
  paper: '#FBF9F4',
};

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.name.trim().length < 2) e.name = 'Name is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
    if (form.subject.trim().length < 5) e.subject = 'Subject is required';
    if (form.message.trim().length < 10) e.message = 'Message must be at least 10 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSent(true);
      setForm({ name: '', email: '', subject: '', message: '' });
      setTimeout(() => setSent(false), 4000);
    }, 900);
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const inputClass =
    'w-full px-4 py-3 rounded-xl bg-white border transition-all duration-300 text-base focus:outline-none focus:ring-2';

  return (
    <div className="min-h-screen" style={{ background: LUX.paper }}>
      {/* HERO */}
      <section className="relative overflow-hidden flex items-center py-24 lg:py-32">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1423666639041-f56000627a92?w=1600&h=900&fit=crop)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(115deg, ${LUX.ink} 0%, rgba(2,44,34,0.92) 45%, rgba(2,44,34,0.65) 75%, rgba(4,19,14,0.85) 100%)`,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(120% 80% at 80% 20%, rgba(201,162,75,0.18), transparent 55%)',
          }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${LUX.gold}, transparent)` }}
        />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-3 mb-5">
            <span className="h-px w-10" style={{ background: LUX.gold }} />
            <span
              className="text-[11px] font-semibold tracking-[0.32em] uppercase"
              style={{ color: LUX.goldSoft }}
            >
              We're Here to Help
            </span>
            <span className="h-px w-10" style={{ background: LUX.gold }} />
          </div>
          <h1
            className="font-serif text-4xl md:text-6xl font-semibold text-white leading-[1.05] tracking-tight mb-5"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Get in{' '}
            <span
              className="italic font-light"
              style={{
                backgroundImage: `linear-gradient(90deg, ${LUX.goldSoft}, ${LUX.gold})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Touch
            </span>
          </h1>
          <p className="text-base md:text-lg text-white/80 leading-relaxed max-w-2xl mx-auto">
            We'd love to hear from you. Send us a message and we'll respond within 24 hours.
          </p>
        </div>
      </section>

      {/* CONTACT GRID */}
      <section className="py-24" style={{ background: LUX.paper }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-10">
            {/* LEFT — Info */}
            <div
              className="rounded-2xl p-8 lg:p-10 border"
              style={{
                background: '#fff',
                borderColor: 'rgba(6,78,59,0.10)',
                boxShadow: '0 1px 0 rgba(6,78,59,0.04), 0 24px 50px -28px rgba(6,78,59,0.25)',
              }}
            >
              <div className="inline-flex items-center gap-3 mb-5">
                <span className="h-px w-8" style={{ background: LUX.gold }} />
                <span
                  className="text-[11px] font-semibold tracking-[0.32em] uppercase"
                  style={{ color: LUX.gold }}
                >
                  Contact Information
                </span>
              </div>
              <h2
                className="text-3xl font-semibold mb-8"
                style={{ color: LUX.emeraldDeep, fontFamily: 'Georgia, serif' }}
              >
                Let's start a conversation
              </h2>

              <div className="space-y-5">
                {[
                  { icon: Mail, label: 'Email', value: 'support@tesmarket.com' },
                  { icon: Phone, label: 'Phone', value: '+1 234 567 8900' },
                  { icon: MapPin, label: 'Location', value: '123 Market Street, City, Country' },
                ].map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 rounded-xl transition-colors"
                    style={{ background: LUX.cream }}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`,
                      }}
                    >
                      <c.icon className="w-5 h-5" style={{ color: LUX.goldSoft }} />
                    </div>
                    <div>
                      <p
                        className="text-[11px] font-semibold tracking-[0.22em] uppercase"
                        style={{ color: LUX.gold }}
                      >
                        {c.label}
                      </p>
                      <p className="text-base font-semibold" style={{ color: LUX.emeraldDeep }}>
                        {c.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Why contact */}
              <div
                className="mt-8 p-6 rounded-xl text-white"
                style={{
                  background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`,
                }}
              >
                <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: 'Georgia, serif' }}>
                  Why Contact Us?
                </h3>
                <ul className="space-y-2.5 text-sm">
                  {['Quick response within 24 hours', 'Expert support team', 'Personalized solutions'].map(
                    (t) => (
                      <li key={t} className="flex items-center">
                        <Check className="w-4 h-4 mr-3" style={{ color: LUX.goldSoft }} />
                        {t}
                      </li>
                    )
                  )}
                </ul>
              </div>

              {/* Hours */}
              <div className="mt-6 p-6 rounded-xl" style={{ background: LUX.cream }}>
                <h3
                  className="text-base font-semibold mb-3"
                  style={{ color: LUX.emeraldDeep, fontFamily: 'Georgia, serif' }}
                >
                  Business Hours
                </h3>
                <div className="space-y-2 text-sm" style={{ color: '#4b5563' }}>
                  <div className="flex justify-between">
                    <span>Monday – Friday</span>
                    <span className="font-medium">9:00 AM – 6:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday</span>
                    <span className="font-medium">10:00 AM – 4:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday</span>
                    <span className="font-medium">Closed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT — Form */}
            <div
              className="rounded-2xl p-8 lg:p-10 border"
              style={{
                background: '#fff',
                borderColor: 'rgba(6,78,59,0.10)',
                boxShadow: '0 1px 0 rgba(6,78,59,0.04), 0 24px 50px -28px rgba(6,78,59,0.25)',
              }}
            >
              <div className="inline-flex items-center gap-3 mb-5">
                <span className="h-px w-8" style={{ background: LUX.gold }} />
                <span
                  className="text-[11px] font-semibold tracking-[0.32em] uppercase"
                  style={{ color: LUX.gold }}
                >
                  Send a Message
                </span>
              </div>
              <h2
                className="text-3xl font-semibold mb-8"
                style={{ color: LUX.emeraldDeep, fontFamily: 'Georgia, serif' }}
              >
                We'd love to hear from you
              </h2>

              {sent && (
                <div
                  className="mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                  style={{ background: 'rgba(6,95,70,0.10)', color: LUX.emerald }}
                >
                  <Check className="w-4 h-4" />
                  Message sent — we'll get back to you soon.
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label
                    className="block text-[11px] font-semibold tracking-[0.18em] uppercase mb-2"
                    style={{ color: LUX.emeraldDeep }}
                  >
                    Name
                  </label>
                  <input
                    {...field('name')}
                    placeholder="Your full name"
                    className={inputClass}
                    style={{
                      borderColor: errors.name ? '#dc2626' : 'rgba(6,78,59,0.15)',
                    }}
                  />
                  {errors.name && <p className="mt-1.5 text-sm text-red-600">{errors.name}</p>}
                </div>

                <div>
                  <label
                    className="block text-[11px] font-semibold tracking-[0.18em] uppercase mb-2"
                    style={{ color: LUX.emeraldDeep }}
                  >
                    Email
                  </label>
                  <input
                    {...field('email')}
                    type="email"
                    placeholder="you@example.com"
                    className={inputClass}
                    style={{
                      borderColor: errors.email ? '#dc2626' : 'rgba(6,78,59,0.15)',
                    }}
                  />
                  {errors.email && <p className="mt-1.5 text-sm text-red-600">{errors.email}</p>}
                </div>

                <div>
                  <label
                    className="block text-[11px] font-semibold tracking-[0.18em] uppercase mb-2"
                    style={{ color: LUX.emeraldDeep }}
                  >
                    Subject
                  </label>
                  <input
                    {...field('subject')}
                    placeholder="How can we help you?"
                    className={inputClass}
                    style={{
                      borderColor: errors.subject ? '#dc2626' : 'rgba(6,78,59,0.15)',
                    }}
                  />
                  {errors.subject && <p className="mt-1.5 text-sm text-red-600">{errors.subject}</p>}
                </div>

                <div>
                  <label
                    className="block text-[11px] font-semibold tracking-[0.18em] uppercase mb-2"
                    style={{ color: LUX.emeraldDeep }}
                  >
                    Message
                  </label>
                  <textarea
                    {...field('message')}
                    rows={5}
                    placeholder="Tell us more about your inquiry..."
                    className={`${inputClass} resize-none`}
                    style={{
                      borderColor: errors.message ? '#dc2626' : 'rgba(6,78,59,0.15)',
                    }}
                  />
                  {errors.message && <p className="mt-1.5 text-sm text-red-600">{errors.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex justify-center items-center px-6 py-4 font-semibold rounded-xl text-white transition-all duration-300 disabled:opacity-60 shadow-lg hover:-translate-y-0.5"
                  style={{
                    background: `linear-gradient(135deg, ${LUX.emerald}, ${LUX.emeraldDeep})`,
                    border: `1px solid ${LUX.gold}55`,
                  }}
                >
                  <Send className="h-4 w-4 mr-2.5" />
                  {submitting ? 'Sending Message…' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="relative overflow-hidden py-20">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1556740758-90de374c12ad?w=1600&h=900&fit=crop)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(120deg, ${LUX.ink} 0%, rgba(2,44,34,0.95) 100%)` }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: 'Secure & Private', desc: 'Your details are encrypted and never shared.' },
              { icon: Headphones, title: '24/7 Concierge', desc: 'Our dedicated team is always here to help you.' },
              { icon: Clock, title: 'Fast Response', desc: 'We reply to every inquiry within 24 hours.' },
            ].map((b, i) => (
              <div key={i} className="text-center">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 mx-auto border"
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: `${LUX.gold}55` }}
                >
                  <b.icon className="h-6 w-6" style={{ color: LUX.goldSoft }} />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                  {b.title}
                </h3>
                <p className="text-sm text-white/70 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST BADGES */}
      <section className="py-16" style={{ background: LUX.cream }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: Shield, text: 'Secure Payments' },
              { icon: Verified, text: 'Verified Vendors' },
              { icon: Truck, text: 'Fast Delivery' },
              { icon: MessageSquare, text: '24/7 Support' },
            ].map((b, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2 rounded-full border"
                style={{ borderColor: `${LUX.gold}40`, background: '#fff' }}
              >
                <b.icon className="h-4 w-4" style={{ color: LUX.gold }} />
                <span className="text-xs font-medium tracking-wide" style={{ color: LUX.emeraldDeep }}>
                  {b.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;
