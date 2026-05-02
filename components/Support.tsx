import React from 'react';
import LegalPageLayout from './ui/LegalPageLayout';

type Props = { onBack: () => void };

const Support: React.FC<Props> = ({ onBack }) => (
  <LegalPageLayout title="Support" effectiveDate="April 20, 2026" onBack={onBack}>
    <p>
      Need help with Grifon.AI? You're in the right place. Our team is small
      but responsive — you'll usually hear back within 24–48 hours.
    </p>

    <h2>1. Email Us</h2>
    <p>
      For all support inquiries, email{' '}
      <a href="mailto:grifon.ai@gmail.com" className="text-[#FFCC00] hover:underline">grifon.ai@gmail.com</a>.
      Please send from the email address on your Grifon account so we can find
      you quickly.
    </p>

    <h2>2. What We Can Help With</h2>
    <ul>
      <li><strong>Account issues</strong> — sign-in problems, password resets, deleting your account.</li>
      <li><strong>Billing</strong> — subscription questions, refund requests, updating your payment method, cancelling a plan.</li>
      <li><strong>Bugs &amp; errors</strong> — something crashed or produced a wrong output. Include the tool you were using and a short description of what happened.</li>
      <li><strong>Feature requests &amp; feedback</strong> — we read every one. The roadmap is genuinely shaped by what users ask for.</li>
      <li><strong>Enterprise / custom plans</strong> — tell us about your team size and use case; we'll get back with options.</li>
    </ul>

    <h2>3. Response Times</h2>
    <p>
      We aim to respond to all emails within <strong>48 hours</strong> on
      business days (Monday to Friday, Philippine Standard Time). Urgent
      billing issues are usually handled within 24 hours.
    </p>
    <p>
      We respond in English or Filipino — whichever you prefer.
    </p>

    <h2>4. Before You Email</h2>
    <p>
      A few things that make support requests faster to resolve:
    </p>
    <ul>
      <li>include the email address on your Grifon account;</li>
      <li>describe what you were trying to do and what happened instead;</li>
      <li>for billing issues, include the date of the charge and the plan name;</li>
      <li>for bugs, a screenshot or the browser you were using helps a lot.</li>
    </ul>

    <h2>5. What We Can't Do</h2>
    <p>
      Grifon is a tool for generating marketing content, not a marketing
      agency. We can't write campaigns for you, manage your ad accounts, or
      guarantee specific business results from using AI outputs. For bespoke
      creative work, we're happy to point you toward partners.
    </p>

    <h2>6. Status &amp; Outages</h2>
    <p>
      If the app is unreachable or a specific tool is throwing errors for
      everyone, it's usually a third-party outage (Google AI, Supabase, or
      Vercel). We monitor these and restore service as quickly as possible.
    </p>

    <h2>7. Security Reports</h2>
    <p>
      Found a security vulnerability? Please email{' '}
      <a href="mailto:grifon.ai@gmail.com" className="text-[#FFCC00] hover:underline">grifon.ai@gmail.com</a>{' '}
      with the subject line <strong>"Security"</strong> and details of the
      issue. Do not disclose it publicly until we've had a chance to respond.
      We appreciate responsible disclosure.
    </p>
  </LegalPageLayout>
);

export default Support;
