import React from 'react';
import LegalPageLayout from './ui/LegalPageLayout';

type Props = { onBack: () => void; backLabel?: string };

const TermsOfService: React.FC<Props> = ({ onBack, backLabel }) => (
  <LegalPageLayout title="Terms of Service" effectiveDate="April 20, 2026" onBack={onBack} backLabel={backLabel}>
    <p>
      These Terms of Service ("Terms") govern your access to and use of Grifon.AI
      ("Grifon", "we", "us", "our"), an AI-powered marketing studio operated by
      Haste Enterprises, registered in the Republic of the Philippines. By
      creating an account or using Grifon, you agree to these Terms.
    </p>

    <h2>1. The Service</h2>
    <p>
      Grifon provides a suite of AI-assisted tools for creating marketing
      content, including but not limited to ad scripts, storyboards, images,
      video prompts, captions, and organic-social calendars. The service relies
      on third-party AI providers (including Google Gemini and Google Veo) to
      generate outputs. Availability, quality, and pricing of those models may
      change without notice.
    </p>

    <h2>2. Accounts</h2>
    <p>
      You must register an account using a valid email address and a password.
      You are responsible for keeping your credentials confidential and for all
      activity on your account. Notify us immediately at grifon.ai@gmail.com if
      you suspect unauthorized access.
    </p>
    <p>
      You must be at least 18 years old to use Grifon. By using the service you
      represent that you meet this requirement.
    </p>

    <h2>3. Plans &amp; Billing</h2>
    <p>
      Grifon offers a free tier and paid subscription plans billed monthly or
      annually. Paid plans are processed by PayMongo, our third-party payment
      processor. By subscribing, you authorize us (through PayMongo) to charge
      your selected payment method on a recurring basis until you cancel.
    </p>
    <p>
      You are responsible for cancelling before your next renewal date if you
      do not wish to be charged again. Renewals are not automatically refunded.
      See our <span className="text-[#FFCC00]">Refund Policy</span> for the
      conditions under which refunds are issued.
    </p>
    <p>
      Prices are listed in Philippine Pesos (PHP) unless otherwise stated. We
      may change pricing with reasonable advance notice; changes apply to
      renewals after the notice period.
    </p>

    <h2>4. Acceptable Use</h2>
    <p>You agree NOT to use Grifon to:</p>
    <ul>
      <li>generate content that is unlawful, defamatory, hateful, harassing, sexually explicit involving minors, or that infringes the rights of any third party;</li>
      <li>impersonate any person or entity, or misrepresent your affiliation with any person or entity;</li>
      <li>attempt to reverse-engineer, scrape, overload, or circumvent rate limits of the service;</li>
      <li>resell, white-label, or sublicense the service or its outputs as your own AI product;</li>
      <li>submit credentials, API keys, or personal data that you are not authorized to submit.</li>
    </ul>
    <p>
      We may suspend or terminate accounts that violate these rules, with or
      without notice, and may refuse refunds in such cases.
    </p>

    <h2>5. Your Content &amp; AI Outputs</h2>
    <p>
      You retain ownership of any text, images, or other material you submit to
      Grifon ("Your Content"). You grant us a limited license to process Your
      Content through our third-party AI providers solely for the purpose of
      delivering the service.
    </p>
    <p>
      Subject to the terms of the underlying AI providers, you own the outputs
      Grifon generates for you and may use them commercially. You are solely
      responsible for ensuring those outputs are accurate, non-infringing, and
      lawful for your use case. AI models can produce incorrect or biased
      content; always review before publishing.
    </p>

    <h2>6. Third-Party Services</h2>
    <p>
      Grifon integrates with third-party providers including Google (Gemini,
      Veo), Supabase (authentication and database), PayMongo (payments), and
      Vercel (hosting). Your use of Grifon is also subject to the terms and
      privacy policies of those providers. We are not responsible for their
      actions, outages, or policy changes.
    </p>

    <h2>7. Service Changes &amp; Availability</h2>
    <p>
      We may add, modify, or remove features at any time. We aim for high
      availability but do not guarantee uninterrupted service. Scheduled
      maintenance, third-party outages, and force-majeure events may cause
      downtime.
    </p>

    <h2>8. Termination</h2>
    <p>
      You may cancel your subscription or delete your account at any time by
      emailing grifon.ai@gmail.com. We may terminate or suspend your access
      immediately, without prior notice, if you breach these Terms.
    </p>

    <h2>9. Disclaimers</h2>
    <p>
      The service is provided <strong>"AS IS" and "AS AVAILABLE"</strong>
      without warranties of any kind, whether express or implied, including
      merchantability, fitness for a particular purpose, accuracy, and
      non-infringement. We do not warrant that AI outputs are accurate,
      complete, or suitable for your business needs.
    </p>

    <h2>10. Limitation of Liability</h2>
    <p>
      To the maximum extent permitted by Philippine law, Haste Enterprises,
      Grifon, and their officers, employees, and suppliers shall not be liable
      for any indirect, incidental, special, consequential, or punitive damages,
      or any loss of profits, revenue, data, or goodwill, arising out of or in
      connection with your use of the service. Our total aggregate liability
      shall not exceed the amount you paid us in the twelve (12) months
      preceding the claim.
    </p>

    <h2>11. Indemnification</h2>
    <p>
      You agree to indemnify and hold harmless Haste Enterprises from any
      claims, damages, or expenses (including reasonable legal fees) arising
      from Your Content, your use of AI outputs, or your breach of these Terms.
    </p>

    <h2>12. Governing Law &amp; Disputes</h2>
    <p>
      These Terms are governed by the laws of the Republic of the Philippines.
      Any dispute arising from or related to these Terms or the service shall
      be submitted to the exclusive jurisdiction of the proper courts of Metro
      Manila, Philippines.
    </p>

    <h2>13. Changes to These Terms</h2>
    <p>
      We may update these Terms from time to time. Material changes will be
      announced via email or a notice on the service at least seven (7) days
      before they take effect. Continued use of Grifon after the effective date
      constitutes acceptance.
    </p>

    <h2>14. Contact</h2>
    <p>
      Questions about these Terms can be directed to{' '}
      <a href="mailto:grifon.ai@gmail.com" className="text-[#FFCC00] hover:underline">grifon.ai@gmail.com</a>.
    </p>
  </LegalPageLayout>
);

export default TermsOfService;
