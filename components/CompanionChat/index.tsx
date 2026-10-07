import { useState } from 'react';
import ProducerFlow from '../OneShotAd/ProducerFlow';
import { useQuota } from '../../hooks/useQuota';
import { CompanionChatSurface } from './CompanionChatSurface';
import { CompanionChatShell } from './CompanionChatShell';

interface Props {
  userId: string;
  presetUnlocked: boolean;
  isBusinessTier: boolean;
  videoAllowed: boolean | null;
  videoAllowanceLoading: boolean;
  onRetryVideoAllowance: () => void;
  onBack: () => void;
  onUpgrade: () => void;
}

export default function CompanionChat({ userId, presetUnlocked, isBusinessTier, videoAllowed, videoAllowanceLoading, onRetryVideoAllowance, onBack, onUpgrade }: Props) {
  const quota = useQuota();
  const [retryingAllowance, setRetryingAllowance] = useState(false);
  const allowanceLoading = quota.loading || videoAllowanceLoading || retryingAllowance;
  const quotaReady = quota.loaded && !allowanceLoading;
  const quotaBlocked = quotaReady && (quota.reports.remaining === 0 || quota.workflows.remaining === 0);
  const retryAllowance = async () => {
    if (retryingAllowance) return;
    setRetryingAllowance(true);
    try { await Promise.all([quota.refetch(), onRetryVideoAllowance()]); }
    catch { /* Keep the unconfirmed allowance closed and offer another retry. */ }
    finally { setRetryingAllowance(false); }
  };
  return <CompanionChatShell key={userId} userId={userId} onStudio={onBack}>{conversation => <ProducerFlow key={conversation.chat.id} conversation={conversation.chat} userId={userId} directorUnlocked={false} presetUnlocked={presetUnlocked} isBusinessTier={isBusinessTier}
    onBack={onBack} onUpgrade={onUpgrade} onSwitchToSteps={onBack} onCloneVoice={onBack}
    renderSurface={controller => <CompanionChatSurface key={conversation.chat.id} conversation={conversation} userId={userId}
      controller={{ ...controller,
        start: input => !quotaReady ? Promise.resolve() : quotaBlocked ? Promise.resolve(onUpgrade()) : controller.start(input),
        approve: () => !quotaReady ? Promise.resolve() : videoAllowed === true ? controller.approve() : videoAllowed === false ? Promise.resolve(onUpgrade()) : Promise.resolve(),
        resume: () => controller.run?.gate ? controller.resume?.() ?? Promise.resolve()
          : !quotaReady ? Promise.resolve() : quotaBlocked || (controller.run?.storyboardApproved && videoAllowed === false) ? Promise.resolve(onUpgrade())
            : controller.run?.storyboardApproved && videoAllowed !== true ? Promise.resolve() : controller.resume?.() ?? Promise.resolve(),
      }}
      onBack={onBack} onUpgrade={onUpgrade} presetUnlocked={presetUnlocked} quotaBlocked={quotaBlocked}
      quotaReady={quotaReady} allowanceLoading={allowanceLoading} onRetryAllowance={() => void retryAllowance()}
      videoAllowed={quotaReady ? videoAllowed : null} />}
  />}</CompanionChatShell>;
}
