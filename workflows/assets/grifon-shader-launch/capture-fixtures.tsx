// Manually prepared, no-spend fixtures; the mounted product components are unchanged.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import MarketResearch from '../../../components/MarketResearch';
import Step3AdScript from '../../../components/Step3AdScript';
import Step5Storyboard from '../../../components/Step5Storyboard';
import type { BusinessInfo, Script, Scene } from '../../../types';

declare global {
  interface Window {
    __captureAssets: string[];
    __captureState?: { surface: string; fixtureOnly: true; generationCalled: false };
  }
}

const noop = () => {};
const businessInfo: BusinessInfo = {
  product: 'GRIFON',
  audience: 'To grow your business.',
  benefit: 'Give your next ad a clear direction.',
  painPoint: '',
  separator: '',
  features: 'Research / Script / Storyboard',
  scriptType: 'Custom',
  productImageUrls: window.__captureAssets,
};
export const exampleScript: Script = {
  hook1: ['Your next ad.'],
  hook2: ['To tell your story.'],
  body: [
    'To launch a product. To tell your story.',
    'To grow your business. Give your next ad a clear direction.',
  ],
};
export const exampleScenes: Scene[] = [
  { scriptLine: 'Research', sceneDescription: 'Know your audience.', manualUploadUrl: window.__captureAssets[0], referenceImage: 'none' },
  { scriptLine: 'Script', sceneDescription: 'Shape your message.', manualUploadUrl: window.__captureAssets[1], referenceImage: 'none' },
  { scriptLine: 'Storyboard', sceneDescription: 'Plan every scene.', manualUploadUrl: window.__captureAssets[2], referenceImage: 'none' },
];

function CaptureFixture() {
  const surface = new URLSearchParams(location.search).get('surface') || 'research';
  const [script, setScript] = useState<Script | null>(exampleScript);
  const [language, setLanguage] = useState<'English' | 'Taglish'>('English');
  const [storyboard, setStoryboard] = useState<Scene[]>(exampleScenes);
  const [directorAngleBrief, setDirectorAngleBrief] = useState<string | null>(null);
  window.__captureState = { surface, fixtureOnly: true, generationCalled: false };
  return (
    <>
      <header id="example-project" className="capture-disclosure">
        <span>Example project</span>
        <small>Manually prepared</small>
      </header>
      <main className={`capture-fixture capture-${surface}`}>
        {surface === 'research' ? <MarketResearch onBack={noop} /> : surface === 'script' ? (
          <Step3AdScript businessInfo={businessInfo} script={script} setScript={setScript}
            setFinalScript={noop} language={language} setLanguage={setLanguage}
            onNext={noop} onBack={noop} brandName="Grifon" offer=""
            directorAngleBrief={directorAngleBrief} setDirectorAngleBrief={setDirectorAngleBrief} />
        ) : surface === 'storyboard' ? (
          <Step5Storyboard script={[...exampleScript.hook1, ...exampleScript.body]}
            avatar={null} businessInfo={businessInfo} storyboard={storyboard}
            setStoryboard={setStoryboard} onNext={noop} onBack={noop}
            aspectRatio="16:9" language="English" />
        ) : null}
      </main>
    </>
  );
}

createRoot(document.getElementById('root')!).render(<CaptureFixture />);
