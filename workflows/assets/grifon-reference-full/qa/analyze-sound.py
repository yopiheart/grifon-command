"""Local signal measurements only. Does not claim to identify perceived instruments."""
import json, subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
REPO=ROOT.parents[2]
FF=REPO/'node_modules/ffmpeg-static/ffmpeg.exe'
OUT=ROOT/'qa/sound-v06'
OUT.mkdir(exist_ok=True)
SR=22050; N=2048; HOP=220
items=[('reference',ROOT/'assets/reference.mp4'),('v05',ROOT/'assets/audio/score-master.m4a')]
if (ROOT/'assets/audio-v06/score-master.m4a').exists():
    items.append(('v06',ROOT/'assets/audio-v06/score-master.m4a'))
report={}
for label,file in items:
    r=subprocess.run([str(FF),'-v','error','-i',str(file),'-vn','-ac','1','-ar',str(SR),'-f','f32le','pipe:1'],capture_output=True,check=True)
    x=np.frombuffer(r.stdout,dtype='<f4')
    frames=np.lib.stride_tricks.sliding_window_view(x,N)[::HOP]
    spec=np.abs(np.fft.rfft(frames*np.hanning(N),axis=1))
    freq=np.fft.rfftfreq(N,1/SR); times=np.arange(len(frames))*HOP/SR
    rms=np.sqrt(np.mean(frames**2,axis=1)); db=20*np.log10(np.maximum(rms,1e-8))
    bands={f'{a}-{b}Hz':np.sqrt(np.sum(spec[:,(freq>=a)&(freq<b)]**2,axis=1)) for a,b in [(30,180),(180,700),(700,3000),(3000,10000)]}
    flux=np.maximum(np.diff(np.log1p(spec*10),axis=0),0).mean(axis=1)
    flux=np.r_[0,flux]; threshold=np.median(flux)+np.std(flux)*.65
    candidates=np.where((flux>np.roll(flux,1))&(flux>np.roll(flux,-1))&(flux>threshold))[0]
    peaks=[]
    for i in sorted(candidates,key=lambda i:-flux[i]):
        if all(abs(times[i]-times[j])>.10 for j in peaks): peaks.append(i)
    peaks=sorted(peaks)
    music=(times>1)&(times<12.5); z=flux[music]-np.mean(flux[music]); ac=np.correlate(z,z,mode='full')[len(z)-1:]
    scores=[]
    for bpm in np.arange(65,171,.5):
        lag=int(round(60/bpm*SR/HOP)); score=ac[lag]+.5*ac[min(len(ac)-1,lag*2)]
        scores.append((float(score),float(bpm)))
    tempo=[]
    for score,bpm in sorted(scores,reverse=True):
        if all(abs(bpm-q['bpm'])>6 for q in tempo):tempo.append({'bpm':bpm,'score':round(score,3)})
        if len(tempo)==5:break
    power=spec**2; band_sum=np.array([np.sum(power[:,(freq>=a)&(freq<b)]) for a,b in [(30,180),(180,700),(700,3000),(3000,10000)]])
    notes=[]
    for a,b in [(0,3),(3,6),(6,9),(9,13),(13,17),(17,22.8),(22.8,29),(29,32.9)]:
        mean=np.mean(spec[(times>=a)&(times<b)],axis=0)
        local=np.where((mean>np.roll(mean,1))&(mean>np.roll(mean,-1))&(freq>70)&(freq<2200))[0]
        prominent=sorted(local,key=lambda k:-mean[k])[:10]
        notes.append({'span':[a,b],'rmsDb':round(float(np.mean(db[(times>=a)&(times<b)])),1),'peakFrequenciesHz':[round(float(freq[k]),1) for k in prominent]})
    report[label]={'duration':len(x)/SR,'peakDBFS':float(20*np.log10(np.max(abs(x)))),'overallRMSdB':float(20*np.log10(np.sqrt(np.mean(x*x)))),'bandEnergyPercent':dict(zip(bands, np.round(band_sum/band_sum.sum()*100,2).tolist())),'pulseCandidatesNotConfirmedBPM':tempo,'onsets':[{'time':round(float(times[i]),3),'strength':round(float(flux[i]),3)} for i in peaks],'sections':notes}
    np.savez_compressed(OUT/f'{label}-features.npz',times=times,rms=rms,flux=flux,spec=spec,freq=freq)
    # Data chart: time horizontally, log frequency vertically, amplitude colours.
    width,height=1400,430
    logfreq=np.geomspace(40,10000,320)[::-1]
    columns=np.linspace(0,len(times)-1,width).astype(int)
    bins=np.searchsorted(freq,logfreq).clip(0,len(freq)-1)
    values=20*np.log10(np.maximum(spec[columns][:,bins].T,1e-6))
    values=np.clip((values+35)/65,0,1)
    rgb=np.stack([values**.6*230,values**1.3*190,values**2*110],axis=-1).astype('uint8')
    chart=Image.new('RGB',(width,height),'#111216'); chart.paste(Image.fromarray(rgb),(0,45)); draw=ImageDraw.Draw(chart)
    draw.text((12,12),f'{label.upper()} - signal spectrogram (not auditory analysis)',fill='white')
    for sec in range(34):
        px=int(sec/33*width);draw.line((px,365,px,374),fill='#aaa');draw.text((px+2,377),str(sec),fill='white')
    points=[(int(t/33*width),int(425-np.clip((d+50)/45,0,1)*38)) for t,d in zip(times,db)]
    draw.line(points,fill='#ffcc00',width=1)
    chart.save(OUT/f'{label}-spectrogram.png')
(OUT/'reference-signal-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:{a:v[a] for a in ['overallRMSdB','bandEnergyPercent','pulseCandidatesNotConfirmedBPM','sections']} for k,v in report.items()},indent=2))
