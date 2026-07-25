# Astro Color Mixer Changelog

## v0.9.7.12-beta

Packages the Astro Color Mixer script-menu icon using the same nested PixInsight script-icon resource method validated for Astro Contrast Enhancer.

Includes:

- `#feature-icon @script_icons_dir/AstroColorMixer/astro_color_mixer_24.png`
- bundled icon resource at `rsc/icons/script/AstroColorMixer/astro_color_mixer_24.png`
- removal of the previous flat and nested SVG icon package variants from the release zip

Unchanged:

- processing math
- masks, probe behavior, histogram and polar plot math
- recipes, preview behavior, passes, layout target sizes, and output behavior
- display scaling warning behavior from v0.9.7.11-beta

## v0.9.7.11-beta

Adds display workspace warnings for systems where PixInsight reports a workspace smaller than Astro Color Mixer's layout target.

Release basis:

- Built from v0.9.7.10-beta as the baseline release script.
- The release intentionally preserves v0.9.7.10-beta processing, preview, masks, probes, histogram/polar diagnostics, recipes, passes, layout target sizes, and output behavior.

Includes:

- Windows warning for constrained workspaces, with guidance for Windows Settings > System > Display > Scale
- explicit mention that Windows Scale may be above 100%, Recommended, or Auto
- macOS warning for constrained display workspaces, with guidance for System Settings > Displays
- updated FAQ, About text, and Technical Appendix content for display scaling/workspace troubleshooting
- package update to include the Astro Color Mixer script-menu icon at the flat PixInsight script icon path as well as the previous nested resource path

Unchanged:

- processing math
- masks, probe behavior, histogram and polar plot math
- recipes, preview behavior, passes, layout target sizes, and output behavior

## v0.9.3-beta

First beta distribution package.

Includes:

- H/S/L Color Mixer
- Neutral / Low-Saturation luminance
- Selected Band width/feather
- Stars Present and Starless image modes
- Range Mask
- Refinement Passes
- preview viewport
- mask views
- histogram
- polar plot
- probe
- pass viewer
- Adjustment Set save/load
- Apply to New Image
- bundled documentation and starter PIDoc source

Known beta limitations:

- preview uses downsampled data
- documentation PIDoc integration is preliminary
- UI may vary by platform/display scaling
- user feedback requested
