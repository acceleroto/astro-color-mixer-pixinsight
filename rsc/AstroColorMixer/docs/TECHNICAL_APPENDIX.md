# Astro Color Mixer Technical Appendix

This appendix describes the processing model used by Astro Color Mixer. It is both a technical overview and a compact white paper for the tool. Astro Color Mixer is designed for nonlinear RGB astrophotography images and combines hue-band selection, luminance-range masking, low-saturation handling, protection weighting, preview diagnostics, and sequential refinement passes.

## 1. Design goals

Astro Color Mixer is designed for controlled nonlinear RGB color refinement.

Primary goals:

- provide practical astrophotography-specific color bands
- avoid arbitrary global color swings
- expose masks and diagnostics before committing changes
- support broad and targeted refinements through ordered passes
- protect unstable dark, bright, and low-saturation regions
- preserve a non-destructive workflow by creating a new output image by default

## 2. Processing assumptions

- input is nonlinear RGB
- values are normalized internally to `0..1`
- source image is not overwritten by the primary output workflow
- preview uses a downsampled representation for responsiveness
- `Create Image` uses the full-resolution source image
- adjustments are intended as post-stretch refinements, not calibration operations

High-level pipeline:

```text
source RGB
  -> preview/full-resolution working copy
  -> enabled pass loop
  -> band and neutral masks
  -> chroma/luminance adjustment
  -> clamp
  -> output image
```

## 3. Luminance model

Astro Color Mixer uses a Rec. 709 style luminance estimate:

```text
Y = 0.2126 R + 0.7152 G + 0.0722 B
```

Luminance is used as a practical structural guide for Range Masking, diagnostics, neutral luminance handling, and dark/highlight protection. In a nonlinear astrophotography workflow, luminance remains one of the most useful stable signals for selecting where an edit should be allowed to act.

## 4. Hue and saturation model

Hue and saturation are used for selection and editing. Hue is circular, so distances are measured around a wrapped `0..360` degree space.

Low saturation makes hue unreliable, especially in backgrounds, halos, dust transitions, and weak-color structures. Selected bands therefore use circular hue distance, while saturation reliability reduces false confidence in very low-saturation regions.

## 5. Astro color bands

The color bands are practical editing regions:

- red: `0 deg`
- orange: `30 deg`
- yellow: `60 deg`
- green: `120 deg`
- cyan: `180 deg`
- blue: `240 deg`
- purple: `275 deg`
- magenta: `315 deg`

Labels such as H-alpha and OIII are workflow cues to help the user think about common astrophotography structures. They are not claims that every selected pixel belongs to a pure emission-line source.

## 6. Image Type

Astro Color Mixer uses `Image Type` to choose protection behavior appropriate to the image being processed.

`Stars Present` assumes the image still contains stellar profiles, bright cores, and possible halos. The protection model is more conservative around high-luminance structures. This reduces the risk of color shifts in star cores, over-saturation around halos, or harsh luminance changes in bright stellar features.

`Starless / Star-Reduced` assumes stars have been removed or substantially reduced. The protection model can allow more freedom in nebular, galactic, dust, and faint-signal regions because fewer bright stellar features are present.

This setting affects mask construction and protection weighting. It does not perform star detection, star removal, or explicit star masking.

## 7. Hue band mask

Each band is centered on a hue angle. `Hue Radius` defines the outer affected span around that center, and `Feather` defines the soft transition beyond the stronger inner region. A smoothstep-style transition is used so the mask rolls off gradually rather than clipping abruptly.

Pseudo formula:

```text
distance = circularHueDistance(hue, center)
mask = 1 - smoothstep(innerWidth, outerWidth, distance)
```

A higher Feather value makes the transition softer and reduces abrupt color boundaries.

## 7A. Selected Band spatial softening

Selected Band Soften is an optional spatial blur applied to the active band's final mask. It is not part of hue selection itself, and it is not a luminance Range Mask control.

The distinction is important:

- Feather softens selection as hue distance approaches the edge of the selected band.
- Range Mask Feather softens luminance inclusion at the low and high range boundaries.
- Selected Band Soften smooths the already-built band mask across neighboring image pixels.

The implementation uses modest whole-pixel radii only: `Off`, `1 px`, `2 px`, `3 px`, `4 px`, or `5 px`. This is intended to reduce visible mask-edge artifacts when a strong adjustment is used on starless or strongly star-reduced data.

Selected Band Soften is gated by Image Type. It is applied only when Image Type is `Starless / Star-Reduced`. In `Stars Present` mode, saved soften values are ignored by the processing path because spatially blurring a color mask can leak adjustments into star cores, halos, and adjacent stellar structures.

Conceptual sequence for a band adjustment:

```text
rawBandMask = hueMask * saturationReliability * protection * rangeMask
if imageType == starless and selectedBandSoften > 0:
    workingBandMask = spatialBlur(rawBandMask, selectedBandSoften)
else:
    workingBandMask = rawBandMask
```

Current Band Mask and Combined Mask preview modes show the softened mask only when the soften value is active. Range Mask preview remains a luminance-only diagnostic and is not spatially softened.

## 8. Saturation reliability

Very low-saturation pixels do not carry stable hue information. Astro Color Mixer therefore uses a saturation reliability term to reduce false hue selection in neutral areas.

This prevents weakly colored background pixels from being treated like confidently blue, magenta, or green structures. The Neutral / Low-Saturation luminance control provides a separate path for those pixels.

## 9. Dark and highlight protection

Very dark pixels can be noisy and unstable. Very bright pixels often include star cores, clipped highlights, or structures where strong hue changes can look unnatural quickly.

The tool includes dark and highlight protection terms, and the chosen image type changes the behavior so stars-present and starless workflows can be handled differently.

These terms are guardrails, not substitutes for user judgment. Strong edits can still create artifacts if the selected mask is too broad or the adjustment is too large.

## 10. Range Mask

Range Mask limits the effect of a pass by luminance. `Low` and `High` define the included range, while `Feather` softens the shoulders at each edge.

Formula:

```text
leftRamp = smoothstep(low - feather, low, Y)
rightRamp = 1 - smoothstep(high, high + feather, Y)
rangeMask = clamp01(leftRamp * rightRamp)
```

Presets are practical starting points, not fixed answers. The correct luminance interval depends on the current stretch and the imaging target.

## 11. Neutral / Low-Saturation adjustment

For low-saturation pixels, Astro Color Mixer uses a neutral mask rather than pretending hue is stable.

Formula:

```text
neutralMask = 1 - smoothstep(satStart, satFull, saturation)
```

This is useful when editing sky background, gray dust, faint halos, or other structures where a hue-based chroma edit is not the right model. In practice, this behaves as luminance shaping for pixels whose hue is not trustworthy.

Neutral adjustment appears on the Luminance tab because it is not a hue-band chroma edit.

## 12. Chroma-vector adjustment model

The processing model is practical rather than marketed as mathematically perfect color science. Conceptually, RGB is separated into a luminance-like neutral component and a chroma component.

- saturation edits scale chroma magnitude
- hue edits rotate chroma direction
- luminance edits modify the brightness component
- the result is recombined and clamped back into a valid nonlinear RGB range

This model is useful for post-stretch astrophotography because it gives intuitive control over perceived color families while retaining luminance-aware selection and protection.

## 13. Combined mask

For a band adjustment, the final influence is approximately the product of several control terms:

```text
finalMask =
  hueMask *
  saturationReliability *
  darkProtection *
  highlightProtection *
  rangeMask *
  pass terms
```

The exact implementation details follow the actual code path, but conceptually the tool combines hue selection, saturation reliability, luminance gating, and protection terms before the adjustment is applied.

If Selected Band Soften is active, the band mask is spatially softened after these selection terms are combined and before the hue, saturation, or luminance adjustment is applied. This means Soften changes the edge behavior of the selection mask, not the color math itself.

For Neutral / Low-Saturation luminance adjustment, the neutral mask replaces hue selection as the main inclusion term. Range Mask and protection weighting can still limit where the neutral adjustment is allowed to act.

## 14. Refinement Passes

The adjustment set contains ordered passes. Enabled passes are applied sequentially, and each pass works on the result produced by the previous enabled pass.

Pseudo sequence:

```text
working = original
for each enabled pass:
    working = applyPass(working, pass)
```

Passes are not layers. There are no blend modes and no opacity slider. A later enabled pass receives the already-adjusted result of earlier enabled passes.

## 15. Preview and diagnostics

Preview uses a downsampled image so the tool remains responsive. Histogram calculations use preview luminance. The polar plot uses sampled preview pixels. The probe reads preview pixels. At high zoom, detail crop preview can render the visible region from source pixels.

`Create Image` uses the full-resolution source data, which is why small local differences can appear even when the broad preview match is strong.

Diagnostics are decision aids:

- Current Band Mask shows hue-band inclusion, including active selected-band Soften in Starless / Star-Reduced mode
- Range Mask shows luminance-range inclusion
- Combined Mask shows the active selection stack, including active selected-band Soften in Starless / Star-Reduced mode
- Histogram helps place luminance ranges
- Polar Plot shows hue and saturation distribution
- Probe reports local luminance, hue, saturation, and nearest reliable band

## 16. Adjustment set model

Adjustment sets are stored as JSON and preserve important editing state:

- image type
- sensitivity
- pass order
- enabled/disabled pass state
- band settings
- Hue Radius and Feather
- selected-band Soften values
- Range Mask configuration
- neutral luminance terms

Diagnostic readouts are interactive session tools and are not the main purpose of the saved adjustment-set file. Adjustment sets are intended for repeatability, review, documentation, and sharing.

## 17. Output model

`Create Image` builds a new PixInsight image from the full-resolution source and the current adjustment set. This is the preferred non-destructive output path.

`Apply to Target` writes the adjusted result back to the selected target image and respects the active PixInsight mask. It is useful for deliberate in-place work, but the safer exploratory workflow is to create a new image first.

## 18. Limitations

- not intended for linear calibration
- extreme adjustments can create artifacts
- hue is unreliable in neutral pixels
- preview is approximate because it is downsampled
- Range Mask behavior depends on the current stretch
- saturated stars and bright cores may need careful handling
- user judgment is still required

## 19. Practical guidance

- start with small adjustments
- preview masks before strong edits
- use a new pass for targeted work
- avoid using Range Mask to reinterpret finished global work unless that is intentional
- save adjustment sets for complex sessions
