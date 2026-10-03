"""Two bounded regression checks, not a perceptual audio grade.

Run analyze-sound.py first. V05 must fail both; V06 must pass both.
"""
import json
from pathlib import Path
p=Path(__file__).resolve().parent/'sound-v06'
r=json.loads((p/'reference-signal-report.json').read_text())
results={}
for name in ['reference','v05','v06']:
    x=r[name]
    lift=x['sections'][4]['rmsDb']-x['sections'][3]['rmsDb']
    bright=x['bandEnergyPercent']['700-3000Hz']+x['bandEnergyPercent']['3000-10000Hz']
    results[name]={'revealLiftDB':round(lift,2),'energyAbove700HzPercent':round(bright,2),
      'revealBuilds':lift>=3,'midHighPresence':bright>=12}
passed=all(not results['v05'][k] and results['v06'][k] for k in ['revealBuilds','midHighPresence'])
result={'scope':'Reveal energy direction and spectral balance only; not proof of excitement, musical quality, instrument identity or reference fidelity.',
    'results':results,'regressionProved':passed}
(p/'regression-metrics.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
if not passed:raise SystemExit(1)
