"""Free deterministic measurements; audio metrics do not constitute listening."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import sys
import numpy as np

HERE = Path(__file__).resolve().parent
REFERENCE = HERE.parent
FFMPEG = Path("C:/Users/ADMIN/Desktop/grifon-command/node_modules/ffmpeg-static/ffmpeg.exe")
SOURCE = REFERENCE / "source-audio.m4a"
EXPECTED_SHA = "5d848e1648efc71cb6b842d34625f8595ed2da842a4daa87dc0499217baca9ae"
SR, HOP, NFFT = 48000, 240, 2048
def sha(b):
    return hashlib.sha256(b).hexdigest()
if sha(SOURCE.read_bytes()) != EXPECTED_SHA:
    raise RuntimeError("Exact native audio hash differs")
result = subprocess.run([str(FFMPEG), "-nostdin", "-hide_banner", "-v", "error", "-xerror", "-i", str(SOURCE), "-map", "0:a:0", "-ar", str(SR), "-ac", "2", "-c:a", "pcm_f32le", "-f", "f32le", "pipe:1"], capture_output=True, timeout=30)
if result.returncode:
    raise RuntimeError(result.stderr.decode(errors="replace"))
pcm = np.frombuffer(result.stdout, dtype="<f4").reshape(-1, 2)
mono = pcm.mean(axis=1).astype(np.float64)
duration = len(pcm) / SR
time_uncertainty = NFFT / SR / 2
def db(value):
    return float(20 * np.log10(max(float(value), 1e-12)))
def intervals(mask, times, minimum=.30):
    edges = np.diff(np.r_[False, mask, False].astype(np.int8))
    answer = []
    for begin, end in zip(np.flatnonzero(edges == 1), np.flatnonzero(edges == -1)):
        start = max(0.0, float(times[begin] - .01))
        stop = min(duration, float(times[min(end, len(times) - 1)] + .01))
        if stop - start >= minimum:
            answer.append({"start": round(start, 6), "end": round(stop, 6), "duration": round(stop-start, 6)})
    return answer

# Stereo 20 ms RMS, sampled every 5 ms; no downsampling/aliasing.
energy = (pcm.astype(np.float64) ** 2).mean(axis=1)
prefix = np.r_[0., np.cumsum(energy)]
rms_starts = np.arange(0, len(pcm) - 960 + 1, HOP)
rms = np.sqrt(np.maximum(0., (prefix[rms_starts+960] - prefix[rms_starts]) / 960))
rms_times = (rms_starts + 480) / SR
rms_db = 20 * np.log10(np.maximum(rms, 1e-12))

# Positive log-magnitude spectral flux. Hann FFT gives ~21.3 ms timing uncertainty;
# 5 ms hops provide samples, not independent 5 ms onset precision.
frames = np.lib.stride_tricks.sliding_window_view(mono, NFFT)[::HOP]
magnitude = np.abs(np.fft.rfft(frames * np.hanning(NFFT), axis=1)) / NFFT
frequencies = np.fft.rfftfreq(NFFT, 1 / SR)
log_magnitude = np.log1p(magnitude * 100.)
positive_difference = np.maximum(0., np.diff(log_magnitude, axis=0, prepend=log_magnitude[:1]))
times = (np.arange(len(frames)) * HOP + NFFT / 2) / SR
band_definitions = {"low_40_200hz": (40, 200), "mid_200_2000hz": (200, 2000), "high_2000_12000hz": (2000, 12000)}
band_flux = {}
for name, (lo, hi) in band_definitions.items():
    band_flux[name] = positive_difference[:, (frequencies >= lo) & (frequencies < hi)].mean(axis=1)
flux = positive_difference[:, (frequencies >= 40) & (frequencies < 12000)].mean(axis=1)
flux_median = float(np.median(flux))
flux_mad = float(np.median(np.abs(flux - flux_median)))
threshold = max(float(np.percentile(flux, 80)), flux_median + 3 * flux_mad)
local = np.flatnonzero((flux[1:-1] > flux[:-2]) & (flux[1:-1] >= flux[2:])) + 1
candidates = [int(i) for i in local if flux[i] >= threshold]
# Retain the strongest candidate within each 80 ms neighborhood.
selected = []
for i in sorted(candidates, key=lambda i: float(flux[i]), reverse=True):
    if all(abs(times[i] - times[j]) >= .08 for j in selected):
        selected.append(i)
selected.sort()
flux_max = max(float(flux.max()), 1e-12)
high_threshold = float(np.percentile(flux, 95))
high = [i for i in selected if flux[i] >= high_threshold]

# Only boundaries explicitly labelled hard cut or abrupt material substitution.
shot_map_file = REFERENCE / "independent-shot-map.md"
shot_map = shot_map_file.read_text(encoding="utf-8")
cut_rows = []
phase_rows = []
for line in shot_map.splitlines():
    match = re.match(r"\| (\d+)-[^|]+\|[^|]+\| (.+) \|$", line)
    if not match:
        continue
    frame, description = int(match.group(1)), match.group(2)
    phase_rows.append({"frame": frame, "time": frame * 1001 / 30000, "description": description})
    is_cut = description.startswith("Hard cut") or description.startswith("Hard palette")
    is_ring_material = frame in (91, 97, 104, 111, 119, 126, 132)
    is_rapid_stripe = frame in (397, 400, 403, 407)
    if is_cut or is_ring_material or is_rapid_stripe:
        cut_rows.append({"frame": frame, "time": round(frame * 1001 / 30000, 9), "kind": "frame-inspected abrupt boundary", "visualDescription": description})
def nearest_cut(time):
    if not cut_rows:
        return None
    cut = min(cut_rows, key=lambda row: abs(row["time"] - time))
    return {"frame": cut["frame"], "time": cut["time"], "deltaSeconds": round(time-cut["time"], 6), "within80ms": abs(time-cut["time"]) <= .08}
event_list = []
for i in selected:
    strength = float(flux[i])
    rms_index = int(np.argmin(np.abs(rms_times-times[i])))
    event_list.append({"time": round(float(times[i]), 6), "flux": round(strength, 9), "normalizedFlux": round(strength/flux_max, 6), "robustScoreMad": round((strength-flux_median)/max(flux_mad, 1e-12), 3), "stereo20msRmsDbfs": round(float(rms_db[rms_index]), 3), "measurementConfidence": "high-energy change" if strength >= high_threshold else "detected spectral change", "timingUncertaintySeconds": round(time_uncertainty, 6), "bandFlux": {name: round(float(values[i]), 9) for name, values in band_flux.items()}, "nearestInspectedCut": nearest_cut(float(times[i])), "identity": "Unassessed: spectral change does not identify an SFX, instrument or voice."})

# Autocorrelation detects candidate periodicity; it does not identify musical BPM.
def autocorrelation_candidates(envelope, selected_times, begin, end):
    mask = (times >= begin) & (times < end)
    values = envelope[mask]
    local_times = times[mask]
    if len(values) < 600:
        return {"start": begin, "end": end, "status": "too short", "candidates": []}
    centered = np.maximum(0., values - np.convolve(values, np.ones(61)/61, mode="same"))
    centered -= centered.mean()
    lags = np.arange(round(60/240/(HOP/SR)), round(60/60/(HOP/SR))+1)
    correlation = []
    for lag in lags:
        left, right = centered[:-lag], centered[lag:]
        denominator = np.linalg.norm(left) * np.linalg.norm(right)
        correlation.append(float(np.dot(left, right) / denominator) if denominator else 0.)
    correlation = np.array(correlation)
    peaks = [i for i in range(1, len(correlation)-1) if correlation[i] > correlation[i-1] and correlation[i] >= correlation[i+1]]
    ranked = sorted(peaks, key=lambda i: float(correlation[i]), reverse=True)[:8]
    def refine_peak(i):
        left, middle, right = correlation[i-1:i+2]
        denominator = left - 2*middle + right
        shift = .5*(left-right)/denominator if denominator else 0.
        return float((lags[i]+np.clip(shift,-.5,.5))*HOP/SR)
    tempo_candidates = [{"bpm": round(60/(lags[i]*HOP/SR), 4), "lagSeconds": round(lags[i]*HOP/SR, 6), "refinedLagSeconds": round(refine_peak(i), 6), "refinedBpmCandidate": round(60/refine_peak(i), 4), "normalizedAutocorrelation": round(float(correlation[i]), 6)} for i in ranked]
    target_lag = int(round(.5/(HOP/SR)))
    target_i = int(np.argmin(abs(lags-target_lag)))
    nearby = [i for i, lag in enumerate(lags) if 117 <= 60/(lag*HOP/SR) <= 123]
    best_nearby = max(nearby, key=lambda i: float(correlation[i]))
    target_peak = best_nearby in peaks
    strong_times = [float(t) for t in selected_times if begin <= t < end]
    best_phase, best_fraction = 0., 0.
    for phase in np.arange(0, .5, .005):
        if strong_times:
            offsets = np.abs((np.array(strong_times)-phase+.25) % .5 - .25)
            fraction = float((offsets <= .06).mean())
            if fraction > best_fraction:
                best_fraction, best_phase = fraction, float(phase)
    best_score = max(float(correlation.max()), 1e-12)
    near_score = float(correlation[best_nearby])
    supported = bool(target_peak and near_score >= .20 and near_score/best_score >= .85 and len(strong_times) >= 8 and best_fraction >= .60)
    return {"start": begin, "end": end, "candidates": tempo_candidates, "claimed120bpm": {"exactHalfSecondCorrelation": round(float(correlation[target_i]), 6), "bestWithin117to123Bpm": round(60/(lags[best_nearby]*HOP/SR), 4), "nearbyAutocorrelation": round(near_score, 6), "nearbyIsLocalPeak": bool(target_peak), "relativeToStrongestLag": round(near_score/best_score, 6), "highTransientCount": len(strong_times), "bestHalfSecondPhase": round(best_phase, 6), "highTransientsWithin60msOfGridFraction": round(best_fraction, 6), "status": "PASS_PERIODIC_EVENT_SUPPORT" if supported else "FAIL_TO_ESTABLISH_120BPM"}, "diagnosticLags": [{"bpm": round(60/(lag*HOP/SR), 4), "correlation": round(float(score), 6)} for lag, score in zip(lags, correlation)]}
high_times = [float(times[i]) for i in high]
tempo = autocorrelation_candidates(flux, high_times, 0., duration)
tempo_windows = [autocorrelation_candidates(flux, high_times, float(start), min(float(start+6), duration)) for start in (0,4,8,12,16,20,24)]
band_tempos = {name: autocorrelation_candidates(values, high_times, 0., duration) for name, values in band_flux.items()}

claimed_timestamps = []
for stamp in (.06, .10):
    # Use unpruned prominent peaks: the80ms display/de-duplication rule must not
    # reject two claims only40ms apart merely because it pruned their candidates.
    candidates_near = [{"time": round(float(times[i]), 6), "flux": round(float(flux[i]), 9), "robustScoreMad": round((float(flux[i])-flux_median)/max(flux_mad,1e-12), 3), "timingUncertaintySeconds": round(time_uncertainty,6)} for i in candidates if abs(float(times[i])-stamp) <= .03]
    index = int(np.argmin(abs(rms_times-stamp)))
    before = float(np.median(rms_db[(rms_times >= max(0., stamp-.04)) & (rms_times < stamp)]))
    after = float(np.max(rms_db[(rms_times >= stamp) & (rms_times <= stamp+.04)]))
    claimed_timestamps.append({"claimedSeconds": stamp, "toleranceSeconds": .03, "detectedOnsetWithinTolerance": candidates_near, "stereo20msRmsDbfsAtClaim": round(float(rms_db[index]), 3), "medianBeforeDbfs": round(before,3) if before > -150 else None, "beforeIsDigitalSilence": before <= -150, "maxAfterMinusMedianBeforeDb": round(after-before, 3) if before > -150 else None, "status": "PASS_MEASURED_CHANGE_NEAR_TIMESTAMP" if candidates_near else "FAIL_NO_PROMINENT_DETECTED_CHANGE_NEAR_TIMESTAMP", "sfxIdentity": "NOT ASSESSABLE FROM METRICS"})
cut_evidence = []
for cut in cut_rows:
    near = min(event_list, key=lambda event: abs(event["time"]-cut["time"]))
    cut_evidence.append({**cut, "nearestAudioChange": {"time": near["time"], "deltaSeconds": round(near["time"]-cut["time"], 6), "confidence": near["measurementConfidence"], "within80ms": abs(near["time"]-cut["time"]) <= .08}})
def covered_fraction(event_times, radius=.08):
    spans = sorted((max(0., float(t)-radius), min(duration,float(t)+radius)) for t in event_times)
    merged = []
    for begin,end in spans:
        if merged and begin <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1],end)
        else:
            merged.append([begin,end])
    return sum(end-begin for begin,end in merged)/duration
cut_proximity_context = {"within80msCutCount":sum(c['nearestAudioChange']['within80ms'] for c in cut_evidence), "inspectedAbruptBoundaryCount":len(cut_rows), "allDetectedEventsCoverFractionOfTimelineAt80ms":round(covered_fraction(times[selected]),6), "highTransientEventsCoverFractionOfTimelineAt80ms":round(covered_fraction(high_times),6), "interpretation":"Descriptive proximity only. Many detected events cover a large part of the timeline, so proximity can occur by chance and does not establish intentional beat-sync."}
report = {"schemaVersion": 1, "source": {"file": "../source-audio.m4a", "sha256": EXPECTED_SHA, "decodedPcmFloat32Sha256": sha(result.stdout), "decodedFrames": len(pcm), "duration": duration, "sampleRate": SR, "channels": 2, "strictDecodeExitCode": result.returncode, "sourceHashPreserved": True}, "method": {"numpyVersion": np.__version__, "fftSamples": NFFT, "hannWindowSeconds": NFFT/SR, "hopSeconds": HOP/SR, "onsetTimeUncertaintySeconds": time_uncertainty, "rmsWindowSeconds": .02, "peakMinimumSeparationSeconds": .08, "fluxDefinition": "Positive change in log1p(100*Hann FFT magnitude / NFFT), averaged over40Hz-12kHz; candidate local maxima exceed both80th percentile and median+3MAD", "highChangeThreshold": "95th percentile of all flux samples", "timestampClaimMethod":"Uses unpruned prominent peaks within30ms;80ms pruning only affects reported event list/plot", "tempoCriteria": "A117-123BPM local autocorrelation peak >=.20, >=85% strongest tested lag, >=8 high transients, and >=60% high transients within60ms of an optimized0.5s grid; measures periodicity only.", "silenceThresholdDbfs": -50, "minimumSilenceSeconds": .30, "shotMapSha256": sha(shot_map_file.read_bytes()), "scriptSha256": sha(Path(__file__).read_bytes())}, "claimChecks": {"timestamps": claimed_timestamps, "tempo120": tempo["claimed120bpm"], "soundDescriptions": {"electronicHouse":"UNASSESSED_WITHOUT_LISTENING", "staticBuzz":"UNASSESSED_WITHOUT_LISTENING", "shutter":"UNASSESSED_WITHOUT_LISTENING", "vinylScratch":"UNASSESSED_WITHOUT_LISTENING"}}, "silenceIntervals": intervals(rms_db < -50, rms_times), "quietIntervalsBelow40Dbfs": intervals(rms_db < -40, rms_times), "eventCount": len(event_list), "highTransientCount": len(high), "events": event_list, "highestTwentyEvents": sorted(event_list, key=lambda event: event["flux"], reverse=True)[:20], "cutProximity": cut_evidence, "cutProximityContext":cut_proximity_context, "tempo": tempo, "tempoWindows": tempo_windows, "bandTempo": band_tempos, "sampledSeries": [{"time": round(float(times[i]), 6), "fluxNormalized": round(float(flux[i]/flux_max), 6), "rmsDbfs": round(float(rms_db[int(np.argmin(abs(rms_times-times[i])))]), 3)} for i in range(0, len(times), 4)], "hearing": "NOT PERFORMED. The runtime cannot ingest audio. Metrics do not establish genre, SFX identity, speech or musical intent.", "providerCalls": 0, "newSpendUsd": 0}
(HERE / "events.json").write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")

# Compact standalone SVG plot; no unavailable plotting library is installed.
W,H = 1200,640
L,R = 65,1170
def x(t): return L+(R-L)*t/duration
def rms_y(v): return 270-(np.clip(v,-80,6)+80)/86*190
def flux_y(v): return 450-v*135
def poly(points): return " ".join(f"{a:.2f},{b:.2f}" for a,b in points)
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="1200" height="640" fill="#f8f8f6"/><style>text{{font-family:Arial,sans-serif;fill:#252528}}.label{{font-size:12px}}.minor{{font-size:11px;fill:#6b6b70}}</style>', '<text x="65" y="30" font-size="20">Exact source audio: measured events and periodicity</text>', '<text x="65" y="52" class="label">932 video frames / native stereo AAC / 5 ms hop / onset uncertainty ~21 ms / no listening or sound identity claim</text>']
for second in range(0,32,2):
    svg.append(f'<path d="M{x(second):.2f} 75 V460" stroke="#ddddda"/><text x="{x(second):.2f}" y="478" text-anchor="middle" class="label">{second}s</text>')
for level in (-80,-60,-40,-20,0):
    svg.append(f'<path d="M65 {rms_y(level):.2f} H1170" stroke="#e0e0dc"/><text x="57" y="{rms_y(level)+4:.2f}" text-anchor="end" class="minor">{level}</text>')
svg.append('<text x="65" y="74" class="label">Stereo 20 ms RMS (dBFS)</text>')
svg.append(f'<polyline fill="none" stroke="#245c8b" stroke-width="1.25" points="{poly([(x(float(rms_times[i])),rms_y(float(rms_db[i]))) for i in range(0,len(rms_times),4)])}"/>')
svg.append('<text x="65" y="302" class="label">Positive spectral flux; orange=high transient / gray=inspected abrupt visual boundary</text>')
for cut in cut_rows:
    svg.append(f'<path d="M{x(cut["time"]):.2f} 310 V450" stroke="#b4b4b0" stroke-dasharray="3 4"/>')
svg.append(f'<polyline fill="none" stroke="#35343c" stroke-width="1.25" points="{poly([(x(float(times[i])),flux_y(float(flux[i]/flux_max))) for i in range(0,len(times),2)])}"/>')
for i in high:
    svg.append(f'<circle cx="{x(float(times[i])):.2f}" cy="{flux_y(float(flux[i]/flux_max)):.2f}" r="2.8" fill="#c4611a"/>')
grid = tempo['claimed120bpm']
svg.append(f'<text x="65" y="515" class="label">120 BPM hypothesis: {grid["status"]}; half-second correlation {grid["exactHalfSecondCorrelation"]:.3f}; grid match {grid["highTransientsWithin60msOfGridFraction"]*100:.1f}%</text>')
svg.append('<text x="65" y="540" class="label">Strongest autocorrelation candidates: '+", ".join(f'{c["bpm"]:.1f} BPM ({c["normalizedAutocorrelation"]:.3f})' for c in tempo['candidates'][:5])+'</text>')
svg.append('<text x="65" y="565" class="label">Early claims: '+"; ".join(f'{c["claimedSeconds"]:.2f}s: {"change detected" if c["detectedOnsetWithinTolerance"] else "no prominent change"}' for c in claimed_timestamps)+'</text>')
svg.append('<text x="65" y="594" class="minor">Tempo candidates can reflect editing, envelopes and layered effects. These measurements do not prove musical beat or instrument identity.</text>')
svg.append('<text x="65" y="616" class="minor">Exact source SHA256 '+EXPECTED_SHA+'</text></svg>')
(HERE / "timeline.svg").write_text("\n".join(svg), encoding="utf-8")
summary = {"sourceSha256": EXPECTED_SHA, "decodedFrames": len(pcm), "duration": duration, "eventCount": len(event_list), "highTransientCount": len(high), "tempo120": report['claimChecks']['tempo120'], "earlyTimestamps": claimed_timestamps, "tempoCandidates": tempo['candidates'][:5], "tempo120SupportedWindows":sum(w['claimed120bpm']['status']=='PASS_PERIODIC_EVENT_SUPPORT' for w in tempo_windows), "tempoWindowCount":len(tempo_windows), "silenceIntervals": report['silenceIntervals'], "quietIntervalsBelow40Dbfs":report['quietIntervalsBelow40Dbfs'], "cutProximity":cut_proximity_context, "highestTwentyEventTimes":[e['time'] for e in report['highestTwentyEvents']], "sourceHashPreserved":True, "hearing":report['hearing'], "providerCalls":0,"newSpendUsd":0}
(HERE / "summary.json").write_text(json.dumps(summary,indent=2)+"\n",encoding="utf-8")
print(json.dumps(summary, indent=2))
