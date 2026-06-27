import React from 'react';
import LegalPageLayout from './ui/LegalPageLayout';

type Props = { onBack: () => void; backLabel?: string };

const PrivacyPolicy: React.FC<Props> = ({ onBack, backLabel }) => (
  <LegalPageLayout title="Privacy Policy" effectiveDate="June 25, 2026" onBack={onBack} backLabel={backLabel}>
    <p>
      This Privacy Policy explains how Haste Enterprises ("we", "us") collects,
      uses, and shares information when you use Grifon.AI ("Grifon"). It is
      designed to comply with the Philippine Data Privacy Act of 2012 (R.A.
      10173) and its implementing rules.
    </p>

    <h2>1. Information We Collect</h2>
    <p><strong>Account information.</strong> When you sign up, we collect your
    email address and a hashed version of your password (via Supabase Auth).</p>
    <p><strong>Billing information.</strong> Payments are processed by
    PayMongo. We do NOT store your credit card or e-wallet credentials. We
    receive and store the payment status, plan ID, billing cycle, checkout
    session ID, and the timestamp of each successful transaction.</p>
    <p><strong>Content you submit.</strong> Briefs, prompts, product
    descriptions, images, and any other inputs you provide to Grifon's tools.
    These are transmitted to our AI providers to generate outputs.</p>
    <p><strong>Generated outputs.</strong> Scripts, images, videos, and other
    content produced by the service in response to your inputs.</p>
    <p><strong>Technical data.</strong> Standard web logs (IP address, user
    agent, timestamps) for security and abuse prevention, and rate-limit counts
    tied to your user ID.</p>

    <h2>2. How We Use Your Information</h2>
    <ul>
      <li>to provide, maintain, and improve the service;</li>
      <li>to authenticate you and secure your account;</li>
      <li>to process payments and manage your subscription;</li>
      <li>to enforce rate limits and prevent abuse;</li>
      <li>to respond to your support requests;</li>
      <li>to comply with legal obligations.</li>
    </ul>
    <p>
      We do not sell your personal information. We do not use Your Content to
      train our own AI models.
    </p>

    <h2>3. Who We Share It With</h2>
    <p>We share information only with the third-party processors we need to
    run the service:</p>
    <ul>
      <li><strong>Supabase</strong> — authentication, database, and realtime for your account and subscription record.</li>
      <li><strong>PayMongo</strong> — processing subscription payments and sending us webhook notifications of successful or failed charges.</li>
      <li><strong>Google (Gemini, Veo)</strong> — generating AI outputs from the prompts and images you submit. Google's handling of that data is governed by its own terms.</li>
      <li><strong>Vercel</strong> — hosting the application and serverless functions.</li>
      <li><strong>Meta (Facebook/Instagram)</strong> — <em>only if you opt in to
      personalized ads</em> (see Section 8). We may share a securely hashed
      (SHA-256) version of your email so Meta can match you to a Custom Audience
      and show you relevant Grifon ads. We never share your password, content, or
      payment details with Meta.</li>
    </ul>
    <p>
      We may also disclose information if required by law, subpoena, or to
      protect the rights, property, or safety of Grifon, our users, or the
      public.
    </p>

    <h2>4. International Data Transfer</h2>
    <p>
      Our service providers operate data centers outside the Philippines,
      including in the United States and the European Union. By using Grifon
      you consent to the transfer of your information to those jurisdictions.
      We rely on each provider's standard contractual safeguards for such
      transfers.
    </p>

    <h2>5. Data Retention</h2>
    <p>
      We retain account and subscription data for as long as your account is
      active. If you delete your account, we remove your personal data within
      thirty (30) days, except where retention is required by law (for example,
      tax or accounting records of paid transactions, which may be kept up to
      ten (10) years as required under Philippine regulations).
    </p>
    <p>
      Generated outputs and briefs stored in your account are deleted together
      with the account.
    </p>

    <h2>6. Your Rights</h2>
    <p>Under the Data Privacy Act you have the right to:</p>
    <ul>
      <li>be informed about how your data is processed;</li>
      <li>access the personal data we hold about you;</li>
      <li>correct inaccurate data;</li>
      <li>object to processing or withdraw consent;</li>
      <li>request erasure of your data (subject to the retention limits above);</li>
      <li>data portability, where technically feasible;</li>
      <li>lodge a complaint with the National Privacy Commission of the Philippines.</li>
    </ul>
    <p>
      To exercise any of these rights, email{' '}
      <a href="mailto:grifon.ai@gmail.com" className="text-[#FFCC00] hover:underline">grifon.ai@gmail.com</a>.
      We respond within a reasonable time and no later than thirty (30) days.
    </p>

    <h2>7. Cookies &amp; Local Storage</h2>
    <p>
      Grifon uses essential cookies and browser localStorage to keep you signed
      in (Supabase Auth session tokens) and to remember your selected plan during
      the checkout flow. With your separate consent (the cookie banner shown on
      your first visit), we also load the Meta Pixel for advertising measurement;
      you can decline it without affecting the rest of the service.
    </p>

    <h2>8. Advertising &amp; Retargeting</h2>
    <p>
      We run two <em>distinct</em>, separately-consented advertising mechanisms,
      and you can decline or withdraw from either independently:
    </p>
    <ul>
      <li><strong>Meta Pixel (device-level).</strong> An anonymous, cookie-based
      measurement pixel governed by the first-visit cookie banner. It is tied to
      your browser/device, not to your account email.</li>
      <li><strong>Custom Audiences (account-level).</strong> If — and only if —
      you tick the optional "personalized ads" box at sign-up or enable it later
      in Settings, we share a securely hashed (SHA-256) version of your account
      email with Meta so it can show you relevant Grifon ads. This is a separate
      act of consent from the pixel banner.</li>
    </ul>
    <p>
      <strong>Withdrawing consent.</strong> You may withdraw personalized-ads
      consent at any time via Settings → Notifications → "Personalized ads". When
      you withdraw, we stop sharing your data for new audiences and remove your
      hashed email from the advertising audiences we previously uploaded, on a
      rolling basis no later than thirty (30) days. We honour your choice and
      record when it was made.
    </p>

    <h2>9. Security</h2>
    <p>
      We use industry-standard safeguards, including HTTPS for all traffic,
      hashed passwords, signed webhooks, and scoped API keys. No system is
      perfectly secure; you use the service at your own risk.
    </p>

    <h2>10. Children</h2>
    <p>
      Grifon is not intended for users under 18 years old. We do not knowingly
      collect personal data from children. If you believe a child has submitted
      data to us, contact us and we will delete it.
    </p>

    <h2>11. Changes to This Policy</h2>
    <p>
      We may update this Policy. Material changes will be announced via email
      or in-app notice at least seven (7) days before they take effect.
    </p>

    <h2>12. Contact</h2>
    <p>
      Data Protection Officer: Haste Enterprises, reachable at{' '}
      <a href="mailto:grifon.ai@gmail.com" className="text-[#FFCC00] hover:underline">grifon.ai@gmail.com</a>.
    </p>
  </LegalPageLayout>
);

export default PrivacyPolicy;
