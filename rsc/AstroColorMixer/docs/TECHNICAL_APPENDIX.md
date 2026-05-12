# Astro Color Mixer Technical Appendix

Version: `v0.9.4-beta`  
Date: `2026-05-12`

## 1. Introduction

This appendix describes the processing model used by Astro Color Mixer and the practical assumptions behind it. The tool is designed for nonlinear RGB astrophotography images and combines hue-band selection, luminance-range masking, low-saturation handling, probe-guided targeting, visible mask inspection, and sequential refinement passes.

The goal is not to claim physically perfect color reconstruction. The goal is to provide a controlled nonlinear RGB editing model that is useful for astrophotography finishing work.

An important design intent is that the tool protects stars while the user adjusts nebulae, dust, halos, galaxies, and background structures. It is not intended as a dedicated star-adjustment tool.

## 2. Design Goals

Astro Color Mixer is designed around the following goals:

- provide a near-realtime experience while adjusting hue, saturation, and luminance
- add an astro-specific enhancement model through tunable band selection and action
- allow users to probe image areas and use them as references for settings
- allow advanced Range Mask limitation of operations
- allow multiple targeted passes of adjustments

This makes the tool a finishing and refinement environment rather than a calibration or reconstruction framework.

## 3. Processing Assumptions

Astro Color Mixer assumes:

- nonlinear RGB input
- normalized floating-point RGB values in the range `0..1`
- the source image is normally not overwritten
- preview uses downsampled data for responsiveness
- final output uses full-resolution source data

The target/source image is only overwritten if the user explicitly requests **Apply to Target** at the end of the process.

These assumptions matter because the tool is intended for post-stretch, visually guided adjustment.

## 4. Preview, Navigation, and Interactive Diagnostics

The user experience is intentionally built around fast interactive iteration.

- preview is downsampled for responsiveness
- zoom, fit, and pan operate on the preview
- click-and-hold compare temporarily shows a reference state
- the **Compare** menu determines which reference is used
- the probe samples preview data and can auto-select a band
- histogram and polar plot visualize the current preview state
- mask views let the user inspect the active band mask, Range Mask, or combined mask while controls are being adjusted

This is important because Astro Color Mixer is not just a batch transform. It is designed to let the user steer the process visually and diagnostically in near realtime.

## 5. Image Type: Stars Present vs Starless / Star-Reduced

The Image Type setting selects protection behavior appropriate to the image being processed.

In **Stars Present** mode, Astro Color Mixer assumes the image still contains bright stellar structures, star cores, and possible halos. Protection is more conservative around bright star-like regions so large color or luminance moves are less likely to produce star-core distortion, oversaturated halos, or harsh highlight artifacts.

This should be understood as protection, not as an invitation to target stars directly as the main subject of editing.

In **Starless / Star-Reduced** mode, Astro Color Mixer assumes stars have already been removed or strongly reduced. Protection can therefore allow more freedom in nebulae, galaxies, dust, and faint structures.

This setting does **not** detect stars, remove stars, or create a star mask. It changes internal protection weighting during adjustment.

### 5A. Star Protection Mechanism

The star protection behavior is best understood as a weighting mechanism rather than a binary star-selection mask.

Conceptually, when **Stars Present** is selected:

- bright star-like regions receive more conservative color and luminance action
- highlight-heavy structures are less likely to undergo strong hue rotation or saturation forcing
- bright stellar cores and halo-adjacent structures are protected from more aggressive nonlinear moves

This is not intended to behave like a separate PixInsight StarMask process. It is an internal moderation mechanism that changes how strongly edits are allowed to act in bright stellar regions.

Its role is to reduce star damage while you work on the rest of the image. It is not a dedicated mechanism for shaping star color, star size, or star appearance as a primary goal.

## 6. Luminance Model

Astro Color Mixer uses the luminance model:

```text
Y = 0.2126 R + 0.7152 G + 0.0722 B
```

Luminance is used for:

- Range Mask construction
- preview diagnostics
- Neutral / Low-Saturation luminance control
- dark and highlight protection

In a nonlinear RGB workflow, luminance remains one of the most stable structural signals for targeted adjustment.

## 7. Hue and Saturation Selection

Hue and saturation are used for selection and adjustment behavior in an HSL-style sense.

Important properties:

- hue is circular
- hue distance must wrap at the ends of the angle domain
- low saturation makes hue unreliable

This is especially important in weak-color background, dust, and halo regions where nominal hue values can be unstable.

## 8. Astro Color Bands

Practical band centers:

- red `0°`
- orange `30°`
- yellow `60°`
- green `120°`
- cyan `180°`
- blue `240°`
- purple `275°`
- magenta `315°`

These bands are practical editing regions, not strict physical line assignments. Labels such as *H-alpha* and *OIII* are workflow cues intended to help users navigate common astrophotography color regions.

The actual selection mechanism used by each band is described in the following sections.

## 9. Hue Band Mask

Each active color band is built around circular hue distance from a band center.

- **Hue Radius** sets the outer affected angular radius on each side of the hue center
- **Feather** controls how much of that radius is used for falloff instead of full-strength influence
- a `smoothstep`-style falloff is used for soft selection boundaries

Conceptual pseudocode:

```text
distance = circularHueDistance(hue, center)
outerWidth = widthDeg
innerWidth = widthDeg * (1 - feather)
mask = 1 - smoothstep(innerWidth, outerWidth, distance)
```

This produces three practical regions that correspond to the language now shown in the application:

- **strong region**: `distance <= innerWidth`
- **feather region**: `innerWidth < distance < outerWidth`
- **unaffected hues**: `distance >= outerWidth`

So a setting such as `Hue Radius = 45°` and `Feather = 0.75` does **not** mean full-strength influence across the whole `±45°` span. Instead, the strong region occupies only the inner portion, and the feather region falls smoothly to zero by the outer radius.

This is why viewing the mask while adjusting Hue Radius and Feather is so important: the user can see the strong region and feather region directly instead of interpreting them only numerically.

## 10. Sensitivity

**Sensitivity** changes how assertively the tool responds to the selected signal.

Conceptually, it is a response-scaling control. It does not define a different color band, but it changes how strongly the selected structures react to the current H/S/L adjustment.

Practically, this lets the user choose between:

- more restrained action on already strong material
- more assertive action on weak or subtle material

It works together with the band mask and protection terms rather than replacing them.

## 11. Saturation Reliability

Low-saturation pixels do not provide reliable hue information. Astro Color Mixer therefore uses a saturation reliability term to reduce the chance of neutral background or weak-color dust being treated as a strong hue target.

This helps:

- avoid false hue selection in gray background
- reduce instability in weak-color halos
- support a separate neutral luminance path for low-saturation structures

## 12. Dark and Highlight Protection

Very dark pixels can be noisy or unstable. Very bright pixels can contain star cores, clipped highlights, or structures where strong hue rotation becomes visually harsh.

Astro Color Mixer therefore applies conceptual protection for:

- dark background
- bright highlights
- star-core and stars-present behavior

The Image Type mode influences how conservative these protections are.

## 13. Range Mask

Range Mask limits the effect of an adjustment by luminance.

```text
leftRamp = smoothstep(low - feather, low, Y)
rightRamp = 1 - smoothstep(high, high + feather, Y)
rangeMask = clamp01(leftRamp * rightRamp)
```

Interpretation:

- **Low** defines the lower shoulder of the included interval
- **High** defines the upper shoulder
- **Feather** softens both boundaries
- presets act as starting points rather than fixed answers

Because the image is nonlinear, the practical meaning of a luminance interval depends on the current stretch.

## 14. Neutral / Low-Saturation Model

For low-saturation pixels, Astro Color Mixer uses a neutral mask rather than assuming hue is trustworthy:

```text
neutralMask = 1 - smoothstep(satStart, satFull, saturation)
```

This is useful for:

- sky background
- gray dust
- weak-color halos
- neutral transition regions

The model is luminance-focused because those regions often need tonal shaping more than hue-specific color editing.

## 15. Chroma-Vector Adjustment

Astro Color Mixer uses a practical nonlinear RGB chroma-vector editing model.

Conceptually:

- separate a luminance-like neutral component from chroma
- saturation scales chroma magnitude
- hue shifts rotate chroma direction
- luminance changes the brightness component
- recombine and clamp to a valid RGB range

This should be understood as a practical nonlinear editing model, not a claim of perfect perceptual or physical color science.

## 16. Combined Mask

A band adjustment is influenced by multiple control terms. Approximate combined influence can be described as:

```text
finalMask =
  hueMask *
  saturationReliability *
  darkProtection *
  highlightProtection *
  rangeMask
```

If additional pass-specific terms are applied in code, they conceptually sit on top of this structure. The practical behavior is that hue selection, reliability, protection, and luminance gating combine before the edit is applied.

## 17. Probe, Compare, and Mask Inspection

The probe and comparison tools are central to how the user interacts with the model.

- the probe measures preview luminance, hue, and saturation
- probe placement also updates histogram and polar plot markers
- probe-based band auto-selection can move the user quickly to the relevant band
- click-and-hold compare lets the user evaluate changes against a reference
- the **Compare** menu controls which reference is shown
- mask preview modes reveal the band mask, Range Mask, or combined mask directly

Together, these tools let the user see both the image result and the selection logic behind the result.

## 18. Refinement Passes

Refinement Passes are sequential enabled passes stored in the working state.

Conceptually:

```text
working = original
for each enabled pass:
    working = applyPass(working, pass)
```

This supports workflows such as:

- broad global color setup first
- targeted background or halo cleanup later
- highlight or luminance-specific work in a separate pass

## 19. Preview and Diagnostics

Preview is based on downsampled image data for speed.

Diagnostics follow the preview model:

- histogram uses preview luminance
- polar plot uses sampled preview pixels
- probe reads preview coordinates
- mask views represent preview-resolution selection behavior

Final output operates on the full-resolution source image, which is why small local detail differences can exist even when the overall preview direction is accurate.

## 20. Output Model

Astro Color Mixer supports two output modes:

- **Create Image**: generates a new adjusted image and leaves the target unchanged
- **Apply to Target**: writes the adjusted result back into the current target image

If **Apply to Target** is used and the selected target image has an active PixInsight mask, that mask is respected during the writeback operation.

This means the tool is normally non-destructive by default, but can support an in-place PixInsight-style finishing workflow when requested explicitly.

## 21. Adjustment Set JSON

Adjustment Set JSON stores the working state of the tool. This can include:

- image type
- sensitivity
- pass ordering and enabled state
- band values
- hue radius and feather
- Range Mask state
- Neutral / Low-Saturation state
- related working settings

The file is intended for repeatability and workflow continuity rather than for diagnostic rendering.

## 22. Limitations

Important limitations:

- not intended for linear calibration
- extreme changes can create artifacts
- preview is approximate
- hue is unreliable in neutral areas
- Range Mask depends on the current stretch
- saturated star cores require care
- beta status means users should work non-destructively and inspect results carefully

## 23. Practical Guidance

- start with small adjustments
- inspect masks before strong edits
- use the probe instead of guessing when a color region is uncertain
- use the Compare menu to evaluate whether a change is genuinely helping
- create a new pass for targeted Range Mask work
- use **Stars Present** when unsure
- save Adjustment Sets for complex sessions

Astro Color Mixer works best when used deliberately, with the user checking both the visual preview and the diagnostic views before committing strong targeted changes.
