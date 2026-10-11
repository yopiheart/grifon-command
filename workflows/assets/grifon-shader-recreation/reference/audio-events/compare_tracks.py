"""Deterministic full-track alignment comparison; no providers or hearing claims."""
from pathlib import Path
import hashlib
import json
import subprocess
import numpy as np

HERE = Path(__file__).resolve().parent
REFERENCE = HERE.parent
FFMPEG = Path('C:/Users/ADMIN/Desktop/grifon-command/node_modules/ffmpeg-static/ffmpeg.exe')
MUSIC = Path('C:/Users/ADMIN/Desktop/grifon-command/workflows/assets/grifon-reference-full/assets/audio-v07/sources')
INPUTS = {
    'A': (REFERENCE/'source-audio.m4a', '5d848e1648efc71cb6b842d34625f8595ed2da842a4daa87dc0499217baca9ae'),
    'B': (MUSIC/'close-up.mp3', 'a7f05a29d07a84d38072ccd2b35204bca812db86e75b2a837e71cc144d3e739b'),
    'C': (MUSIC/'digital-clouds.mp3', '71cd4ea39edcc7532672bd97311abadfd318d00e7a828310a88b4f57fad9cd48'),
}
SR, FFT, HOP = 8000, 1024, 320
RATES = (.90,.94,.96,.98,1.,1.02,1.031746,1.04,1.06,1.08,1.10)
WINDOWS = [(0.,6.),(8.,14.),(14.,20.),(20.,26.),(25.,30.)]
def sha(b): return hashlib.sha256(b).hexdigest()
def decode(path):
    result = subprocess.run([str(FFMPEG),'-nostdin','-hide_banner','-v','error','-xerror','-i',str(path),'-map','0:a:0','-ar',str(SR),'-ac','1','-c:a','pcm_f32le','-f','f32le','pipe:1'],capture_output=True,timeout=30)
    if result.returncode: raise RuntimeError(result.stderr.decode(errors='replace'))
    return np.frombuffer(result.stdout,dtype='<f4').astype(np.float64),sha(result.stdout)
sources = {}
pcm = {}
for key,(file,expected) in INPUTS.items():
    data=file.read_bytes()
    if sha(data)!=expected: raise RuntimeError('Registered source changed:'+key)
    pcm[key],pcm_hash=decode(file)
    sources[key]={'file':str(file),'bytes':len(data),'sha256':expected,'decodedMono8kSha256':pcm_hash,'decodedFrames':len(pcm[key]),'seconds':len(pcm[key])/SR}
def power2(n): return 1 << (n-1).bit_length()
def matched_correlation(candidate,template):
    """Normalized valid-lag correlation, with per-channel local mean removed."""
    if candidate.ndim==1: candidate=candidate[:,None]
    if template.ndim==1: template=template[:,None]
    n=len(template)
    centered=template-template.mean(axis=0)
    fft_size=power2(len(candidate)+n-1)
    numerator=np.fft.irfft(np.sum(np.fft.rfft(candidate,n=fft_size,axis=0)*np.conj(np.fft.rfft(centered,n=fft_size,axis=0)),axis=1),n=fft_size)[:len(candidate)-n+1]
    prefix=np.vstack([np.zeros((1,candidate.shape[1])),np.cumsum(candidate,axis=0)])
    prefix2=np.vstack([np.zeros((1,candidate.shape[1])),np.cumsum(candidate*candidate,axis=0)])
    sums=prefix[n:]-prefix[:-n]
    variances=np.maximum(0.,prefix2[n:]-prefix2[:-n]-sums*sums/n).sum(axis=1)
    denominator=np.sqrt(variances*np.sum(centered*centered))
    score=np.divide(numerator,denominator,out=np.zeros_like(numerator),where=denominator>1e-12)
    return score
def midband(x):
    fft=np.fft.rfft(x)
    frequency=np.fft.rfftfreq(len(x),1/SR)
    fft[(frequency<300)|(frequency>3500)]=0
    return np.fft.irfft(fft,n=len(x))
def best_wave(candidate,reference,start,end):
    template=reference[round(start*SR):round(end*SR)]
    score=matched_correlation(candidate,template)
    peak=int(np.argmax(np.abs(score)))
    # Compare second-best separated by >=one second to expose loop ambiguity.
    masked=np.abs(score).copy()
    masked[max(0,peak-SR):min(len(masked),peak+SR)]=0
    runner=int(np.argmax(masked))
    return {'candidateStartSeconds':peak/SR,'referenceStartSeconds':start,'referenceEndSeconds':end,'correlation':round(float(score[peak]),6),'absoluteCorrelation':round(abs(float(score[peak])),6),'impliedCandidateOffset':round(peak/SR-start,6),'runnerUpAtLeast1sAway':{'startSeconds':runner/SR,'absoluteCorrelation':round(abs(float(score[runner])),6)}}
mid={key:midband(audio) for key,audio in pcm.items()}

# Fingerprint40 log-frequency bands + temporal deltas. Local per-band mean
# removal avoids awarding similarity solely for a shared genre/EQ spectrum.
edges=np.geomspace(50,3900,41)
frequency=np.fft.rfftfreq(FFT,1/SR)
def fingerprint(audio):
    frames=np.lib.stride_tricks.sliding_window_view(audio,FFT)[::HOP]
    power=np.abs(np.fft.rfft(frames*np.hanning(FFT),axis=1))**2/FFT**2
    bands=[]
    for lo,hi in zip(edges[:-1],edges[1:]):
        select=(frequency>=lo)&(frequency<hi)
        if not select.any(): select[int(np.argmin(abs(frequency-(lo+hi)/2)))]=True
        bands.append(np.log1p(power[:,select].mean(axis=1)*1e6))
    logbands=np.stack(bands,axis=1)
    delta=np.diff(logbands,axis=0,prepend=logbands[:1])
    return np.concatenate([logbands,delta*2],axis=1)
fingerprints={key:fingerprint(audio) for key,audio in pcm.items()}
weights=1/np.maximum(fingerprints['A'].std(axis=0),.15)
fingerprints={key:value*weights for key,value in fingerprints.items()}
def resample_features(feature,rate):
    positions=np.arange(max(2,round(len(feature)*rate)))/rate
    return np.stack([np.interp(positions,np.arange(len(feature)),feature[:,column]) for column in range(feature.shape[1])],axis=1)
comparison={}
for key in ('B','C'):
    windows=[]
    for start,end in WINDOWS:
        raw_wave=best_wave(pcm[key],pcm['A'],start,end)
        high_wave=best_wave(mid[key],mid['A'],start,end)
        first,last=round(start*SR/HOP),round(end*SR/HOP)
        template=fingerprints['A'][first:last]
        by_rate=[]
        for rate in RATES:
            feature=resample_features(template,rate)
            scores=matched_correlation(fingerprints[key],feature)
            peak=int(np.argmax(scores))
            by_rate.append({'referenceStartSeconds':start,'referenceEndSeconds':end,'candidateStartSeconds':round(peak*HOP/SR,6),'candidateEndSeconds':round(peak*HOP/SR+(end-start)*rate,6),'candidatePlaybackRateRelativeToReference':rate,'normalizedSpectralPatternCorrelation':round(float(scores[peak]),6),'impliedCandidateOffset':round(peak*HOP/SR-rate*start,6)})
        by_rate.sort(key=lambda item:item['normalizedSpectralPatternCorrelation'],reverse=True)
        windows.append({'referenceStart':start,'referenceEnd':end,'waveform8kMono':raw_wave,'waveform300to3500Hz':high_wave,'bestSpectral':by_rate[0],'spectralAtRate1':next(item for item in by_rate if item['candidatePlaybackRateRelativeToReference']==1.),'rateSearch':by_rate})
    full=best_wave(pcm[key],pcm['A'],0.,len(pcm['A'])/SR)
    full_mid=best_wave(mid[key],mid['A'],0.,len(pcm['A'])/SR)
    strong_wave=[window for window in windows[:4] if window['waveform300to3500Hz']['absoluteCorrelation']>=.55]
    strong_spectral=[window for window in windows[:4] if window['bestSpectral']['normalizedSpectralPatternCorrelation']>=.80]
    offsets=[window['waveform300to3500Hz']['impliedCandidateOffset'] for window in strong_wave]
    coherent_wave=len(offsets)>=3 and max(offsets)-min(offsets)<=.05
    spec_offsets=[window['bestSpectral']['impliedCandidateOffset'] for window in strong_spectral]
    spec_rates=[window['bestSpectral']['candidatePlaybackRateRelativeToReference'] for window in strong_spectral]
    coherent_spectral=len(spec_offsets)>=3 and max(spec_offsets)-min(spec_offsets)<=.10 and max(spec_rates)-min(spec_rates)<=.005
    comparison[key]={'fullReferenceWaveformSearch':full,'fullReferenceMidbandWaveformSearch':full_mid,'windows':windows,'identityCheck':{'highMidbandWaveformWindowsAtLeast55Percent':len(strong_wave),'highSpectralWindowsAtLeast80Percent':len(strong_spectral),'coherentWaveformAlignment':coherent_wave,'coherentSpectralAlignment':coherent_spectral,'status':'SUPPORTED_DISTINCTIVE_AUDIO_FINGERPRINT' if coherent_wave or coherent_spectral else 'EXACT_TRACK_IDENTITY_NOT_ESTABLISHED'},'highestSpectralSimilarity':max(w['bestSpectral']['normalizedSpectralPatternCorrelation'] for w in windows),'highestMidbandWaveformSimilarity':max(w['waveform300to3500Hz']['absoluteCorrelation'] for w in windows)}
    for name,end in [('pilot',7.4),('full',len(pcm['A'])/SR)]:
        template=fingerprints['A'][:min(len(fingerprints['A']),round(end*SR/HOP))]
        options=[]
        for rate in RATES:
            scores=matched_correlation(fingerprints[key],resample_features(template,rate))
            peak=int(np.argmax(scores))
            options.append({'candidateStartSeconds':round(peak*HOP/SR,6),'candidateEndSeconds':round(peak*HOP/SR+end*rate,6),'playbackRate':rate,'normalizedSpectralPatternCorrelation':round(float(scores[peak]),6),'status':'Diagnostic weak similarity only; no region passes distinctive identity contract'})
        options.sort(key=lambda value:value['normalizedSpectralPatternCorrelation'],reverse=True)
        comparison[key][name+'ContinuousRegionSearch']={'referenceInterval':[0.,end],'bestAcrossOffsetsAndRates':options[0],'bestAtOriginalTempo':next(value for value in options if value['playbackRate']==1.),'allRateResults':options}

# Recover knownC content despite noise, lossy AAC and optional pitch-preserving
# tempo change. Keep all fixture PCM/AAC in memory; no additional media output.
control_results=[]
for control_rate in (1.,1.04):
    control_start=12.
    length=round(31.146667*control_rate*SR)
    region=pcm['C'][round(control_start*SR):round(control_start*SR)+length]
    noise_rng=np.random.default_rng(1731)
    noise=noise_rng.standard_normal(len(region))
    noise*=.15*np.sqrt(np.mean(region*region))/np.sqrt(np.mean(noise*noise))
    mixture=(region*.75+noise).astype('<f4')
    encode=subprocess.run([str(FFMPEG),'-nostdin','-hide_banner','-v','error','-f','f32le','-ar',str(SR),'-ac','1','-i','pipe:0','-af','atempo='+str(control_rate),'-c:a','aac','-b:a','64k','-f','adts','pipe:1'],input=mixture.tobytes(),capture_output=True,timeout=30)
    if encode.returncode: raise RuntimeError(encode.stderr.decode(errors='replace'))
    decode_control=subprocess.run([str(FFMPEG),'-nostdin','-hide_banner','-v','error','-f','aac','-i','pipe:0','-ar',str(SR),'-ac','1','-c:a','pcm_f32le','-f','f32le','pipe:1'],input=encode.stdout,capture_output=True,timeout=30)
    if decode_control.returncode: raise RuntimeError(decode_control.stderr.decode(errors='replace'))
    control_pcm=np.frombuffer(decode_control.stdout,dtype='<f4').astype(np.float64)
    control_feature=fingerprint(control_pcm)*weights
    control_windows=[]
    for start,end in WINDOWS[:4]:
        template=control_feature[round(start*SR/HOP):round(end*SR/HOP)]
        choices=[]
        for rate in RATES:
            scores=matched_correlation(fingerprints['C'],resample_features(template,rate))
            peak=int(np.argmax(scores))
            choices.append({'rate':rate,'score':round(float(scores[peak]),6),'candidateStartSeconds':round(peak*HOP/SR,6),'impliedCandidateOffset':round(peak*HOP/SR-rate*start,6)})
        choices.sort(key=lambda value:value['score'],reverse=True)
        control_windows.append({'referenceWindow':[start,end],'bestSpectral':choices[0]})
    passing=[window['bestSpectral'] for window in control_windows if window['bestSpectral']['score']>=.80]
    recovered=bool(len(passing)>=3 and max(value['impliedCandidateOffset'] for value in passing)-min(value['impliedCandidateOffset'] for value in passing)<=.10 and all(abs(value['rate']-control_rate)<=.005 for value in passing))
    control_results.append({'knownSource':'C','knownSourceStartSeconds':control_start,'knownTempoRate':control_rate,'addedNoiseRmsRelativeToUnscaledMusic':.15,'musicGain':.75,'codec':'AAC64k mono8k; all encoded/decoded bytes remained in memory','windows':control_windows,'status':'PASS_KNOWN_COMPRESSED_NOISY_TRACK_RECOVERED' if recovered else 'CONTROL_LIMITATION_KNOWN_TRACK_NOT_RECOVERED'})
if any(value['status']!='PASS_KNOWN_COMPRESSED_NOISY_TRACK_RECOVERED' for value in control_results):
    raise RuntimeError('Known compressed/time-stretched track detector control failed: '+json.dumps(control_results))

# Validate matched-correlation on a planted exact pattern and reject a distinct
# seeded random signal; this checks the detector, not the third-party claim.
rng=np.random.default_rng(20261008)
template=rng.standard_normal((1024,3))
planted=rng.standard_normal((4096,3))
planted[1729:1729+len(template)]=template
positive=matched_correlation(planted,template)
negative=matched_correlation(rng.standard_normal((4096,3)),template)
if int(np.argmax(positive))!=1729 or positive[1729]<.99999 or np.max(np.abs(negative))>.15: raise RuntimeError('Correlation detector self-check failed')
report={'schemaVersion':1,'sources':sources,'method':{'scriptSha256':sha(Path(__file__).read_bytes()),'numpyVersion':np.__version__,'sampleRate':SR,'allCleanTrackOffsetsSearched':True,'waveform':'Normalized valid-lag PCM correlation with local mean/variance; additional300-3500Hz search avoids accepting a shared low-frequency beat as identity','spectral':'40log-frequency band energies plus temporal differences; per-band local mean removal and reference-derived whitening;25fps; searches candidate timeline playback rate0.90-1.10','rateGrid':RATES,'windowList':WINDOWS,'identityCriterion':'At least3 nonoverlapping windows with midband PCM>=.55 and coherent offsets<=50ms, OR spectralpattern>=.80 with coherent offsets<=100ms and rates<=.005 apart. Spectral similarity alone below this cannot establish an exact track','detectorSelfCheck':{'plantedOffset':1729,'detectedOffset':int(np.argmax(positive)),'plantedCorrelation':float(positive[1729]),'distinctSeededPatternMaximumAbsoluteCorrelation':float(np.max(np.abs(negative))),'status':'PASS'},'knownLossyNoisyTempoControls':control_results},'comparisons':comparison,'modelClaim':'Focused model described C/Digital Clouds as exact underlying instrumental starting0s,126BPM; this independent measurement does not treat that claim as evidence','interpretation':'A matched distinctive PCM/spectral sequence with consistent timing supports an audio fingerprint. Similar tempo, generic spectrum, filenames or model assertion do not. Additional vocals/SFX or processing can lower similarity; failure to establish is not proof of absence','hearing':'NOT PERFORMED. No sound, genre, words or SFX identities are assigned by this tool','providerCalls':0,'newSpendUsd':0}
(HERE/'track-comparison.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
summary={key:{'status':value['identityCheck']['status'],'fullWaveform':value['fullReferenceWaveformSearch'],'fullMidband':value['fullReferenceMidbandWaveformSearch'],'highestSpectral':value['highestSpectralSimilarity'],'highestMidband':value['highestMidbandWaveformSimilarity'],'pilotDiagnosticRegion':value['pilotContinuousRegionSearch']['bestAcrossOffsetsAndRates'],'fullDiagnosticRegion':value['fullContinuousRegionSearch']['bestAcrossOffsetsAndRates'],'bestWindows':[{'reference': [w['referenceStart'],w['referenceEnd']],'waveform':w['waveform300to3500Hz'],'spectral':w['bestSpectral']} for w in value['windows']]} for key,value in comparison.items()}
(HERE/'track-comparison-summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
print(json.dumps(summary,indent=2))
