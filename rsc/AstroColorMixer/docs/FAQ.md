# Astro Color Mixer FAQ & Practical Guide

Version: `v0.9.4-beta`  
Date: `2026-05-12`

Astro Color Mixer is a nonlinear RGB color and luminance refinement tool for astrophotography. It is designed for images that have already been calibrated, integrated, color balanced, and stretched. It is not a substitute for calibration or linear processing; it is a finishing tool for controlled color-band, luminance-range, and multi-pass refinement.

It is designed to protect stars while you refine nebulae, dust, halos, galaxies, and background structures, but it is not intended to be a dedicated tool for adjusting stars themselves.

## 1. What is Astro Color Mixer?

Astro Color Mixer is a nonlinear RGB color and luminance refinement tool built around practical astro editing bands, targeted masking, preview diagnostics, and sequential refinement passes.

It is especially useful for:

- emission nebula color shaping
- reflection nebulosity enhancement
- galaxy core and dust refinement
- halo cleanup
- neutral background luminance control
- targeted cleanup through multiple passes

## 2. What are the design goals?

Astro Color Mixer is built around a few practical goals:

- provide a near-realtime experience while adjusting hue, saturation, and luminance
- add astro-specific enhancement through tunable band selection and action
- let the user probe areas of the image and use those areas as references for settings
- allow advanced Range Mask limitation of operations
- allow multiple targeted passes of adjustments

The intent is not to replace earlier PixInsight processing stages. The intent is to provide a fast, targeted nonlinear finishing environment.

## 3. What does the tool assume about the source image?

Astro Color Mixer assumes:

- a nonlinear RGB source image
- a source image that has already gone through the core preprocessing and stretch workflow
- visually guided finishing work rather than calibration work

By default, the source image is not overwritten. The normal safe workflow is to create a new adjusted image. The source image is only overwritten if the user explicitly chooses **Apply to Target** at the end of the process.

## 4. Where does it fit in a PixInsight workflow?

Astro Color Mixer is a **post-stretch refinement tool**.

Use it after:

- calibration
- registration and integration
- background correction
- color calibration
- nonlinear stretch
- any early noise reduction or contrast work that belongs before finishing color

Its normal role is controlled final refinement, not broad upstream correction.

## 5. What kind of image should I use?

Use a **nonlinear RGB** image.

Good candidates:

- stretched RGB images with stars present
- starless RGB images
- star-reduced RGB images

Avoid using it on:

- raw linear stacks
- data that still needs core calibration or major global correction

Preview is downsampled for speed, but final output runs on full-resolution image data.

## 5A. What is Stars Present vs Starless / Star-Reduced?

The **Image Type** setting changes how Astro Color Mixer protects the image during adjustment.

**Stars Present** is the safer mode for images that still contain normal stars, bright cores, and halos. It applies more conservative protection around bright stellar structures so color or luminance edits are less likely to create damaged star cores, exaggerated halos, or harsh highlight artifacts.

That protection is intentional, but Astro Color Mixer should not be thought of as a star-editing tool. It is intended to keep stars from being damaged while you work on surrounding or overlapping structures.

Mechanically, this is not a separate star-removal process and not a classic PixInsight star mask. It is an internal protection behavior that reduces how aggressively strong edits act in bright star-like regions and highlight structures.

**Starless / Star-Reduced** is intended for images where stars have already been removed or strongly reduced. Since fewer bright stellar features remain, the tool can act more freely on nebulae, galaxies, dust, and faint structures.

This setting does **not** remove stars. It does **not** create a star mask. It changes protection behavior during adjustment.

## 6. How does the preview and interface workflow work?

The tool is designed to stay visually responsive while you work.

- preview uses downsampled image data for speed
- final output uses full-resolution data
- preview can be zoomed, fit, and panned
- click-and-hold compare lets you temporarily inspect a reference while staying in the working preview
- the **Compare** menu controls which reference the click-and-hold action uses
- mask views let you inspect how the current selected band, Range Mask, or combined selection is behaving

This means the preview is intended for fast decision-making, while final output is where the full-resolution result is produced.

It also means the safest mental model is: use Astro Color Mixer to refine the image while protecting stars, not to treat stars as the primary target of adjustment.

## 7. What does the probe do?

The probe samples a preview pixel and reports:

- luminance
- hue
- saturation

It also:

- places markers on the histogram and polar plot
- helps identify what part of the image is being measured
- can auto-select the nearest color band when hue is reliable

This is especially useful when you want to tune a problem area by measuring it directly instead of guessing which band it belongs to.

## 8. What are the color bands?

- **Red / H-alpha**: broad red emission and warm red structure control
- **Orange / Dust & Galaxy Cores**: warm dust and core-toned shaping
- **Yellow / Warm Stars**: warm stellar color and gold transitions
- **Green / Cast Control**: green cast cleanup or restrained green restoration
- **Cyan / OIII**: cyan-turquoise emission work
- **Blue / Reflection Nebula**: reflection nebulosity and blue structures
- **Purple / Violet Cleanup**: violet drift and blue-violet transition cleanup
- **Magenta / Halo Cleanup**: magenta halo and magenta artifact cleanup

These are practical editing regions, not strict physical emission-line labels. The underlying selection mechanism is described in the following sections.

## 9. What do Hue, Saturation, and Luminance do?

- **Hue** rotates color direction inside the active band
- **Saturation** strengthens or weakens color intensity inside the active band
- **Luminance** brightens or darkens the active band

These adjustments apply to the currently active pass, which is why broad work and targeted work are often separated into different passes.

## 10. What is Sensitivity?

**Sensitivity** changes how assertively Astro Color Mixer responds to the selected signal.

In practice, it affects how strongly the tool responds to the chosen color or luminance structures. Lower sensitivity is more restrained. Higher sensitivity makes the same adjustment values act more aggressively.

This is useful when:

- a subtle image needs more response
- a bright or already strong image needs gentler control
- you want the same band setup to behave more conservatively or more actively

## 11. What are Hue Radius and Feather?

Hue Radius and Feather control how the active color band is selected.

- **Hue Radius** sets the outer limit on each side of the hue center
- **Feather** determines how quickly the selection falls from the strong region to that outer limit

The current mask model has three practical regions:

- a **strong region** near the hue center
- a **feather region** between the strong region and the outer radius
- **unaffected hues** outside the outer radius

So if **Hue Radius = 45°** and **Feather = 0.75**, the affected range reaches `±45°`, but full-strength influence occupies only the inner part of that span. The rest is a smooth feathered falloff.

Practical guidance:

- lower Hue Radius for more selective edits
- higher Hue Radius for a broader color-family reach
- lower Feather for firmer boundaries
- higher Feather for smoother transitions

The app now shows this explicitly through the Selected Band readout and profile display, so you can see the strong region and feather region while adjusting them.

## 12. Why are the mask views important?

The ability to view the masks while adjusting **Hue Radius** and **Feather** is one of the most powerful parts of the tool.

Mask views show what the current adjustment is affecting.

Typical interpretation:

- **white** = included strongly
- **black** = excluded strongly

Mask views can display:

- selected band influence
- Range Mask influence
- combined influence

These views are especially helpful before strong halo cleanup, narrow-band targeting, or background shaping.

## 13. What is Range Mask?

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

The exact mechanism is described in the Technical Appendix, but practically it acts as a luminance gate layered on top of the band selection.

## 14. What is Neutral / Low-Saturation?

When saturation is very low, hue becomes unreliable. Astro Color Mixer therefore provides a Neutral / Low-Saturation luminance path for weak-color material.

This is useful for:

- sky background
- gray dust
- low-color halos
- neutral transition regions
- structures where hue-specific editing would be misleading

## 15. What are Refinement Passes?

Refinement Passes are ordered adjustment passes.

Typical use:

- **Base Pass** for broad/global work
- later passes for targeted cleanup or luminance-specific shaping

They are **not** Photoshop layers:

- no blend modes
- no pass opacity control
- passes apply sequentially in order

This allows broad first-pass shaping followed by much more selective targeted corrections.

## 16. What are the histogram and polar plot showing?

### Histogram

The histogram shows preview luminance distribution. When Range Mask is active, it helps visualize the brightness interval being targeted.

### Polar Plot

The polar plot shows hue angle and saturation radius for sampled preview pixels. It is a fast diagnostic view of how color is distributed in the current preview.

The probe reticle and plot markers are meant to help you connect what you see in the image with what the diagnostics are reporting.

## 17. What does the Compare menu do?

The **Compare** menu controls what click-and-hold temporarily shows while you inspect the preview.

Depending on the current mode and pass state, it can compare against:

- the original image
- the most useful prior state
- the last pass when appropriate

This helps you judge whether a change is improving the image or just moving it.

## 18. What are the output options?

Astro Color Mixer supports two main output paths:

- **Create Image**: creates a new adjusted image and leaves the target unchanged
- **Apply to Target**: writes the adjusted result back into the current target image

If **Apply to Target** is used and the target image has an active PixInsight mask, that mask is respected during the apply operation.

In addition, mask images can be viewed directly in the preview area while you work, which is often the safest way to validate a targeted adjustment before committing it.

## 19. Why can preview differ from final output?

Preview uses downsampled data so the tool stays responsive.

Final output processes full-resolution data, which means:

- tiny local details can differ slightly
- overall edit direction should still match
- stale preview can mislead unless refreshed

## 20. What are Adjustment Sets?

Adjustment Sets are JSON files that store the working state of the tool.

They can preserve:

- pass order and enabled state
- H/S/L band values
- selected band behavior
- Hue Radius and Feather
- Range Mask settings
- Neutral / Low-Saturation settings
- image type and related tool state

They are useful for repeatability, documentation, testing, and returning to complex sessions later.

## 21. Common mistakes

- using the tool on linear data
- making excessive hue shifts where smaller targeted passes would be safer
- changing Range Mask inside an existing global pass unintentionally
- ignoring the mask preview before strong edits
- expecting hue to be meaningful in neutral background
- forgetting that preview may be stale after changes
- forgetting to use the probe and compare tools when tuning difficult problem areas

## 22. Example workflows

### A. Faint blue reflection nebulosity lift

1. Start in Base Pass or create a dedicated reflection pass.
2. Increase **Blue / Reflection Nebula** saturation modestly.
3. Inspect the band mask.
4. Reduce **Hue Radius** if blue stars are moving more than the nebulosity.
5. Use Range Mask if the goal is faint blue structure rather than highlights.

### B. Magenta halo cleanup

1. Create a new Refinement Pass.
2. Work mainly in **Magenta / Halo Cleanup**, with **Purple / Violet Cleanup** if needed.
3. Use a narrower **Hue Radius** and enough Feather to keep the transition smooth.
4. Use mask views to confirm the selection.
5. Use Range Mask if the artifact is concentrated in brighter star-adjacent regions.

### C. Neutral background luminance control with Range Mask

1. Use the **Luminance** tab.
2. Work in **Neutral / Low-Saturation**.
3. Enable **Range Mask**.
4. Use the histogram and mask views to confine the action to the intended luminance region.
5. Make small luminance changes and compare against the original.
