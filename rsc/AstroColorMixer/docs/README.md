# Astro Color Mixer for PixInsight

*Nonlinear RGB color refinement for astrophotography*

## Overview

Astro Color Mixer is a PixInsight script for nonlinear RGB color and luminance refinement in astrophotography. It is built for the finishing stage of image processing, where the goal is not calibration or broad correction, but controlled work on practical astro color regions, luminance ranges, and targeted refinement passes.

Core capabilities include:

- color-band Hue, Saturation, and Luminance adjustment
- Neutral / Low-Saturation luminance control
- Selected Band width and feather shaping
- Range Mask targeting
- sequential Refinement Passes
- preview diagnostics, mask views, and probe sampling
- histogram and polar plot analysis
- Adjustment Set save/load as JSON
- non-destructive output to a new image

## Intended Input

Astro Color Mixer is intended for:

- nonlinear RGB images
- images that have already been calibrated and integrated
- images that have already gone through background correction and color calibration
- images that have already been stretched

It is not intended for:

- raw linear integration output
- calibration work
- broad early-stage color correction

The tool supports both **Stars Present** and **Starless / Star-Reduced** workflows.

## Basic Workflow

1. Open a nonlinear RGB image.
2. Choose **Image Type**: **Stars Present** or **Starless / Star-Reduced**.
3. Start with **Base Pass**.
4. Use H/S/L color sliders for broad adjustments.
5. Use the probe, histogram, and polar plot to understand the image.
6. Use Selected Band width and feather to refine color selection.
7. Use Range Mask for luminance-targeted work.
8. Add Refinement Passes for targeted adjustments.
9. Use Preview, mask views, and Original/Adjusted comparison.
10. Apply to New Image.
11. Save an Adjustment Set if useful.

## Major Tool Areas

### Color Mixer

The main color mixer provides Hue, Saturation, and Luminance controls for practical astro color bands. This is where most broad nonlinear color refinement begins.

### Neutral / Low-Saturation

Low-saturation pixels often do not carry reliable hue information. The Neutral / Low-Saturation luminance path provides a safer way to shape sky background, gray dust, halos, and weak-color structures.

### Selected Band

Selected Band controls define which hue region is being emphasized. Width determines how broad the selected hue family is, while Feather controls how softly the effect falls off into neighboring colors.

### Range Mask

Range Mask limits an adjustment by luminance. It can be used to isolate dim background, faint signal, midtones, highlights, bright cores, or star regions inside the active pass.

### Refinement Passes

Refinement Passes are sequential editable passes. Base Pass usually handles broad work, while later passes can isolate targeted cleanup, background shaping, or highlight control.

### Preview and Mask Views

Preview allows fast inspection of the current working state. Mask views show band selection, Range Mask gating, or combined influence so users can evaluate what an edit is affecting before applying it.

### Histogram / Polar Plot / Probe

The histogram summarizes preview luminance and helps with Range Mask placement. The polar plot shows hue angle and saturation distribution. The probe samples the preview and reports luminance, hue, saturation, and band alignment.

### Adjustment Sets

Adjustment Sets store the working JSON state of the tool, including passes, sliders, Selected Band settings, Range Mask configuration, and related controls.

## Stars Present vs Starless / Star-Reduced

Astro Color Mixer includes an **Image Type** setting because stars and starless images respond differently to color refinement.

Use **Stars Present** when the image still contains normal stars, bright stellar cores, or visible halos. This mode is more conservative around bright star-like structures so strong color and luminance moves are less likely to create damaged cores, aggressive halo coloration, or harsh highlight artifacts.

Use **Starless / Star-Reduced** when stars have been removed or strongly reduced before color work. This mode allows the tool to act more freely on nebulae, galaxies, dust, and faint structures because fewer bright stellar features need protection.

This setting does **not** remove stars and does **not** create a star mask. It changes protection behavior during color-band and luminance adjustments.

## Known Limitations

- not intended for linear calibration
- extreme hue or saturation changes can create artifacts
- preview uses downsampled data for responsiveness
- Range Mask depends on the current stretch
- low-saturation pixels have unreliable hue
- this is beta software; save work and rely on output-to-new-image behavior

## Installation

Current beta installation paths:

- manual ZIP install through **Script > Execute Script**
- repository installation later, once `updates.xri` is validated

Bundled documentation is included under:

`rsc/AstroColorMixer/docs/`

## Version

**v0.9.3-beta**
