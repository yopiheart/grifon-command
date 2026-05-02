import React from 'react';
import LegalPageLayout from './ui/LegalPageLayout';

type Props = { onBack: () => void };

const RefundPolicy: React.FC<Props> = ({ onBack }) => (
  <LegalPageLayout title="Refund Policy" effectiveDate="April 20, 2026" onBack={onBack}>
    <p>
      We want Grifon.AI to be worth every peso you spend on it. This Refund
      Policy explains when we issue refunds and how to request one.
    </p>

    <h2>1. 7-Day Refund Window</h2>
    <p>
      You may request a full refund of your <strong>first paid
      subscription</strong> (whether monthly or annual) within{' '}
      <strong>seven (7) calendar days</strong> of the charge date, for any
      reason. No questions, no runaround.
    </p>

    <h2>2. Renewals</h2>
    <p>
      Automatic renewals (the second and subsequent charges on a recurring
      subscription) are <strong>not refundable by default</strong>. You are
      responsible for cancelling before the renewal date if you do not want to
      be charged again. If you were charged for a renewal you clearly intended
      to cancel — for example, because of a billing or platform error on our
      side — contact us and we will review on a case-by-case basis.
    </p>

    <h2>3. What Is Not Refundable</h2>
    <ul>
      <li>any subscription period more than 7 days after the charge date;</li>
      <li>accounts terminated for breach of our Terms of Service;</li>
      <li>usage-based fees for third-party AI credits already consumed, if any;</li>
      <li>refund requests submitted via chargeback without first contacting support (see below).</li>
    </ul>

    <h2>4. How to Request a Refund</h2>
    <p>
      Email{' '}
      <a href="mailto:grifon.ai@gmail.com" className="text-[#FFCC00] hover:underline">grifon.ai@gmail.com</a>{' '}
      from the email address on your Grifon account with the subject line{' '}
      <strong>"Refund Request"</strong>. Please include:
    </p>
    <ul>
      <li>the date of the charge;</li>
      <li>the plan you subscribed to (Starter, Pro, etc.);</li>
      <li>a brief reason (optional, but helps us improve).</li>
    </ul>

    <h2>5. Processing Time</h2>
    <p>
      Once approved, refunds are issued through PayMongo back to the original
      payment method. PayMongo typically processes refunds within{' '}
      <strong>5–10 business days</strong>, though your card issuer or e-wallet
      may take additional time to reflect the credit. We do not charge a
      processing fee.
    </p>
    <p>
      When a refund is issued, your paid plan is downgraded to the free tier
      effective immediately. Any generated content you created remains in your
      account.
    </p>

    <h2>6. Chargebacks</h2>
    <p>
      Please contact us before filing a chargeback with your bank or card
      issuer. Most refund requests can be resolved faster and with less
      paperwork by emailing us directly. Accounts associated with unresolved
      chargebacks may be suspended pending review.
    </p>

    <h2>7. Changes to This Policy</h2>
    <p>
      We may update this Policy. Material changes will apply only to purchases
      made on or after the new effective date.
    </p>

    <h2>8. Contact</h2>
    <p>
      Questions about refunds? Email{' '}
      <a href="mailto:grifon.ai@gmail.com" className="text-[#FFCC00] hover:underline">grifon.ai@gmail.com</a>.
    </p>
  </LegalPageLayout>
);

export default RefundPolicy;
