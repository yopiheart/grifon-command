import { useMemo, useState } from 'react';
import ProducerFlow from '../OneShotAd/ProducerFlow';
import { useQuota } from '../../hooks/useQuota';
import { CompanionChatSurface } from './CompanionChatSurface';
import { CompanionChatShell } from './CompanionChatShell';
import type { PlanId } from '../../utils/planGate';
import { createCloudFixtureClient } from '../../services/companionCloudFixtures';

interface Props {
  userId: string;
  userEmail: string | null;
  userName: string;
  actualPlanId: PlanId;
  planLoading: boolean;
  planError: boolean;
  onRetryPlan?: () => Promise<void>;
  onLogout: () => Promise<void>;
  onNavigate: (href: string) => void;
  presetUnlocked: boolean;
  isBusinessTier: boolean;
  videoAllowed: boolean | null;
  videoAllowanceLoading: boolean;
  onRetryVideoAllowance: () => void;
  onBack: () => void;
  onUpgrade: () => void;
}

export default function CompanionChat({ userId, userEmail, userName, actualPlanId, planLoading, planError, onRetryPlan, onLogout, onNavigate, presetUnlocked, isBusinessTier, videoAllowed, videoAllowanceLoading, onRetryVideoAllowance, onBack, onUpgrade }: Props) {
  const cloudFixtureClient = useMemo(() => new URLSearchParams(window.location.search).get('cloudFixtures') === '1' ? createCloudFixtureClient(userId) : undefined, [userId]);
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
  return <CompanionChatShell key={userId} userId={userId} userEmail={userEmail} userName={userName} plan={actualPlanId} planLoading={planLoading} planError={planError} onRetryPlan={onRetryPlan} onLogout={onLogout} onUpgrade={onUpgrade} onNavigate={onNavigate} onStudio={onBack} cloudFixtureClient={cloudFixtureClient}>{conversation => {
    const back = () => { void conversation.leave(onBack).catch(() => {}); };
    const upgrade = () => { void conversation.leave(onUpgrade).catch(() => {}); };
    return <ProducerFlow key={conversation.chat.id} conversation={conversation.chat} userId={userId} directorUnlocked={false} presetUnlocked={presetUnlocked} isBusinessTier={isBusinessTier}
    onBack={back} onUpgrade={upgrade} onSwitchToSteps={back} onCloneVoice={back}
    renderSurface={controller => <CompanionChatSurface key={conversation.chat.id} conversation={conversation} userId={userId} onAvatarPresentation={conversation.presentAvatar}
      controller={{ ...controller,
        start: input => !quotaReady ? Promise.resolve() : quotaBlocked ? Promise.resolve(upgrade()) : controller.start(input),
        approve: () => !quotaReady ? Promise.resolve() : videoAllowed === true ? controller.approve() : videoAllowed === false ? Promise.resolve(upgrade()) : Promise.resolve(),
        retry: () => controller.run?.gate ? controller.retry()
          : !quotaReady ? Promise.resolve() : quotaBlocked || (controller.run?.storyboardApproved && videoAllowed === false) ? Promise.resolve(upgrade())
            : controller.run?.storyboardApproved && videoAllowed !== true ? Promise.resolve() : controller.retry(),
        resume: () => controller.run?.gate ? controller.resume?.() ?? Promise.resolve()
          : !quotaReady ? Promise.resolve() : quotaBlocked || (controller.run?.storyboardApproved && videoAllowed === false) ? Promise.resolve(upgrade())
            : controller.run?.storyboardApproved && videoAllowed !== true ? Promise.resolve() : controller.resume?.() ?? Promise.resolve(),
      }}
      onBack={back} onUpgrade={upgrade} presetUnlocked={presetUnlocked} quotaBlocked={quotaBlocked}
      quotaReady={quotaReady} allowanceLoading={allowanceLoading} onRetryAllowance={() => void retryAllowance()}
      videoAllowed={quotaReady ? videoAllowed : null} />}
  />; }}</CompanionChatShell>;
}
