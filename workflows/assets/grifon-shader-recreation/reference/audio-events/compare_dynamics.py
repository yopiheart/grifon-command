"""Same-method periodicity and gain-invariant energy shape; no hearing claim."""
from pathlib import Path
import hashlib,json,subprocess
import numpy as np
HERE=Path(__file__).resolve().parent
FFMPEG='C:/Users/ADMIN/Desktop/grifon-command/node_modules/ffmpeg-static/ffmpeg.exe'
SR,HOP,NFFT=48000,240,2048
comparison=json.loads((HERE/'track-comparison.json').read_text(encoding='utf-8'))
series={}
def sha(b):return hashlib.sha256(b).hexdigest()
def correlation(candidate,template):
    n=len(template); centered=template-template.mean()
    size=1 << (len(candidate)+n-2).bit_length()
    numerator=np.fft.irfft(np.fft.rfft(candidate,n=size)*np.conj(np.fft.rfft(centered,n=size)),n=size)[:len(candidate)-n+1]
    p=np.r_[0.,np.cumsum(candidate)];p2=np.r_[0.,np.cumsum(candidate*candidate)]
    variance=np.maximum(0.,p2[n:]-p2[:-n]-(p[n:]-p[:-n])**2/n)
    denominator=np.sqrt(variance*np.sum(centered*centered))
    return np.divide(numerator,denominator,out=np.zeros_like(numerator),where=denominator>1e-10)
def smooth(x,n):return np.convolve(np.pad(x,(n//2,n//2),mode='edge'),np.ones(n)/n,mode='valid')
def tempo(flux):
    centered=np.maximum(0.,flux-np.convolve(flux,np.ones(61)/61,mode='same'));centered-=centered.mean()
    lags=np.arange(50,201)
    scores=[]
    for lag in lags:
        a,b=centered[:-lag],centered[lag:];denominator=np.linalg.norm(a)*np.linalg.norm(b)
        scores.append(float(np.dot(a,b)/denominator) if denominator else 0.)
    scores=np.array(scores)
    peaks=[i for i in range(1,len(scores)-1) if scores[i]>scores[i-1] and scores[i]>=scores[i+1]]
    output=[]
    for i in sorted(peaks,key=lambda i:float(scores[i]),reverse=True)[:5]:
        left,middle,right=scores[i-1:i+2];denominator=left-2*middle+right
        shift=np.clip(.5*(left-right)/denominator,-.5,.5) if denominator else 0.
        lag=(lags[i]+shift)*HOP/SR
        output.append({'lagSeconds':round(float(lag),6),'bpmCandidate':round(float(60/lag),4),'normalizedAutocorrelation':round(float(scores[i]),6)})
    return output
for key,source in comparison['sources'].items():
    file=Path(source['file'])
    if sha(file.read_bytes())!=source['sha256']:raise RuntimeError('Changed registered input:'+key)
    r=subprocess.run([FFMPEG,'-nostdin','-hide_banner','-v','error','-xerror','-i',str(file),'-map','0:a:0','-ar',str(SR),'-ac','2','-c:a','pcm_f32le','-f','f32le','pipe:1'],capture_output=True,timeout=30)
    if r.returncode:raise RuntimeError(r.stderr.decode(errors='replace'))
    pcm=np.frombuffer(r.stdout,dtype='<f4').reshape(-1,2)
    mono=pcm.mean(axis=1).astype(np.float64)
    energy=(pcm.astype(np.float64)**2).mean(axis=1);prefix=np.r_[0.,np.cumsum(energy)]
    starts=np.arange(0,len(pcm)-960+1,HOP)
    rms=np.sqrt(np.maximum(0.,(prefix[starts+960]-prefix[starts])/960))
    rms_db=20*np.log10(np.maximum(rms,1e-12))
    frames=np.lib.stride_tricks.sliding_window_view(mono,NFFT)[::HOP]
    frequencies=np.fft.rfftfreq(NFFT,1/SR);band=(frequencies>=40)&(frequencies<12000)
    flux=[];previous=None
    for begin in range(0,len(frames),512):
        magnitude=np.abs(np.fft.rfft(frames[begin:begin+512]*np.hanning(NFFT),axis=1))/NFFT
        log=np.log1p(magnitude*100.)
        delta=np.diff(log,axis=0,prepend=log[:1] if previous is None else previous)
        flux.extend(np.maximum(0.,delta)[:,band].mean(axis=1))
        previous=log[-1:]
    flux=np.array(flux)
    series[key]={'rms':rms,'rmsDb':rms_db,'slowDb':smooth(np.clip(rms_db,-80,6),101),'flux':flux,'nativeStereoPcmSha256':sha(r.stdout),'duration':len(pcm)/SR,'sourceSha256':source['sha256'],'periodicityWholeTrack':tempo(flux),'periodicityFirst31Seconds':tempo(flux[:round(31.146667/(HOP/SR))])}
    del pcm,mono,energy,prefix,r
# MatchA's original diagnostic to show the method stayed the same.
old=json.loads((HERE/'summary.json').read_text(encoding='utf-8'))
if abs(series['A']['periodicityWholeTrack'][0]['bpmCandidate']-old['tempoCandidates'][0]['refinedBpmCandidate'])>.0001:raise RuntimeError('A periodicity method changed unexpectedly')
rates=comparison['method']['rateGrid']
shapes={}
for key in ('B','C'):
    output={}
    for name,end in [('pilot7.4s',7.4),('firstHalf15.573s',31.146667/2),('full31.147s',31.146667)]:
        n=min(round(end/(HOP/SR)),len(series['A']['slowDb']))
        template=series['A']['slowDb'][:n]
        at_zero=correlation(series[key]['slowDb'][:n],template)[0]
        results=[]
        for rate in rates:
            positions=np.arange(round(n*rate))/rate
            stretched=np.interp(positions,np.arange(n),template)
            scores=correlation(series[key]['slowDb'],stretched)
            peak=int(np.argmax(scores))
            results.append({'candidateStartSeconds':round(peak*HOP/SR,6),'candidateEndSeconds':round(peak*HOP/SR+end*rate,6),'playbackRate':rate,'gainInvariantSlowEnergyCorrelation':round(float(scores[peak]),6)})
        results.sort(key=lambda value:value['gainInvariantSlowEnergyCorrelation'],reverse=True)
        original=next(value for value in results if value['playbackRate']==1.)
        best=results[0]
        # High-frequency modulation/beat correlation at selectedslow-shape region.
        start=round(best['candidateStartSeconds']/(HOP/SR))
        positions=start+np.arange(n)*best['playbackRate']
        selected_rms=np.interp(positions,np.arange(len(series[key]['rmsDb'])),np.clip(series[key]['rmsDb'],-80,6))
        transient_energy=correlation(selected_rms,np.clip(series['A']['rmsDb'][:n],-80,6))[0]
        output[name]={'referenceInterval':[0.,end],'atCandidate0sOriginalTempoSlowEnergyCorrelation':round(float(at_zero),6),'bestAllOffsetsAndRates':best,'bestAllOffsetsAtOriginalTempo':original,'20msEnergyCorrelationAtBestSlowShape':round(float(transient_energy),6),'allRateResults':results,'interpretation':'Energy-envelope shape only. Matching buildup/fade or pulse does not identify melody, genre or exact underlying audio.'}
    shapes[key]=output
compact={'schemaVersion':1,'sourceHashes':{key:value['sourceSha256'] for key,value in series.items()},'periodicity':{key:{'wholeTrack':value['periodicityWholeTrack'],'first31Seconds':value['periodicityFirst31Seconds']} for key,value in series.items()},'energyShape':shapes,'method':{'scriptSha256':sha(Path(__file__).read_bytes()),'sampleRate':SR,'fftSamples':NFFT,'hopSeconds':HOP/SR,'flux':'Exactly theAmeasure.py method: positive log1p(100*HannFFT/NFFT) differences averaged40Hz-12kHz, subtract61-hop movingbaseline, normalized autocorrelationlags50..200, refinedpeaks','energy':'Stereo20msRMS at5mshop, dBfloor-80, 505msmovingaverage; Pearsonsearch gain-invariant, all cleantrack offsets and playbackrate0.90..1.10','AReproducedOriginal130Candidate':True,'allPcmDecodedInMemory':True},'identityConclusion':'Neither B nor C has an identifiable exact fingerprint. Do not promote an energy-shape or periodicity match into exact-track identity. Model-assisted sonic comparison remains unverified by direct hearing.','hearing':'NOT PERFORMED','providerCalls':0,'newSpendUsd':0}
(HERE/'track-dynamics.json').write_text(json.dumps(compact,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'periodicity':{key:value['periodicityWholeTrack'][:3] for key,value in series.items()},'energyBest':{key:{name:{'at0':value['atCandidate0sOriginalTempoSlowEnergyCorrelation'],'best':value['bestAllOffsetsAndRates'],'original':value['bestAllOffsetsAtOriginalTempo'],'transient20ms':value['20msEnergyCorrelationAtBestSlowShape']} for name,value in measures.items()} for key,measures in shapes.items()}},indent=2))
