import React, { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { MarketResearchReport } from '../types';
import { GoldButton } from './ui/GoldButton';
import { getMarketMindEvidenceAttribution } from './marketMindEvidence';

interface MarketMindReportViewProps {
  report: MarketResearchReport;
  onSendToDirector?: () => void;
  onBuildOffer?: () => void;
}

const hasText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const ReportField: React.FC<{ label: string; value?: string }> = ({ label, value }) => hasText(value) ? (
  <div className="min-w-0">
    <dt className="text-xs text-zinc-400 mb-1">{label}</dt>
    <dd className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{value}</dd>
  </div>
) : null;

const MarketMindReportView: React.FC<MarketMindReportViewProps> = ({ report, onSendToDirector, onBuildOffer }) => {
  const [showFullReport, setShowFullReport] = useState(false);
  const evidence = Array.isArray(report.rawEvidence) ? report.rawEvidence.filter(hasText) : [];
  const headlines = Array.isArray(report.headlines) ? report.headlines.filter(hasText) : [];
  const hooks = Array.isArray(report.videoHooks)
    ? report.videoHooks.filter(hook => hook && (hasText(hook.visual) || hasText(hook.spokenLine))) : [];
  const competitors = Array.isArray(report.competitorMatrix)
    ? report.competitorMatrix.filter(entry => entry && (hasText(entry.competitor) || hasText(entry.weakness) || hasText(entry.exploitationAngle))) : [];
  const adAngles = Array.isArray(report.fbAdLibraryAngles)
    ? report.fbAdLibraryAngles.filter(entry => entry && (hasText(entry.angle) || hasText(entry.openingLine) || hasText(entry.whyItWorks))) : [];

  return (
    <div className="min-w-0 space-y-6 [overflow-wrap:anywhere]">
      <section className="bg-[#FFCC00]/5 border border-[#FFCC00]/30 rounded-xl p-4 sm:p-6 space-y-5" aria-labelledby="marketmind-brief-title">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-[#FFCC00] mb-2">// MARKETMIND BRIEF</p>
          <h2 id="marketmind-brief-title" className="text-lg sm:text-xl text-zinc-100 font-bold leading-tight">{report.subject || 'Saved MarketMind report'}</h2>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="min-w-0 space-y-3">
            <h3 className="text-sm font-bold text-zinc-100">Winning Avatar</h3>
            {hasText(report.winningAvatar) ? (
              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">{report.winningAvatar}</p>
            ) : <p className="text-sm text-zinc-400">No audience hypothesis supplied in this report.</p>}
            <dl className="space-y-3">
              <ReportField label="Demographics" value={report.demographics} />
              <ReportField label="Day in their life" value={report.dayInTheLife} />
            </dl>
          </div>
          <div className="min-w-0 space-y-3">
            <h3 className="text-sm font-bold text-zinc-100">Why they may buy</h3>
            <dl className="space-y-3">
              <ReportField label="Urgent problem (Bleeding Neck)" value={report.bleedingNeck} />
              <ReportField label="Desired outcome (Magic Genie)" value={report.magicGenie} />
              <ReportField label="Emotional payoff" value={report.emotionalPayoff} />
            </dl>
            {![report.bleedingNeck, report.magicGenie, report.emotionalPayoff].some(hasText) && (
              <p className="text-sm text-zinc-400">No buying-reason details supplied in this report.</p>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="marketmind-evidence-title" className="space-y-3">
        <h3 id="marketmind-evidence-title" className="text-base font-bold text-zinc-100">Evidence &amp; assumptions</h3>
        <p className="text-sm text-zinc-300 leading-relaxed">
          Audience, pain points and creative strategy are hypotheses to review. Source labels in this report are supplied attribution, not verification.
        </p>
        {evidence.length > 0 ? (
          <ul className="space-y-3">
            {evidence.map((item, index) => {
              const attribution = getMarketMindEvidenceAttribution(item);
              return (
                <li key={index} className="min-w-0 border border-white/10 rounded-xl p-4 space-y-2">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">{attribution.status}</p>
                  <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-line">{item}</p>
                  {attribution.sources.length > 0 && (
                    <ul className="space-y-1">
                      {attribution.sources.map(source => (
                        <li key={source.href} className="min-w-0">
                          <a href={source.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 max-w-full items-center gap-2 text-sm text-[#FFCC00] underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFCC00] rounded-md">
                            <span className="min-w-0 [overflow-wrap:anywhere]">{source.host}</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        ) : <p className="text-sm text-zinc-400 border border-white/10 rounded-xl p-4">No supporting evidence supplied in this report.</p>}
      </section>

      {(onSendToDirector || onBuildOffer) && (
        <div className="space-y-2 border-t border-white/10 pt-5">
          {onSendToDirector && (
            <GoldButton onClick={onSendToDirector} className="w-full min-h-11 py-4 rounded-xl tracking-widest text-xs flex items-center justify-center gap-2">
              SEND TO DIRECTOR AI <ArrowRight className="w-4 h-4 shrink-0" aria-hidden="true" />
            </GoldButton>
          )}
          {onBuildOffer && (
            <button onClick={onBuildOffer} className="w-full min-h-11 text-xs text-zinc-300 hover:text-[#FFCC00] transition-colors flex items-center justify-center gap-2 py-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFCC00]">
              Or build stronger offer first <ArrowRight className="w-3 h-3 shrink-0" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <section aria-labelledby="marketmind-direction-title" className="space-y-4 border-t border-white/10 pt-5">
        <h3 id="marketmind-direction-title" className="text-base font-bold text-zinc-100">Campaign direction</h3>
        <dl className="space-y-4">
          <ReportField label="Big Idea" value={report.bigIdea} />
          <ReportField label="Contrarian Truth" value={report.contrarianTruth} />
          <ReportField label="Villain" value={report.villain} />
          <ReportField label="Objection to address" value={report.objectionToUs} />
        </dl>
        {![report.bigIdea, report.contrarianTruth, report.villain, report.objectionToUs].some(hasText) && adAngles.length === 0 && headlines.length === 0 && (
          <p className="text-sm text-zinc-400">No campaign direction supplied in this report.</p>
        )}
        {headlines.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-zinc-100">Headlines</h4>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-zinc-200 leading-relaxed">
              {headlines.map((headline, index) => <li key={index} className="pl-1 whitespace-pre-line">{headline}</li>)}
            </ol>
          </div>
        )}
        {adAngles.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-zinc-100">Ad concepts</h4>
            {adAngles.map((angle, index) => (
              <div key={index} className="min-w-0 border border-white/10 rounded-xl p-4 space-y-3">
                <p className="text-xs font-mono text-zinc-400">{angle.format || `Concept ${index + 1}`}</p>
                <dl className="space-y-3">
                  <ReportField label="Angle" value={angle.angle} />
                  <ReportField label="Opening line" value={angle.openingLine} />
                  <ReportField label="Report's rationale" value={angle.whyItWorks} />
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="marketmind-hooks-title" className="space-y-3 border-t border-white/10 pt-5">
        <h3 id="marketmind-hooks-title" className="text-base font-bold text-zinc-100">Hook concepts</h3>
        {hooks.length > 0 ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {hooks.map((hook, index) => (
              <div key={index} className="min-w-0 border border-white/10 rounded-xl p-4 space-y-3">
                <p className="text-xs font-mono text-zinc-400">{hook.type || `Hook ${index + 1}`}</p>
                <dl className="space-y-3">
                  <ReportField label="Visual opening" value={hook.visual} />
                  <ReportField label="Spoken opening" value={hook.spokenLine} />
                </dl>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-zinc-400">No Hook concepts supplied in this report.</p>}
      </section>

      <section aria-labelledby="marketmind-competitors-title" className="space-y-3 border-t border-white/10 pt-5">
        <h3 id="marketmind-competitors-title" className="text-base font-bold text-zinc-100">Competitor comparisons</h3>
        <p className="text-sm text-zinc-400 leading-relaxed">Weaknesses and proposed angles are report hypotheses to check against supporting evidence.</p>
        {competitors.length > 0 ? (
          <div className="space-y-3">
            {competitors.map((competitor, index) => (
              <div key={index} className="min-w-0 border border-white/10 rounded-xl p-4 space-y-3">
                <h4 className="text-sm font-bold text-zinc-100">{competitor.competitor || `Competitor ${index + 1}`}</h4>
                <dl className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  <ReportField label="Reported weakness" value={competitor.weakness} />
                  <ReportField label="Proposed angle" value={competitor.exploitationAngle} />
                </dl>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-zinc-400">No competitor comparisons supplied in this report.</p>}
      </section>

      <div className="border-t border-white/10 pt-4">
        <button onClick={() => setShowFullReport(value => !value)} aria-expanded={showFullReport} aria-controls="marketmind-original-report" className="w-full min-h-11 flex items-center justify-between gap-3 text-xs text-zinc-300 hover:text-[#FFCC00] hover:bg-white/5 transition-colors py-3 px-2 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFCC00]">
          <span>{showFullReport ? 'COLLAPSE FULL REPORT' : 'VIEW FULL REPORT'} <span className="text-zinc-400">(original)</span></span>
          {showFullReport ? <ChevronUp className="w-4 h-4 shrink-0" aria-hidden="true" /> : <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />}
        </button>
        {showFullReport && (
          <div id="marketmind-original-report" className="mt-3 space-y-3">
            <p className="text-xs text-zinc-400 leading-relaxed">Original report text, unchanged. Historical reports may contain unsupported claims; review them against the evidence supplied.</p>
            <pre className="min-w-0 text-sm font-mono text-zinc-300 whitespace-pre-wrap [overflow-wrap:anywhere] leading-relaxed">{report.narrativeReport || 'No original report text supplied.'}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarketMindReportView;
