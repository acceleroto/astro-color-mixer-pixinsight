# Astro Color Mixer FAQ & Practical Guide

Astro Color Mixer is a nonlinear RGB color and luminance refinement tool for astrophotography. It is intended for images that have already been calibrated, registered, integrated, color balanced, and stretched. It is not a replacement for calibration, linear processing, background correction, or broad color correction.

## What is Astro Color Mixer?

Astro Color Mixer is built for nonlinear RGB color-band refinement. Instead of making arbitrary global color swings, it lets you work in practical astro editing regions such as H-alpha reds, warm dust and galaxy cores, OIII cyans, reflection blues, violet drift, magenta halos, and background-oriented low-saturation areas.

The primary workflow creates a new output image so the original source remains unchanged. `Apply to Target` is available for deliberate in-place work and respects an active PixInsight mask.

## Where does it fit in a PixInsight workflow?

Use Astro Color Mixer after the image has already gone through the core imaging stages:

- calibration
- registration and integration
- background correction
- color calibration
- nonlinear stretch
- initial noise reduction or contrast shaping as appropriate

Typical placement is after the image is already nonlinear, when you want controlled final color and luminance refinement.

## What kind of image should I use?

Use a nonlinear RGB image with a sensible stretch and broadly reasonable color. Do not use the tool on raw linear stacks or as a substitute for earlier calibration work.

The tool works on stars-present and starless images. The `Image Type` setting tells the processing model which protection behavior to use.

## Stars Present vs Starless

`Stars Present` is intended for images that still contain normal stars. It uses more conservative highlight and star-core protection so adjustments are less likely to damage bright stars, push star cores into odd colors, or exaggerate halos.

`Starless` is intended for images where stars have been removed. Since there are fewer bright star structures to protect, the tool can act more freely on nebulae, galaxies, dust, and faint color regions.

This setting does not remove stars and does not create a star mask. It only changes protection behavior used while applying adjustments.

## Basic workflow

1. Open a nonlinear RGB image.
2. Choose `Image Type`.
3. Start with `Base Pass` for broad work.
4. Use `Hue`, `Saturation`, and `Luminance` tabs for color-band adjustments.
5. Click the preview to probe useful pixels and confirm which band is active.
6. Adjust `Hue Radius` and `Feather` when a band needs to be narrower, broader, or smoother.
6A. On starless data, use `Blur` only when a hard selected-band mask edge is visible.
7. Use mask preview modes before strong edits.
8. Add a `Refinement Pass` for targeted work such as halos, background, highlights, or faint signal.
9. Use `Range Mask` when the change should affect only a luminance slice.
10. Compare adjusted output against original or last pass.
11. Use `Create Image` when the result is ready.
12. Save an adjustment set if the session is worth preserving.

## What are the color bands?

- `Red / H-alpha`: broad red emission control, warm red signal, and H-alpha-biased structures.
- `Orange`: warm dust lanes, core warmth, and orange stellar or core transitions.
- `Yellow`: star warmth and yellow-gold transitions.
- `Green`: green cast suppression or restoration where needed.
- `Cyan / OIII`: cyan-turquoise emission and cyan star or nebula structures.
- `Blue`: reflection nebulosity and blue halo structures.
- `Purple`: violet drift, deep blue-violet transitions, and some star-edge cleanup work.
- `Magenta`: magenta halos, magenta-biased star artifacts, and magenta fringe control.

These are practical editing regions, not strict physical classifications.

## What do Hue, Saturation, and Luminance do?

`Hue` shifts color direction inside the selected band. `Saturation` strengthens or weakens color intensity inside that band. `Luminance` changes the brightness of selected color regions.

Use small moves first. Saturation is often the most natural first adjustment for emission and reflection structures. Luminance is useful for emphasis, background control, and balancing bright or faint structures.

## What are Hue Radius and Feather?

`Hue Radius` controls how much of the hue neighborhood around the selected band is affected. Narrow radius is more selective; wide radius reaches a broader family of colors.

`Feather` controls how softly the selection falls off. Higher feather produces smoother transitions and lowers the chance of abrupt color boundaries.

## What is Selected Band Blur?

`Blur` is a spatial blur control for the active selected-band mask. It is different from `Feather`: Feather softens the transition across hue distance, while Blur smooths the final mask slightly across neighboring image pixels.

This can help when a strong adjustment reveals the edge of the color mask on starless nebula, galaxy, or dust data. The control uses modest whole-pixel values: `Off`, `1 px`, `2 px`, `3 px`, `4 px`, or `5 px`.

Selected Band Blur is only active in `Starless` mode. In `Stars Present` mode it is disabled because spatially blurring a color mask can bleed adjustments into star cores, halos, and nearby structures. It is not a substitute for real star masking or star protection.

Start with `1 px`, inspect `Current Band Mask` or `Combined Mask`, and compare before and after. Values up to `5 px` can be useful for starless color-mask work, but if stars will be recombined later, use the lowest value that hides the hard edge cleanly.

## What is Range Mask?

`Range Mask` is a luminance-based selection. `Low` and `High` define the brightness interval, while `Feather` softens the inclusion edges.

Use it for background work, faint signal work, highlight protection, bright cores, stars, or any pass that should act only in a luminance slice. Range Mask belongs to the active pass, not the whole tool globally.

Before making a strong edit, switch preview to `Range Mask` or `Combined Mask`. If the mask does not include the structures you intend to change, tune `Low`, `High`, and `Feather` first.

## What is Neutral / Low-Saturation?

When saturation is very low, hue becomes unreliable. `Neutral / Low-Saturation` is the luminance control for those pixels. It is useful for sky background, gray dust, halos, low-color transitions, and neutral structures where a hue-based edit would be misleading.

This control appears with the `Luminance` controls.

## Why might a low-saturation galaxy not respond strongly?

Some broadband galaxy images have real but very weak color in the outer arms, dust, and faint halo structures. In those pixels the hue can be unstable, so `Protect Low Sat` may deliberately reduce the effect of color-band sliders. This is a guardrail, not a judgment that the color is unimportant.

Turning off `Protect Low Sat` can help reveal faint blue, cyan, orange, or red structure in a low-color galaxy. The risk is that the tool is then acting on pixels whose hue is less reliable, so aggressive slider moves can create blotchy color, noisy hue patches, or colored star-halo fields.

The safest workflow for this case is to work on a starless image, inspect the Band Mask and Combined Mask, use moderate slider moves, and build the result with multiple smaller passes rather than one extreme pass. If working on a stars-present image, keep `Protect Stars` enabled and watch star halos carefully.

## What are Refinement Passes?

Refinement Passes are editable sequential processing passes. `Base Pass` is usually where broad global work begins. Additional passes are best for targeted changes such as background control, halo cleanup, highlight-specific luminance shaping, or faint signal refinement.

They are not Photoshop layers. There are no blend modes and no opacity sliders. Passes are applied in order.

## What do probe, histogram, and polar plot do?

The probe samples a preview pixel and reports luminance, hue, and saturation. If hue is reliable, it can auto-select the nearest color band.

The histogram shows preview luminance distribution and helps place a Range Mask intelligently.

The polar plot shows hue angle and saturation radius for sampled preview pixels.

## What are mask views?

Mask views let you see what the current band, Range Mask, or combined mask is including. In general terms, white means strongly included and black means largely excluded.

In `Starless` mode, `Current Band Mask` and `Combined Mask` reflect any active selected-band Blur value.

Use mask views before strong saturation, luminance, or cleanup adjustments.

## Why can preview differ from final output?

Preview is based on downsampled data for speed and responsiveness. At high zoom levels, the tool can render a detail crop for the visible region. `Create Image` processes the full-resolution source.

Fine detail and microstructure can differ slightly, but the overall direction of the result should remain consistent with the preview.

## What is an adjustment set?

Adjustment sets are JSON settings files. They preserve passes, sliders, selected-band settings, Hue Radius, Feather, selected-band Blur values, Range Mask values, image type, sensitivity, and related adjustment state. Older adjustment sets with saved soften values load those values as Blur.

They are useful for repeatability, documentation, sharing, and complex multi-pass sessions.

## Create Image vs Apply to Target

`Create Image` is the safest primary output path. It writes the adjusted result to a new PixInsight image window and leaves the target unchanged.

`Apply to Target` writes the adjusted result back into the selected target image. PixInsight undo should normally be available, and an active PixInsight mask is respected, but this is still a more direct operation.

## Common mistakes

- Using the tool on linear data instead of nonlinear RGB.
- Making extreme hue shifts when a narrower, more targeted pass would be cleaner.
- Enabling Range Mask without checking mask views first.
- Doing highly targeted work in Base Pass instead of a new Refinement Pass.
- Trusting hue in neutral or low-saturation background regions.
- Using selected-band Blur as if it were star protection. It is only active for starless work.
- Forgetting that the preview is stale after changing controls.
- Using `Apply to Target` when a new output image would be safer.
- Treating band names as strict physical classifications instead of practical editing regions.

## Example workflows

### Boost faint blue reflection nebulosity

Start in Base Pass or a dedicated reflection pass. Increase Blue saturation modestly, inspect the mask view, then narrow Hue Radius if blue stars begin to move more than the nebula. Use Range Mask if you only want faint reflection structures and not the brightest highlights.

### Reduce magenta halos

Add a new Refinement Pass. Focus on Magenta and possibly Purple. Use a narrower Hue Radius and enough Feather to keep transitions smooth. If halos are mostly around bright stars, use Range Mask so the pass is concentrated in brighter zones.

### Darken or smooth neutral background

Work on the Luminance tab and use Neutral / Low-Saturation rather than a hue band. Enable Range Mask and target the dim background interval. Make a small luminance move, inspect the histogram and mask view, and keep the pass separate from broad color work.

### Conservative stars-present cleanup

Use Stars Present mode. Work with small saturation and hue changes, inspect Current Band Mask before strong edits, and use Range Mask if the change should avoid bright star cores.

### Starless nebula refinement before recombination

Use Starless mode. Add passes for broad nebula saturation, local cyan or red balance, and faint structure luminance. If a strong selected-band edit reveals a hard mask boundary, try `1 px` of Blur, inspect the mask view, and increase only as needed. Keep adjustments moderate if stars will be recombined later.
