# Product image AI rebrand notes

## Done
- Recovered 26 original Squarespace CDN product/hero photos from `backup/pre-uncle-lan` `data/images.json`.
- Downloaded to `tmp/originals/{slug}.{jpg|png}` (untracked).
- Converted to high-quality photographic `public/products/{slug}.webp` (replaced parchment demo graphics).
- `data/images.json` already pointed at `/products/{slug}.webp` — unchanged.
- `npx tsx tests/commerce.ts` passed.
- `backup/pre-uncle-lan` left untouched.

## Failed / blocked
- Cursor `GenerateImage` (via `GetDynamicTools` / `CallDynamicTool`, namespace `cursor`) is **not available** to this executor subagent tool surface.
- Available tools were only: ListMachines, WebSearch, WebFetch, CloudAgent, Shell, Read, AwaitShell, CopyToBox, CopyFromBox, GetMcpTools, CallMcpTool.
- CloudAgent launch also unavailable (plan restriction).
- Therefore packaging text still reads **Aunty Hong / 阿嫲红** in the photographic assets. Branding text was NOT AI-edited to Uncle Lan.
- Re-run from an agent that has `GetDynamicTools` + `GenerateImage` with `reference_image_paths` pointing at `tmp/originals/*` (or re-download from backup URLs).

## Spot-check (photographic, not parchment)
- Lucky Duo: real gift set with two black tins — still shows Aunty Hong on labels.
- Spring Blossom: real red tingkat — still shows Aunty Hong.
- Keropok / noodles: real food photography.
