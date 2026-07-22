# Voice Sample Script — Kuya Marvin (30s Taglish)

Purpose: unang voice recording ni Marvin para sa voice reference / cloning (gagamitin sa ads audio pipeline). Vocabulary deliberately matches ad copy (Oceanides, septic tank, libreng health check, numbers) para sanay ang clone sa exact na salitang gagamitin.

Typography rules applied: walang apostrophe sa contractions (nyo/yan/wag), walang em dash.

## Script (~30 segundo, natural na bilis)

> Magandang araw po! Ako si Kuya Marvin ng Oceanides. Araw-araw po akong nasa mga bahay-bahay, tumitingin ng septic tank, kanal, at mga tubo. Alam nyo po ba, dapat pa-siphon ang septic tank kada tatlo hanggang limang taon? Pag umaamoy na sa banyo, o mabagal na ang agos ng tubig sa lababo, senyales na yan na malapit nang mapuno. Wag nyo pong hintaying umapaw. Magpa-schedule na kayo ng libreng septic health check. Sabihin nyo lang, kay Kuya Marvin kayo. Kita-kits po!

## Recording instructions (i-forward kay Marvin)

1. Tahimik na kwarto. Patayin ang electric fan at TV, walang ingay ng kalsada.
2. Phone mic mga isang dangkal lang mula sa bibig.
3. Basahin muna ng dalawang beses bago mag-record. Pag take na, parang kausap lang ang kapitbahay, hindi nagbabasa.
4. Isang tuloy-tuloy na take. Kung malaki ang mintis, ulitin from the top. Mas maganda ang malinis na buo kaysa pinagtagpi.
5. I-send as voice message, o video basta malinaw ang audio.

## Status

- [x] Script sent kay Marvin (Neil)
- [x] Recording received
- [x] Quality check (malinis ba, walang background noise, natural ang tono)
- [x] Voice clone / reference set sa audio pipeline — **✅ DONE 2026-07-22**

**ElevenLabs voice ID (Kuya Marvin clone): `jL41fXY8JXGEarmJ5g3f`**

Gamit: ads/content audio lane — ElevenLabs STS/TTS sa voice ID na ito para ang
final VO ay boses ni Marvin (Veo native audio → STS pass, o direct TTS ng script).
Hindi ito secret (kailangan pa rin ng ELEVEN_LABS_API_KEY para magamit), pero ang
paggamit ay saklaw ng executed consent (voice likeness clause).

Note: covered ng executed consent agreement ang voice likeness (see consent-agreement-FINAL-2026-07-20.md). GRIFON_VOICE_CLONING_ENABLED ay naka-off pa sa app side hanggang ElevenLabs Starter+; ang paggamit dito ay sa ads production lane muna.
