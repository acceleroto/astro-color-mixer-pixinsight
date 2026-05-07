# Astro Color Mixer FAQ & Practical Guide

Astro Color Mixer is a nonlinear RGB color and luminance refinement tool for astrophotography. It is designed for images that have already been calibrated, integrated, color balanced, and stretched. It is not a substitute for calibration or linear processing; it is a finishing tool for controlled color-band, luminance-range, and multi-pass refinement.

## 1. What is Astro Color Mixer?

Astro Color Mixer is a nonlinear RGB color and luminance refinement tool built around practical astro editing bands, targeted masking, preview diagnostics, and sequential refinement passes.

It is especially useful for:

- emission nebula color shaping
- reflection nebulosity enhancement
- galaxy core and dust refinement
- halo cleanup
- neutral background luminance control
- targeted cleanup through multiple passes

The tool always creates a new output image instead of overwriting the active source image.

## 2. Where does it fit in a PixInsight workflow?

Astro Color Mixer is a **post-stretch refinement tool**.

Use it after:

- calibration
- registration and integration
- background correction
- color calibration
- nonlinear stretch
- any early noise reduction or contrast work that belongs before finishing color

Its normal role is controlled final refinement, not broad upstream correction.

## 3. What kind of image should I use?

Use a **nonlinear RGB** image.

Good candidates:

- stretched RGB images with stars present
- starless RGB images
- star-reduced RGB images

Avoid using it on:

- raw linear stacks
- data that still needs core calibration or major global correction

Preview is downsampled for speed, but final Apply to New Image processes full-resolution data.

## 4. What is Stars Present vs Starless / Star-Reduced?

The **Image Type** setting changes how Astro Color Mixer protects the image during adjustment.

**Stars Present** is the safer mode for images that still contain normal stars, bright cores, and halos. It uses more conservative protection around bright stellar structures so color or luminance edits are less likely to create damaged star cores, exaggerated halos, or harsh highlight artifacts.

**Starless / Star-Reduced** is intended for images where stars have already been removed or strongly reduced. Since fewer bright stellar features remain, the tool can act more freely on nebulae, galaxies, dust, and faint structures.

This setting does **not** remove stars. It does **not** create a star mask. It only changes protection behavior during adjustment.

## 5. What is the basic workflow?

1. Open a nonlinear RGB image.
2. Choose **Image Type**.
3. Start with **Base Pass**.
4. Make broad H/S/L changes.
5. Use the probe, histogram, and polar plot to understand the current target.
6. Refine the selected hue family with Width and Feather.
7. Use Range Mask for luminance-specific targeting.
8. Add new Refinement Passes for targeted work.
9. Inspect preview and mask views.
10. Apply to New Image.
11. Save an Adjustment Set if the session should be preserved.

## 6. What are the color bands?

- **Red / H-alpha**: broad red emission and warm red structure control
- **Orange / Dust & Galaxy Cores**: warm dust and core-toned shaping
- **Yellow / Warm Stars**: warm stellar color and gold transitions
- **Green / Cast Control**: green cast cleanup or restrained green restoration
- **Cyan / OIII**: cyan-turquoise emission work
- **Blue / Reflection Nebula**: reflection nebulosity and blue structures
- **Purple / Violet Cleanup**: violet drift and blue-violet transition cleanup
- **Magenta / Halo Cleanup**: magenta halo and magenta artifact cleanup

These are practical editing regions, not strict physical emission-line labels.

## 7. What do Hue, Saturation, and Luminance do?

- **Hue** rotates color direction inside the active band.
- **Saturation** strengthens or weakens color intensity inside the active band.
- **Luminance** brightens or darkens the active band.

These adjustments apply to the currently active pass, which is why broad work and targeted work are often separated into different passes.

## 8. What are Width and Feather?

Width and Feather control how the active color band is selected.

- **Width** determines how broad the selected hue family is.
- **Feather** determines how softly the selection falls off into neighboring hues.

Practical guidance:

- narrow Width for selective edits
- wider Width for broader color-family edits
- lower Feather for firmer boundaries
- higher Feather for smoother transitions

## 9. What is Range Mask?

Range Mask is a luminance-based selector applied within the active pass.

Controls:

- **Low** defines the lower luminance boundary
- **High** defines the upper luminance boundary
- **Feather** softens both edges
- **Presets** provide starting points for common luminance regions

It is useful for:

- dim background work
- faint-signal emphasis
- highlight targeting
- bright core control
- star-region cleanup

## 10. What is Neutral / Low-Saturation?

When saturation is very low, hue becomes unreliable. Astro Color Mixer therefore provides a Neutral / Low-Saturation luminance path for weak-color material.

This is useful for:

- sky background
- gray dust
- low-color halos
- neutral transition regions
- structures where hue-specific editing would be misleading

## 11. What are Refinement Passes?

Refinement Passes are ordered adjustment passes.

Typical use:

- **Base Pass** for broad/global work
- later passes for targeted cleanup or luminance-specific shaping

They are **not** Photoshop layers:

- no blend modes
- no pass opacity control
- passes apply sequentially in order

## 12. What does the probe do?

The probe samples a preview pixel and reports:

- luminance
- hue
- saturation

It also:

- places markers on the histogram and polar plot
- helps identify what part of the image is being measured
- can auto-select the nearest color band when hue is reliable

## 13. What are the histogram and polar plot showing?

### Histogram

The histogram shows preview luminance distribution. When Range Mask is active, it helps visualize the brightness interval being targeted.

### Polar Plot

The polar plot shows hue angle and saturation radius for sampled preview pixels. It is a fast diagnostic view of how color is distributed in the current preview.

## 14. What are mask views?

Mask views show what the current adjustment is affecting.

Typical interpretation:

- **white** = included strongly
- **black** = excluded strongly

Mask views can display:

- selected band influence
- Range Mask influence
- combined influence

These views are especially helpful before strong halo cleanup, narrow-band targeting, or background shaping.

## 15. Why can preview differ from final output?

Preview uses downsampled data so the tool stays responsive.

Final **Apply to New Image** processes full-resolution data, which means:

- tiny local details can differ slightly
- overall edit direction should still match
- stale preview can mislead unless refreshed

## 16. What are Adjustment Sets?

Adjustment Sets are JSON files that store the working state of the tool.

They can preserve:

- pass order and enabled state
- H/S/L band values
- selected band behavior
- Width and Feather
- Range Mask settings
- Neutral / Low-Saturation settings
- image type and related tool state

They are useful for repeatability, documentation, testing, and returning to complex sessions later.

## 17. Common mistakes

- using the tool on linear data
- making excessive hue shifts where smaller targeted passes would be safer
- changing Range Mask inside an existing global pass unintentionally
- ignoring the mask preview before strong edits
- expecting hue to be meaningful in neutral background
- forgetting that preview may be stale after changes

## 18. Example workflows

### A. Faint blue reflection nebulosity lift

1. Start in Base Pass or create a dedicated reflection pass.
2. Increase **Blue / Reflection Nebula** saturation modestly.
3. Inspect the band mask.
4. Reduce Width if blue stars are moving more than the nebulosity.
5. Use Range Mask if the goal is faint blue structure rather than highlights.

### B. Magenta halo cleanup

1. Create a new Refinement Pass.
2. Work mainly in **Magenta / Halo Cleanup**, with **Purple / Violet Cleanup** if needed.
3. Use narrower Width and enough Feather to keep the transition smooth.
4. Use Range Mask if the artifact is concentrated in brighter star-adjacent regions.

### C. Neutral background luminance control with Range Mask

1. Use the **Luminance** tab.
2. Work through **Neutral / Low-Saturation** rather than a hue band.
3. Enable Range Mask and target the dim background interval.
4. Make a small luminance adjustment.
5. Inspect the histogram and combined mask before increasing strength.
6. Keep this separate from the broad color pass so the workflow stays understandable.
