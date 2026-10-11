# Shader launch dependency notices

The local bundle uses these exact installed package versions. The build checks each version before writing any output and copies each upstream license verbatim.

| Package | Version | License |
| --- | --- | --- |
| shaders | 4.0.1 | MIT |
| typegpu | 0.12.3 | MIT |
| tinyest | 0.3.4 | MIT |
| tsover-runtime | 0.0.7 | Apache-2.0 |
| typed-binary | 4.3.3 | MIT |

Run `node workflows/assets/grifon-shader-launch/build.mjs` from the repository with `GRIFON_TOOL_ROOT` pointing to the existing primary checkout. The script reuses installed `esbuild@0.27.0` and the ignored `.tools/shader-runtime` there. `GRIFON_SHADER_RUNTIME` may point to another local runtime directory with the same versions. The script does not install packages or make network requests.

Run the same command with `--check` to verify the committed bundle and license notices match a fresh build byte for byte. The build contains no timestamps or machine paths.

The materials are original compositions made from the open-source package; no Shaders platform presets, Pro exports, account assets, or remote render service are included.
