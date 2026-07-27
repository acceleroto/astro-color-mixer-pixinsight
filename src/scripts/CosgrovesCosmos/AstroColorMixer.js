#iflt __PI_VERSION__ 01.09.04

#feature-id    Cosgrove's Cosmos > Astro Color Mixer
#feature-icon  @script_icons_dir/AstroColorMixer/astro_color_mixer_24.png
#feature-info  Astro Color Mixer requires PixInsight 1.9.4 or newer.

console.criticalln("Astro Color Mixer requires PixInsight 1.9.4 or newer. This installed PixInsight version is too old to run the V8 JavaScript engine required by this script. Please update PixInsight and try again.");
throw new Error("Astro Color Mixer requires PixInsight 1.9.4 or newer.");

#else

#engine v8

#feature-id    Cosgrove's Cosmos > Astro Color Mixer
#feature-icon  @script_icons_dir/AstroColorMixer/astro_color_mixer_24.png
#feature-info  Astro Color Mixer v0.9.7.13-beta. Script menu icon restore.

/*
 * Astro Color Mixer for PixInsight
 *
 * Beta build:
 * Astro Color Mixer v0.9.7.13-beta
 */

#include <pjsr/UndoFlag.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/DataType.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/BitmapFormat.jsh>
#include <pjsr/ColorSpace.jsh>
#include <pjsr/SampleType.jsh>

CoreApplication.ensureMinimumVersion( 1, 9, 4 );

function showMessage(text, title, icon) {
   (new MessageBox(text, title || "Astro Color Mixer v0.9.7.13-beta", icon || StdIcon_Information, StdButton_Ok)).execute();
}

var acmHelpHostDialog = null;

function showHelpTopic(title, text) {
   if (acmHelpHostDialog && typeof acmHelpHostDialog.showInlineHelp === "function") {
      acmHelpHostDialog.showInlineHelp("default", title, text);
      return;
   }
   showMessage(text, title || "Astro Color Mixer Help", StdIcon_Information);
}

function fail(text) {
   console.criticalln(text);
   showMessage(text, "Astro Color Mixer v0.9.7.13-beta", StdIcon_Error);
   var error = new Error(text);
   error.__acmHandled = true;
   throw error;
}

function acmFormatScreenSizeForWarning(size) {
   if (!size)
      return "unavailable";
   return Math.round(size.width || 0) + " x " + Math.round(size.height || 0);
}

var ACM_GRAY_UI_THEME = {
   window: 0xff353535,
   header: 0xff2f2f2f,
   panel: 0xff404040,
   panelInset: 0xff303030,
   passViewer: 0xffd8d8d8,
   line: 0xff747474,
   text: "#f2f2f2",
   muted: "#d2d2d2",
   darkText: "#161616",
   accent: "#d8dcff"
};

function acmThemeRichText(text, color, bold) {
   var value = String(text || "");
   var wrapped = "<color=" + (color || ACM_GRAY_UI_THEME.text) + ">" + value + "</color>";
   return bold ? "<b>" + wrapped + "</b>" : wrapped;
}

function acmThemeColorToArgb(color, fallbackArgb) {
   var value = String(color || "");
   if (value.charAt(0) === "#" && value.length === 7) {
      var parsed = parseInt(value.substring(1), 16);
      if (!isNaN(parsed))
         return 0xff000000 | parsed;
   }
   return fallbackArgb == null ? 0xfff2f2f2 : fallbackArgb;
}

function acmSetThemeLabel(label, text, color, bold) {
   if (!label)
      return;
   label.useRichText = true;
   label.text = acmThemeRichText(text, color, bold);
   label.foregroundColor = color === ACM_GRAY_UI_THEME.darkText ? 0xff161616 : 0xfff2f2f2;
   label.textColor = label.foregroundColor;
}

function acmSetGoldTitleLabel(label, text) {
   if (!label)
      return;
   label.useRichText = true;
   label.text = acmThemeRichText(text, "#ffc43a", true);
   label.foregroundColor = 0xffffc43a;
   label.textColor = 0xffffc43a;
}

function acmRethemeLabelText(label, color, bold) {
   if (!label)
      return;
   var text = String(label.text || "");
   text = text.replace(/<color=[^>]+>/g, "").replace(/<\/color>/g, "");
   if (text.length > 0)
      acmSetThemeLabel(label, text, color || ACM_GRAY_UI_THEME.text, !!bold);
}

function acmApplyLightText(control) {
   if (!control)
      return;
   control.foregroundColor = 0xfff2f2f2;
   control.textColor = 0xfff2f2f2;
}

function acmPlainLightLabel(label, text) {
   if (!label)
      return;
   label.useRichText = false;
   label.text = String(text || "");
   acmApplyLightText(label);
}

function acmParkHiddenControl(control) {
   if (!control)
      return;
   try {
      control.text = "";
   } catch (e1) {
   }
   try {
      control.visible = false;
   } catch (e2) {
   }
   try {
      control.hide();
   } catch (e3) {
   }
   try {
      control.setFixedSize(1, 1);
   } catch (e4) {
   }
}

function acmStripRichTags(text) {
   return String(text || "").replace(/<[^>]*>/g, "");
}

function acmNowMs() {
   return (new Date()).getTime();
}

function acmFormatElapsedSeconds(startMs, endMs) {
   var elapsed = Math.max(0, (endMs == null ? acmNowMs() : endMs) - startMs) / 1000;
   return elapsed.toFixed(elapsed >= 10 ? 1 : 2) + " s";
}

function acmFormatImageTypeForUser(imageType) {
   return imageType === "starless" ? "Starless" : "Stars Present";
}

function acmFormatMaskModeForUser(maskMode) {
   if (maskMode === "BandMask")
      return "Band Mask";
   if (maskMode === "RangeMask")
      return "Range Mask";
   if (maskMode === "StarProtectionMask")
      return "Star Protection Mask";
   if (maskMode === "CombinedMask")
      return "Combined Mask";
   return String(maskMode || "Mask");
}

function acmFlushUi() {
   try {
      if (typeof CoreApplication !== "undefined" && CoreApplication && typeof CoreApplication.processEvents === "function")
         CoreApplication.processEvents();
   } catch (e1) {
   }
   try {
      if (console && typeof console.flush === "function")
         console.flush();
   } catch (e2) {
   }
}

function acmHistogramSubtitleText(rangeMaskEnabled) {
   if (ACM_HOST_IS_WINDOWS)
      return "\u00b7 Luminance";
   return "\u00b7 Preview luminance";
}

function acmPlainDarkLabel(label, text) {
   if (!label)
      return;
   label.useRichText = false;
   label.text = String(text || "");
   label.foregroundColor = 0xff161616;
   label.textColor = 0xff161616;
}

function acmSetThemePanel(control, fillArgb, borderArgb) {
   if (!control)
      return;
   control.acmThemeFill = fillArgb;
   control.acmThemeBorder = borderArgb;
   control.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(this.acmThemeBorder || ACM_GRAY_UI_THEME.line);
      g.brush = new Brush(this.acmThemeFill || ACM_GRAY_UI_THEME.panel);
      g.drawRect(this.boundsRect);
      g.end();
   };
}

function acmCreateHelpButton(parent, title, text, helpKey) {
   var button = new Control(parent);
   button.acmHelpTitle = title;
   button.acmHelpText = text;
   button.acmHelpKey = helpKey || "default";
   button.toolTip = title;
   button.setFixedSize(20, 20);
   button.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0xff8e92a0);
      g.brush = new Brush(0xff55575d);
      g.drawRect(this.boundsRect);
      var f = new Font;
      f.pixelSize = 13;
      f.bold = true;
      g.font = f;
      var tw = g.font.width("?");
      var x = Math.round((this.width - tw) * 0.5);
      var y = Math.round((this.height + g.font.ascent - g.font.descent) * 0.5);
      g.pen = new Pen(0xfff2f2f2);
      g.drawText(x, y, "?");
      g.end();
   };
   button.onMousePress = function() {
      if (acmHelpHostDialog && typeof acmHelpHostDialog.showInlineHelp === "function")
         acmHelpHostDialog.showInlineHelp(this.acmHelpKey, title, text, this);
   };
   button.onMouseRelease = function() {
      if (acmHelpHostDialog && typeof acmHelpHostDialog.hideInlineHelp === "function")
         acmHelpHostDialog.hideInlineHelp();
   };
   return button;
}

function acmCreateTinyDeleteButton(parent, toolTip, onDelete) {
   var button = new Control(parent);
   button.toolTip = toolTip;
   button.setFixedSize(12, 12);
   button.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0xff8e92a0);
      g.brush = new Brush(0xff55575d);
      g.drawRect(this.boundsRect);
      g.pen = new Pen(0xfff2f2f2, 2);
      g.drawLine(3, 3, this.width - 4, this.height - 4);
      g.drawLine(this.width - 4, 3, 3, this.height - 4);
      g.end();
   };
   button.onMousePress = function() {
      if (typeof onDelete === "function")
         onDelete();
   };
   return button;
}

function acmCreateHelpBox(parent) {
   var box = new Control(parent);
   box.titleLabel = new Label(box);
   acmSetThemeLabel(box.titleLabel, "", ACM_GRAY_UI_THEME.text, true);
   box.titleLabel.textAlignment = TextAlign_Left|TextAlign_Top;
   box.bodyLabel = new Label(box);
   box.bodyLabel.wordWrapping = true;
   box.bodyLabel.useRichText = false;
   box.bodyLabel.textAlignment = TextAlign_Left|TextAlign_Top;
   box.bodyLabel.text = "";
   acmApplyLightText(box.bodyLabel);
   box.sizer = new VerticalSizer;
   box.sizer.margin = 6;
   box.sizer.spacing = 2;
   box.sizer.add(box.titleLabel);
   box.sizer.add(box.bodyLabel);
   box.bodyLabel.minWidth = 220;
   box.scaledMinWidth = 240;
   box.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(ACM_GRAY_UI_THEME.line);
      g.brush = new Brush(0xff464646);
      g.drawRect(this.boundsRect);
      g.end();
   };
   box.hide();
   return box;
}

function acmEstimateWrappedTextHeight(text, width, lineHeight, minimumHeight) {
   var lines = String(text || "").split("\n");
   var charWidth = ACM_HOST_IS_WINDOWS ? 6 : 7;
   var wrapChars = Math.max(24, Math.floor(Math.max(120, width || 220) / charWidth));
   var visualLines = 0;
   for (var i = 0; i < lines.length; ++i)
      visualLines += Math.max(1, Math.ceil(lines[i].length / wrapChars));
   var padding = ACM_HOST_IS_WINDOWS ? 28 : 4;
   return Math.max(minimumHeight || 32, visualLines * (lineHeight || 17) + padding);
}

function acmGetOptionalDialogRect(dialog, propertyName) {
   if (!dialog)
      return null;
   try {
      return (propertyName in dialog) ? dialog[propertyName] : null;
   } catch (ex) {
      return null;
   }
}

function acmGetDialogAvailableScreenSize(dialog) {
   var candidates = [
      acmGetOptionalDialogRect(dialog, "availableScreenRect"),
      acmGetOptionalDialogRect(dialog, "availableScreenBounds"),
      acmGetOptionalDialogRect(dialog, "availableRect"),
      acmGetOptionalDialogRect(dialog, "screenRect"),
      acmGetOptionalDialogRect(dialog, "screenBounds")
   ];
   for (var i = 0; i < candidates.length; ++i) {
      var rect = candidates[i];
      if (rect && typeof rect.width === "number" && typeof rect.height === "number" && rect.width > 0 && rect.height > 0)
         return { width: rect.width, height: rect.height };
   }
   return null;
}

function acmGetSmallDisplayWorkspaceWarning(dialog) {
   var screenSize = acmGetDialogAvailableScreenSize(dialog);
   if (!screenSize)
      return null;
   var width = Math.round(screenSize.width || 0);
   var height = Math.round(screenSize.height || 0);
   var isWindows = acmHostIsWindows();
   var warn = isWindows ? (width < 1700 || height < 900) : (width < 1360 || height < 780);
   if (!warn)
      return null;

   var text;
   if (isWindows) {
      text = "Astro Color Mixer detected a small Windows display workspace.\n\n";
      text += "PixInsight reports the available screen workspace as " + acmFormatScreenSizeForWarning(screenSize) + ", which is smaller than this tool's Windows layout target. This often happens when the Windows operating system is using Display Scaling above 100%, Recommended, or Auto.\n\n";
      text += "If the Astro Color Mixer window is clipped, too large, or cannot be resized, change this in Windows:\n\n";
      text += "Windows Settings > System > Display > Scale\n\n";
      text += "Set Scale to 100%, then restart PixInsight and run Astro Color Mixer again.\n\n";
      text += "This is a Windows operating system display setting. It is not a PixInsight setting and not an Astro Color Mixer setting.";
      return {
         title: "Astro Color Mixer Display Scaling Notice",
         text: text,
         platform: "Windows",
         width: width,
         height: height
      };
   }

   text = "Astro Color Mixer detected a small macOS display workspace.\n\n";
   text += "PixInsight reports the available screen workspace as " + acmFormatScreenSizeForWarning(screenSize) + ", which may be smaller than this tool's Mac layout target. This can happen when macOS display scaling is set to a mode that provides less screen space.\n\n";
   text += "If the Astro Color Mixer window is clipped, too large, or cannot be resized, change this in macOS:\n\n";
   text += "System Settings > Displays\n\n";
   text += "Choose a setting that provides more screen space, then restart PixInsight and run Astro Color Mixer again.\n\n";
   text += "This is a macOS display setting. It is not a PixInsight setting and not an Astro Color Mixer setting.";
   return {
      title: "Astro Color Mixer Display Scaling Notice",
      text: text,
      platform: "macOS",
      width: width,
      height: height
   };
}

function acmShowSmallDisplayWorkspaceWarningIfNeeded(dialog) {
   var warning = acmGetSmallDisplayWorkspaceWarning(dialog);
   if (!warning)
      return false;
   console.writeln("");
   console.writeln("Astro Color Mixer display workspace warning:");
   console.writeln(warning.platform + " available screen workspace reported by PixInsight: " + warning.width + " x " + warning.height);
   if (warning.platform === "Windows") {
      console.writeln("If the window is clipped or cannot be resized, check Windows Settings > System > Display > Scale.");
      console.writeln("Set Scale to 100%, especially if Scale is above 100%, Recommended, or Auto.");
      console.writeln("This is a Windows operating system display setting, not a PixInsight or Astro Color Mixer setting.");
   } else {
      console.writeln("If the window is clipped or cannot be resized, check System Settings > Displays and choose a setting that provides more screen space.");
      console.writeln("This is a macOS display setting, not a PixInsight or Astro Color Mixer setting.");
   }
   showMessage(warning.text, warning.title, StdIcon_Warning);
   return true;
}

function acmGetControlPositionRelativeToDialog(control, dialog) {
   var x = 0;
   var y = 0;
   var current = control;
   while (current && current !== dialog) {
      if (current.boundsRect) {
         x += current.boundsRect.x0;
         y += current.boundsRect.y0;
      }
      current = current.parent;
   }
   return { x: x, y: y };
}

function acmConfigureResponsiveDialogBounds(dialog) {
   var isWindows = acmHostIsWindows();
   var safeMargin = isWindows ? 48 : 72;
   var targetMinWidth = isWindows ? 1680 : 1240;
   var targetMinHeight = isWindows ? 820 : 900;
   var defaultWidth = isWindows ? 2220 : 2000;
   var defaultHeight = isWindows ? 1180 : 940;
   var screenSize = acmGetDialogAvailableScreenSize(dialog);
   var minWidth = targetMinWidth;
   var minHeight = targetMinHeight;
   var width = defaultWidth;
   var height = defaultHeight;

   if (screenSize) {
      minWidth = Math.max(isWindows ? 1440 : 1120, Math.min(targetMinWidth, screenSize.width - safeMargin));
      minHeight = Math.max(720, Math.min(targetMinHeight, screenSize.height - safeMargin));
      width = Math.max(minWidth, Math.min(defaultWidth, screenSize.width - safeMargin));
      height = Math.max(minHeight, Math.min(defaultHeight, screenSize.height - safeMargin));
   }

   dialog.setMinWidth(minWidth);
   dialog.setMinHeight(minHeight);
   if (typeof dialog.resize === "function")
      dialog.resize(width, height);

   dialog.acmMinDialogWidth = minWidth;
   dialog.acmMinDialogHeight = minHeight;
   dialog.acmDefaultDialogWidth = width;
   dialog.acmDefaultDialogHeight = height;
}

var ACM_WINDOW_SIZE_SETTINGS_PREFIX = "AstroColorMixer/windowSize/v103_release_09711/";
var ACM_LEGACY_WINDOW_SIZE_SETTINGS_PREFIX = "AstroColorMixer/windowSize/v10/";
var ACM_OLDER_WINDOW_SIZE_SETTINGS_PREFIX = "AstroColorMixer/windowSize/v9/";
var ACM_OLDEST_WINDOW_SIZE_SETTINGS_PREFIX = "AstroColorMixer/windowSize/v7/";
var ACM_ANCIENT_WINDOW_SIZE_SETTINGS_PREFIX = "AstroColorMixer/windowSize/v6/";
var ACM_PREHISTORIC_WINDOW_SIZE_SETTINGS_PREFIX = "AstroColorMixer/windowSize/v5/";
var ACM_PRIMORDIAL_WINDOW_SIZE_SETTINGS_PREFIX = "AstroColorMixer/windowSize/v4/";
var ACM_FIRST_WINDOW_SIZE_SETTINGS_PREFIX = "AstroColorMixer/windowSize/v3/";
var ACM_ORIGINAL_WINDOW_SIZE_SETTINGS_PREFIX = "AstroColorMixer/windowSize/v2/";
var ACM_INITIAL_WINDOW_SIZE_SETTINGS_PREFIX = "AstroColorMixer/windowSize/v1/";

function acmSavedSizeKeyForPrefix(prefix, mode, suffix) {
   return prefix + (mode === "compact" ? "compact" : "standard") + suffix;
}

function acmSavedSizeKey(mode, suffix) {
   return acmSavedSizeKeyForPrefix(ACM_WINDOW_SIZE_SETTINGS_PREFIX, mode, suffix);
}

function acmReadSavedWindowSize(mode) {
   try {
      var w = Settings.read(acmSavedSizeKey(mode, "Width"), DataType_Int32);
      var h = Settings.read(acmSavedSizeKey(mode, "Height"), DataType_Int32);
      if (typeof w === "number" && typeof h === "number" && w > 0 && h > 0)
         return { width: w, height: h };
   } catch (ex) {
   }
   return null;
}

function acmWriteSavedWindowSize(mode, width, height) {
   try {
      Settings.write(acmSavedSizeKey(mode, "Width"), DataType_Int32, Math.round(width));
      Settings.write(acmSavedSizeKey(mode, "Height"), DataType_Int32, Math.round(height));
      return true;
   } catch (ex) {
   }
   return false;
}

function acmResetSavedWindowSizes() {
   try {
      Settings.remove(ACM_WINDOW_SIZE_SETTINGS_PREFIX);
      Settings.remove(ACM_LEGACY_WINDOW_SIZE_SETTINGS_PREFIX);
      Settings.remove(ACM_OLDER_WINDOW_SIZE_SETTINGS_PREFIX);
      Settings.remove(ACM_OLDEST_WINDOW_SIZE_SETTINGS_PREFIX);
      Settings.remove(ACM_ANCIENT_WINDOW_SIZE_SETTINGS_PREFIX);
      Settings.remove(ACM_PREHISTORIC_WINDOW_SIZE_SETTINGS_PREFIX);
      Settings.remove(ACM_PRIMORDIAL_WINDOW_SIZE_SETTINGS_PREFIX);
      Settings.remove(ACM_FIRST_WINDOW_SIZE_SETTINGS_PREFIX);
      Settings.remove(ACM_ORIGINAL_WINDOW_SIZE_SETTINGS_PREFIX);
      Settings.remove(ACM_INITIAL_WINDOW_SIZE_SETTINGS_PREFIX);
      return true;
   } catch (ex) {
   }
   try {
      Settings.remove(acmSavedSizeKey("standard", "Width"));
      Settings.remove(acmSavedSizeKey("standard", "Height"));
      Settings.remove(acmSavedSizeKey("compact", "Width"));
      Settings.remove(acmSavedSizeKey("compact", "Height"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_LEGACY_WINDOW_SIZE_SETTINGS_PREFIX, "standard", "Width"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_LEGACY_WINDOW_SIZE_SETTINGS_PREFIX, "standard", "Height"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_LEGACY_WINDOW_SIZE_SETTINGS_PREFIX, "compact", "Width"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_LEGACY_WINDOW_SIZE_SETTINGS_PREFIX, "compact", "Height"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_OLDER_WINDOW_SIZE_SETTINGS_PREFIX, "standard", "Width"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_OLDER_WINDOW_SIZE_SETTINGS_PREFIX, "standard", "Height"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_OLDER_WINDOW_SIZE_SETTINGS_PREFIX, "compact", "Width"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_OLDER_WINDOW_SIZE_SETTINGS_PREFIX, "compact", "Height"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_OLDEST_WINDOW_SIZE_SETTINGS_PREFIX, "standard", "Width"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_OLDEST_WINDOW_SIZE_SETTINGS_PREFIX, "standard", "Height"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_OLDEST_WINDOW_SIZE_SETTINGS_PREFIX, "compact", "Width"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_OLDEST_WINDOW_SIZE_SETTINGS_PREFIX, "compact", "Height"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_ANCIENT_WINDOW_SIZE_SETTINGS_PREFIX, "standard", "Width"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_ANCIENT_WINDOW_SIZE_SETTINGS_PREFIX, "standard", "Height"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_ANCIENT_WINDOW_SIZE_SETTINGS_PREFIX, "compact", "Width"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_ANCIENT_WINDOW_SIZE_SETTINGS_PREFIX, "compact", "Height"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_PREHISTORIC_WINDOW_SIZE_SETTINGS_PREFIX, "standard", "Width"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_PREHISTORIC_WINDOW_SIZE_SETTINGS_PREFIX, "standard", "Height"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_PREHISTORIC_WINDOW_SIZE_SETTINGS_PREFIX, "compact", "Width"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_PREHISTORIC_WINDOW_SIZE_SETTINGS_PREFIX, "compact", "Height"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_PRIMORDIAL_WINDOW_SIZE_SETTINGS_PREFIX, "standard", "Width"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_PRIMORDIAL_WINDOW_SIZE_SETTINGS_PREFIX, "standard", "Height"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_PRIMORDIAL_WINDOW_SIZE_SETTINGS_PREFIX, "compact", "Width"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_PRIMORDIAL_WINDOW_SIZE_SETTINGS_PREFIX, "compact", "Height"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_FIRST_WINDOW_SIZE_SETTINGS_PREFIX, "standard", "Width"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_FIRST_WINDOW_SIZE_SETTINGS_PREFIX, "standard", "Height"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_FIRST_WINDOW_SIZE_SETTINGS_PREFIX, "compact", "Width"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_FIRST_WINDOW_SIZE_SETTINGS_PREFIX, "compact", "Height"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_ORIGINAL_WINDOW_SIZE_SETTINGS_PREFIX, "standard", "Width"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_ORIGINAL_WINDOW_SIZE_SETTINGS_PREFIX, "standard", "Height"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_ORIGINAL_WINDOW_SIZE_SETTINGS_PREFIX, "compact", "Width"));
      Settings.remove(acmSavedSizeKeyForPrefix(ACM_ORIGINAL_WINDOW_SIZE_SETTINGS_PREFIX, "compact", "Height"));
      return true;
   } catch (ex2) {
   }
   return false;
}

function acmClampWindowSize(dialog, width, height, minWidth, minHeight) {
   var w = Math.max(minWidth, Math.round(width));
   var h = Math.max(minHeight, Math.round(height));
   var screenSize = acmGetDialogAvailableScreenSize(dialog);
   if (screenSize) {
      if (screenSize.width > w + 48)
         w = Math.min(w, Math.max(minWidth, screenSize.width - 48));
      if (screenSize.height > h + 72)
         h = Math.min(h, Math.max(minHeight, screenSize.height - 72));
   }
   return { width: w, height: h };
}

function acmDefaultWindowSizeForMode(dialog, mode) {
   var compact = mode === "compact";
   if (compact) {
      return {
         width: ACM_HOST_IS_WINDOWS ? 1700 : 1360,
         height: ACM_HOST_IS_WINDOWS ? 980 : 780
      };
   }
   return {
      width: dialog.acmDefaultDialogWidth || (ACM_HOST_IS_WINDOWS ? 2220 : 2000),
      height: dialog.acmDefaultDialogHeight || (ACM_HOST_IS_WINDOWS ? 1040 : 940)
   };
}

function acmSavedWindowSizeIsSaneForMode(mode, size) {
   if (!size)
      return false;
   if (mode === "compact") {
      if (ACM_HOST_IS_WINDOWS)
         return size.width >= 1700 && size.width <= 2400 && size.height >= 980 && size.height <= 1260;
      return size.width >= 1360 && size.width <= 2400 && size.height >= 780 && size.height <= 1200;
   }
   return size.width >= 1200 && size.height >= 820;
}

function acmCreateInfoBox(parent) {
   var box = new Control(parent);
   box.visible = false;
   box.hide();
   box.currentKind = "";

   box.titleLabel = new Label(box);
   acmSetThemeLabel(box.titleLabel, "Info", ACM_GRAY_UI_THEME.text, true);

   box.closeButton = new PushButton(box);
   box.closeButton.text = "x";
   box.closeButton.setFixedSize(18, 18);

   box.bodyLabel = new Label(box);
   box.bodyLabel.wordWrapping = true;
   box.bodyLabel.useRichText = false;
   box.bodyLabel.textAlignment = TextAlign_Left|TextAlign_Top;
    box.bodyLabel.minWidth = 380;
   box.bodyLabel.text = "";
   acmApplyLightText(box.bodyLabel);

   var headerRow = new HorizontalSizer;
   headerRow.spacing = 6;
   headerRow.add(box.titleLabel);
   headerRow.addStretch();
   headerRow.add(box.closeButton);

   box.sizer = new VerticalSizer;
   box.sizer.margin = 8;
   box.sizer.spacing = 6;
   box.sizer.add(headerRow);
   box.sizer.add(box.bodyLabel, 100);
   box.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(ACM_GRAY_UI_THEME.line);
      g.brush = new Brush(0xff464646);
      g.drawRect(this.boundsRect);
      g.end();
   };
   return box;
}

console.writeln("<end><cbr><br><b>Astro Color Mixer v0.9.7.13-beta</b>");

// -------------------------------------------------------------------------
// Minimal copied core logic
// -------------------------------------------------------------------------
//
// This script copies the minimum required portable functions from:
// - core/color-bands.js
// - core/parameters.js
// - core/range-mask.js
// - core/color-math.js
// - core/neutral-luminance.js
// - core/pass-engine.js
//
// The current /core uses ES module imports, which are not directly reusable
// by PJSR without an additional loader layer. This script keeps the copied core
// minimal while preserving recipe compatibility in PixInsight.

var ACM_EPSILON = 1e-6;
var ACM_POSITIVE_LUMINANCE_GAIN = 0.55;
var ACM_SQRT3 = Math.sqrt(3);
var ACM_AXIS = [1 / ACM_SQRT3, 1 / ACM_SQRT3, 1 / ACM_SQRT3];
var ACM_SWATCH_WIDTH = 10;
var ACM_ROW_LABEL_WIDTH = 0;
var ACM_ROW_EDIT_WIDTH = 38;
var ACM_ROW_RESET_WIDTH = 34;
var ACM_ROW_SPACING = 2;
var ACM_MIXER_LABEL_WIDTH = 84;
var ACM_MIXER_SLIDER_MIN_WIDTH = 252;

function acmHostIsWindows() {
   try {
      var tempPath = String(File.systemTempDirectory || "");
      return /^[A-Za-z]:/.test(tempPath) || tempPath.indexOf("\\") >= 0;
   } catch (error) {
      return false;
   }
}

var ACM_HOST_IS_WINDOWS = acmHostIsWindows();

var ACM_PROTECTION_PRESETS = {
   stars: {
      satFloor: 0.05,
      satFull: 0.25,
      darkFloor: 0.04,
      darkFull: 0.18,
      highlightStart: 0.7,
      highlightFull: 0.95
   },
   starless: {
      satFloor: 0.03,
      satFull: 0.18,
      darkFloor: 0.02,
      darkFull: 0.12,
      highlightStart: 0.85,
      highlightFull: 0.98
   }
};

var ACM_SENSITIVITY_RANGES = {
   Fine: { hueShift: 5, saturation: 15, luminance: 10 },
   Normal: { hueShift: 20, saturation: 60, luminance: 30 },
   Advanced: { hueShift: 45, saturation: 100, luminance: 60 },
   Strong: { hueShift: 45, saturation: 100, luminance: 60 }
};

var ACM_NEUTRAL_SENSITIVITY_RANGES = {
   Fine: 5,
   Normal: 20,
   Advanced: 50,
   Strong: 50
};

var ACM_BAND_DEFS = [
   { id: "red", center: 0, label: "Red / H-alpha", shortLabel: "Red", color: "#db534b" },
   { id: "orange", center: 30, label: "Orange / Galaxy Cores", shortLabel: "Orange", color: "#d8872f" },
   { id: "yellow", center: 60, label: "Yellow / Warm Stars", shortLabel: "Yellow", color: "#d8c43f" },
   { id: "green", center: 120, label: "Green / Cast Control", shortLabel: "Green", color: "#3ba05a" },
   { id: "cyan", center: 180, label: "Cyan / OIII", shortLabel: "Cyan", color: "#39b7b5" },
   { id: "blue", center: 240, label: "Blue / Reflection Nebula", shortLabel: "Blue", color: "#4a76d4" },
   { id: "purple", center: 275, label: "Purple / Violet Cleanup", shortLabel: "Purple", color: "#7a61d7" },
   { id: "magenta", center: 315, label: "Magenta / Halo Cleanup", shortLabel: "Magenta", color: "#cb4ca8" }
];

function acmCreateBandDefaults() {
   var bands = [];
   for (var i = 0; i < ACM_BAND_DEFS.length; ++i) {
      var band = ACM_BAND_DEFS[i];
      bands.push({
         id: band.id,
         center: band.center,
         label: band.label,
         color: band.color,
         hueShift: 0,
         saturation: 0,
         luminance: 0,
         width: 45,
         feather: 0.75,
         maskSoftenRadius: 0
      });
   }
   return bands;
}

function acmFindBandDefById(bandId) {
   for (var i = 0; i < ACM_BAND_DEFS.length; ++i)
      if (ACM_BAND_DEFS[i].id === bandId)
         return ACM_BAND_DEFS[i];
   return null;
}

function acmCreateDefaultNeutralLuminance() {
   return {
      luminance: 0,
      satStart: 0.04,
      satFull: 0.16
   };
}

function acmCreateDefaultRangeMask() {
   return {
      enabled: false,
      low: 0.0,
      high: 1.0,
      feather: 0.10,
      preset: "All",
      maskSoftenRadius: 0,
      boostEnabled: false
   };
}

function acmCreateDefaultProtectionControls() {
   return {
      protectStars: true,
      protectLowSaturation: true,
      starMaskStrength: "Strong"
   };
}

function acmEffectiveProtectionControls(protectionControls, imageType) {
   var source = protectionControls || acmCreateDefaultProtectionControls();
   return {
      protectStars: imageType === "starless" ? false : source.protectStars !== false,
      protectLowSaturation: source.protectLowSaturation !== false,
      starMaskStrength: acmNormalizeStarMaskStrength(source.starMaskStrength)
   };
}

function acmCreateDefaultMaskSoften() {
   return {
      radius: 0.0
   };
}

function acmClamp(value, minValue, maxValue) {
   return Math.min(maxValue, Math.max(minValue, value));
}

function acmClamp01(value) {
   return acmClamp(value, 0, 1);
}

function acmSmoothstep(edge0, edge1, x) {
   if (Math.abs(edge1 - edge0) < ACM_EPSILON)
      return x >= edge1 ? 1 : 0;
   var t = acmClamp01((x - edge0) / (edge1 - edge0));
   return t * t * (3 - 2 * t);
}

function acmRgbToHsl(r, g, b) {
   var maxValue = Math.max(r, g, b);
   var minValue = Math.min(r, g, b);
   var l = (maxValue + minValue) * 0.5;

   if (Math.abs(maxValue - minValue) < ACM_EPSILON)
      return [0, 0, l];

   var d = maxValue - minValue;
   var s = l > 0.5 ? d / (2 - maxValue - minValue) : d / (maxValue + minValue);
   var h = 0;

   if (maxValue === r)
      h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
   else if (maxValue === g)
      h = ((b - r) / d + 2) * 60;
   else
      h = ((r - g) / d + 4) * 60;

   return [h % 360, s, l];
}

function acmLuma709(r, g, b) {
   return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function acmComputeStretchAnalysis(sourceRgb, width, height) {
   if (!sourceRgb || width <= 0 || height <= 0)
      return null;

   var pixelCount = width * height;
   var maxSamples = 12000;
   var step = Math.max(1, Math.floor(pixelCount / maxSamples));
   var values = [];

   for (var i = 0; i < pixelCount; i += step) {
      var j = i * 3;
      values.push(acmLuma709(sourceRgb[j], sourceRgb[j + 1], sourceRgb[j + 2]));
   }

   if (values.length < 16)
      return null;

   values.sort(function(a, b) { return a - b; });

   function percentile(p) {
      var index = Math.round((values.length - 1) * p);
      return values[Math.max(0, Math.min(values.length - 1, index))];
   }

   var median = percentile(0.50);
   var p95 = percentile(0.95);
   var p99 = percentile(0.99);

   return {
      median: median,
      p95: p95,
      p99: p99,
      likelyLinear: median < 0.035 && p95 < 0.18 && p99 < 0.45
   };
}

function acmApplySourceHsl(sourceRgb, width, height) {
   var count = width * height;
   var h = new Float32Array(count);
   var s = new Float32Array(count);
   var l = new Float32Array(count);
   var y = new Float32Array(count);

   for (var i = 0; i < count; ++i) {
      var base = i * 3;
      var r = sourceRgb[base];
      var g = sourceRgb[base + 1];
      var b = sourceRgb[base + 2];
      var maxValue = Math.max(r, g, b);
      var minValue = Math.min(r, g, b);
      var lightness = (maxValue + minValue) * 0.5;
      var hue = 0;
      var saturation = 0;
      var d = maxValue - minValue;
      if (Math.abs(d) >= ACM_EPSILON) {
         saturation = lightness > 0.5 ? d / (2 - maxValue - minValue) : d / (maxValue + minValue);
         if (maxValue === r)
            hue = ((g - b) / d + (g < b ? 6 : 0)) * 60;
         else if (maxValue === g)
            hue = ((b - r) / d + 2) * 60;
         else
            hue = ((r - g) / d + 4) * 60;
         hue = hue % 360;
      }
      h[i] = hue;
      s[i] = saturation;
      l[i] = lightness;
      y[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
   }

   return { h: h, s: s, l: l, y: y };
}

function acmBandMaskAnalysisRadius(imageType) {
   return 2;
}

function acmBoxBlurRgb(sourceRgb, width, height, radius) {
   var r = Math.round(radius || 0);
   if (r <= 0 || width <= 1 || height <= 1)
      return sourceRgb;

   var count = width * height;
   var temp = new Float32Array(count * 3);
   var output = new Float32Array(count * 3);

   for (var y = 0; y < height; ++y) {
      for (var x = 0; x < width; ++x) {
         var rSum = 0;
         var gSum = 0;
         var bSum = 0;
         var samples = 0;
         var x0 = Math.max(0, x - r);
         var x1 = Math.min(width - 1, x + r);
         for (var sx = x0; sx <= x1; ++sx) {
            var sampleBase = (y * width + sx) * 3;
            rSum += sourceRgb[sampleBase];
            gSum += sourceRgb[sampleBase + 1];
            bSum += sourceRgb[sampleBase + 2];
            ++samples;
         }
         var base = (y * width + x) * 3;
         var denom = Math.max(1, samples);
         temp[base] = rSum / denom;
         temp[base + 1] = gSum / denom;
         temp[base + 2] = bSum / denom;
      }
   }

   for (var yy = 0; yy < height; ++yy) {
      var y0 = Math.max(0, yy - r);
      var y1 = Math.min(height - 1, yy + r);
      for (var xx = 0; xx < width; ++xx) {
         var rSumY = 0;
         var gSumY = 0;
         var bSumY = 0;
         var samplesY = 0;
         for (var sy = y0; sy <= y1; ++sy) {
            var sampleBaseY = (sy * width + xx) * 3;
            rSumY += temp[sampleBaseY];
            gSumY += temp[sampleBaseY + 1];
            bSumY += temp[sampleBaseY + 2];
            ++samplesY;
         }
         var outBase = (yy * width + xx) * 3;
         var denomY = Math.max(1, samplesY);
         output[outBase] = acmClamp01(rSumY / denomY);
         output[outBase + 1] = acmClamp01(gSumY / denomY);
         output[outBase + 2] = acmClamp01(bSumY / denomY);
      }
   }

   return output;
}

function acmComputeBandMaskAnalysisHsl(sourceRgb, width, height, imageType) {
   var radius = acmBandMaskAnalysisRadius(imageType);
   if (radius <= 0)
      return acmApplySourceHsl(sourceRgb, width, height);
   return acmApplySourceHsl(acmBoxBlurRgb(sourceRgb, width, height, radius), width, height);
}

function acmCircularHueDistance(h1, h2) {
   var delta = Math.abs((h1 % 360) - (h2 % 360));
   return Math.min(delta, 360 - delta);
}

function acmNormalizeAngle360(deg) {
   deg = deg % 360;
   if (deg < 0)
      deg += 360;
   return deg;
}

function acmAppendAnnularSectorPolygons(polygons, cx, cy, innerR, outerR, startDeg, endDeg) {
   var start = acmNormalizeAngle360(startDeg);
   var end = acmNormalizeAngle360(endDeg);
   var spans = [];
   if (end <= start) {
      spans.push({ start: start, end: 360 });
      spans.push({ start: 0, end: end });
   } else {
      spans.push({ start: start, end: end });
   }

   for (var spanIndex = 0; spanIndex < spans.length; ++spanIndex) {
      var span = spans[spanIndex];
      var delta = span.end - span.start;
      if (delta <= 0)
         continue;
      var steps = Math.max(32, Math.ceil(delta / 1));
      var points = [];
      for (var i = 0; i <= steps; ++i) {
         var deg = span.start + (delta * i / steps);
         var a = deg * Math.PI / 180;
         points.push(new Point(
            cx + Math.cos(a) * outerR,
            cy - Math.sin(a) * outerR
         ));
      }
      for (var j = steps; j >= 0; --j) {
         var degIn = span.start + (delta * j / steps);
         var aIn = degIn * Math.PI / 180;
         points.push(new Point(
            cx + Math.cos(aIn) * innerR,
            cy - Math.sin(aIn) * innerR
         ));
      }
      polygons.push(points);
   }
}

function acmRgb01ToArgb(r, g, b, a) {
   var alpha = a == null ? 255 : Math.max(0, Math.min(255, Math.round(a)));
   var rr = Math.max(0, Math.min(255, Math.round(r * 255)));
   var gg = Math.max(0, Math.min(255, Math.round(g * 255)));
   var bb = Math.max(0, Math.min(255, Math.round(b * 255)));
   return ((alpha & 0xff) << 24) | ((rr & 0xff) << 16) | ((gg & 0xff) << 8) | (bb & 0xff);
}

function acmLerpColorArgb(colorA, colorB, t) {
   t = acmClamp01(t);
   var aA = (colorA >>> 24) & 0xff;
   var rA = (colorA >>> 16) & 0xff;
   var gA = (colorA >>> 8) & 0xff;
   var bA = colorA & 0xff;
   var aB = (colorB >>> 24) & 0xff;
   var rB = (colorB >>> 16) & 0xff;
   var gB = (colorB >>> 8) & 0xff;
   var bB = colorB & 0xff;
   var a = Math.round(aA + (aB - aA) * t) & 0xff;
   var r = Math.round(rA + (rB - rA) * t) & 0xff;
   var g = Math.round(gA + (gB - gA) * t) & 0xff;
   var b = Math.round(bA + (bB - bA) * t) & 0xff;
   return (a << 24) | (r << 16) | (g << 8) | b;
}

function acmNormalizeHueDegrees(deg) {
   deg = deg % 360;
   if (deg < 0)
      deg += 360;
   return Math.round(deg);
}

function acmFormatAngleDegrees(value) {
   if (Math.abs(value - Math.round(value)) < 0.005)
      return "" + Math.round(value);
   var text = value.toFixed(2);
   text = text.replace(/0+$/, "");
   text = text.replace(/\.$/, "");
   return text;
}

function acmComputeSelectedBandRange(centerDeg, widthDeg) {
   return {
      low: acmNormalizeHueDegrees(centerDeg - widthDeg),
      high: acmNormalizeHueDegrees(centerDeg + widthDeg)
   };
}

function acmMakeHueMask(distance, widthDeg, feather) {
   var outerWidth = widthDeg;
   var innerWidth = widthDeg * (1 - feather);

   if (feather <= ACM_EPSILON || Math.abs(outerWidth - innerWidth) < ACM_EPSILON)
      return distance <= outerWidth ? 1 : 0;

   var t = acmClamp01((distance - innerWidth) / (outerWidth - innerWidth));
   return 1 - acmSmoothstep(0, 1, t);
}

function acmComputeRangeMask(luminance, rangeMaskState) {
   if (!rangeMaskState || !rangeMaskState.enabled)
      return 1;
   var low = rangeMaskState.low;
   var high = rangeMaskState.high;
   var feather = rangeMaskState.feather;
   var leftRamp = acmSmoothstep(low - feather, low, luminance);
   var rightRamp = 1 - acmSmoothstep(high, high + feather, luminance);
   return acmClamp01(leftRamp * rightRamp);
}

function acmBuildMasks(hue, saturation, lightness, band, protection, globalStrength, rangeMaskValue, protectionControls) {
   var controls = protectionControls || acmCreateDefaultProtectionControls();
   var distance = acmCircularHueDistance(hue, band.center);
   var hueMask = acmMakeHueMask(distance, band.width, band.feather);
   var satMask = controls.protectLowSaturation === false
      ? 1
      : acmSmoothstep(protection.satFloor, protection.satFull, saturation);
   var darkMask = acmSmoothstep(protection.darkFloor, protection.darkFull, lightness);
   var highlightMask = controls.protectStars === false
      ? 1
      : 1 - acmSmoothstep(protection.highlightStart, protection.highlightFull, lightness);

   return {
      finalMask: hueMask * satMask * darkMask * highlightMask * rangeMaskValue * globalStrength
   };
}

function acmBuildNeutralMasks(saturation, lightness, neutralState, protection, globalStrength, rangeMaskValue, options) {
   var controls = options && options.protectionControls ? options.protectionControls : acmCreateDefaultProtectionControls();
   var neutralMask = 1 - acmSmoothstep(neutralState.satStart, neutralState.satFull, saturation);
   var neutralDarkFloor = options && options.neutralDarkFloor != null ? options.neutralDarkFloor : protection.darkFloor;
   var neutralDarkFull = options && options.neutralDarkFull != null ? options.neutralDarkFull : protection.darkFull;
   var darkMask = acmSmoothstep(neutralDarkFloor, neutralDarkFull, lightness);
   var highlightMask = controls.protectStars === false
      ? 1
      : 1 - acmSmoothstep(protection.highlightStart, protection.highlightFull, lightness);
   return neutralMask * darkMask * highlightMask * rangeMaskValue * globalStrength;
}

function acmBoxBlurMaskRadiusOne(maskValues, width, height) {
   var count = width * height;
   var temp = new Float32Array(count);
   var output = new Float32Array(count);
   var lastX = width - 1;
   var lastY = height - 1;

   for (var y = 0; y < height; ++y) {
      var rowBase = y * width;
      for (var x = 0; x < width; ++x) {
         var sum = maskValues[rowBase + x];
         var samples = 1;
         if (x > 0) {
            sum += maskValues[rowBase + x - 1];
            ++samples;
         }
         if (x < lastX) {
            sum += maskValues[rowBase + x + 1];
            ++samples;
         }
         temp[rowBase + x] = sum / samples;
      }
   }

   for (var yy = 0; yy < height; ++yy) {
      var row = yy * width;
      var prevRow = yy > 0 ? row - width : -1;
      var nextRow = yy < lastY ? row + width : -1;
      for (var xx = 0; xx < width; ++xx) {
         var sumY = temp[row + xx];
         var samplesY = 1;
         if (prevRow >= 0) {
            sumY += temp[prevRow + xx];
            ++samplesY;
         }
         if (nextRow >= 0) {
            sumY += temp[nextRow + xx];
            ++samplesY;
         }
         output[row + xx] = acmClamp01(sumY / samplesY);
      }
   }

   return output;
}

function acmBoxBlurMask(maskValues, width, height, radius) {
   var r = Math.round(radius || 0);
   if (r <= 0 || width <= 1 || height <= 1)
      return maskValues;
   if (r === 1)
      return acmBoxBlurMaskRadiusOne(maskValues, width, height);

   var count = width * height;
   var temp = new Float32Array(count);
   var output = new Float32Array(count);

   for (var y = 0; y < height; ++y) {
      var rowBase = y * width;
      for (var x = 0; x < width; ++x) {
         var sum = 0;
         var samples = 0;
         var x0 = Math.max(0, x - r);
         var x1 = Math.min(width - 1, x + r);
         for (var sx = x0; sx <= x1; ++sx) {
            sum += maskValues[rowBase + sx];
            ++samples;
         }
         temp[rowBase + x] = sum / Math.max(1, samples);
      }
   }

   for (var yy = 0; yy < height; ++yy) {
      for (var xx = 0; xx < width; ++xx) {
         var sumY = 0;
         var samplesY = 0;
         var y0 = Math.max(0, yy - r);
         var y1 = Math.min(height - 1, yy + r);
         for (var sy = y0; sy <= y1; ++sy) {
            sumY += temp[sy * width + xx];
            ++samplesY;
         }
         output[yy * width + xx] = acmClamp01(sumY / Math.max(1, samplesY));
      }
   }

   return output;
}

function acmGetMaskSoftenRadius(maskSoften) {
   if (!maskSoften || typeof maskSoften.radius !== "number")
      return 0;
   return acmClamp(maskSoften.radius, 0, 5);
}

function acmMaybeSoftenMask(maskValues, width, height, maskSoften) {
   var radius = acmGetMaskSoftenRadius(maskSoften);
   return radius > 0 ? acmBoxBlurMask(maskValues, width, height, radius) : maskValues;
}

function acmBandMaskEdgePolishRadius() {
   return 1;
}

function acmApplyBandMaskEdgePolish(maskValues, width, height) {
   var radius = acmBandMaskEdgePolishRadius();
   return radius > 0 ? acmBoxBlurMask(maskValues, width, height, radius) : maskValues;
}

function acmRangeMaskBoostEnabled(rangeMaskState) {
   return !!(rangeMaskState && (
      rangeMaskState.boostEnabled === true ||
      rangeMaskState.rangeMaskBoostEnabled === true
   ));
}

function acmRangeMaskEnabled(rangeMaskState) {
   return !!(rangeMaskState && rangeMaskState.enabled === true);
}

function acmApplyRangeMaskShaping(maskValues, width, height, rangeMaskState, maskSoften) {
   if (!rangeMaskState || rangeMaskState.enabled !== true)
      return maskValues;
   var shaped = acmMaybeSoftenMask(maskValues, width, height, maskSoften);
   if (acmRangeMaskBoostEnabled(rangeMaskState))
      shaped = acmBoostMaskValues(shaped);
   return shaped;
}

function acmNormalizeStarMaskStrength(value) {
   return "Strong";
}

function acmStarMaskStrengthSettings(value) {
   var strength = acmNormalizeStarMaskStrength(value);
   if (strength === "Very Strong")
      return {
         seedFloor: 0.13,
         contrastLow: 0.018,
         contrastHigh: 0.090,
         luminanceLow: 0.13,
         luminanceHigh: 0.46,
         radius: 7,
         suppress: 1.0,
         blurRadius: 1
      };
   if (strength === "Strong")
      return {
         seedFloor: 0.17,
         contrastLow: 0.026,
         contrastHigh: 0.115,
         luminanceLow: 0.17,
         luminanceHigh: 0.52,
         radius: 5,
         suppress: 0.97,
         blurRadius: 1
      };
   return {
      seedFloor: 0.22,
      contrastLow: 0.04,
      contrastHigh: 0.16,
      luminanceLow: 0.22,
      luminanceHigh: 0.62,
      radius: 3,
      suppress: 0.92,
      blurRadius: 0
   };
}

var ACM_STAR_EXPANSION_KERNELS = {};

function acmGetStarExpansionKernel(radius) {
   var r = Math.max(0, Math.round(radius || 0));
   var key = "" + r;
   if (ACM_STAR_EXPANSION_KERNELS[key])
      return ACM_STAR_EXPANSION_KERNELS[key];

   var offsets = [];
   for (var oy = -r; oy <= r; ++oy) {
      for (var ox = -r; ox <= r; ++ox) {
         var dist = Math.sqrt(ox * ox + oy * oy);
         if (dist > r)
            continue;
         offsets.push({
            x: ox,
            y: oy,
            falloff: 1 - acmSmoothstep(0, r, dist)
         });
      }
   }
   ACM_STAR_EXPANSION_KERNELS[key] = offsets;
   return offsets;
}

function acmBuildCompactStarProtectionMask(luminanceValues, width, height, strength) {
   var count = width * height;
   var seeds = new Float32Array(count);
   if (!luminanceValues || width < 5 || height < 5)
      return seeds;
   var settings = acmStarMaskStrengthSettings(strength);

   for (var y = 2; y < height - 2; ++y) {
      for (var x = 2; x < width - 2; ++x) {
         var index = y * width + x;
         var center = luminanceValues[index];
         if (center < settings.seedFloor)
            continue;

         var ringSum = 0;
         var ringCount = 0;
         var localMax = center;
         for (var dy = -2; dy <= 2; ++dy) {
            for (var dx = -2; dx <= 2; ++dx) {
               if (dx === 0 && dy === 0)
                  continue;
               var sample = luminanceValues[(y + dy) * width + (x + dx)];
               localMax = Math.max(localMax, sample);
               if (Math.abs(dx) === 2 || Math.abs(dy) === 2) {
                  ringSum += sample;
                  ++ringCount;
               }
            }
         }

         if (center + 0.0001 < localMax)
            continue;

         var ringMean = ringSum / Math.max(1, ringCount);
         var contrast = center - ringMean;
         var compactSignal = acmSmoothstep(settings.contrastLow, settings.contrastHigh, contrast) * acmSmoothstep(settings.luminanceLow, settings.luminanceHigh, center);
         if (compactSignal > 0)
            seeds[index] = compactSignal;
      }
   }

   var expanded = new Float32Array(count);
   var radius = settings.radius;
   var expansionKernel = acmGetStarExpansionKernel(radius);
   for (var sy = 0; sy < height; ++sy) {
      for (var sx = 0; sx < width; ++sx) {
         var seed = seeds[sy * width + sx];
         if (seed <= 0)
            continue;
         for (var kernelIndex = 0; kernelIndex < expansionKernel.length; ++kernelIndex) {
            var kernel = expansionKernel[kernelIndex];
            var ty = sy + kernel.y;
            if (ty < 0 || ty >= height)
               continue;
            var tx = sx + kernel.x;
            if (tx < 0 || tx >= width)
               continue;
            var targetIndex = ty * width + tx;
            var expandedValue = seed * kernel.falloff;
            if (expandedValue > expanded[targetIndex])
               expanded[targetIndex] = expandedValue;
         }
      }
   }

   return settings.blurRadius > 0
      ? acmMaybeSoftenMask(expanded, width, height, { radius: settings.blurRadius })
      : expanded;
}

function acmBuildRangeMaskValues(luminanceValues, width, height, rangeMaskState, maskSoften) {
   var count = width * height;
   var values = new Float32Array(count);
   for (var i = 0; i < count; ++i)
      values[i] = acmComputeRangeMask(luminanceValues[i], rangeMaskState);
   return acmApplyRangeMaskShaping(values, width, height, rangeMaskState, maskSoften);
}

function acmRodriguesRotate(vector, axis, angleRadians) {
   var vx = vector[0], vy = vector[1], vz = vector[2];
   var ax = axis[0], ay = axis[1], az = axis[2];
   var cosA = Math.cos(angleRadians);
   var sinA = Math.sin(angleRadians);
   var dot = vx * ax + vy * ay + vz * az;
   var crossX = ay * vz - az * vy;
   var crossY = az * vx - ax * vz;
   var crossZ = ax * vy - ay * vx;

   return [
      vx * cosA + crossX * sinA + ax * dot * (1 - cosA),
      vy * cosA + crossY * sinA + ay * dot * (1 - cosA),
      vz * cosA + crossZ * sinA + az * dot * (1 - cosA)
   ];
}

function acmApplySingleBand(currentRgb, sourceHsl, width, height, band, options) {
   var output = currentRgb;
   var count = width * height;
   var maskSourceHsl = options.maskSourceHsl || sourceHsl;
   var protection = options.protection;
   var protectionControls = options.protectionControls || acmCreateDefaultProtectionControls();
   var starMaskSettings = acmStarMaskStrengthSettings(protectionControls.starMaskStrength);
   var globalStrength = options.globalStrength != null ? options.globalStrength : 1;
   var rangeMaskState = options.rangeMaskState || null;
   var maskValues = options.maskScratch || new Float32Array(count);
   var starProtectionMask = protectionControls.protectStars === false
      ? null
      : (options.starProtectionMask || null);
   var rangeMaskValues = options.rangeMaskValues || null;
   var protectLowSat = protectionControls.protectLowSaturation !== false;
   var protectHighlights = protectionControls.protectStars !== false;
   var starSuppress = starMaskSettings.suppress;
   var outerWidth = band.width;
   var innerWidth = band.feather <= ACM_EPSILON ? outerWidth : outerWidth * (1 - band.feather);
   var featherDenom = outerWidth - innerWidth;
   var satAdjustBase = band.saturation / 100;
   var lumAdjustBase = band.luminance / 100;
   var hueShiftRadians = band.hueShift * Math.PI / 180;
   var hasHueShift = Math.abs(band.hueShift) > ACM_EPSILON;
   var hasBandBlur = acmGetMaskSoftenRadius(options.maskSoften) > 0;
   var hasBandMaskEdgePolish = acmBandMaskEdgePolishRadius() > 0;

   function buildMaskAt(index) {
      var delta = Math.abs((maskSourceHsl.h[index] % 360) - (band.center % 360));
      var distance = Math.min(delta, 360 - delta);
      var hueMask = 0;
      if (band.feather <= ACM_EPSILON || Math.abs(featherDenom) < ACM_EPSILON) {
         hueMask = distance <= outerWidth ? 1 : 0;
      } else if (distance <= innerWidth + ACM_EPSILON) {
         hueMask = 1;
      } else if (distance <= outerWidth + ACM_EPSILON) {
         var hueT = (distance - innerWidth) / featherDenom;
         hueT = hueT < 0 ? 0 : hueT > 1 ? 1 : hueT;
         hueMask = 1 - (hueT * hueT * (3 - 2 * hueT));
      }
      if (hueMask <= 0)
         return 0;

      var saturation = maskSourceHsl.s[index];
      var lightness = maskSourceHsl.l[index];
      var satMask = protectLowSat
         ? acmSmoothstep(protection.satFloor, protection.satFull, saturation)
         : 1;
      var darkMask = acmSmoothstep(protection.darkFloor, protection.darkFull, lightness);
      var highlightMask = protectHighlights
         ? 1 - acmSmoothstep(protection.highlightStart, protection.highlightFull, lightness)
         : 1;
      var rangeMaskValue = rangeMaskValues ? rangeMaskValues[index] : 1;
      var mask = hueMask * satMask * darkMask * highlightMask * rangeMaskValue * globalStrength;
      if (starProtectionMask)
         mask *= 1 - starSuppress * starProtectionMask[index];
      return mask;
   }

   if (hasBandBlur || hasBandMaskEdgePolish) {
      for (var i = 0; i < count; ++i)
         maskValues[i] = buildMaskAt(i);
      if (hasBandBlur)
         maskValues = acmMaybeSoftenMask(maskValues, width, height, options.maskSoften);
      if (hasBandMaskEdgePolish)
         maskValues = acmApplyBandMaskEdgePolish(maskValues, width, height);
   } else {
      for (var directIndex = 0; directIndex < count; ++directIndex) {
         var delta = Math.abs((maskSourceHsl.h[directIndex] % 360) - (band.center % 360));
         var distance = Math.min(delta, 360 - delta);
         var hueMask = 0;
         if (band.feather <= ACM_EPSILON || Math.abs(featherDenom) < ACM_EPSILON) {
            hueMask = distance <= outerWidth ? 1 : 0;
         } else if (distance <= innerWidth + ACM_EPSILON) {
            hueMask = 1;
         } else if (distance <= outerWidth + ACM_EPSILON) {
            var hueT = (distance - innerWidth) / featherDenom;
            hueT = hueT < 0 ? 0 : hueT > 1 ? 1 : hueT;
            hueMask = 1 - (hueT * hueT * (3 - 2 * hueT));
         }
         if (hueMask <= 0)
            continue;

         var sourceSaturationForMask = maskSourceHsl.s[directIndex];
         var sourceLightnessForMask = maskSourceHsl.l[directIndex];
         var satMask = protectLowSat
            ? acmSmoothstep(protection.satFloor, protection.satFull, sourceSaturationForMask)
            : 1;
         var darkMask = acmSmoothstep(protection.darkFloor, protection.darkFull, sourceLightnessForMask);
         var highlightMask = protectHighlights
            ? 1 - acmSmoothstep(protection.highlightStart, protection.highlightFull, sourceLightnessForMask)
            : 1;
         var rangeMaskValue0 = rangeMaskValues ? rangeMaskValues[directIndex] : 1;
         var mask = hueMask * satMask * darkMask * highlightMask * rangeMaskValue0 * globalStrength;
         if (starProtectionMask)
            mask *= 1 - starSuppress * starProtectionMask[directIndex];
         if (mask <= 0)
            continue;

         var directBase = directIndex * 3;
         var r0 = output[directBase];
         var g0 = output[directBase + 1];
         var b0 = output[directBase + 2];
         var y0 = 0.2126 * r0 + 0.7152 * g0 + 0.0722 * b0;
         var rotatedR0 = (r0 - y0);
         var rotatedG0 = (g0 - y0);
         var rotatedB0 = (b0 - y0);

         var satAdjust0 = satAdjustBase;
         if (satAdjust0 > 0 && protectionControls.protectLowSaturation === false) {
            var lowColorReach0 = 1 - acmSmoothstep(0.02, 0.18, sourceHsl.s[directIndex]);
            var signalGate0 = acmSmoothstep(0.10, 0.34, y0) * (1 - acmSmoothstep(0.82, 0.98, y0));
            satAdjust0 *= 1 + 2.4 * lowColorReach0 * signalGate0;
         }
         var satScale0 = Math.max(0, 1 + satAdjust0 * mask);
         rotatedR0 *= satScale0;
         rotatedG0 *= satScale0;
         rotatedB0 *= satScale0;

         if (hasHueShift) {
            var angleRadians0 = hueShiftRadians * mask;
            var ax0 = ACM_AXIS[0], ay0 = ACM_AXIS[1], az0 = ACM_AXIS[2];
            var cosA0 = Math.cos(angleRadians0);
            var sinA0 = Math.sin(angleRadians0);
            var dot0 = rotatedR0 * ax0 + rotatedG0 * ay0 + rotatedB0 * az0;
            var crossR0 = ay0 * rotatedB0 - az0 * rotatedG0;
            var crossG0 = az0 * rotatedR0 - ax0 * rotatedB0;
            var crossB0 = ax0 * rotatedG0 - ay0 * rotatedR0;
            var invCos0 = 1 - cosA0;
            var sourceR0 = rotatedR0;
            var sourceG0 = rotatedG0;
            var sourceB0 = rotatedB0;
            rotatedR0 = sourceR0 * cosA0 + crossR0 * sinA0 + ax0 * dot0 * invCos0;
            rotatedG0 = sourceG0 * cosA0 + crossG0 * sinA0 + ay0 * dot0 * invCos0;
            rotatedB0 = sourceB0 * cosA0 + crossB0 * sinA0 + az0 * dot0 * invCos0;
         }

         var y20 = lumAdjustBase >= 0
            ? y0 + (lumAdjustBase * ACM_POSITIVE_LUMINANCE_GAIN) * mask * (1 - y0)
            : y0 + lumAdjustBase * mask * y0;

         output[directBase] = acmClamp01(y20 + rotatedR0);
         output[directBase + 1] = acmClamp01(y20 + rotatedG0);
         output[directBase + 2] = acmClamp01(y20 + rotatedB0);
      }

      return output;
   }

   for (var j = 0; j < count; ++j) {
      var mask = hasBandBlur || hasBandMaskEdgePolish ? maskValues[j] : buildMaskAt(j);
      if (mask <= 0)
         continue;

      var base = j * 3;
      var r = output[base];
      var g = output[base + 1];
      var b = output[base + 2];
      var y = acmLuma709(r, g, b);
      var chromaR = r - y;
      var chromaG = g - y;
      var chromaB = b - y;

      var sourceSaturation = sourceHsl.s[j];
      var satAdjust = satAdjustBase;
      if (satAdjust > 0 && protectionControls.protectLowSaturation === false) {
         var lowColorReach = 1 - acmSmoothstep(0.02, 0.18, sourceSaturation);
         var signalGate = acmSmoothstep(0.10, 0.34, y) * (1 - acmSmoothstep(0.82, 0.98, y));
         satAdjust *= 1 + 2.4 * lowColorReach * signalGate;
      }
      var satScale = Math.max(0, 1 + satAdjust * mask);
      var rotatedR = chromaR * satScale;
      var rotatedG = chromaG * satScale;
      var rotatedB = chromaB * satScale;

      if (hasHueShift) {
         var angleRadians = hueShiftRadians * mask;
         var ax = ACM_AXIS[0], ay = ACM_AXIS[1], az = ACM_AXIS[2];
         var cosA = Math.cos(angleRadians);
         var sinA = Math.sin(angleRadians);
         var dot = rotatedR * ax + rotatedG * ay + rotatedB * az;
         var crossR = ay * rotatedB - az * rotatedG;
         var crossG = az * rotatedR - ax * rotatedB;
         var crossB = ax * rotatedG - ay * rotatedR;
         var invCos = 1 - cosA;
         var sourceR = rotatedR;
         var sourceG = rotatedG;
         var sourceB = rotatedB;
         rotatedR = sourceR * cosA + crossR * sinA + ax * dot * invCos;
         rotatedG = sourceG * cosA + crossG * sinA + ay * dot * invCos;
         rotatedB = sourceB * cosA + crossB * sinA + az * dot * invCos;
      }

      var lumAdjust = lumAdjustBase;
      var y2 = lumAdjust >= 0
         ? y + (lumAdjust * ACM_POSITIVE_LUMINANCE_GAIN) * mask * (1 - y)
         : y + lumAdjust * mask * y;

      output[base] = acmClamp01(y2 + rotatedR);
      output[base + 1] = acmClamp01(y2 + rotatedG);
      output[base + 2] = acmClamp01(y2 + rotatedB);
   }

   return output;
}

function acmApplyNeutralLuminance(currentRgb, sourceHsl, width, height, neutralState, options) {
   var output = currentRgb;
   var count = width * height;
   var protection = options.protection;
   var protectionControls = options.protectionControls || acmCreateDefaultProtectionControls();
   var starMaskSettings = acmStarMaskStrengthSettings(protectionControls.starMaskStrength);
   var globalStrength = options.globalStrength != null ? options.globalStrength : 1;
   var rangeMaskState = options.rangeMaskState || null;
   var maskValues = options.maskScratch || new Float32Array(count);
   var starProtectionMask = protectionControls.protectStars === false
      ? null
      : (options.starProtectionMask || null);
   var rangeMaskValues = options.rangeMaskValues || null;

   for (var i = 0; i < count; ++i) {
      var saturation = sourceHsl.s[i];
      var lightness = sourceHsl.l[i];
      var luminance = sourceHsl.y[i];
      var rangeMaskValue = rangeMaskValues ? rangeMaskValues[i] : 1;
      var relaxedDarkFloor = rangeMaskState && rangeMaskState.enabled ? protection.darkFloor * 0.25 : protection.darkFloor;
      var relaxedDarkFull = rangeMaskState && rangeMaskState.enabled ? protection.darkFull * 0.6 : protection.darkFull;
      maskValues[i] = acmBuildNeutralMasks(
         saturation,
         lightness,
         neutralState,
         protection,
         globalStrength,
         rangeMaskValue,
         {
            neutralDarkFloor: relaxedDarkFloor,
            neutralDarkFull: relaxedDarkFull,
            protectionControls: protectionControls
         }
      );
      if (starProtectionMask)
         maskValues[i] *= 1 - starMaskSettings.suppress * starProtectionMask[i];
   }

   maskValues = acmMaybeSoftenMask(maskValues, width, height, options.maskSoften);

   for (var j = 0; j < count; ++j) {
      var mask = maskValues[j];
      if (mask <= 0)
         continue;

      var base = j * 3;
      var r = output[base];
      var g = output[base + 1];
      var b = output[base + 2];
      var y = acmLuma709(r, g, b);
      var chroma = [r - y, g - y, b - y];

      var lumAdjust = neutralState.luminance / 100;
      var y2 = lumAdjust >= 0
         ? y + (lumAdjust * ACM_POSITIVE_LUMINANCE_GAIN) * mask * (1 - y)
         : y + lumAdjust * mask * y;

      output[base] = acmClamp01(y2 + chroma[0]);
      output[base + 1] = acmClamp01(y2 + chroma[1]);
      output[base + 2] = acmClamp01(y2 + chroma[2]);
   }

   return output;
}

function acmGetBandByIdMap() {
   var defaults = acmCreateBandDefaults();
   var byId = {};
   for (var i = 0; i < defaults.length; ++i)
      byId[defaults[i].id] = defaults[i];
   return byId;
}

function acmNormalizeBand(sourceBand, defaultBand) {
   return {
      id: defaultBand.id,
      center: defaultBand.center,
      label: defaultBand.label,
      color: defaultBand.color,
      hueShift: sourceBand && typeof sourceBand.hueShift === "number" ? sourceBand.hueShift : 0,
      saturation: sourceBand && typeof sourceBand.saturation === "number" ? sourceBand.saturation : 0,
      luminance: sourceBand && typeof sourceBand.luminance === "number" ? sourceBand.luminance : 0,
      width: sourceBand && typeof sourceBand.width === "number" ? sourceBand.width : defaultBand.width,
      feather: sourceBand && typeof sourceBand.feather === "number" ? sourceBand.feather : defaultBand.feather,
      maskSoftenRadius: sourceBand && sourceBand.hasOwnProperty && sourceBand.hasOwnProperty("maskSoftenRadius") && typeof sourceBand.maskSoftenRadius === "number"
         ? acmGetMaskSoftenRadius({ radius: sourceBand.maskSoftenRadius })
         : 0
   };
}

function acmNormalizeBands(inputBands) {
   var defaults = acmCreateBandDefaults();
   var sourceById = {};

   if (inputBands instanceof Array) {
      for (var i = 0; i < inputBands.length; ++i) {
         if (inputBands[i] && typeof inputBands[i].id === "string")
            sourceById[inputBands[i].id] = inputBands[i];
      }
   } else if (inputBands && typeof inputBands === "object") {
      for (var key in inputBands) {
         if (inputBands.hasOwnProperty(key)) {
            sourceById[key] = {
               id: key,
               hueShift: inputBands[key].hueShift,
               saturation: inputBands[key].saturation,
               luminance: inputBands[key].luminance,
               width: inputBands[key].width,
               feather: inputBands[key].feather,
               maskSoftenRadius: inputBands[key] && inputBands[key].hasOwnProperty && inputBands[key].hasOwnProperty("maskSoftenRadius")
                  ? inputBands[key].maskSoftenRadius
                  : 0
            };
         }
      }
   }

   var normalized = [];
   for (var bandIndex = 0; bandIndex < defaults.length; ++bandIndex) {
      var defaultBand = defaults[bandIndex];
      normalized.push(acmNormalizeBand(sourceById[defaultBand.id], defaultBand));
   }
   return normalized;
}

function acmConvertLegacyRecipe(recipe) {
   if (recipe && !(recipe.passes instanceof Array) && recipe.bands) {
      return {
         version: recipe.version || "legacy-recipe",
         imageType: recipe.imageType || "stars",
         sensitivity: recipe.sensitivity || "Normal",
         globalStrength: typeof recipe.globalStrength === "number" ? recipe.globalStrength : 1,
         activePassId: "pass-1",
         passes: [
            {
               id: "pass-1",
               label: recipe.name || "Base Pass",
               isBasePass: true,
               enabled: true,
               selectedBandId: recipe.selectedBandId || "red",
               rangeMask: recipe.rangeMask || acmCreateDefaultRangeMask(),
               neutralLuminance: recipe.neutralLuminance || acmCreateDefaultNeutralLuminance(),
               bands: acmNormalizeBands(recipe.bands)
            }
         ]
      };
   }
   return recipe;
}

function acmNormalizeRecipe(recipe) {
   var converted = acmConvertLegacyRecipe(recipe || {});
   if (!(converted.passes instanceof Array) || converted.passes.length === 0)
      fail("Unsupported recipe: no passes array was found.");

   var sensitivity = ACM_SENSITIVITY_RANGES[converted.sensitivity] ? converted.sensitivity : "Normal";
   var sourceProtections = converted.protectionControls || acmCreateDefaultProtectionControls();
   var protectionControls = {
      protectStars: sourceProtections.protectStars !== false,
      protectLowSaturation: sourceProtections.protectLowSaturation !== false,
      starMaskStrength: acmNormalizeStarMaskStrength(sourceProtections.starMaskStrength)
   };
   var normalizedPasses = [];

   for (var passIndex = 0; passIndex < converted.passes.length; ++passIndex) {
      var pass = converted.passes[passIndex];
      var bands = acmNormalizeBands(pass.bands);

      for (var bandIndex = 0; bandIndex < bands.length; ++bandIndex) {
         bands[bandIndex].hueShift = acmClamp(
            bands[bandIndex].hueShift,
            -ACM_SENSITIVITY_RANGES[sensitivity].hueShift,
            ACM_SENSITIVITY_RANGES[sensitivity].hueShift
         );
         bands[bandIndex].saturation = acmClamp(
            bands[bandIndex].saturation,
            -ACM_SENSITIVITY_RANGES[sensitivity].saturation,
            ACM_SENSITIVITY_RANGES[sensitivity].saturation
         );
         bands[bandIndex].luminance = acmClamp(
            bands[bandIndex].luminance,
            -ACM_SENSITIVITY_RANGES[sensitivity].luminance,
            ACM_SENSITIVITY_RANGES[sensitivity].luminance
         );
      }

      var neutral = pass.neutralLuminance || acmCreateDefaultNeutralLuminance();
      neutral = {
         luminance: typeof neutral.luminance === "number" ? neutral.luminance : 0,
         satStart: typeof neutral.satStart === "number" ? neutral.satStart : 0.04,
         satFull: typeof neutral.satFull === "number" ? neutral.satFull : 0.16
      };
      neutral.luminance = acmClamp(
         neutral.luminance,
         -ACM_NEUTRAL_SENSITIVITY_RANGES[sensitivity],
         ACM_NEUTRAL_SENSITIVITY_RANGES[sensitivity]
      );

      var rangeMask = pass.rangeMask || acmCreateDefaultRangeMask();
      rangeMask = {
         enabled: rangeMask.enabled === true,
         low: typeof rangeMask.low === "number" ? rangeMask.low : 0.0,
         high: typeof rangeMask.high === "number" ? rangeMask.high : 1.0,
         feather: typeof rangeMask.feather === "number" ? rangeMask.feather : 0.10,
         preset: rangeMask.preset || "All",
         maskSoftenRadius: rangeMask && rangeMask.hasOwnProperty && rangeMask.hasOwnProperty("maskSoftenRadius")
            ? acmGetMaskSoftenRadius({ radius: rangeMask.maskSoftenRadius })
            : (rangeMask && rangeMask.hasOwnProperty && rangeMask.hasOwnProperty("rangeMaskSoftenPx")
               ? acmGetMaskSoftenRadius({ radius: rangeMask.rangeMaskSoftenPx })
               : (rangeMask && rangeMask.hasOwnProperty && rangeMask.hasOwnProperty("rangeMaskBlurPx")
                  ? acmGetMaskSoftenRadius({ radius: rangeMask.rangeMaskBlurPx })
                  : 0)),
         boostEnabled: acmRangeMaskBoostEnabled(rangeMask)
      };
      var legacyPassSoftenRadius = pass && pass.hasOwnProperty && pass.hasOwnProperty("maskSoften")
         ? acmGetMaskSoftenRadius(pass.maskSoften)
         : 0;
      if (legacyPassSoftenRadius > 0) {
         for (var softenBandIndex = 0; softenBandIndex < bands.length; ++softenBandIndex)
            if (!bands[softenBandIndex].maskSoftenRadius)
               bands[softenBandIndex].maskSoftenRadius = legacyPassSoftenRadius;
      }

      normalizedPasses.push({
         id: pass.id || ("pass-" + (passIndex + 1)),
         label: pass.name || pass.label || ("Pass " + (passIndex + 1)),
         enabled: pass.enabled !== false,
         selectedBandId: pass.selectedBandId || "red",
         rangeMask: rangeMask,
         neutralLuminance: neutral,
         bands: bands
      });
   }

   return {
      version: converted.version || "acm-recipe-1.0",
      imageType: converted.imageType || "stars",
      sensitivity: sensitivity,
      globalStrength: typeof converted.globalStrength === "number" ? converted.globalStrength : 1.0,
      protectionControls: protectionControls,
      activePassId: converted.activePassId || normalizedPasses[0].id,
      passes: normalizedPasses
   };
}

function applyAstroColorMixerPasses(rgbFloat, width, height, recipe, options) {
   options = options || {};
   var timingLogger = typeof options.timingLogger === "function" ? options.timingLogger : null;
   var normalized = acmNormalizeRecipe(recipe);
   var working = new Float32Array(rgbFloat);
   var protection = ACM_PROTECTION_PRESETS[normalized.imageType] || ACM_PROTECTION_PRESETS.stars;
   var protectionControls = acmEffectiveProtectionControls(normalized.protectionControls, normalized.imageType);
   var sharedStarProtectionMask = null;
   var sharedStarProtectionMaskReady = protectionControls.protectStars === false;

   for (var passIndex = 0; passIndex < normalized.passes.length; ++passIndex) {
      var pass = normalized.passes[passIndex];
      if (pass.enabled === false)
         continue;

      var adjustedBands = [];
      for (var adjustedBandIndex = 0; adjustedBandIndex < pass.bands.length; ++adjustedBandIndex) {
         var adjustedBand = pass.bands[adjustedBandIndex];
         if (
            Math.abs(adjustedBand.hueShift) > ACM_EPSILON ||
            Math.abs(adjustedBand.saturation) > ACM_EPSILON ||
            Math.abs(adjustedBand.luminance) > ACM_EPSILON
         )
            adjustedBands.push(adjustedBand);
      }
      var neutralActive = Math.abs(pass.neutralLuminance.luminance) > ACM_EPSILON;
      if (adjustedBands.length === 0 && !neutralActive)
         continue;

      var passStart = timingLogger ? acmNowMs() : 0;
      var stepStart = timingLogger ? acmNowMs() : 0;
      var sourceHsl = acmApplySourceHsl(working, width, height);
      if (timingLogger)
         timingLogger("  " + pass.label + " analyze image color", stepStart, acmNowMs());

      stepStart = timingLogger ? acmNowMs() : 0;
      var bandMaskSourceHsl = adjustedBands.length > 0
         ? acmComputeBandMaskAnalysisHsl(working, width, height, normalized.imageType)
         : sourceHsl;
      if (timingLogger && adjustedBands.length > 0)
         timingLogger("  " + pass.label + " prepare smooth color masks", stepStart, acmNowMs());

      stepStart = timingLogger ? acmNowMs() : 0;
      var starProtectionMask = null;
      if (protectionControls.protectStars !== false) {
         if (!sharedStarProtectionMaskReady) {
            sharedStarProtectionMask = acmBuildCompactStarProtectionMask(sourceHsl.y, width, height, protectionControls.starMaskStrength);
            sharedStarProtectionMaskReady = true;
            if (timingLogger)
               timingLogger("  " + pass.label + " build star protection", stepStart, acmNowMs());
         } else if (timingLogger) {
            timingLogger("  " + pass.label + " reuse star protection", stepStart, acmNowMs());
         }
         starProtectionMask = sharedStarProtectionMask;
      }

      var rangeMaskSoften = normalized.imageType === "starless" ? { radius: pass.rangeMask.maskSoftenRadius } : null;
      var rangeMaskValues = null;
      if (acmRangeMaskEnabled(pass.rangeMask)) {
         stepStart = timingLogger ? acmNowMs() : 0;
         rangeMaskValues = acmBuildRangeMaskValues(sourceHsl.y, width, height, pass.rangeMask, rangeMaskSoften);
         if (timingLogger)
            timingLogger("  " + pass.label + " build Range Mask", stepStart, acmNowMs());
      }
      var maskScratch = new Float32Array(width * height);

      for (var bandIndex = 0; bandIndex < adjustedBands.length; ++bandIndex) {
         var band = adjustedBands[bandIndex];
         stepStart = timingLogger ? acmNowMs() : 0;
         working = acmApplySingleBand(working, sourceHsl, width, height, band, {
            protection: protection,
            protectionControls: protectionControls,
            globalStrength: normalized.globalStrength,
            rangeMaskState: pass.rangeMask,
            starProtectionMask: starProtectionMask,
            rangeMaskSoften: rangeMaskSoften,
            rangeMaskValues: rangeMaskValues,
            maskSourceHsl: bandMaskSourceHsl,
            maskScratch: maskScratch,
            maskSoften: normalized.imageType === "starless" ? { radius: band.maskSoftenRadius } : null
         });
         if (timingLogger)
            timingLogger("  " + pass.label + " apply " + band.label, stepStart, acmNowMs());
      }

      if (neutralActive) {
         stepStart = timingLogger ? acmNowMs() : 0;
         working = acmApplyNeutralLuminance(working, sourceHsl, width, height, pass.neutralLuminance, {
            protection: protection,
            protectionControls: protectionControls,
            globalStrength: normalized.globalStrength,
            rangeMaskState: pass.rangeMask,
            starProtectionMask: starProtectionMask,
            rangeMaskSoften: rangeMaskSoften,
            rangeMaskValues: rangeMaskValues,
            maskScratch: maskScratch,
            maskSoften: null
         });
         if (timingLogger)
            timingLogger("  " + pass.label + " apply Neutral luminance", stepStart, acmNowMs());
      }
      if (timingLogger)
         timingLogger("Process " + pass.label + " (" + adjustedBands.length + " band" + (adjustedBands.length === 1 ? "" : "s") + (neutralActive ? " + neutral" : "") + ")", passStart, acmNowMs());
   }

   return {
      recipe: normalized,
      rgb: working
   };
}

function acmSummarizeRangeMask(rangeMask) {
   if (!rangeMask || !rangeMask.enabled)
      return "Range Off";
   var soften = acmGetMaskSoftenRadius({ radius: rangeMask.maskSoftenRadius });
   var softenText = soften > 0 ? " · Blur " + soften.toFixed(0) + " px" : "";
   if (rangeMask.preset && rangeMask.preset !== "Custom" && rangeMask.preset !== "All")
      return "Range " + rangeMask.preset + softenText;
   return "Range " + rangeMask.low.toFixed(2) + "-" + rangeMask.high.toFixed(2) + " · Feather " + rangeMask.feather.toFixed(2) + softenText;
}

function acmSummarizePassMaskControls(pass) {
   return acmSummarizeRangeMask(pass.rangeMask) + acmSummarizeBandSoften(pass);
}

function acmSummarizeMaskSoften(maskSoften) {
   var radius = acmGetMaskSoftenRadius(maskSoften);
   return radius > 0 ? " · Blur " + radius.toFixed(1) + " px" : "";
}

function acmSummarizeBandSoften(pass) {
   if (!pass || !(pass.bands instanceof Array))
      return "";
   var maxRadius = 0;
   for (var i = 0; i < pass.bands.length; ++i)
      maxRadius = Math.max(maxRadius, acmGetMaskSoftenRadius({ radius: pass.bands[i].maskSoftenRadius }));
   return maxRadius > 0 ? " · Band Blur max " + maxRadius.toFixed(0) + " px" : "";
}

function acmSummarizePass(pass) {
   var parts = [];
   for (var i = 0; i < pass.bands.length; ++i) {
      var band = pass.bands[i];
      var sat = acmRoundedValue(band.saturation, 0);
      var lum = acmRoundedValue(band.luminance, 1);
      var hue = acmRoundedValue(band.hueShift, 1);
      if (Math.abs(sat) > ACM_EPSILON)
         parts.push(band.label.split(" / ")[0] + " S " + (sat > 0 ? "+" : "") + acmFormatMixerValue(sat, 0));
      if (Math.abs(lum) > ACM_EPSILON)
         parts.push(band.label.split(" / ")[0] + " L " + (lum > 0 ? "+" : "") + acmFormatMixerValue(lum, 1));
      if (Math.abs(hue) > ACM_EPSILON)
         parts.push(band.label.split(" / ")[0] + " H " + (hue > 0 ? "+" : "") + acmFormatMixerValue(hue, 1));
   }
   var neutralLum = acmRoundedValue(pass.neutralLuminance.luminance, 1);
   if (Math.abs(neutralLum) > ACM_EPSILON)
      parts.push("Neutral L " + (neutralLum > 0 ? "+" : "") + acmFormatMixerValue(neutralLum, 1));
   if (parts.length === 0)
      return "No active adjustments";
   if (parts.length > 4)
      return parts.slice(0, 4).join(" · ") + " ...";
   return parts.join(" · ");
}

function acmFormatPassViewerRowText(pass) {
   return (pass.enabled !== false ? "✓ " : "□ ") + pass.name + " · " + acmSummarizePass(pass) + " · " + acmSummarizePassMaskControls(pass);
}

function acmDialogIsCompactMode(dialog) {
   return !!(dialog && (
      dialog.layoutMode === "compact" ||
      (dialog.layoutModeCombo && dialog.layoutModeCombo.currentItem === 1)
   ));
}

function acmCompactPassViewerBandLabel(label) {
   var base = String(label || "").split(" / ")[0];
   if (base === "Red")
      return "R";
   if (base === "Orange")
      return "O";
   if (base === "Yellow")
      return "Y";
   if (base === "Green")
      return "G";
   if (base === "Cyan")
      return "C";
   if (base === "Blue")
      return "B";
   if (base === "Purple")
      return "P";
   if (base === "Magenta")
      return "M";
   if (base === "Neutral")
      return "N";
   return base;
}

function acmPassViewerShouldAbbreviate(dialog) {
   return !!(dialog && (ACM_HOST_IS_WINDOWS || acmDialogIsCompactMode(dialog)));
}

function acmCompactPassViewerPassName(pass, dialog) {
   if (!dialog || !acmDialogIsCompactMode(dialog) || ACM_HOST_IS_WINDOWS)
      return pass.name;
   if (pass.id === "pass-1")
      return "Base";
   var match = String(pass.name || "").match(/(\d+)/);
   return match ? ("Pass " + match[1]) : pass.name;
}

function acmSummarizePassForViewerFull(pass, dialog) {
   var abbreviate = acmPassViewerShouldAbbreviate(dialog);
   var parts = [];
   for (var i = 0; i < pass.bands.length; ++i) {
      var band = pass.bands[i];
      var bandName = abbreviate ? acmCompactPassViewerBandLabel(band.label) : band.label.split(" / ")[0];
      var sat = acmRoundedValue(band.saturation, 0);
      var lum = acmRoundedValue(band.luminance, 1);
      var hue = acmRoundedValue(band.hueShift, 1);
      if (Math.abs(sat) > ACM_EPSILON)
         parts.push(bandName + " S " + (sat > 0 ? "+" : "") + acmFormatMixerValue(sat, 0));
      if (Math.abs(lum) > ACM_EPSILON)
         parts.push(bandName + " L " + (lum > 0 ? "+" : "") + acmFormatMixerValue(lum, 1));
      if (Math.abs(hue) > ACM_EPSILON)
         parts.push(bandName + " H " + (hue > 0 ? "+" : "") + acmFormatMixerValue(hue, 1));
   }
   var neutralLum = acmRoundedValue(pass.neutralLuminance.luminance, 1);
   if (Math.abs(neutralLum) > ACM_EPSILON)
      parts.push((abbreviate ? "N" : "Neutral") + " L " + (neutralLum > 0 ? "+" : "") + acmFormatMixerValue(neutralLum, 1));
   if (parts.length === 0)
      return abbreviate ? "No adj" : "No active adjustments";
   return parts.join(" - ");
}

function acmSummarizePassForViewer(pass, dialog) {
   return acmSummarizePassForViewerFull(pass, dialog);
}

function acmSummarizeRangeMaskForViewer(rangeMask, dialog) {
   if (!rangeMask || !rangeMask.enabled)
      return dialog && (ACM_HOST_IS_WINDOWS || acmDialogIsCompactMode(dialog)) ? "RM Off" : "Range Off";
   var soften = acmGetMaskSoftenRadius({ radius: rangeMask.maskSoftenRadius });
   var softenText = soften > 0 ? " - Blur " + soften.toFixed(0) : "";
   if (rangeMask.preset && rangeMask.preset !== "Custom" && rangeMask.preset !== "All")
      return (dialog && (ACM_HOST_IS_WINDOWS || acmDialogIsCompactMode(dialog)) ? "RM " : "Range ") + rangeMask.preset + softenText;
   if (dialog && (ACM_HOST_IS_WINDOWS || acmDialogIsCompactMode(dialog)))
      return "RM " + rangeMask.low.toFixed(2) + "-" + rangeMask.high.toFixed(2) + softenText;
   return acmSummarizeRangeMask(rangeMask);
}

function acmSummarizePassMaskControlsForViewer(pass, dialog) {
   if (dialog && (ACM_HOST_IS_WINDOWS || acmDialogIsCompactMode(dialog)))
      return acmSummarizeRangeMaskForViewer(pass.rangeMask, dialog);
   return acmSummarizePassMaskControls(pass);
}

function acmFormatPassViewerWrappedRowText(pass, dialog, hasDeleteButton) {
   var rawText = acmCompactPassViewerPassName(pass, dialog) + " - " + acmSummarizePassForViewerFull(pass, dialog) + " - " + acmSummarizePassMaskControlsForViewer(pass, dialog);
   var displayText = acmCompactPassViewerPassName(pass, dialog) + " - " + acmSummarizePassForViewer(pass, dialog) + " - " + acmSummarizePassMaskControlsForViewer(pass, dialog);
   if (dialog && (ACM_HOST_IS_WINDOWS || acmDialogIsCompactMode(dialog)))
      return { raw: rawText, wrapped: displayText };
   var textWidth = acmPassViewerTextWidth(dialog, hasDeleteButton);
   var compactPassViewer = acmDialogIsCompactMode(dialog);
   var compactWindowsPassViewer = !!(ACM_HOST_IS_WINDOWS && compactPassViewer);
   var wrapChars = compactWindowsPassViewer
      ? Math.max(32, Math.floor(textWidth / 6.2))
      : Math.max(68, Math.floor(textWidth / (ACM_HOST_IS_WINDOWS ? 4.7 : 4.9)));
   var parts = displayText.split(" - ");
   var lines = [];
   var current = "";
   for (var i = 0; i < parts.length; ++i) {
      var piece = parts[i];
      var next = current.length > 0 ? current + " - " + piece : piece;
      if (current.length > 0 && next.length > wrapChars) {
         lines.push(current);
         current = piece;
      } else {
         current = next;
      }
   }
   if (current.length > 0)
      lines.push(current);
   return { raw: rawText, wrapped: lines.join("\n") };
}

function acmPassComboDisplayName(pass, dialog) {
   if (!pass)
      return "";
   if (ACM_HOST_IS_WINDOWS && dialog && dialog.layoutMode === "compact") {
      if (pass.id === "pass-1")
         return "Base";
      var match = String(pass.name || "").match(/(\d+)/);
      if (match)
         return "Pass " + match[1];
      return "Pass";
   }
   return pass.name;
}

function acmPassViewerTextWidth(dialog, hasDeleteButton) {
   var viewportWidth = dialog && dialog.passViewerHost && dialog.passViewerHost.viewport ? dialog.passViewerHost.viewport.width : 0;
   var hostWidth = dialog && dialog.passViewerHost ? dialog.passViewerHost.width : 0;
   var panelWidth = dialog && dialog.passViewerPanel ? dialog.passViewerPanel.width : 0;
   var width = Math.max(viewportWidth, hostWidth, panelWidth);
   if (ACM_HOST_IS_WINDOWS && dialog && dialog.layoutMode === "compact")
      width = Math.min(width || 0, 330);
   if (width < 360)
      width = acmDialogIsCompactMode(dialog) ? (ACM_HOST_IS_WINDOWS ? 330 : 760) : (ACM_HOST_IS_WINDOWS ? 640 : 820);
   var deleteAllowance = hasDeleteButton ? 30 : 0;
   return Math.max(180, width - deleteAllowance - (ACM_HOST_IS_WINDOWS && dialog && dialog.layoutMode === "compact" ? 58 : 42));
}

function acmConfigurePassViewerLabel(label, text, dialog, hasDeleteButton) {
   if (!label)
      return 24;
   var textWidth = acmPassViewerTextWidth(dialog, hasDeleteButton);
   var fontSize = label.font && label.font.pixelSize ? label.font.pixelSize : 10;
   var lineHeight = Math.max(13, fontSize + (ACM_HOST_IS_WINDOWS ? 4 : 3));
   var rowHeight = acmEstimateWrappedTextHeight(text, textWidth, lineHeight, lineHeight + 6);
   rowHeight = Math.min(ACM_HOST_IS_WINDOWS ? 58 : 50, Math.max(ACM_HOST_IS_WINDOWS ? 22 : 20, rowHeight));
   label.setFixedWidth(textWidth);
   label.setMinHeight(rowHeight);
   label.scaledMinHeight = rowHeight;
   return rowHeight;
}

function acmClipTextToWidth(text, font, maxWidth) {
   var value = String(text || "");
   if (!font || maxWidth <= 0)
      return "";
   if (font.width(value) <= maxWidth)
      return value;
   var suffix = "...";
   var suffixWidth = font.width(suffix);
   if (suffixWidth >= maxWidth)
      return "";
   var lo = 0;
   var hi = value.length;
   while (lo < hi) {
      var mid = Math.ceil((lo + hi) / 2);
      if (font.width(value.substring(0, mid)) + suffixWidth <= maxWidth)
         lo = mid;
      else
         hi = mid - 1;
   }
   return value.substring(0, lo) + suffix;
}

function acmConfigurePassViewerRowControl(rowControl, textInfo, dialog, hasDeleteButton, checked, passId) {
   if (!rowControl)
      return 24;
   var textWidth = acmPassViewerTextWidth(dialog, hasDeleteButton);
   var compactPassViewer = acmDialogIsCompactMode(dialog);
   var compactWindowsPassViewer = !!(ACM_HOST_IS_WINDOWS && compactPassViewer);
   var fontSize = ACM_HOST_IS_WINDOWS ? 12 : (compactPassViewer ? 9 : 10);
   var lineHeight = Math.max(compactWindowsPassViewer ? 14 : 13, fontSize + (ACM_HOST_IS_WINDOWS ? 4 : 3));
   var rowHeight = acmEstimateWrappedTextHeight(textInfo.wrapped, textWidth, lineHeight, lineHeight + 6);
   if (ACM_HOST_IS_WINDOWS)
      rowHeight = 24;
   else if (compactPassViewer)
      rowHeight = 24;
   else
      rowHeight = Math.min(58, Math.max(22, rowHeight));
   rowControl.acmTextLines = (ACM_HOST_IS_WINDOWS || compactPassViewer) ? [String(textInfo.wrapped || "").replace(/\n/g, " ")] : String(textInfo.wrapped || "").split("\n");
   rowControl.acmRawText = textInfo.raw;
   rowControl.acmChecked = !!checked;
   rowControl.acmPassId = passId;
   rowControl.acmFontSize = fontSize;
   rowControl.acmLineHeight = lineHeight;
   rowControl.acmCompactPassViewer = compactPassViewer;
   rowControl.toolTip = textInfo.raw;
   rowControl.setMinWidth(compactPassViewer ? 220 : Math.max(220, textWidth + 34));
   rowControl.setFixedHeight(rowHeight);
   rowControl.scaledMinHeight = rowHeight;
   rowControl.maxHeight = rowHeight;
   rowControl.onPaint = function() {
      var g = new Graphics(this);
      g.brush = new Brush(ACM_GRAY_UI_THEME.passViewer);
      g.fillRect(0, 0, this.width, this.height, g.brush);
      var font = new Font;
      font.pixelSize = this.acmFontSize || 10;
      if (this.acmCompactPassViewer)
         font.bold = true;
      g.font = font;
      var radioX = 12;
      var radioY = Math.round(this.height * 0.5);
      g.brush = new Brush(0xffffffff);
      g.pen = new Pen(0xff777777, 1);
      g.drawEllipse(radioX - 6, radioY - 6, radioX + 6, radioY + 6);
      if (this.acmChecked) {
         g.brush = new Brush(0xff111111);
         g.pen = new Pen(0xff111111, 2);
         g.drawEllipse(radioX - 2, radioY - 2, radioX + 2, radioY + 2);
      }
      g.pen = new Pen(this.acmCompactPassViewer ? 0xff000000 : 0xff161616, 1);
      var lines = this.acmTextLines || [];
      var x = 34;
      var y = (ACM_HOST_IS_WINDOWS || this.acmCompactPassViewer)
         ? Math.round((this.height + g.font.ascent - g.font.descent) * 0.5)
         : 5 + g.font.ascent;
      var step = this.acmLineHeight || 14;
      var maxTextWidth = Math.max(0, this.width - x - 8);
      for (var i = 0; i < lines.length; ++i) {
         var line = (ACM_HOST_IS_WINDOWS || this.acmCompactPassViewer) ? acmClipTextToWidth(lines[i], g.font, maxTextWidth) : lines[i];
         g.drawText(x, y + i * step, line);
      }
      g.end();
   };
   return rowHeight;
}

function acmWindowsPassViewerRowHeight() {
   return 24;
}

function acmWindowsPassViewerBodyHeight(dialog) {
   return acmWindowsPassViewerRowHeight() * ACM_MAX_REFINEMENT_PASSES;
}

function acmWindowsPassViewerTooltip(dialog) {
   if (!dialog || !dialog.editorState || !(dialog.editorState.passes instanceof Array))
      return "";
   var lines = [];
   for (var i = 0; i < dialog.editorState.passes.length; ++i) {
      var pass = dialog.editorState.passes[i];
      lines.push(acmFormatPassViewerWrappedRowText(pass, dialog, pass.id !== "pass-1").raw);
   }
   return lines.join("\n");
}

function acmConfigureWindowsPassViewerCanvas(body, dialog) {
   if (!body || !dialog)
      return;
   var bodyHeight = acmWindowsPassViewerBodyHeight(dialog);
   body.acmDialogRef = dialog;
   body.acmRowHeight = acmWindowsPassViewerRowHeight();
   body.toolTip = acmWindowsPassViewerTooltip(dialog);
   body.setMinWidth(260);
   body.setFixedHeight(bodyHeight);
   body.scaledMinHeight = bodyHeight;
   body.maxHeight = bodyHeight;
   body.onMouseMove = function(x, y) {
      var dialog = this.acmDialogRef;
      if (!dialog || !dialog.editorState || !(dialog.editorState.passes instanceof Array))
         return;
      var rowIndex = Math.floor(y / Math.max(1, this.acmRowHeight || 24));
      if (rowIndex >= 0 && rowIndex < dialog.editorState.passes.length) {
         var pass = dialog.editorState.passes[rowIndex];
         this.toolTip = acmFormatPassViewerWrappedRowText(pass, dialog, pass.id !== "pass-1").raw;
      } else {
         this.toolTip = acmWindowsPassViewerTooltip(dialog);
      }
   };
   body.onMousePress = function(x, y) {
      var dialog = this.acmDialogRef;
      if (!dialog || !dialog.editorState || !(dialog.editorState.passes instanceof Array))
         return;
      var rowIndex = Math.floor(y / Math.max(1, this.acmRowHeight || 24));
      if (rowIndex < 0 || rowIndex >= dialog.editorState.passes.length)
         return;
      var pass = dialog.editorState.passes[rowIndex];
      var deleteLeft = this.width - 19;
      if (pass.id !== "pass-1" && x >= deleteLeft) {
         dialog.editorState.activePassId = pass.id;
         dialog.deleteActivePass();
         return;
      }
      dialog.editorState.activePassId = pass.id;
      dialog.refreshFromState();
      dialog.markPreviewStale();
   };
   body.onPaint = function() {
      var dialog = this.acmDialogRef;
      var g = new Graphics(this);
      g.brush = new Brush(ACM_GRAY_UI_THEME.passViewer);
      g.fillRect(0, 0, this.width, this.height, g.brush);
      if (!dialog || !dialog.editorState || !(dialog.editorState.passes instanceof Array)) {
         g.end();
         return;
      }

      var font = new Font;
      font.pixelSize = 12;
      font.bold = true;
      g.font = font;
      var rowHeight = Math.max(1, this.acmRowHeight || 24);
      var radioX = 14;
      var textX = 34;
      var deleteX = this.width - 14;
      var maxTextWidth = Math.max(0, this.width - textX - 26);
      for (var i = 0; i < dialog.editorState.passes.length; ++i) {
         var pass = dialog.editorState.passes[i];
         var yTop = i * rowHeight;
         var yMid = yTop + Math.round(rowHeight * 0.5);
         var baseline = yTop + Math.round((rowHeight + g.font.ascent - g.font.descent) * 0.5);
         if (pass.id === dialog.editorState.activePassId) {
            g.brush = new Brush(0xffeeeeee);
            g.fillRect(0, yTop, this.width, yTop + rowHeight, g.brush);
         }
         g.brush = new Brush(0xffffffff);
         g.pen = new Pen(0xff777777, 1);
         g.drawEllipse(radioX - 6, yMid - 6, radioX + 6, yMid + 6);
         if (pass.id === dialog.editorState.activePassId) {
            g.brush = new Brush(0xff111111);
            g.pen = new Pen(0xff111111, 2);
            g.drawEllipse(radioX - 2, yMid - 2, radioX + 2, yMid + 2);
         }
         var textInfo = acmFormatPassViewerWrappedRowText(pass, dialog, pass.id !== "pass-1");
         var displayText = String(textInfo.wrapped || "").replace(/\n/g, " ");
         if (pass.id !== "pass-1")
            maxTextWidth = Math.max(0, this.width - textX - 32);
         else
            maxTextWidth = Math.max(0, this.width - textX - 8);
         g.pen = new Pen(0xff111111, 1);
         g.drawText(textX, baseline, acmClipTextToWidth(displayText, g.font, maxTextWidth));
         if (pass.id !== "pass-1") {
            g.pen = new Pen(0xff5f5f5f, 1);
            g.drawRect(new Rect(deleteX - 5, yMid - 5, deleteX + 5, yMid + 5));
            g.drawLine(deleteX - 3, yMid - 3, deleteX + 3, yMid + 3);
            g.drawLine(deleteX + 3, yMid - 3, deleteX - 3, yMid + 3);
         }
      }
      g.end();
   };
}

function acmPassViewerBodyHeight(dialog, contentHeight) {
   return Math.max(1, contentHeight);
}

var ACM_LAST_RECIPE_PATH = "";
var ACM_LAST_SAVE_PATH = "";
var ACM_TAB_HUE = "hueShift";
var ACM_TAB_SAT = "saturation";
var ACM_TAB_LUM = "luminance";
var ACM_MAX_REFINEMENT_PASSES = 4;
var __acmPoc8Dialog = null;

function chooseRecipeFile() {
   var ofd = new OpenFileDialog;
   ofd.caption = "Load Astro Color Mixer Adjustment Set";
   ofd.multipleSelections = false;
   ofd.filters = [
      ["Astro Color Mixer Adjustment Set", "*.json"],
      ["JSON Files", "*.json"],
      ["All Files", "*"]
   ];

   if (!ofd.execute())
      return "";

   var filePath = "";
   if (typeof ofd.fileName === "string" && ofd.fileName.length > 0)
      filePath = ofd.fileName;
   else if (ofd.fileNames && ofd.fileNames.length > 0)
      filePath = ofd.fileNames[0];
   return filePath;
}

function chooseRecipeSaveFile(defaultBaseName) {
   var sfd = new SaveFileDialog;
   sfd.caption = "Save Astro Color Mixer Adjustment Set";
   sfd.overwritePrompt = true;
   sfd.filters = [
      ["Astro Color Mixer Adjustment Set", "*.json"],
      ["JSON Files", "*.json"]
   ];
   if (ACM_LAST_SAVE_PATH)
      sfd.initialPath = ACM_LAST_SAVE_PATH;
   else
      sfd.initialPath = File.systemTempDirectory + "/" + (defaultBaseName || "AstroColorMixer_Recipe") + ".json";
   if (!sfd.execute())
      return "";
   return sfd.fileName;
}

function loadRecipeFromFile(filePath) {
   var f = new File;
   try {
      f.openForReading(filePath);
      var buffer = f.read(DataType_ByteArray, f.size);
      f.close();
      var text = typeof buffer.utf8ToString === "function" ? buffer.utf8ToString(0, buffer.length) : buffer.toString();
      var parsed;
      try {
         parsed = JSON.parse(text);
      } catch (jsonError) {
         throw new Error("The selected file is not valid JSON:\n" + filePath + "\n\n" + jsonError.message);
      }
      return acmNormalizeRecipe(parsed);
   } catch (error) {
      if (f.isOpen)
         f.close();
      throw new Error("Unable to read recipe file:\n" + filePath + "\n\n" + (error && error.message ? error.message : String(error)));
   }
}

function saveRecipeToFile(filePath, recipe) {
   var text = JSON.stringify(recipe, null, 2) + "\n";
   var file = new File;
   file.createForWriting(filePath);
   file.write(ByteArray.stringToUTF8(text));
   file.close();
}

function acmLoadTextFile(filePath) {
   var f = new File;
   try {
      f.openForReading(filePath);
      var buffer = f.read(DataType_ByteArray, f.size);
      f.close();
      return typeof buffer.utf8ToString === "function" ? buffer.utf8ToString(0, buffer.length) : buffer.toString();
   } catch (error) {
      if (f.isOpen)
         f.close();
      throw error;
   }
}

function acmShowTextDialog(title, text) {
   function resetDocumentationScrollToTop(scrollBox) {
      if (!scrollBox)
         return;
      try {
         scrollBox.horizontalScrollPosition = 0;
         scrollBox.verticalScrollPosition = 0;
         scrollBox.viewport.update();
      } catch (ex1) {
      }
   }

   var dialog = new Dialog;
   dialog.windowTitle = title;
   dialog.userResizable = true;
   dialog.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0x00000000, 0);
      g.brush = new Brush(ACM_GRAY_UI_THEME.window);
      g.fillRect(0, 0, this.width, this.height, g.brush);
      g.end();
   };

   var docFontSize = ACM_HOST_IS_WINDOWS ? 18 : 15;
   var docFont = new Font;
   docFont.pixelSize = docFontSize;
   var docText = String(text || "");
   var docSourceLines = docText.split("\n");
   var docLineHeight = docFontSize + 7;
   var docWrappedLines = [];
   var docWrapWidth = -1;
   var docContentHeight = 720;

   function rebuildDocumentationLines(graphics, width) {
      var maxWidth = Math.max(120, width - 24);
      if (docWrapWidth === maxWidth && docWrappedLines.length > 0)
         return;
      docWrapWidth = maxWidth;
      docWrappedLines = [];
      for (var i = 0; i < docSourceLines.length; ++i) {
         var line = docSourceLines[i];
         if (line.length === 0) {
            docWrappedLines.push("");
            continue;
         }
         var words = line.split(" ");
         var current = "";
         for (var w = 0; w < words.length; ++w) {
            var word = words[w];
            var test = current.length > 0 ? current + " " + word : word;
            if (current.length > 0 && graphics.font.width(test) > maxWidth) {
               docWrappedLines.push(current);
               current = word;
            } else {
               current = test;
            }
         }
         docWrappedLines.push(current);
      }
      docContentHeight = Math.max(720, docWrappedLines.length * docLineHeight + 24);
   }

   var scrollBox = new ScrollBox(dialog);
   scrollBox.autoScroll = false;
   scrollBox.setMinWidth(1100);
   scrollBox.setMinHeight(720);
   scrollBox.backgroundColor = ACM_GRAY_UI_THEME.panel;
   scrollBox.viewport.backgroundColor = ACM_GRAY_UI_THEME.panel;

   function updateDocumentationScrollRange() {
      var visibleHeight = Math.max(1, scrollBox.viewport.height);
      if (docWrappedLines.length === 0)
         docContentHeight = Math.max(720, docSourceLines.length * docLineHeight + 24);
      scrollBox.setHorizontalScrollRange(0, 0);
      scrollBox.setVerticalScrollRange(0, Math.max(0, docContentHeight - visibleHeight));
   }

   scrollBox.viewport.onResize = function() {
      docWrapWidth = -1;
      updateDocumentationScrollRange();
      this.update();
   };

   scrollBox.viewport.onMouseWheel = function(x, y, delta, buttonState, modifiers) {
      var wheelUnits = Math.max(1, Math.min(2, Math.round(Math.abs(delta) / 120)));
      var step = Math.max(6, Math.round(docLineHeight * 0.55 * wheelUnits));
      var next = this.parent.verticalScrollPosition - (delta > 0 ? step : -step);
      this.parent.verticalScrollPosition = acmClamp(next, 0, this.parent.maxVerticalScrollPosition);
      this.update();
   };

   scrollBox.viewport.onPaint = function(x0, y0, x1, y1) {
      var g = new Graphics(this);
      g.font = docFont;
      rebuildDocumentationLines(g, this.width);
      updateDocumentationScrollRange();
      g.brush = new Brush(ACM_GRAY_UI_THEME.panel);
      g.fillRect(0, 0, this.width, this.height, g.brush);
      g.pen = new Pen(0xfff2f2f2);
      var scrollY = this.parent.verticalScrollPosition;
      var firstLine = Math.max(0, Math.floor(scrollY / docLineHeight));
      var yBase = 12 - (scrollY - firstLine * docLineHeight) + g.font.ascent;
      var visibleLines = Math.ceil(this.height / docLineHeight) + 2;
      for (var i = 0; i < visibleLines && firstLine + i < docWrappedLines.length; ++i) {
         var line = docWrappedLines[firstLine + i];
         if (line.length > 0)
            g.drawText(12, yBase + i * docLineHeight, line);
      }
      g.end();
   };

   var noteLabel = new Label(dialog);
   acmSetThemeLabel(noteLabel, "Scroll to read the full document.", ACM_GRAY_UI_THEME.text, false);
   var closeButton = new PushButton(dialog);
   closeButton.text = "Close";
   closeButton.onClick = function() { dialog.ok(); };

   var buttons = new HorizontalSizer;
   buttons.add(noteLabel);
   buttons.addStretch();
   buttons.add(closeButton);
   dialog.sizer = new VerticalSizer;
   dialog.sizer.margin = 8;
   dialog.sizer.spacing = 8;
   dialog.sizer.add(scrollBox, 100);
   dialog.sizer.add(buttons);
   dialog.adjustToContents();
   updateDocumentationScrollRange();
   resetDocumentationScrollToTop(scrollBox);
   if (typeof Timer !== "undefined") {
      dialog.acmDocumentationStartTimer = new Timer;
      dialog.acmDocumentationStartTimer.interval = 0.05;
      dialog.acmDocumentationStartTimer.periodic = false;
      dialog.acmDocumentationStartTimer.onTimeout = function() {
         updateDocumentationScrollRange();
         resetDocumentationScrollToTop(scrollBox);
      };
      dialog.acmDocumentationStartTimer.start();
   }
   dialog.execute();
}

var ACM_FAQ_TEXT = [
   "ASTRO COLOR MIXER FAQ & PRACTICAL GUIDE",
   "",
   "Astro Color Mixer is a nonlinear RGB color and luminance refinement tool for astrophotography. It is intended for images that have already been calibrated, registered, integrated, color balanced, and stretched. It is not a replacement for calibration, linear processing, background correction, or broad color correction. It is a focused finishing and refinement tool for controlled color-band, luminance-range, and multi-pass adjustments.",
   "",
   "1. WHAT IS ASTRO COLOR MIXER?",
   "",
   "Astro Color Mixer is built for nonlinear RGB color-band refinement. Instead of making arbitrary global color swings, it lets you work in practical astro editing regions such as H-alpha reds, warm dust and galaxy cores, OIII cyans, reflection blues, violet drift, magenta halos, and background-oriented low-saturation areas.",
   "",
   "It is designed for nebulae, galaxies, dust, halos, stars, and background refinement. The primary workflow creates a new output image so the original source view remains unchanged. The Apply to Target command is available for deliberate target writes and respects an active PixInsight mask.",
   "",
   "2. WHERE DOES IT FIT IN A PIXINSIGHT WORKFLOW?",
   "",
   "Use Astro Color Mixer after the image has already gone through the core imaging stages:",
   "",
   "  - calibration",
   "  - registration and integration",
   "  - background correction",
   "  - color calibration",
   "  - nonlinear stretch",
   "  - initial noise reduction or contrast shaping as appropriate",
   "",
   "Typical placement is after the image is already nonlinear, when you want controlled final color and luminance refinement. It can be used on stars-present images, starless images, or separate starless/star layers depending on the target and your workflow.",
   "",
   "3. WHAT KIND OF IMAGE SHOULD I USE?",
   "",
   "Use a nonlinear RGB image. Do not use the tool on raw linear stacks or as a substitute for earlier calibration work. The input should already have a sensible stretch and broadly reasonable color. The tool works on both stars-present and starless images, and the Image Type setting tells the processing model which protection behavior to use. Preview is downsampled for speed, while Create Image processes the full-resolution source.",
   "",
   "3A. WHAT IS THE DIFFERENCE BETWEEN STARS PRESENT AND STARLESS?",
   "",
   "The Image Type setting changes how Astro Color Mixer protects the image during color and luminance adjustments.",
   "",
   "Stars Present is intended for images that still contain normal stars. It uses more conservative highlight and star-core protection so adjustments are less likely to damage bright stars, push star cores into odd colors, or exaggerate halos.",
   "",
   "Starless is intended for images where stars have been removed. Since there are fewer bright star structures to protect, the tool can act more freely on nebulae, galaxies, dust, and faint color regions.",
   "",
   "This setting does not remove stars and does not create a star mask. It only changes the protection behavior used while applying the adjustment.",
   "",
   "Practical guidance:",
   "",
   "  - Use Stars Present for normal RGB images with stars.",
   "  - Use Starless for nebula, galaxy, or dust processing after stars have been removed.",
   "  - If unsure, start with Stars Present because it is the safer mode.",
   "  - Always inspect the preview and mask views before applying strong changes.",
   "",
   "3B. WHAT DO THE PROTECTION CHECKBOXES DO?",
   "",
   "Protect Stars uses a compact-star protection mask together with highlight protection. It is intended to reduce unwanted color changes in star cores, many normal stars, and some halos. It is not a full star-removal or StarNet-style star mask, and it cannot perfectly protect every bright halo, bloated star, or tiny faint star in an aggressive edit.",
   "",
   "Protect Low Sat reduces hue-band edits in very low-saturation pixels. This protects noisy neutral regions where hue is unreliable, but it also protects faint low-color halo fields around bright stars. Turning it off lets Astro Color Mixer reach weak broadband color in galaxy arms, dust, and faint structures more aggressively, but it also removes an important guardrail.",
   "",
   "For normal refinements on stars-present images, leave both protections enabled. For aggressive faint-color extraction from galaxies or dust, a starless workflow is strongly recommended: remove or separate the stars, work the starless image, then recombine the stars later.",
   "",
   "If you do turn Protect Low Sat off on a stars-present image, use restraint. Several modest passes are usually safer than one huge pass with multiple sliders pushed to extremes. Extreme single-pass moves can create blotchy red/orange color, noisy neutral regions, or colored halos around stars.",
   "",
   "3C. WHAT DOES COMPACT MODE CHANGE?",
   "",
   "Compact mode is a space-saving layout for smaller or crowded PixInsight workspaces. It keeps the same processing model, adjustment controls, preview behavior, passes, masks, probe math, histogram, polar plot, and output behavior as Standard mode.",
   "",
   "The difference is presentation. Compact mode compresses the header and control areas, keeps diagnostics and passes available, and uses tighter Windows compact control spacing where needed. Standard mode remains the more spacious layout for detailed review.",
   "",
   "Standard and Compact remember their window sizes separately so changing modes should not require recovering an old stale window size.",
   "",
   "3D. WHY AM I SEEING A DISPLAY SCALING WARNING?",
   "",
   "Astro Color Mixer checks the display workspace size that PixInsight reports when the script starts. On some systems, especially Windows laptops, the operating system can scale the display so PixInsight reports a smaller logical workspace than the physical monitor resolution might suggest.",
   "",
   "For example, a 1920 x 1080 Windows laptop using 125% scaling may be reported to PixInsight as roughly 1536 x 864. That can make a window designed for a larger workspace appear clipped, too large, or difficult to resize.",
   "",
   "On Windows, check Windows Settings > System > Display > Scale. If Scale is above 100%, Recommended, or Auto, set it to 100%, then restart PixInsight and run Astro Color Mixer again.",
   "",
   "On macOS, check System Settings > Displays and choose a setting that provides more screen space, then restart PixInsight.",
   "",
   "This is an operating system display setting. It is not a PixInsight setting and not an Astro Color Mixer setting.",
   "",
   "4. BASIC WORKFLOW",
   "",
   "  1. Open a nonlinear RGB image.",
   "  2. Choose Image Type:",
   "     - Stars Present for normal RGB images with stars.",
   "     - Starless for starless images.",
   "  3. Start with Base Pass for broad work.",
   "  3A. For aggressive galaxy or dust color extraction, strongly consider working starless.",
   "  4. Use Hue, Saturation, and Luminance tabs for color-band adjustments.",
   "  5. Click the preview to probe useful pixels and confirm which band is active.",
   "  6. Adjust Hue Radius and Feather when a band needs to be narrower, broader, or smoother.",
   "  6A. On starless data, use Selected Band Blur only when a hard mask edge is visible.",
   "  7. Use Current Band Mask, Range Mask, or Combined Mask preview modes before strong edits.",
   "  8. Add a Refinement Pass for targeted work such as halos, background, highlights, or faint signal.",
   "  9. Use Range Mask when the change should affect only a luminance slice.",
   "  10. Compare Adjusted to Original or Last Pass.",
   "  11. Create Image when the result is ready.",
   "  12. Save an adjustment set if the session is worth preserving.",
   "",
   "5. WHAT ARE THE COLOR BANDS?",
   "",
   "  - Red / H-alpha: broad red emission control, warm red signal, and H-alpha-biased structures.",
   "  - Orange / Dust & Galaxy Cores: warm dust lanes, core warmth, and orange stellar or core transitions.",
   "  - Yellow / Warm Stars: star warmth and yellow-gold transitions.",
   "  - Green / Cast Control: green cast suppression or restoration where needed.",
   "  - Cyan / OIII: cyan-turquoise emission and cyan star or nebula structures.",
   "  - Blue / Reflection Nebula: classic reflection nebulosity and blue halo structures.",
   "  - Purple / Violet Cleanup: violet drift, deep blue-violet transitions, and some star-edge cleanup work.",
   "  - Magenta / Halo Cleanup: magenta halos, magenta-biased star artifacts, and magenta fringe control.",
   "",
   "6. WHAT DO HUE, SATURATION, AND LUMINANCE DO?",
   "",
   "Hue shifts color direction inside the selected band. Saturation strengthens or weakens color intensity inside that band. Luminance changes the brightness of selected color regions. These edits apply only to the active Refinement Pass, which means broad and targeted work can be separated cleanly.",
   "",
   "Use small moves first. A little hue movement can be useful for correcting a color family, but large hue shifts can become artificial quickly. Saturation is often the most natural first adjustment for emission and reflection structures. Luminance is useful for emphasis, background control, and balancing bright or faint structures.",
   "",
   "6A. WHAT DOES SENSITIVITY DO?",
   "",
   "Sensitivity controls how strongly slider positions map into image adjustments. Fine gives smaller, more precise slider response. Normal is the default general-purpose setting. Strong gives larger visible changes for the same slider movement.",
   "",
   "Strong is the renamed version of the earlier Advanced setting. The behavior is the same, but the new label is clearer: it means stronger slider response, not a more complicated processing mode.",
   "",
   "7. WHAT ARE WIDTH AND FEATHER?",
   "",
   "Width controls how much of the hue neighborhood around the selected band is affected. Narrow width is more selective; wide width reaches a broader family of colors. Feather controls how softly the selection falls off beyond the stronger inner region. Higher feather produces smoother transitions and lowers the chance of abrupt color boundaries.",
   "",
   "7A. WHAT IS SELECTED BAND BLUR?",
   "",
   "Selected Band Blur is part of Band Mask Shaping. It is a spatial blur control for the active color band mask. It is different from Feather. Feather softens the transition across hue distance; Blur spatially smooths the final mask slightly across neighboring image pixels.",
   "",
   "Boost increases mask contrast by pushing brighter mask areas toward white and darker areas toward black. It is intended for mask inspection and created mask images, not as a generic image-contrast control.",
   "",
   "This can help when a strong adjustment reveals the edge of the color mask on starless nebula, galaxy, or dust data. The control is intentionally modest: Off, 1 px, 2 px, 3 px, 4 px, or 5 px.",
   "",
   "Selected Band Blur is only active in Starless mode. In Stars Present mode it is disabled because spatially blurring a color mask can bleed adjustments into star cores, halos, and nearby structures. This is not a substitute for real star masking or star protection.",
   "",
   "Use it cautiously. Start with 1 px, inspect Current Band Mask or Combined Mask, and compare before and after. Values up to 5 px can be useful for starless color-mask work, but if stars will be recombined later, keep the blur value as low as the image allows so the star layer and starless layer still blend naturally.",
   "",
   "8. WHAT IS RANGE MASK?",
   "",
   "Range Mask is a luminance-based selection. Low and High define the brightness interval, while Feather softens the inclusion edges. Range Mask Shaping provides Blur and Boost. Blur spatially smooths the Range Mask, and Boost increases mask contrast. Range Mask belongs to the active pass, not the whole tool globally.",
   "",
   "Use probe and histogram to set Low and High. The histogram shows the active range selection. A good habit is to switch Preview Mode to Range Mask or Combined Mask before making a strong edit. If the mask does not include the structures you intend to change, adjust Low, High, and Feather before touching the color sliders.",
   "",
   "9. WHAT IS NEUTRAL / LOW-SATURATION?",
   "",
   "When saturation is very low, hue becomes unreliable. Neutral / Low-Saturation is the luminance control for those pixels. It is useful for sky background, gray dust, halos, low-color transitions, and neutral structures where a hue-based edit would be misleading. This control appears with the Luminance controls.",
   "",
   "9A. WHY CAN LOW-SATURATION GALAXIES BE DIFFICULT?",
   "",
   "Some broadband galaxy images have real color in the outer arms, dust, and halo structures, but that color can be very weak. Protect Low Sat may correctly treat those pixels as unreliable hue data, which means the color sliders can appear to do very little.",
   "",
   "Turning Protect Low Sat off can help Astro Color Mixer reach that faint color, but it also removes a guardrail. The risks are blotchy color, noisy red/orange patches, uneven neutral backgrounds, and colored halos around stars.",
   "",
   "The safest approach is to work on a starless galaxy whenever possible, use modest moves, and build the result with several smaller passes instead of one aggressive pass. If you must work stars-present, keep Protect Stars enabled, inspect the mask views, and compare often.",
   "",
   "10. WHAT ARE REFINEMENT PASSES?",
   "",
   "Refinement Passes are editable sequential processing passes. Base Pass is usually where broad global work begins. Additional passes are best for targeted changes such as background control, halo cleanup, or highlight-specific luminance shaping. They are not Photoshop layers: there are no blend modes and no opacity sliders. Passes are applied in order.",
   "",
   "Use separate passes when the intent is different. For example, broad nebula saturation, magenta halo cleanup, and neutral background darkening should usually be separate passes. This makes the session easier to inspect, revise, and save as an adjustment set.",
   "",
   "11. WHAT DO PROBE, HISTOGRAM, AND POLAR PLOT DO?",
   "",
   "The probe samples a preview pixel and reports luminance, hue, and saturation. The histogram helps you see the preview luminance distribution and place a Range Mask intelligently. The polar plot shows hue angle and saturation radius for sampled preview pixels. If hue is reliable, the probe can auto-select the nearest color band to help you navigate the image.",
   "",
   "Plot Info explains the polar plot and summarizes the current probe, selected band, Range Mask state, and delayed Changed / Strong estimate. Changed estimates how much of the preview visibly moved after the most recent preview update. Strong estimates the subset with larger channel movement. This is preview-resolution guidance, not photometry.",
   "",
   "12. WHAT ARE MASK VIEWS?",
   "",
   "Mask views let you see what the current band, the Range Mask, or the combined mask is including. In general terms, white means strongly included and black means largely excluded. They are especially useful before strong saturation, luminance, or cleanup adjustments. In Starless mode, Current Band Mask and Combined Mask reflect any selected-band Blur value.",
   "",
   "12A. WHAT IS DIFFERENCE PREVIEW?",
   "",
   "Difference preview shows where the current adjustment changes the image. Dark areas changed little or not at all. Brighter or more colorful areas changed more. The display is amplified with preview-only gain so subtle color work is easier to see.",
   "",
   "Difference preview is diagnostic only. Create Image and Apply to Target always write the normal adjusted image, not the difference view.",
   "",
   "13. WHY CAN PREVIEW DIFFER FROM FINAL OUTPUT?",
   "",
   "Preview is based on downsampled data for speed and responsiveness. At high zoom levels, the tool can render a detail crop for the visible region. Create Image processes the full-resolution source. Fine detail and microstructure can differ slightly, but the overall direction of the result should remain consistent with the preview.",
   "",
   "14. WHAT IS AN ADJUSTMENT SET?",
   "",
   "Adjustment sets are JSON settings files. They preserve passes, sliders, selected band settings, Width, Feather, selected-band Blur values, Range Mask values, image type, sensitivity, and related adjustment state. They are useful for repeatability, documentation, sharing, and complex multi-pass sessions.",
   "",
   "15. COMMON MISTAKES",
   "",
   "  - Using the tool on linear data instead of nonlinear RGB.",
   "  - Making extreme hue shifts when a narrower, more targeted pass would be cleaner.",
   "  - Enabling Range Mask without checking the mask views first.",
   "  - Doing highly targeted work in Base Pass instead of a new Refinement Pass.",
   "  - Trusting hue in neutral or low-saturation background regions.",
   "  - Turning off Protect Low Sat and then driving several sliders to extremes on a stars-present image.",
   "  - Expecting Protect Stars to replace a true starless workflow for aggressive galaxy color extraction.",
   "  - Trying to do one huge low-color rescue pass when several smaller passes would be cleaner.",
   "  - Using mask blurring as if it were star protection. It is only active for starless or starless work.",
   "  - Ignoring a display workspace warning when the operating system is using Windows Display Scaling, Recommended, Auto, or a macOS display mode with reduced screen space.",
   "  - Forgetting that the preview is stale after changing controls.",
   "  - Using Apply to Target when a new output image would be safer.",
   "  - Treating the band names as strict physical classifications instead of practical editing regions.",
   "",
   "16. CREATE IMAGE VS APPLY TO TARGET",
   "",
   "Create Image is the safest primary output path. It writes the adjusted result to a new PixInsight image window and leaves the target unchanged.",
   "",
   "Apply to Target writes the adjusted result back into the selected target image. PixInsight undo should normally be available, and an active PixInsight mask is respected, but this is still a more direct operation. Use it when you are intentionally working in-place.",
   "",
   "17. EXAMPLE WORKFLOWS",
   "",
   "A. Boosting faint blue reflection nebulosity",
   "  Start in Base Pass or a dedicated reflection pass. Increase Blue / Reflection Nebula saturation modestly, inspect the mask view, then narrow Width if blue stars begin to move more than the nebula. Use Range Mask if you only want the faint reflection structures and not the brightest highlights.",
   "",
   "B. Reducing magenta halos",
   "  Add a new Refinement Pass. Focus on Magenta / Halo Cleanup and possibly Purple / Violet Cleanup. Use a narrower Width and enough Feather to keep transitions smooth. If the halos are mostly around bright stars, use Range Mask so the pass is concentrated in the brighter zones where the artifact lives.",
   "",
   "C. Darkening or smoothing neutral background with Range Mask",
   "  Work on the Luminance tab and use Neutral / Low-Saturation rather than a hue band. Enable Range Mask and target the dim background interval. Make a small luminance move, inspect the histogram and mask view, and keep the pass separate from your broad color pass so the workflow stays readable.",
   "",
   "D. Conservative stars-present color cleanup",
   "  Use Stars Present mode. Work with small saturation and hue changes, inspect Current Band Mask before strong edits, and use Range Mask if the change should avoid bright star cores. If star color begins to look forced, reduce the adjustment or split the work into a narrower pass.",
   "",
   "E. Starless nebula refinement before recombination",
   "  Use Starless mode. Add passes for broad nebula saturation, local cyan or red balance, and faint structure luminance. If a strong selected-band edit reveals a hard mask boundary, try 1 px of selected-band Blur and inspect the mask view before going farther. Keep adjustments moderate if stars will be recombined later so the star layer and nebula layer still feel coherent.",
   "",
   "F. Aggressive low-color galaxy extraction",
   "  The safest workflow is to separate or remove stars first, then use Astro Color Mixer on the starless galaxy. If working stars-present, keep Protect Stars enabled, inspect Star Protection Mask, and turn Protect Low Sat off only when necessary. Use multiple smaller passes rather than one extreme pass, because low-saturation pixels can become blotchy when pushed too hard."
].join("\n");

var ACM_TECHNICAL_APPENDIX_TEXT = [
   "ASTRO COLOR MIXER TECHNICAL APPENDIX",
   "",
   "This appendix describes the processing model used by Astro Color Mixer. It is both a technical overview and a compact white paper for the tool. Astro Color Mixer is designed for nonlinear RGB astrophotography images and combines hue-band selection, luminance-range masking, low-saturation handling, protection weighting, preview diagnostics, and sequential refinement passes.",
   "",
   "1. DESIGN GOALS",
   "",
   "Astro Color Mixer is designed for controlled nonlinear RGB color refinement. The main goals are:",
   "",
   "  - provide practical astrophotography-specific color bands",
   "  - avoid arbitrary global color swings",
   "  - give the user mask and diagnostic feedback before committing changes",
   "  - support broad and targeted refinements through ordered passes",
   "  - protect unstable dark, bright, and low-saturation regions",
   "  - preserve a non-destructive workflow by creating a new output image by default",
   "",
   "2. PROCESSING ASSUMPTIONS",
   "",
   "  - input is nonlinear RGB",
   "  - values are normalized internally to 0..1",
   "  - source image is not overwritten",
   "  - preview uses a downsampled representation for responsiveness",
   "  - Apply to New Image uses the full-resolution image",
   "  - adjustments are intended as post-stretch refinements, not calibration operations",
   "",
   "High-level pipeline:",
   "",
   "source RGB -> preview/full-resolution working copy -> enabled pass loop -> band and neutral masks -> chroma/luminance adjustment -> clamp -> output image",
   "",
   "2A. DISPLAY WORKSPACE DETECTION",
   "",
   "Astro Color Mixer uses the screen workspace size exposed by PixInsight to decide whether to show a display warning. The script does not directly read the Windows or macOS display scaling percentage. Instead, it detects the practical failure condition: PixInsight reports an available workspace smaller than the layout target.",
   "",
   "On Windows, the warning is shown when the reported workspace is below 1700 x 900. This often corresponds to Windows Display Scaling above 100%, Recommended, or Auto on a 1920 x 1080 laptop. A physical 1920 x 1080 display at 125% scaling can be reported to PixInsight as roughly 1536 x 864 logical pixels.",
   "",
   "On macOS, the warning is shown when the reported workspace is below 1360 x 780. This can happen when macOS display scaling is set to a mode that provides less screen space.",
   "",
   "The warning is informational only. It does not change processing, preview math, masks, recipes, passes, output behavior, or layout sizes. It tells the user where to change the operating system display setting and recommends restarting PixInsight so the script sees the updated workspace.",
   "",
   "3. LUMINANCE MODEL",
   "",
   "Y = 0.2126 R + 0.7152 G + 0.0722 B",
   "",
   "Luminance is used as a practical structural guide for Range Masking, diagnostics, neutral luminance handling, and dark/highlight protection. In a nonlinear astrophotography workflow, luminance remains one of the most useful stable signals for selecting where an edit should be allowed to act.",
   "",
   "4. HUE AND SATURATION MODEL",
   "",
   "Hue and saturation are used for selection and editing. Hue is circular, so distances are measured around a wrapped 0..360 degree space. Low saturation makes hue unreliable, especially in backgrounds, halos, dust transitions, and weak-color structures. Selected bands therefore use circular hue distance, while saturation reliability reduces false confidence in very low-saturation regions.",
   "",
   "5. ASTRO COLOR BANDS",
   "",
   "  - red: 0 deg",
   "  - orange: 30 deg",
   "  - yellow: 60 deg",
   "  - green: 120 deg",
   "  - cyan: 180 deg",
   "  - blue: 240 deg",
   "  - purple: 275 deg",
   "  - magenta: 315 deg",
   "",
   "These bands are practical editing regions, not strict physical emission-line definitions. Labels such as H-alpha and OIII are workflow cues to help the user think about common astrophotography structures, not claims that every selected pixel belongs to a pure emission-line source.",
   "",
   "5B. SENSITIVITY",
   "",
   "Sensitivity changes the mapping between slider positions and adjustment strength. Fine uses smaller ranges for precise late-stage work. Normal is the default general-purpose response. Strong uses the same behavior previously labeled Advanced, with larger ranges for more visible changes.",
   "",
   "Sensitivity does not change the mask model or introduce a separate processing algorithm. It changes the allowed adjustment range and gradient preview response for the sliders.",
   "",
   "5A. IMAGE TYPE: STARS PRESENT VS STARLESS",
   "",
   "Astro Color Mixer uses the Image Type setting to choose protection behavior appropriate to the image being processed.",
   "",
   "In Stars Present mode, the tool assumes the image still contains stellar profiles, bright cores, and possible halos. The protection model is more conservative around high-luminance structures. This reduces the risk of color shifts in star cores, over-saturation around halos, or harsh luminance changes in bright stellar features.",
   "",
   "Protect Stars adds a lightweight compact-star protection mask to this highlight protection. The mask searches for small bright local peaks, expands them modestly, and reduces hue-band influence in those regions. This is a practical guardrail, not a full astronomical star mask. It will not perfectly cover every large halo, bloated star field, or tiny faint star.",
   "",
   "In Starless mode, the tool assumes stars have been removed. The protection model can allow more freedom in nebular, galactic, dust, and faint-signal regions because fewer bright stellar features are present.",
   "",
   "This setting affects mask construction and protection weighting. It does not remove stars. The built-in star protection is intentionally lightweight and should not be treated as a substitute for a real starless workflow when edits are aggressive.",
   "",
   "Conceptually:",
   "",
   "  - Stars Present: stronger low-saturation caution, stronger dark/background caution, and more conservative highlight/star-core protection.",
   "  - Starless: allows more effect in faint structures, uses less restrictive highlight protection, and is useful when stars will be recombined later.",
   "",
   "6. HUE BAND MASK",
   "",
   "Each band is centered on a hue angle. Width defines the stronger affected span around that center, and Feather defines the soft transition beyond the stronger region. A smoothstep-style transition is used so the mask rolls off gradually rather than clipping abruptly.",
   "",
   "Pseudo formula:",
   "",
   "distance = circularHueDistance(hue, center)",
   "mask = 1 - smoothstep(innerWidth, outerWidth, distance)",
   "",
   "Hue Radius controls the outerWidth. Feather controls the distance between the stronger inner region and the outer falloff boundary. A higher Feather value makes the transition softer and reduces abrupt color boundaries.",
   "",
   "6A. SELECTED BAND BLUR",
   "",
   "Selected Band Blur is part of Band Mask Shaping. It is an optional spatial blur applied to the active band's final mask. It is not part of hue selection itself, and it is not a luminance Range Mask control.",
   "",
   "The distinction is important:",
   "",
   "  - Feather softens selection as hue distance approaches the edge of the selected band.",
   "  - Range Mask Feather softens luminance inclusion at the low and high range boundaries.",
   "  - Selected Band Blur smooths the already-built band mask across neighboring image pixels.",
   "",
   "The implementation uses small whole-pixel radii only: Off, 1 px, 2 px, 3 px, 4 px, or 5 px. This is intended to reduce visible mask-edge artifacts when a strong adjustment is used on starless data.",
   "",
   "Selected Band Blur is gated by Image Type. It is applied only when Image Type is Starless. In Stars Present mode, saved blur values are ignored by the processing path because spatially blurring a color mask can leak adjustments into star cores, halos, and adjacent stellar structures.",
   "",
   "Conceptual sequence for a band adjustment:",
   "",
   "rawBandMask = hueMask * saturationReliability * protection * rangeMask",
   "if imageType == starless and selectedBandBlur > 0:",
   "    workingBandMask = spatialBlur(rawBandMask, selectedBandBlur)",
   "else:",
   "    workingBandMask = rawBandMask",
   "",
   "Current Band Mask and Combined Mask preview modes show the blurred mask only when the blur value is active. Range Mask preview remains a luminance-only diagnostic and is not spatially blurred.",
   "",
   "7. SATURATION RELIABILITY",
   "",
   "Very low-saturation pixels do not carry stable hue information. Astro Color Mixer therefore uses a saturation reliability term to reduce false hue selection in neutral areas. This prevents weakly colored background pixels from being treated like confidently blue, magenta, or green structures. The Neutral / Low-Saturation luminance control provides a separate path for those pixels.",
   "",
   "The Protect Low Sat checkbox controls this guardrail for hue-band edits. When it is enabled, low-saturation pixels are deliberately harder to move. This protects noisy neutral regions and also helps protect faint low-saturation halo fields around bright stars.",
   "",
   "When Protect Low Sat is disabled, the tool can reach weak broadband color more aggressively. This is useful for low-color galaxy arms, dust, and faint structures, but it also increases the risk of blotchy color in neutral regions and colored halos around stars. For aggressive use, several smaller passes are usually safer than one large pass.",
   "",
   "Low-saturation galaxy case: A broadband galaxy can have real color in faint outer arms or dust lanes while still looking nearly neutral to a hue-based tool. With Protect Low Sat enabled, Astro Color Mixer may correctly refuse to chase that weak color. Turning Protect Low Sat off can reveal the color, but it also exposes noisy hue estimates and star-halo fields. The safest approach is a starless galaxy image, modest slider movement, mask inspection, and multiple smaller passes rather than one extreme pass.",
   "",
   "Aggressive low-saturation color extraction is best performed on a starless image whenever possible. The recommended workflow is to remove or separate the stars, apply Astro Color Mixer to the starless target, then recombine stars afterward.",
   "",
   "8. DARK AND HIGHLIGHT PROTECTION",
   "",
   "Very dark pixels can be noisy and unstable. Very bright pixels often include star cores, clipped highlights, or structures where strong hue changes can look unnatural quickly. The tool includes dark and highlight protection terms, and the chosen image type changes the behavior so stars-present and starless workflows can be handled differently.",
   "",
   "In Stars Present mode, Protect Stars also applies the compact-star mask described above. The mask mainly protects compact stellar profiles and many normal halos. Very large diffuse halos and extremely faint small stars can still be affected, especially when Protect Low Sat is disabled and multiple saturation sliders are pushed hard.",
   "",
   "These protection terms are not a substitute for user judgment. They are guardrails that make normal edits safer. Strong edits can still create artifacts if the selected mask is too broad or the adjustment is too large.",
   "",
   "9. RANGE MASK",
   "",
   "Range Mask limits the effect of a pass by luminance. Low and High define the included range, while Feather softens the shoulders at each edge.",
   "",
   "Range Mask Shaping operates after the base luminance mask is built. Blur spatially smooths the mask, and Boost increases mask contrast by pushing brighter mask values toward white and darker mask values toward black. Use the probe and histogram to set Low and High; the histogram shows the active range selection.",
   "",
   "Formula:",
   "",
   "leftRamp = smoothstep(low - feather, low, Y)",
   "rightRamp = 1 - smoothstep(high, high + feather, Y)",
   "rangeMask = clamp01(leftRamp * rightRamp)",
   "",
   "Presets are practical starting points, not fixed answers. The correct luminance interval depends on the current stretch and the imaging target.",
   "",
   "10. NEUTRAL / LOW-SATURATION ADJUSTMENT",
   "",
   "For low-saturation pixels, Astro Color Mixer uses a neutral mask rather than pretending hue is stable.",
   "",
   "Formula:",
   "",
   "neutralMask = 1 - smoothstep(satStart, satFull, saturation)",
   "",
   "This is useful when editing sky background, gray dust, faint halos, or other structures where a hue-based chroma edit is not the right model. In practice, this behaves as luminance shaping for pixels whose hue is not trustworthy.",
   "",
   "Neutral adjustment appears on the Luminance tab because it is not a hue-band chroma edit. It is intentionally separated from the color bands so neutral background and low-chroma structures can be handled without pretending they have a reliable hue.",
   "",
   "11. CHROMA-VECTOR ADJUSTMENT MODEL",
   "",
   "The processing model is practical rather than marketed as mathematically perfect color science. Conceptually, RGB is separated into a luminance-like neutral component and a chroma component. Saturation edits scale chroma magnitude, hue edits rotate chroma direction, and luminance edits modify the brightness component. The result is then recombined and clamped back into a valid nonlinear RGB range.",
   "",
   "This model is useful for post-stretch astrophotography because it gives intuitive control over perceived color families while still retaining luminance-aware selection and protection.",
   "",
   "12. COMBINED MASK",
   "",
   "For a band adjustment, the final influence is approximately the product of several control terms:",
   "",
   "finalMask =",
   "  hueMask *",
   "  saturationReliability *",
   "  darkProtection *",
   "  highlightProtection *",
   "  compactStarProtection *",
   "  rangeMask *",
   "  pass terms",
   "",
   "The exact implementation details follow the actual code path, but conceptually the tool combines hue selection, saturation reliability, luminance gating, and protection terms before the adjustment is applied.",
   "",
   "If Selected Band Blur is active, the band mask is spatially blurred after these selection terms are combined and before the hue, saturation, or luminance adjustment is applied. This means Blur changes the edge behavior of the selection mask, not the color math itself.",
   "",
   "For Neutral / Low-Saturation luminance adjustment, the neutral mask replaces hue selection as the main inclusion term. Range Mask and protection weighting can still limit where the neutral adjustment is allowed to act.",
   "",
   "13. REFINEMENT PASSES",
   "",
   "The adjustment set contains ordered passes. Enabled passes are applied sequentially, and each pass works on the result produced by the previous enabled pass. This makes it possible to combine broad global work with targeted cleanup and luminance-specific refinements without collapsing everything into one control set.",
   "",
   "Pseudo sequence:",
   "",
   "working = original",
   "for each enabled pass:",
   "    working = applyPass(working, pass)",
   "",
   "Passes are not layers. There are no blend modes and no opacity slider. A later enabled pass receives the already-adjusted result of earlier enabled passes.",
   "",
   "14. PREVIEW AND DIAGNOSTICS",
   "",
   "Preview uses a downsampled image so the tool remains responsive. Histogram calculations use preview luminance. The polar plot uses sampled preview pixels. The probe reads preview pixels. At high zoom, detail crop preview can render the visible region from source pixels. Create Image uses the full-resolution source data, which is why small local differences can appear even when the broad preview match is strong.",
   "",
   "Diagnostics are decision aids:",
   "",
   "  - Current Band Mask shows hue-band inclusion, including active selected-band Blur in Starless mode",
   "  - Range Mask shows luminance-range inclusion",
   "  - Combined Mask shows the active selection stack, including active selected-band Blur in Starless mode",
   "  - Histogram helps place luminance ranges",
   "  - Polar Plot shows hue and saturation distribution",
   "  - Probe reports local luminance, hue, saturation, and nearest reliable band",
   "  - Plot Info summarizes probe values, selected band, Range Mask state, and delayed preview change estimates",
   "",
   "Difference Preview is a diagnostic display mode. It renders abs(adjusted - original) with fixed preview-only 5x display gain. This makes subtle edits easier to see and helps reveal broad spillover, star effects, background movement, or overprocessing. Difference Preview is never written by Create Image or Apply to Target.",
   "",
   "Difference Preview is diagnostic only. The display gain is preview-only and is not used by Create Image or Apply to Target.",
   "",
   "Changed / Strong is also diagnostic only. It is computed after preview rendering from sampled preview pixels so it does not delay the visible preview update. Changed counts pixels with a nontrivial preview RGB difference; Strong counts pixels with a larger difference.",
   "",
   "14A. STANDARD AND COMPACT LAYOUT MODES",
   "",
   "Standard and Compact are UI layout modes only. They do not change the adjustment math, pass execution order, preview sampling, probe calculations, histogram logic, polar plot logic, mask generation, recipe schema, or output path.",
   "",
   "Compact mode uses alternate layout constants for constrained dialogs: shorter control labels where necessary, compressed header controls, a compact refresh control in Windows compact, smaller pass-viewer controls, and separate saved window-size keys. Diagnostics remain available in compact mode so Histogram, Polar Plot, Plot Info, and Pass Viewer information are still visible during review.",
   "",
   "Layout version prefixes are intentionally bumped when compact geometry changes so stale saved window sizes do not keep older layouts alive.",
   "",
   "15. ADJUSTMENT SET MODEL",
   "",
   "Adjustment sets are stored as JSON and preserve the important editing state, including image type, sensitivity, pass order, band settings, Width, Feather, selected-band Blur values, Range Mask configuration, and neutral luminance terms. Diagnostic readouts are interactive session tools and are not the main purpose of the saved adjustment-set file.",
   "",
   "Adjustment sets are intended for repeatability, review, documentation, and sharing. They are not a replacement for the source image and do not store preview bitmap data.",
   "",
   "16. OUTPUT MODEL",
   "",
   "Create Image builds a new PixInsight image from the full-resolution source and the current adjustment set. This is the preferred non-destructive output path.",
   "",
   "Apply to Target writes the adjusted result back to the selected target image and respects the active PixInsight mask. It is useful for deliberate in-place work, but the safer exploratory workflow is to create a new image first.",
   "",
   "17. LIMITATIONS",
   "",
   "  - not intended for linear calibration",
   "  - extreme adjustments can create artifacts",
   "  - hue is unreliable in neutral pixels",
   "  - preview is approximate because it is downsampled",
   "  - Range Mask behavior depends on the current stretch",
   "  - saturated stars and bright cores may need careful handling",
   "  - user judgment is still required",
   "",
   "18. PRACTICAL GUIDANCE",
   "",
   "  - start with small adjustments",
   "  - preview masks before strong edits",
   "  - use a new pass for targeted work",
   "  - avoid using Range Mask to reinterpret finished global work unless that is intentional",
   "  - save adjustment sets for complex sessions",
   "",
   ""
].join("\n");

var ACM_ABOUT_TEXT =
      "About Astro Color Mixer\n\n" +
"Astro Color Mixer v0.9.7.13-beta\n\n" +
"A Cosgrove's Cosmos tool for nonlinear RGB chroma-vector color control in astrophotography.\n\n" +
"Version 2 feature highlights since v0.9.7.7-beta:\n\n" +
"Latest Feature\n" +
"- Added a display workspace warning for Windows and macOS systems where PixInsight reports a workspace smaller than Astro Color Mixer's layout target, including guidance for Windows Display Scaling and macOS Displays settings.\n\n" +
"Preview / Diagnostics\n" +
"- Added Difference preview mode to show where the current adjustment changes the image.\n" +
"- Added Plot Info beside the polar plot with probe, selected band, Range Mask, and delayed Changed / Strong readouts.\n" +
"- Improved histogram labeling and Range Mask overlay display.\n" +
"- Made histogram probe markers and polar plot probe markers more visible.\n" +
"- Improved polar plot grid/readability and made diagnostics titles gold.\n" +
"- Added delayed preview-change estimates instead of calculating them during slider movement. This minimizes compute lag during user interactions.\n\n" +
"Performance / Output\n" +
"- Improved high-resolution output speed, especially with multiple enabled passes.\n" +
"- Reuses star-protection work across passes during full-resolution output.\n" +
"- Skips enabled passes that have no active adjustments, even when their masks are configured.\n" +
"- Added clearer PixInsight console timing for major output phases.\n" +
"- Full-resolution mask export now creates practical PixInsight masks at target-image size.\n" +
"- Saved Band Mask and Combined Mask output now use smoother mask transitions that match the adjustment path.\n\n" +
"Protections\n" +
"- Added global Protect Stars and Protect Low Sat checkboxes.\n" +
"- Added improved compact star-protection mask behavior.\n" +
"- Added Star Protection Mask preview mode.\n" +
"- Starless mode now disables star-protection behavior.\n" +
"- Turning off Protect Low Sat allows stronger action on weak/low-saturation color, with documentation warnings.\n\n" +
"Mask Shaping\n" +
"- Renamed visible Soften language to Blur.\n" +
"- Added Selected Band Blur up to 5 px for starless workflows.\n" +
"- Added Selected Band Boost for mask contrast.\n" +
"- Added Range Mask Blur and Range Mask Boost.\n" +
"- Added clearer Band Mask Shaping and Range Mask Shaping grouping/status text.\n\n" +
"Range Mask / Mask Preview Responsiveness\n" +
"- Range Mask histogram overlay updates immediately while adjusting Low/High/Feather.\n" +
"- Range Mask preview updates faster while viewing Range Mask.\n" +
"- Selected Band mask preview updates faster while changing band/radius/feather/blur/boost.\n" +
"- Mask preview caches are now lazy/targeted instead of rebuilt on every full preview.\n\n" +
"UI / Layout\n" +
"- Added Standard / Compact layout mode support with separate saved window sizes.\n" +
"- Improved Windows compact header, target selector, Pass Viewer, selected-band readout, and diagnostics layout.\n" +
"- Larger header logo and app title.\n" +
"- Active tabs now use gold highlighting.\n" +
"- Fixed clipped slider rows, especially on Saturation and Luminance tabs.\n" +
"- Improved Windows startup window size for large displays.\n" +
"- Wider Windows layout for Plot Info and Image Type controls.\n" +
"- Improved text fitting in several compact control areas.\n\n" +
"Workflow / Safety\n" +
"- Added likely-linear image warning.\n" +
"- Sensitivity option Advanced was renamed to Strong while preserving the same behavior.\n" +
"- Added Sensitivity tooltip/help text.\n" +
"- Improved FAQ, About, and Technical Appendix content to cover Compact mode, new protections, Difference preview, mask shaping, diagnostics, and recommended starless workflows.\n\n" +
"Release-note summary:\n" +
"Since v0.9.7.7-beta, Astro Color Mixer has gained Compact mode, Difference preview, stronger diagnostics, Plot Info, visible star/low-saturation protection controls, improved star protection behavior, selected-band and range-mask Blur/Boost shaping, smoother full-resolution mask output, faster multi-pass output, a Star Protection Mask view, better mask-preview responsiveness, linear-image warnings, clearer documentation, gold active tabs, fixed slider clipping, and improved Windows startup/compact layout.\n\n" +
"Developed by Patrick A. Cosgrove for Cosgrove's Cosmos.\n" +
"Copyright © 2026 Patrick A. Cosgrove. All rights reserved.\n\n" +
"Website:\n" +
"https://cosgrovescosmos.com/\n";

function acmGetDocumentationTitle(kind) {
   if (kind === "technical")
      return "Astro Color Mixer - Technical Appendix";
   if (kind === "about")
      return "About Astro Color Mixer";
   return "Astro Color Mixer - FAQ & Practical Guide";
}

function acmGetDocumentationText(kind) {
   if (kind === "technical")
      return ACM_TECHNICAL_APPENDIX_TEXT;
   if (kind === "about")
      return ACM_ABOUT_TEXT;
   return ACM_FAQ_TEXT;
}


function acmGetImageStatusForView(view) {
   if (!view || view.isNull)
      return { ok: false, viewId: "", message: "No active view is available.", warning: true };
   var image = view.image;
   if (!image || image.numberOfChannels < 3 || !image.isColor)
      return { ok: false, viewId: view.fullId, message: "Target image is not RGB/color: " + view.fullId, warning: true };
   return {
      ok: true,
      viewId: view.fullId,
      width: image.width,
      height: image.height,
      message: view.fullId + " (" + image.width + "×" + image.height + ")",
      warning: false
   };
}

function getActiveImageStatus(viewId) {
   if (viewId) {
      var targetInfo = acmFindViewForViewId(viewId);
      if (!targetInfo || !targetInfo.view)
         return { ok: false, viewId: viewId, message: "Target image is no longer available.", warning: true };
      return acmGetImageStatusForView(targetInfo.view);
   }
   var activeWindow = ImageWindow.activeWindow;
   if (activeWindow.isNull)
      return { ok: false, viewId: "", message: "No eligible RGB images are currently open.", warning: true };
   return acmGetImageStatusForView(activeWindow.currentView);
}

function readActiveRgbImage() {
   var activeWindow = ImageWindow.activeWindow;
   if (activeWindow.isNull)
      fail("No active image. Please open and select an RGB image first.");
   var view = activeWindow.currentView;
   if (view.isNull)
      fail("No active view is available.");
   var image = view.image;
   if (!image || image.numberOfChannels < 3 || !image.isColor)
      fail("The active image is not an RGB/color image.");

   var width = image.width;
   var height = image.height;
   var count = width * height;
   console.writeln("Reading active image: " + view.fullId + " (" + width + "x" + height + ")");

   var rect = new Rect(0, 0, width, height);
   var r = new Float32Array(count);
   var g = new Float32Array(count);
   var b = new Float32Array(count);
   image.getSamples(r, rect, 0);
   image.getSamples(g, rect, 1);
   image.getSamples(b, rect, 2);

   var rgb = new Float32Array(count * 3);
   for (var i = 0; i < count; ++i) {
      var base = i * 3;
      rgb[base] = r[i];
      rgb[base + 1] = g[i];
      rgb[base + 2] = b[i];
   }

   return { width: width, height: height, rgb: rgb, viewId: view.fullId };
}

function acmReadRgbImageFromView(view) {
   if (!view || view.isNull)
      fail("No target view is available.");
   var image = view.image;
   if (!image || image.numberOfChannels < 3 || !image.isColor)
      fail("The target image is not an RGB/color image.");

   var width = image.width;
   var height = image.height;
   var count = width * height;
   var rect = new Rect(0, 0, width, height);
   var r = new Float32Array(count);
   var g = new Float32Array(count);
   var b = new Float32Array(count);
   image.getSamples(r, rect, 0);
   image.getSamples(g, rect, 1);
   image.getSamples(b, rect, 2);

   var rgb = new Float32Array(count * 3);
   for (var i = 0; i < count; ++i) {
      var base = i * 3;
      rgb[base] = r[i];
      rgb[base + 1] = g[i];
      rgb[base + 2] = b[i];
   }

   return { width: width, height: height, rgb: rgb, viewId: view.fullId };
}

function acmReadRgbCropFromView(view, cropRect) {
   if (!view || view.isNull)
      fail("No target view is available.");
   var image = view.image;
   if (!image || image.numberOfChannels < 3 || !image.isColor)
      fail("The target image is not an RGB/color image.");

   var x0 = acmClamp(Math.floor(cropRect.x0), 0, image.width - 1);
   var y0 = acmClamp(Math.floor(cropRect.y0), 0, image.height - 1);
   var x1 = acmClamp(Math.ceil(cropRect.x1), x0 + 1, image.width);
   var y1 = acmClamp(Math.ceil(cropRect.y1), y0 + 1, image.height);
   var width = Math.max(1, x1 - x0);
   var height = Math.max(1, y1 - y0);
   var count = width * height;
   var rect = new Rect(x0, y0, x1, y1);
   var r = new Float32Array(count);
   var g = new Float32Array(count);
   var b = new Float32Array(count);
   image.getSamples(r, rect, 0);
   image.getSamples(g, rect, 1);
   image.getSamples(b, rect, 2);

   var rgb = new Float32Array(count * 3);
   for (var i = 0; i < count; ++i) {
      var base = i * 3;
      rgb[base] = r[i];
      rgb[base + 1] = g[i];
      rgb[base + 2] = b[i];
   }

   return {
      x0: x0,
      y0: y0,
      x1: x1,
      y1: y1,
      width: width,
      height: height,
      rgb: rgb,
      viewId: view.fullId
   };
}

function acmFindWindowForViewId(viewId) {
   if (!viewId || !ImageWindow.windows)
      return null;
   for (var i = 0; i < ImageWindow.windows.length; ++i) {
      var win = ImageWindow.windows[i];
      if (!win || win.isNull)
         continue;
      var mainView = win.mainView;
      var currentView = win.currentView;
      if (mainView && !mainView.isNull && (mainView.fullId === viewId || mainView.id === viewId))
         return win;
      if (currentView && !currentView.isNull && (currentView.fullId === viewId || currentView.id === viewId))
         return win;
   }
   return null;
}

function acmFindViewForViewId(viewId) {
   var win = acmFindWindowForViewId(viewId);
   if (!win || win.isNull)
      return null;
   if (win.currentView && !win.currentView.isNull && (win.currentView.fullId === viewId || win.currentView.id === viewId))
      return { window: win, view: win.currentView };
   if (win.mainView && !win.mainView.isNull)
      return { window: win, view: win.mainView };
   return null;
}

function acmGetEligibleTargetViews() {
   var targets = [];
   if (!ImageWindow.windows)
      return targets;
   for (var i = 0; i < ImageWindow.windows.length; ++i) {
      var win = ImageWindow.windows[i];
      if (!win || win.isNull || !win.mainView || win.mainView.isNull)
         continue;
      var view = win.mainView;
      var image = view.image;
      if (!image || image.numberOfChannels < 3 || !image.isColor)
         continue;
      targets.push({
         window: win,
         view: view,
         viewId: view.fullId,
         label: view.fullId || view.id,
         width: image.width,
         height: image.height
      });
   }
   return targets;
}

function acmReadRgbImageForViewId(viewId) {
   var targetInfo = acmFindViewForViewId(viewId);
   if (!targetInfo || !targetInfo.view)
      fail("Target image is no longer available.");
   return acmReadRgbImageFromView(targetInfo.view);
}

function sanitizeViewId(viewId) {
   return String(viewId || "MinimalEditor").replace(/[^A-Za-z0-9_]+/g, "_");
}

function acmMaskExportBandName(passState) {
   if (!passState || !passState.bands || !passState.bands.length)
      return "";
   var selectedBandId = passState.selectedBandId || passState.bands[0].id;
   for (var i = 0; i < passState.bands.length; ++i) {
      var band = passState.bands[i];
      if (band && band.id === selectedBandId)
         return sanitizeViewId(band.label || selectedBandId);
   }
   return sanitizeViewId(selectedBandId);
}

function acmColorHexToArgb(hex) {
   var text = String(hex || "#808080").replace("#", "");
   if (text.length !== 6)
      return 0xff808080;
   return 0xff000000 | parseInt(text, 16);
}

function acmCreateColorSwatch(parent, hex) {
   var swatch = new Control(parent);
   swatch.scaledMinWidth = ACM_SWATCH_WIDTH;
   swatch.scaledMinHeight = 8;
   swatch.maxWidth = ACM_SWATCH_WIDTH;
   swatch.maxHeight = 8;
   swatch.colorArgb = acmColorHexToArgb(hex);
   swatch.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0xff20242c);
      g.brush = new Brush(this.colorArgb);
      g.drawRect(this.boundsRect);
      g.fillRect(1, 1, this.width - 2, this.height - 2, g.brush);
      g.end();
   };
   return swatch;
}

function acmCreateMiniResetButton(parent) {
   var button = new Control(parent);
   button.setFixedSize(ACM_ROW_RESET_WIDTH, 24);
   button.toolTip = "Reset this band";
   button.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0xff8e92a0);
      g.brush = new Brush(0xff55575d);
      g.drawRect(this.boundsRect);

      var f = new Font;
      f.pixelSize = 14;
      f.bold = true;
      g.font = f;
      var glyph = "\u21ba";
      var tw = g.font.width(glyph);
      var x = Math.round((this.width - tw) * 0.5);
      var y = Math.round((this.height + g.font.ascent - g.font.descent) * 0.5);
      g.pen = new Pen(0xfff2f2f2);
      g.drawText(x, y, glyph);
      g.end();
   };
   button.onMousePress = function() {
      if (typeof this.onClick === "function")
         this.onClick();
   };
   return button;
}

function acmAttachPreviewSliderHooks(dialog, numericControl) {
   if (!numericControl || !numericControl.slider)
      return;
   var previousPress = numericControl.slider.onMousePress;
   var previousRelease = numericControl.slider.onMouseRelease;
   numericControl.slider.onMousePress = function() {
      if (typeof previousPress === "function")
         previousPress.apply(this, arguments);
      dialog.previewSliderInteraction = true;
      if (typeof numericControl.__acmOnSliderPress === "function")
         numericControl.__acmOnSliderPress();
   };
   numericControl.slider.onMouseRelease = function() {
      if (typeof previousRelease === "function")
         previousRelease.apply(this, arguments);
      dialog.previewSliderInteraction = false;
      if (typeof numericControl.__acmOnSliderRelease === "function")
         numericControl.__acmOnSliderRelease();
      if (dialog.autoPreviewCheck && dialog.autoPreviewCheck.checked && dialog.previewIsStale)
         dialog.requestPreviewUpdate();
   };
}

function acmHexToRgb01(hex) {
   var text = String(hex || "#808080").replace("#", "");
   if (text.length !== 6)
      return { r: 0.5, g: 0.5, b: 0.5 };
   return {
      r: parseInt(text.substr(0, 2), 16) / 255,
      g: parseInt(text.substr(2, 2), 16) / 255,
      b: parseInt(text.substr(4, 2), 16) / 255
   };
}

function acmMixRgb01(a, b, t) {
   return {
      r: a.r + (b.r - a.r) * t,
      g: a.g + (b.g - a.g) * t,
      b: a.b + (b.b - a.b) * t
   };
}

function acmScaleRgb01(rgb, factor) {
   return {
      r: acmClamp01(rgb.r * factor),
      g: acmClamp01(rgb.g * factor),
      b: acmClamp01(rgb.b * factor)
   };
}

function acmGradientRgbForBand(tabKey, bandDef, t, isNeutral, sensitivity) {
   if (isNeutral) {
      if (tabKey === ACM_TAB_LUM)
         return t < 0.5 ? acmMixRgb01({ r: 0.1, g: 0.1, b: 0.1 }, { r: 0.5, g: 0.5, b: 0.5 }, t / 0.5)
                        : acmMixRgb01({ r: 0.5, g: 0.5, b: 0.5 }, { r: 0.92, g: 0.92, b: 0.92 }, (t - 0.5) / 0.5);
      return { r: 0.5, g: 0.5, b: 0.5 };
   }

   var base = acmHexToRgb01(bandDef.color);
   if (tabKey === ACM_TAB_HUE) {
      var range = ACM_SENSITIVITY_RANGES[sensitivity] || ACM_SENSITIVITY_RANGES.Normal;
      var centerHue = bandDef.center != null ? bandDef.center : acmRgbToHsl(base.r, base.g, base.b)[0];
      var hueGray = { r: 0.46, g: 0.46, b: 0.46 };
      var leftColor = acmMixRgb01(hueGray, acmHueToRgb01(acmNormalizeHueDegrees(centerHue - range.hueShift)), 0.62);
      var centerColor = acmMixRgb01(hueGray, acmHueToRgb01(centerHue), 0.68);
      var rightColor = acmMixRgb01(hueGray, acmHueToRgb01(acmNormalizeHueDegrees(centerHue + range.hueShift)), 0.62);
      return t < 0.5 ? acmMixRgb01(leftColor, centerColor, t / 0.5) : acmMixRgb01(centerColor, rightColor, (t - 0.5) / 0.5);
   }
   if (tabKey === ACM_TAB_SAT) {
      var satRange = ACM_SENSITIVITY_RANGES[sensitivity] || ACM_SENSITIVITY_RANGES.Normal;
      var satStrength = acmClamp01(satRange.saturation / ACM_SENSITIVITY_RANGES.Advanced.saturation);
      var avg = (base.r + base.g + base.b) / 3;
      var gray = { r: avg, g: avg, b: avg };
      var muted = acmMixRgb01(gray, base, 0.18 + 0.42 * satStrength);
      var boosted = acmScaleRgb01(base, 1.02 + 0.16 * satStrength);
      return t < 0.5 ? acmMixRgb01(gray, muted, t / 0.5) : acmMixRgb01(muted, boosted, (t - 0.5) / 0.5);
   }
   var lumRange = ACM_SENSITIVITY_RANGES[sensitivity] || ACM_SENSITIVITY_RANGES.Normal;
   var lumStrength = acmClamp01(lumRange.luminance / ACM_SENSITIVITY_RANGES.Advanced.luminance);
   var darkColor = acmScaleRgb01(base, 0.12 + 0.20 * lumStrength);
   var brightColor = acmMixRgb01(base, { r: 1, g: 1, b: 1 }, 0.20 + 0.35 * lumStrength);
   return t < 0.5 ? acmMixRgb01(darkColor, base, t / 0.5) : acmMixRgb01(base, brightColor, (t - 0.5) / 0.5);
}

function acmCreateGradientBitmap(width, height, tabKey, bandDef, isNeutral, sensitivity) {
   width = Math.max(16, width | 0);
   height = Math.max(6, height | 0);
   var rgb = new Float32Array(width * height * 3);
   for (var x = 0; x < width; ++x) {
      var t = width > 1 ? x / (width - 1) : 0;
      var c = acmGradientRgbForBand(tabKey, bandDef, t, isNeutral, sensitivity);
      for (var y = 0; y < height; ++y) {
         var base = (y * width + x) * 3;
         rgb[base] = c.r;
         rgb[base + 1] = c.g;
         rgb[base + 2] = c.b;
      }
   }
   return acmRenderBitmapFromRgb(width, height, rgb);
}

function acmCreateSliderGradientControl(parent, dialog, bandDef, isNeutral) {
   var ctl = new Control(parent);
   ctl.acmDialogRef = dialog;
   ctl.bandDef = bandDef;
   ctl.isNeutral = !!isNeutral;
   ctl.scaledMinHeight = 1;
   ctl.cachedBitmap = null;
   ctl.cachedKey = "";
   ctl.onPaint = function() {
      var g = new Graphics(this);
      var key = this.acmDialogRef.activeTab + ":" + (this.acmDialogRef.editorState ? this.acmDialogRef.editorState.sensitivity : "Normal") + ":" + this.width + ":" + this.height + ":" + (this.isNeutral ? "neutral" : this.bandDef.id);
      if (this.cachedKey !== key) {
         this.cachedBitmap = acmCreateGradientBitmap(Math.max(16, this.width), Math.max(6, this.height), this.acmDialogRef.activeTab, this.bandDef, this.isNeutral, this.acmDialogRef.editorState ? this.acmDialogRef.editorState.sensitivity : "Normal");
         this.cachedKey = key;
      }
      var stripeH = Math.max(1, Math.round(this.height * 0.2));
      var stripeTop = Math.max(0, Math.round((this.height - stripeH) * 0.5));
      var stripeBottom = Math.min(this.height - 1, stripeTop + stripeH);
      g.pen = new Pen(0xff30343c);
      g.brush = new Brush(0xff1a1d24);
      g.drawRect(new Rect(0, stripeTop, this.width, stripeBottom));
      if (this.cachedBitmap)
         g.drawScaledBitmap(new Rect(1, stripeTop + 1, this.width - 1, stripeBottom - 1), this.cachedBitmap);
      var cx = Math.round(this.width * 0.5);
      g.pen = new Pen(0xe0ffffff);
      g.drawLine(cx, stripeTop, cx, stripeBottom);
      g.end();
   };
   return ctl;
}

function acmFormatMixerValue(value, precision) {
   return precision > 0 ? value.toFixed(precision) : format("%.0f", value);
}

function acmRoundedValue(value, precision) {
   var scale = precision > 0 ? Math.pow(10, precision) : 1;
   var rounded = precision > 0 ? Math.round(value * scale) / scale : Math.round(value);
   return Math.abs(rounded) < 0.0005 ? 0 : rounded;
}

function acmFormatMixerDisplayValue(value, precision) {
   var rounded = acmRoundedValue(value, precision);
   var text = precision > 0 ? rounded.toFixed(precision) : format("%.0f", rounded);
   return (rounded >= 0 ? "+" : "") + text;
}

function acmCompactMixerLabel(bandDef, isNeutral, label) {
   if (isNeutral)
      return "Neutral";
   if (!bandDef || !bandDef.id)
      return label || "Value";
   switch (bandDef.id) {
   case "red": return "Red / Ha";
   case "orange": return "Orange";
   case "yellow": return "Yellow";
   case "green": return "Green";
   case "cyan": return "Cyan / OIII";
   case "blue": return "Blue";
   case "purple": return "Purple";
   case "magenta": return "Magenta";
   default: return label || bandDef.label || bandDef.shortLabel || "Value";
   }
}

function acmMixerLabelTooltip(bandDef, isNeutral) {
   if (isNeutral)
      return "Neutral / Low-Saturation luminance";
   if (!bandDef)
      return "";
   return (bandDef.label || bandDef.shortLabel || "Value") + ", center " + (bandDef.center != null ? bandDef.center : 0) + "\u00b0";
}

function acmCreateMixerFieldRow(parent, dialog, options) {
   var row = {};
   row.dialog = dialog;
   row.bandId = options.bandId || "";
   row.isNeutral = !!options.isNeutral;
   row.precision = options.precision != null ? options.precision : 1;
   row.minValue = options.minValue != null ? options.minValue : -100;
   row.maxValue = options.maxValue != null ? options.maxValue : 100;
   row.value = options.value != null ? options.value : 0;
   row.bandDef = options.bandDef || { color: "#808080", shortLabel: "Value" };
   row.onValueUpdated = options.onValueUpdated || function() {};
   row.dragging = false;
   row.cachedKey = "";
   row.cachedBitmap = null;

   row.host = new Control(parent);
   row.host.sizer = new HorizontalSizer;
   row.host.sizer.margin = 0;
   row.host.sizer.spacing = ACM_ROW_SPACING;
   row.host.scaledMinHeight = 22;

   if (row.isNeutral) {
      row.swatch = new Control(row.host);
      row.swatch.setFixedWidth(ACM_SWATCH_WIDTH);
      row.swatch.scaledMinWidth = ACM_SWATCH_WIDTH;
      row.swatch.maxWidth = ACM_SWATCH_WIDTH;
   } else {
      row.swatch = acmCreateColorSwatch(row.host, row.bandDef.color);
   }

   row.primaryLabelText = acmCompactMixerLabel(row.bandDef, row.isNeutral, options.label || row.bandDef.label || row.bandDef.shortLabel || "Value");
   row.secondaryLabelText = options.secondaryLabel || (row.isNeutral ? "Low-saturation luminance" : ("Center " + (row.bandDef.center != null ? row.bandDef.center : 0) + "\u00b0"));

   row.labelHost = new Label(row.host);
   row.labelHost.useRichText = true;
   row.labelHost.text = acmThemeRichText(row.primaryLabelText, ACM_GRAY_UI_THEME.text, false);
   acmApplyLightText(row.labelHost);
   row.labelHost.textAlignment = TextAlign_Right | TextAlign_VertCenter;
   row.labelHost.minWidth = ACM_HOST_IS_WINDOWS ? 96 : ACM_MIXER_LABEL_WIDTH;
   row.labelHost.scaledMinHeight = 16;
   row.labelHost.toolTip = acmMixerLabelTooltip(row.bandDef, row.isNeutral);

   row.edit = new Edit(row.host);
   row.edit.setFixedWidth(ACM_HOST_IS_WINDOWS ? 58 : ACM_ROW_EDIT_WIDTH);
   row.edit.setFixedHeight(ACM_HOST_IS_WINDOWS ? 22 : 18);
   row.edit.textAlignment = TextAlign_Center|TextAlign_VertCenter;
   row.formatEditText = function(value) {
      var text = acmFormatMixerDisplayValue(value, row.precision);
      return ACM_HOST_IS_WINDOWS && row.dialog && row.dialog.layoutMode === "compact" ? ("  " + text) : text;
   };
   row.edit.text = row.formatEditText(row.value);

   row.field = new Control(row.host);
   row.field.rowRef = row;
   row.field.minWidth = ACM_MIXER_SLIDER_MIN_WIDTH;
   row.field.scaledMinHeight = 16;
   row.field.onPaint = function() {
      var g = new Graphics(this);
      var r = this.rowRef;
      var compactRow = !!this.acmCompactRow;
      var windowsStandardRow = ACM_HOST_IS_WINDOWS && r.dialog && r.dialog.layoutMode !== "compact";
      var compactWindowsRow = ACM_HOST_IS_WINDOWS && compactRow;
      var fieldTop = windowsStandardRow ? 0 : (compactWindowsRow ? 2 : (ACM_HOST_IS_WINDOWS ? 3 : 2));
      var fieldBottom = this.height - (windowsStandardRow ? 1 : (compactWindowsRow ? 2 : (ACM_HOST_IS_WINDOWS ? 4 : 2)));
      var fieldHeight = Math.max(compactRow ? 7 : 9, fieldBottom - fieldTop);
      var fieldRect = new Rect(0, fieldTop, this.width - 1, fieldTop + fieldHeight);
      var key = r.dialog.activeTab + ":" + (r.dialog.editorState ? r.dialog.editorState.sensitivity : "Normal") + ":" + this.width + ":" + fieldHeight + ":" + (r.isNeutral ? "neutral" : r.bandDef.id);
      if (r.cachedKey !== key) {
         r.cachedBitmap = acmCreateGradientBitmap(Math.max(24, this.width - 2), Math.max(10, fieldHeight - 2), r.dialog.activeTab, r.bandDef, r.isNeutral, r.dialog.editorState ? r.dialog.editorState.sensitivity : "Normal");
         r.cachedKey = key;
      }
      g.pen = new Pen(0xff4a515c);
      g.brush = new Brush(0xff161a22);
      g.drawRect(fieldRect);
      if (r.cachedBitmap)
         g.drawScaledBitmap(new Rect(fieldRect.left + 1, fieldRect.top + 1, fieldRect.right - 1, fieldRect.bottom - 1), r.cachedBitmap);
      var cy = Math.round((fieldRect.top + fieldRect.bottom) * 0.5);
      g.pen = new Pen(0x90f2f4f8, 2);
      var trackInset = compactWindowsRow ? 4 : 10;
      g.drawLine(fieldRect.left + trackInset, cy, fieldRect.right - trackInset, cy);
      var centerX = Math.round((fieldRect.left + fieldRect.right) * 0.5);
      g.pen = new Pen(0x50ffffff, 1);
      g.drawLine(centerX, fieldRect.top + 1, centerX, fieldRect.bottom - 1);
      var t = (r.value - r.minValue) / Math.max(ACM_EPSILON, r.maxValue - r.minValue);
      t = acmClamp01(t);
      var knobInset = compactWindowsRow ? 3 : 10;
      var knobX = fieldRect.left + knobInset + Math.round(t * Math.max(1, (fieldRect.right - fieldRect.left - 2 * knobInset)));
      var selectedRowId = r.dialog && r.dialog.getHighlightedRowId ? r.dialog.getHighlightedRowId() : "";
      if ((r.isNeutral && selectedRowId === "neutral") || (!r.isNeutral && r.bandId === selectedRowId)) {
         if (ACM_HOST_IS_WINDOWS) {
            var ox0 = fieldRect.left + (windowsStandardRow ? 1 : 2);
            var oy0 = fieldRect.top + (windowsStandardRow ? 1 : 2);
            var ox1 = fieldRect.right - (windowsStandardRow ? 2 : 3);
            var oy1 = fieldRect.bottom - (windowsStandardRow ? 2 : 3);
            g.brush = new Brush(windowsStandardRow ? 0x36ff2020 : 0x18ff2020);
            g.fillRect(ox0, oy0, ox1, oy1, g.brush);
            g.pen = new Pen(0xff101010, 1);
            g.drawLine(ox0, oy0, ox1, oy0);
            g.drawLine(ox0, oy1, ox1, oy1);
            g.drawLine(ox0, oy0, ox0, oy1);
            g.drawLine(ox1, oy0, ox1, oy1);
            g.pen = new Pen(0xffff2020, windowsStandardRow ? 3 : 2);
            g.drawLine(ox0, oy0, ox1, oy0);
            g.drawLine(ox0, oy1, ox1, oy1);
            g.drawLine(ox0, oy0, ox0, oy1);
            g.drawLine(ox1, oy0, ox1, oy1);
         } else {
            g.pen = new Pen(0xff000000, 2);
            g.brush = new Brush(0x00000000);
            g.drawRect(new Rect(0, 0, this.width - 1, this.height - 1));
            g.pen = new Pen(0xffff2020, compactRow ? 3 : 3);
            g.drawRect(new Rect(2, 2, this.width - 4, this.height - 4));
         }
      }
      if (compactWindowsRow) {
         g.pen = new Pen(0xff20242c, 2);
         g.brush = new Brush(0xffffffff);
         g.drawCircle(knobX, cy, 5);
         g.pen = new Pen(0xfff8fafc, 1);
         g.drawCircle(knobX, cy, 3);
      } else {
         g.pen = new Pen(0xff5f646d, 1);
         g.brush = new Brush(0xfff1f2f4);
         g.drawCircle(knobX, cy, compactRow ? 4 : 5);
      }
      g.end();
   };

   row.resetButton = acmCreateMiniResetButton(row.host);

   row.host.sizer.addSpacing(0);
   row.host.sizer.add(row.swatch);
   row.host.sizer.addSpacing(ACM_HOST_IS_WINDOWS ? 4 : 2);
   row.host.sizer.add(row.labelHost);
   row.host.sizer.addSpacing(ACM_HOST_IS_WINDOWS ? 4 : 2);
   row.host.sizer.add(row.edit);
   row.host.sizer.addSpacing(ACM_HOST_IS_WINDOWS ? 2 : 2);
   row.host.sizer.add(row.field, 100);
   row.host.sizer.add(row.resetButton);

   row.setLabel = function(text) {
      row.primaryLabelText = acmCompactMixerLabel(row.bandDef, row.isNeutral, text);
      row.labelHost.useRichText = true;
      row.labelHost.text = acmThemeRichText(row.primaryLabelText, ACM_GRAY_UI_THEME.text, false);
      acmApplyLightText(row.labelHost);
      row.labelHost.toolTip = acmMixerLabelTooltip(row.bandDef, row.isNeutral);
   };
   row.setSecondaryLabel = function(text) {
      row.secondaryLabelText = text;
      row.labelHost.toolTip = row.isNeutral ? "Neutral / Low-Saturation luminance" : ((row.bandDef.label || row.bandDef.shortLabel || row.primaryLabelText) + ", " + text.toLowerCase());
   };
   row.setRange = function(minValue, maxValue) {
      row.minValue = minValue;
      row.maxValue = maxValue;
      row.value = acmClamp(row.value, row.minValue, row.maxValue);
      row.edit.text = row.formatEditText(row.value);
      row.field.update();
   };
   row.setPrecision = function(precision) {
      row.precision = precision;
      row.edit.text = row.formatEditText(row.value);
   };
   row.setValue = function(value) {
      row.value = acmClamp(value, row.minValue, row.maxValue);
      row.edit.text = row.formatEditText(row.value);
      row.field.update();
   };
   row.activateSelection = function() {
      if (row.isNeutral) {
         dialog.setHighlightedRowId("neutral");
         return;
      }
      if (!row.bandId)
         return;
      dialog.setHighlightedRowId(row.bandId);
      if (dialog.getActivePassState().selectedBandId !== row.bandId) {
         dialog.getActivePassState().selectedBandId = row.bandId;
         dialog.refreshSelectedBandControls();
         dialog.refreshSelectedBandMaskPreviewIfActive();
      }
   };
   row.commitValue = function(value) {
      row.activateSelection();
      row.value = acmClamp(value, row.minValue, row.maxValue);
      row.edit.text = row.formatEditText(row.value);
      row.field.update();
      row.onValueUpdated(row.value);
   };
   row.valueFromX = function(x) {
      var usableLeft = 10;
      var usableRight = Math.max(usableLeft + 1, row.field.width - 11);
      var t = (x - usableLeft) / Math.max(1, usableRight - usableLeft);
      t = acmClamp01(t);
      return row.minValue + t * (row.maxValue - row.minValue);
   };

   row.field.onMousePress = function(x) {
      row.dragging = true;
      dialog.previewSliderInteraction = true;
      row.commitValue(row.valueFromX(x));
   };
   row.field.onMouseMove = function(x) {
      if (row.dragging)
         row.commitValue(row.valueFromX(x));
   };
   row.field.onMouseRelease = function() {
      row.dragging = false;
      dialog.previewSliderInteraction = false;
      if (dialog.autoPreviewCheck && dialog.autoPreviewCheck.checked && dialog.previewIsStale)
         dialog.requestPreviewUpdate();
   };
   row.edit.onEditCompleted = function() {
      var value = parseFloat(row.edit.text);
      if (isNaN(value))
         row.setValue(row.value);
      else
         row.commitValue(value);
      dialog.previewSliderInteraction = false;
      if (dialog.autoPreviewCheck && dialog.autoPreviewCheck.checked && dialog.previewIsStale)
         dialog.requestPreviewUpdate();
   };

   return row;
}

function acmSetMixerFieldRowDensity(row, compact) {
   if (!row)
      return;
   var ultraCompact = !!(row.dialog && row.dialog.layoutMode === "compact");
   var windowsStandard = ACM_HOST_IS_WINDOWS && !ultraCompact;
   var hostH = ultraCompact ? (ACM_HOST_IS_WINDOWS ? 22 : 18) : (windowsStandard ? (compact ? 24 : 24) : (compact ? 28 : 30));
   var innerH = ultraCompact ? (ACM_HOST_IS_WINDOWS ? 16 : 8) : (windowsStandard ? 16 : (compact ? 11 : 13));
   var editH = ultraCompact ? (ACM_HOST_IS_WINDOWS ? 20 : 13) : (windowsStandard ? 20 : (compact ? 14 : 16));
   if (row.host && row.host.sizer)
      row.host.sizer.spacing = ACM_HOST_IS_WINDOWS && ultraCompact ? 0 : ACM_ROW_SPACING;
   if (row.host) {
      row.host.setFixedHeight(hostH);
      row.host.scaledMinHeight = hostH;
      if (typeof row.host.setMinHeight === "function")
         row.host.setMinHeight(hostH);
   }
   if (row.labelHost) {
      var labelW = windowsStandard ? 96 : ACM_MIXER_LABEL_WIDTH;
      row.labelHost.minWidth = labelW;
      if (typeof row.labelHost.setFixedWidth === "function")
         row.labelHost.setFixedWidth(labelW);
      row.labelHost.scaledMinHeight = innerH;
   }
   if (row.edit) {
      if (typeof row.edit.setFixedWidth === "function")
         row.edit.setFixedWidth(ACM_HOST_IS_WINDOWS && ultraCompact ? 76 : (ACM_HOST_IS_WINDOWS ? 58 : ACM_ROW_EDIT_WIDTH));
      row.edit.setFixedHeight(editH);
   }
   if (row.field) {
      row.field.scaledMinHeight = innerH;
      row.field.acmCompactRow = !!compact || ultraCompact;
      row.field.update();
   }
   if (row.resetButton && typeof row.resetButton.setFixedSize === "function")
      row.resetButton.setFixedSize(ACM_ROW_RESET_WIDTH, ultraCompact ? (ACM_HOST_IS_WINDOWS ? 20 : 18) : 24);
   if (row.host)
      row.host.update();
}

function acmCreateAlignedGradientHost(parent, dialog, numericControl, bandDef, isNeutral, leftPadWidth, rightPadWidth) {
   var outer = new Control(parent);
   outer.scaledMinHeight = 16;
   outer.sizer = new HorizontalSizer;
   outer.sizer.margin = 0;
   outer.sizer.spacing = ACM_ROW_SPACING;

   var leftPad = new Control(outer);
   leftPad.setFixedWidth(Math.max(0, leftPadWidth || 0));
   outer.sizer.add(leftPad);

   var stripeHost = new Control(outer);
   stripeHost.acmDialogRef = dialog;
   stripeHost.numericControlRef = numericControl;
   stripeHost.bandDef = bandDef;
   stripeHost.isNeutral = !!isNeutral;
   stripeHost.scaledMinHeight = 16;
   stripeHost.cachedBitmap = null;
   stripeHost.cachedKey = "";
   stripeHost.onPaint = function() {
      var g = new Graphics(this);
      var numeric = this.numericControlRef;
      var slider = numeric ? numeric.slider : null;
      if (!numeric || !slider) {
         g.end();
         return;
      }
      var fallbackLeft = 0;
      if (numeric.label && typeof numeric.label.width === "number")
         fallbackLeft += numeric.label.width;
      if (numeric.edit && typeof numeric.edit.width === "number")
         fallbackLeft += numeric.edit.width + ACM_ROW_SPACING;
      fallbackLeft += 8;
      var sliderLeft = typeof slider.left === "number" ? slider.left : fallbackLeft;
      sliderLeft = Math.max(0, Math.min(this.width - 4, Math.round(sliderLeft)));
      var sliderWidth = typeof slider.width === "number" ? slider.width : (this.width - sliderLeft);
      sliderWidth = Math.max(16, Math.min(this.width - sliderLeft, Math.round(sliderWidth)));
      var sliderRight = Math.min(this.width - 1, sliderLeft + sliderWidth - 1);
      if (sliderRight <= sliderLeft) {
         g.end();
         return;
      }
      var stripeH = Math.max(12, this.height - 2);
      var stripeTop = Math.max(0, Math.round((this.height - stripeH) * 0.5));
      var stripeBottom = Math.min(this.height - 1, stripeTop + stripeH);
      var paintW = Math.max(16, sliderRight - sliderLeft + 1);
      var key = this.acmDialogRef.activeTab + ":" + paintW + ":" + stripeH + ":" + (this.isNeutral ? "neutral" : this.bandDef.id);
      if (this.cachedKey !== key) {
         this.cachedBitmap = acmCreateGradientBitmap(paintW, stripeH, this.acmDialogRef.activeTab, this.bandDef, this.isNeutral);
         this.cachedKey = key;
      }
      g.pen = new Pen(0xff474c55);
      g.brush = new Brush(0xff171b22);
      g.drawRect(new Rect(sliderLeft, stripeTop, sliderRight, stripeBottom));
      if (this.cachedBitmap)
         g.drawScaledBitmap(new Rect(sliderLeft + 1, stripeTop + 1, sliderRight - 1, stripeBottom - 1), this.cachedBitmap);
      var cx = sliderLeft + Math.round((sliderWidth - 1) * 0.5);
      g.pen = new Pen(0x80ffffff);
      g.drawLine(cx, stripeTop, cx, stripeBottom);
      g.end();
   };
   outer.sizer.add(stripeHost, 100);

   var rightPad = new Control(outer);
   rightPad.setFixedWidth(Math.max(0, rightPadWidth || 0));
   outer.sizer.add(rightPad);

   outer.gradientStripeHost = stripeHost;
   return outer;
}

function acmPaintRangeMaskOverlay(g, rangeMask, left, top, plotW, plotH, enabled, part) {
   if (!rangeMask || plotW <= 0 || plotH <= 0)
      return;
   var mapX = function(v) {
      v = acmClamp01(v);
      return left + Math.round(v * Math.max(0, plotW - 1));
   };
   var featherLeft = Math.max(0, rangeMask.low - rangeMask.feather);
   var featherRight = Math.min(1, rangeMask.high + rangeMask.feather);
   var lowX = mapX(rangeMask.low);
   var highX = mapX(rangeMask.high);
   var featherLeftX = mapX(featherLeft);
   var featherRightX = mapX(featherRight);

   var drawFill = !part || part === "fill";
   var drawLines = !part || part === "lines";

   if (enabled && drawFill) {
      if (featherLeftX < lowX) {
         g.brush = new Brush(0x4c4f3d16);
         g.fillRect(featherLeftX, top, lowX, top + plotH, g.brush);
      }
      if (lowX < highX) {
         g.brush = new Brush(0x6666501b);
         g.fillRect(lowX, top, highX, top + plotH, g.brush);
      }
      if (highX < featherRightX) {
         g.brush = new Brush(0x4c4f3d16);
         g.fillRect(highX, top, featherRightX, top + plotH, g.brush);
      }
   }

   if (!drawLines)
      return;

   if (enabled) {
      g.pen = new Pen(0xffffd15c, 3);
   } else {
      g.pen = new Pen(0xff8c95a6, 2);
   }

   g.drawLine(lowX, top, lowX, top + plotH);
   g.pen = enabled ? new Pen(0xffff9a36, 3) : new Pen(0xff8c95a6, 2);
   g.drawLine(highX, top, highX, top + plotH);
   if (enabled) {
      g.pen = new Pen(0x80ffd277, 1);
      g.drawLine(featherLeftX, top, featherLeftX, top + plotH);
      g.drawLine(featherRightX, top, featherRightX, top + plotH);
   }
}

function acmConfigureNumericRowControl(numeric) {
   numeric.scaledMinHeight = 28;
   if (numeric.label) {
      numeric.label.minWidth = ACM_HOST_IS_WINDOWS ? 72 : 58;
      if (ACM_HOST_IS_WINDOWS && typeof numeric.label.setFixedWidth === "function")
         numeric.label.setFixedWidth(72);
      numeric.label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   }
   if (numeric.edit && typeof numeric.edit.setFixedWidth === "function")
      numeric.edit.setFixedWidth(ACM_HOST_IS_WINDOWS ? 74 : 66);
   if (numeric.slider)
      numeric.slider.minWidth = ACM_HOST_IS_WINDOWS ? 300 : 252;
}

function writeResultImage(width, height, rgb, outputId) {
   var count = width * height;
   var r = new Float32Array(count);
   var g = new Float32Array(count);
   var b = new Float32Array(count);
   for (var i = 0; i < count; ++i) {
      var base = i * 3;
      r[i] = acmClamp01(rgb[base]);
      g[i] = acmClamp01(rgb[base + 1]);
      b[i] = acmClamp01(rgb[base + 2]);
   }

   var outputWindow = new ImageWindow(width, height, 3, 32, true, true, outputId || "AstroColorMixer_MinimalEditor");
   if (outputWindow.isNull)
      fail("Could not create the output image window.");

   var outputView = outputWindow.mainView;
   var outputImage = outputView.image;
   var rect = new Rect(0, 0, width, height);
   outputView.beginProcess(UndoFlag_NoSwapFile);
   try {
      outputImage.setSamples(r, rect, 0);
      outputImage.setSamples(g, rect, 1);
      outputImage.setSamples(b, rect, 2);
   } finally {
      outputView.endProcess();
   }
   outputWindow.show();
   outputWindow.zoomToOptimalFit();
   return outputWindow;
}

function writeGrayResultImage(width, height, values, outputId) {
   var count = width * height;
   var gray = new Float32Array(count);
   for (var i = 0; i < count; ++i)
      gray[i] = acmClamp01(values[i]);

   var outputWindow = new ImageWindow(width, height, 1, 32, true, false, outputId || "AstroColorMixer_Mask");
   if (outputWindow.isNull)
      fail("Could not create the mask image window.");

   var outputView = outputWindow.mainView;
   var outputImage = outputView.image;
   var rect = new Rect(0, 0, width, height);
   outputView.beginProcess(UndoFlag_NoSwapFile);
   try {
      outputImage.setSamples(gray, rect, 0);
   } finally {
      outputView.endProcess();
   }
   outputWindow.show();
   outputWindow.zoomToOptimalFit();
   return outputWindow;
}

function acmWriteRgbToView(view, width, height, rgb) {
   if (!view || view.isNull)
      fail("No target image view is available for write-back.");
   var image = view.image;
   if (!image || image.width !== width || image.height !== height || image.numberOfChannels < 3)
      fail("Target image dimensions or channels do not match the adjusted result.");

   var count = width * height;
   var r = new Float32Array(count);
   var g = new Float32Array(count);
   var b = new Float32Array(count);
   for (var i = 0; i < count; ++i) {
      var base = i * 3;
      r[i] = acmClamp01(rgb[base]);
      g[i] = acmClamp01(rgb[base + 1]);
      b[i] = acmClamp01(rgb[base + 2]);
   }

   var rect = new Rect(0, 0, width, height);
   view.beginProcess();
   try {
      image.setSamples(r, rect, 0);
      image.setSamples(g, rect, 1);
      image.setSamples(b, rect, 2);
   } finally {
      view.endProcess();
   }
}

function acmReadMaskState(targetWindow, width, height) {
   var info = {
      assigned: false,
      enabled: false,
      inverted: false,
      respected: false,
      values: null,
      message: "Target Mask: none",
      propertyNames: ["mask", "maskEnabled", "maskInverted"]
   };
   if (!targetWindow || targetWindow.isNull)
      return info;

   try {
      var maskWindow = targetWindow.mask;
      if (!maskWindow || maskWindow.isNull)
         return info;
      var maskId = maskWindow.mainView && !maskWindow.mainView.isNull ? maskWindow.mainView.id : "";
      info.assigned = true;
      info.enabled = targetWindow.maskEnabled === true;
      info.inverted = targetWindow.maskInverted === true;
      if (!info.enabled) {
         info.message = maskId ? "Target Mask: assigned, disabled — " + maskId : "Target Mask: assigned, disabled";
         return info;
      }
      var maskView = maskWindow.mainView;
      if (!maskView || maskView.isNull || !maskView.image) {
         info.message = maskId ? "Target Mask: assigned, unavailable — " + maskId : "Target Mask: assigned, unavailable";
         return info;
      }
      var maskImage = maskView.image;
      if (maskImage.width !== width || maskImage.height !== height) {
         info.message = maskId ? "Target Mask: assigned, size mismatch — " + maskId : "Target Mask: assigned, size mismatch";
         return info;
      }
      var count = width * height;
      var rect = new Rect(0, 0, width, height);
      var maskValues = new Float32Array(count);
      if (maskImage.numberOfChannels >= 3 && maskImage.isColor) {
         var mr = new Float32Array(count);
         var mg = new Float32Array(count);
         var mb = new Float32Array(count);
         maskImage.getSamples(mr, rect, 0);
         maskImage.getSamples(mg, rect, 1);
         maskImage.getSamples(mb, rect, 2);
         for (var i = 0; i < count; ++i) {
            var value = acmClamp01(0.2126 * mr[i] + 0.7152 * mg[i] + 0.0722 * mb[i]);
            maskValues[i] = info.inverted ? 1 - value : value;
         }
      } else {
         maskImage.getSamples(maskValues, rect, 0);
         for (var j = 0; j < count; ++j) {
            var sample = acmClamp01(maskValues[j]);
            maskValues[j] = info.inverted ? 1 - sample : sample;
         }
      }
      info.values = maskValues;
      info.respected = true;
      info.message = info.inverted
         ? (maskId ? "Target Mask: active, inverted — " + maskId : "Target Mask: active, inverted")
         : (maskId ? "Target Mask: active — " + maskId : "Target Mask: active");
   } catch (error) {
      info.message = "Target Mask: assigned, unavailable";
   }
   return info;
}

function acmBlendRgbWithMask(originalRgb, adjustedRgb, maskValues) {
   if (!maskValues)
      return new Float32Array(adjustedRgb);
   var output = new Float32Array(adjustedRgb.length);
   for (var i = 0; i < maskValues.length; ++i) {
      var t = acmClamp01(maskValues[i]);
      var base = i * 3;
      output[base] = originalRgb[base] * (1 - t) + adjustedRgb[base] * t;
      output[base + 1] = originalRgb[base + 1] * (1 - t) + adjustedRgb[base + 1] * t;
      output[base + 2] = originalRgb[base + 2] * (1 - t) + adjustedRgb[base + 2] * t;
   }
   return output;
}

function acmRenderBitmapFromRgb(width, height, rgb) {
   var count = width * height;
   var r = new Float32Array(count);
   var g = new Float32Array(count);
   var b = new Float32Array(count);
   for (var i = 0; i < count; ++i) {
      var base = i * 3;
      r[i] = acmClamp01(rgb[base]);
      g[i] = acmClamp01(rgb[base + 1]);
      b[i] = acmClamp01(rgb[base + 2]);
   }

   var tempImage = new Image(width, height, 3, ColorSpace_RGB, 32, SampleType_Real);
   var rect = new Rect(0, 0, width, height);
   tempImage.setSamples(r, rect, 0);
   tempImage.setSamples(g, rect, 1);
   tempImage.setSamples(b, rect, 2);
  return tempImage.render();
}

function acmRenderDifferenceBitmapFromRgb(width, height, originalRgb, adjustedRgb, gain) {
   var count = width * height;
   var diff = new Float32Array(count * 3);
   var displayGain = typeof gain === "number" ? gain : 5;
   for (var i = 0; i < count * 3; ++i)
      diff[i] = acmClamp01(Math.abs((adjustedRgb ? adjustedRgb[i] : 0) - (originalRgb ? originalRgb[i] : 0)) * displayGain);
   return acmRenderBitmapFromRgb(width, height, diff);
}

function acmTryLoadBitmap(path) {
   try {
      return new Bitmap(path);
   } catch (error) {
      return null;
   }
}

function acmTryLoadFirstBitmap(paths) {
   if (!(paths instanceof Array))
      return null;
   for (var i = 0; i < paths.length; ++i) {
      var bmp = acmTryLoadBitmap(paths[i]);
      if (bmp)
         return bmp;
   }
   return null;
}

function acmDrawBitmapContained(graphics, panel, bitmap) {
   if (!bitmap || bitmap.width <= 0 || bitmap.height <= 0)
      return;

   var rect = acmGetContainedBitmapRect(panel.width, panel.height, bitmap.width, bitmap.height);
   graphics.drawScaledBitmap(rect, bitmap);
}

function acmGetContainedBitmapRect(panelWidth, panelHeight, bitmapWidth, bitmapHeight) {
   var usableWidth = Math.max(1, panelWidth - 8);
   var usableHeight = Math.max(1, panelHeight - 8);
   var sx = usableWidth / bitmapWidth;
   var sy = usableHeight / bitmapHeight;
   var scale = Math.min(sx, sy);
   var targetWidth = Math.max(1, Math.round(bitmapWidth * scale));
   var targetHeight = Math.max(1, Math.round(bitmapHeight * scale));
   var x = Math.round((panelWidth - targetWidth) * 0.5);
   var y = Math.round((panelHeight - targetHeight) * 0.5);
   return new Rect(x, y, x + targetWidth, y + targetHeight);
}

function acmHueToRgb01(hueDeg) {
   var h = ((hueDeg % 360) + 360) % 360;
   var c = 1;
   var x = c * (1 - Math.abs((h / 60) % 2 - 1));
   if (h < 60) return { r: c, g: x, b: 0 };
   if (h < 120) return { r: x, g: c, b: 0 };
   if (h < 180) return { r: 0, g: c, b: x };
   if (h < 240) return { r: 0, g: x, b: c };
   if (h < 300) return { r: x, g: 0, b: c };
   return { r: c, g: 0, b: x };
}

function acmComputeHistogramData(sourceRgb, width, height, binsCount, rangeMaskState, probeY) {
   var bins = new Array(binsCount);
   for (var i = 0; i < binsCount; ++i)
      bins[i] = 0;
   var maxBin = 0;
   var count = width * height;
   for (var index = 0; index < count; ++index) {
      var base = index * 3;
      var y = acmLuma709(sourceRgb[base], sourceRgb[base + 1], sourceRgb[base + 2]);
      var binIndex = Math.min(binsCount - 1, Math.floor(y * (binsCount - 1)));
      bins[binIndex] += 1;
      if (bins[binIndex] > maxBin)
         maxBin = bins[binIndex];
   }
   return {
      bins: bins,
      maxBin: maxBin,
      probeY: typeof probeY === "number" ? probeY : null,
      rangeMaskState: rangeMaskState || null
   };
}

function acmComputePolarSamplesData(sourceRgb, width, height, sampleLimit) {
   var count = width * height;
   var step = Math.max(1, Math.floor(count / sampleLimit));
   var points = [];
   for (var index = 0; index < count; index += step) {
      var base = index * 3;
      var r = sourceRgb[base];
      var g = sourceRgb[base + 1];
      var b = sourceRgb[base + 2];
      var hsl = acmRgbToHsl(r, g, b);
      var y = acmLuma709(r, g, b);
      if (hsl[1] < 0.04 || y < 0.03)
         continue;
      points.push({ h: hsl[0], s: hsl[1], y: y, r: r, g: g, b: b });
   }
   return points;
}

function acmNearestBandForHue(hueDeg) {
   var bestBand = ACM_BAND_DEFS[0];
   var bestDistance = 999;
   for (var i = 0; i < ACM_BAND_DEFS.length; ++i) {
      var distance = acmCircularHueDistance(hueDeg, ACM_BAND_DEFS[i].center);
      if (distance < bestDistance) {
         bestDistance = distance;
         bestBand = ACM_BAND_DEFS[i];
      }
   }
   return { band: bestBand, distance: bestDistance };
}

function acmComputeProbeData(sourceRgb, width, height, x, y, rangeMaskState) {
   var clampedX = acmClamp(Math.round(x), 0, width - 1);
   var clampedY = acmClamp(Math.round(y), 0, height - 1);
   var base = (clampedY * width + clampedX) * 3;
   var r = sourceRgb[base];
   var g = sourceRgb[base + 1];
   var b = sourceRgb[base + 2];
   var hsl = acmRgbToHsl(r, g, b);
   var luma = acmLuma709(r, g, b);
   var reliableColor = hsl[1] >= 0.08 && luma >= 0.02;
   var nearest = reliableColor ? acmNearestBandForHue(hsl[0]) : null;
   var rangeValue = acmComputeRangeMask(luma, rangeMaskState);
   return {
      x: clampedX,
      y: clampedY,
      r: r,
      g: g,
      b: b,
      h: hsl[0],
      s: hsl[1],
      y709: luma,
      reliableColor: reliableColor,
      nearestBand: nearest ? nearest.band : null,
      suggestedNeutral: hsl[1] < 0.08,
      rangeMaskValue: rangeValue,
      rangeStatus: !rangeMaskState || !rangeMaskState.enabled ? "Off" : (rangeValue > 0.5 ? "Included" : "Excluded")
   };
}

function acmRenderGrayBitmapFromMask(width, height, maskValues) {
   var rgb = new Float32Array(width * height * 3);
   for (var i = 0; i < width * height; ++i) {
      var v = acmClamp01(maskValues[i]);
      var base = i * 3;
      rgb[base] = v;
      rgb[base + 1] = v;
      rgb[base + 2] = v;
   }
   return acmRenderBitmapFromRgb(width, height, rgb);
}

function acmComputeLuminanceValues(sourceRgb, width, height) {
   var count = width * height;
   var values = new Float32Array(count);
   for (var i = 0; i < count; ++i) {
      var base = i * 3;
      values[i] = acmLuma709(sourceRgb[base], sourceRgb[base + 1], sourceRgb[base + 2]);
   }
   return values;
}

function acmComputeInfluenceStats(maskValues, passEnabled) {
   if (!passEnabled)
      return { active: false, targeted: 0, strong: 0 };
   if (!maskValues || !maskValues.length)
      return { active: true, targeted: 0, strong: 0 };
   var targeted = 0;
   var strong = 0;
   for (var i = 0; i < maskValues.length; ++i) {
      var v = maskValues[i];
      if (v > 0.05)
         ++targeted;
      if (v > 0.50)
         ++strong;
   }
   return {
      active: true,
      targeted: targeted / maskValues.length,
      strong: strong / maskValues.length
   };
}

function acmComputePreviewChangeStats(originalRgb, adjustedRgb, width, height) {
   if (!originalRgb || !adjustedRgb || !width || !height)
      return { active: false, changed: 0, strong: 0 };
   var pixels = Math.min(Math.floor(originalRgb.length / 3), width * height);
   if (pixels <= 0)
      return { active: false, changed: 0, strong: 0 };
   var sampleLimit = 60000;
   var step = Math.max(1, Math.floor(pixels / sampleLimit));
   var samples = 0;
   var changed = 0;
   var strong = 0;
   for (var p = 0; p < pixels; p += step) {
      var base = p * 3;
      var dr = Math.abs(adjustedRgb[base] - originalRgb[base]);
      var dg = Math.abs(adjustedRgb[base + 1] - originalRgb[base + 1]);
      var db = Math.abs(adjustedRgb[base + 2] - originalRgb[base + 2]);
      var d = Math.max(dr, dg, db);
      if (d > 0.01)
         ++changed;
      if (d > 0.05)
         ++strong;
      ++samples;
   }
   if (samples <= 0)
      return { active: false, changed: 0, strong: 0 };
   return { active: true, changed: changed / samples, strong: strong / samples };
}

function acmBoostMaskValues(maskValues) {
   var boosted = new Float32Array(maskValues.length);
   for (var i = 0; i < maskValues.length; ++i) {
      var v = acmClamp01(maskValues[i]);
      boosted[i] = Math.pow(v, 0.55);
   }
   return boosted;
}

function acmComputeSelectedBandMaskData(sourceRgb, width, height, passState, imageType, mode, protectionControls, sourceHslOverride, maskSourceHslOverride) {
   var count = width * height;
   var masks = new Float32Array(count);
   var sourceHsl = sourceHslOverride || acmApplySourceHsl(sourceRgb, width, height);
   var maskSourceHsl = maskSourceHslOverride || (mode === "rangeMask"
      ? sourceHsl
      : acmComputeBandMaskAnalysisHsl(sourceRgb, width, height, imageType));
   var protection = ACM_PROTECTION_PRESETS[imageType || "stars"] || ACM_PROTECTION_PRESETS.stars;
   var band = null;
   if (passState && passState.selectedBandId)
      for (var i = 0; i < passState.bands.length; ++i)
         if (passState.bands[i].id === passState.selectedBandId)
            band = passState.bands[i];
   band = band || (passState && passState.bands.length ? passState.bands[0] : null);
   if (!band)
      return masks;
   var rangeMaskState = passState.rangeMask || null;
   var controls = acmEffectiveProtectionControls(protectionControls, imageType);
   var starProtectionMask = controls.protectStars === false
      ? null
      : acmBuildCompactStarProtectionMask(sourceHsl.y, width, height, controls.starMaskStrength);
   var rangeMaskValues = acmBuildRangeMaskValues(
      sourceHsl.y,
      width,
      height,
      rangeMaskState,
      imageType === "starless" ? { radius: rangeMaskState ? rangeMaskState.maskSoftenRadius : 0 } : null
   );
   for (var index = 0; index < count; ++index) {
      var hue = sourceHsl.h[index];
      var saturation = sourceHsl.s[index];
      var lightness = sourceHsl.l[index];
      var luminance = sourceHsl.y[index];
      var rangeMaskValue = rangeMaskValues[index];
      if (mode === "rangeMask") {
         masks[index] = rangeMaskValue;
         continue;
      }
      hue = maskSourceHsl.h[index];
      saturation = maskSourceHsl.s[index];
      lightness = maskSourceHsl.l[index];
      var built = acmBuildMasks(hue, saturation, lightness, band, protection, 1, rangeMaskValue, controls);
      var finalMask = built.finalMask;
      if (starProtectionMask)
         finalMask *= 1 - 0.92 * starProtectionMask[index];
      if (mode === "bandMask")
         masks[index] = acmClamp01(finalMask / Math.max(ACM_EPSILON, rangeMaskValue));
      else
         masks[index] = finalMask;
   }
   if (mode === "rangeMask")
      return masks;
   masks = acmApplyBandMaskEdgePolish(masks, width, height);
   if (imageType === "starless")
      masks = acmMaybeSoftenMask(masks, width, height, { radius: band.maskSoftenRadius });
   return masks;
}

function acmComputePreviewMaskData(sourceRgb, width, height, passState, imageType, protectionControls) {
   var count = width * height;
   var bandMaskValues = new Float32Array(count);
   var rangeMaskValues = new Float32Array(count);
   var combinedMaskValues = new Float32Array(count);
   var sourceHsl = acmApplySourceHsl(sourceRgb, width, height);
   var maskSourceHsl = acmComputeBandMaskAnalysisHsl(sourceRgb, width, height, imageType);
   var protection = ACM_PROTECTION_PRESETS[imageType || "stars"] || ACM_PROTECTION_PRESETS.stars;
   var band = null;
   if (passState && passState.selectedBandId)
      for (var i = 0; i < passState.bands.length; ++i)
         if (passState.bands[i].id === passState.selectedBandId)
            band = passState.bands[i];
   band = band || (passState && passState.bands.length ? passState.bands[0] : null);
   var controls = acmEffectiveProtectionControls(protectionControls, imageType);
   var starMaskValues = controls.protectStars === false
      ? new Float32Array(count)
      : acmBuildCompactStarProtectionMask(sourceHsl.y, width, height, controls.starMaskStrength);
   if (!band)
      return {
         bandMaskValues: bandMaskValues,
         rangeMaskValues: rangeMaskValues,
         combinedMaskValues: combinedMaskValues,
         starMaskValues: starMaskValues
      };

   var rangeMaskState = passState.rangeMask || null;
   rangeMaskValues = acmBuildRangeMaskValues(
      sourceHsl.y,
      width,
      height,
      rangeMaskState,
      imageType === "starless" ? { radius: rangeMaskState ? rangeMaskState.maskSoftenRadius : 0 } : null
   );
   for (var index = 0; index < count; ++index) {
      var rangeMaskValue = rangeMaskValues[index];
      var built = acmBuildMasks(
         maskSourceHsl.h[index],
         maskSourceHsl.s[index],
         maskSourceHsl.l[index],
         band,
         protection,
         1,
         rangeMaskValue,
         controls
      );
      var finalMask = built.finalMask;
      if (controls.protectStars !== false)
         finalMask *= 1 - 0.92 * starMaskValues[index];
      bandMaskValues[index] = acmClamp01(finalMask / Math.max(ACM_EPSILON, rangeMaskValue));
      combinedMaskValues[index] = finalMask;
   }
   bandMaskValues = acmApplyBandMaskEdgePolish(bandMaskValues, width, height);
   combinedMaskValues = acmApplyBandMaskEdgePolish(combinedMaskValues, width, height);
   if (imageType === "starless") {
      bandMaskValues = acmMaybeSoftenMask(bandMaskValues, width, height, { radius: band.maskSoftenRadius });
      combinedMaskValues = acmMaybeSoftenMask(combinedMaskValues, width, height, { radius: band.maskSoftenRadius });
   }
   return {
      bandMaskValues: bandMaskValues,
      rangeMaskValues: rangeMaskValues,
      combinedMaskValues: combinedMaskValues,
      starMaskValues: starMaskValues
   };
}

function acmComputeMaskValuesForPreviewMode(sourceRgb, width, height, passState, imageType, previewMode, protectionControls, boostBandMask) {
   var count = width * height;
   var sourceHsl = acmApplySourceHsl(sourceRgb, width, height);

   if (previewMode === "rangeMask") {
      var rangeMaskState = passState ? passState.rangeMask : null;
      return acmBuildRangeMaskValues(
         sourceHsl.y,
         width,
         height,
         rangeMaskState,
         imageType === "starless" ? { radius: rangeMaskState ? rangeMaskState.maskSoftenRadius : 0 } : null
      );
   }

   if (previewMode === "starMask") {
      var controls = acmEffectiveProtectionControls(protectionControls, imageType);
      if (controls.protectStars === false)
         return new Float32Array(count);
      return acmBuildCompactStarProtectionMask(sourceHsl.y, width, height, controls.starMaskStrength);
   }

   var mode = previewMode === "combinedMask" ? "combinedMask" : "bandMask";
   var maskSourceHsl = acmComputeBandMaskAnalysisHsl(sourceRgb, width, height, imageType);
   var maskValues = acmComputeSelectedBandMaskData(
      sourceRgb,
      width,
      height,
      passState,
      imageType,
      mode,
      protectionControls,
      sourceHsl,
      maskSourceHsl
   );
   if (previewMode === "bandMask" && boostBandMask)
      maskValues = acmBoostMaskValues(maskValues);
   return maskValues;
}

function acmGetViewportRectForScale(panelWidth, panelHeight, bitmapWidth, bitmapHeight, scale, panX, panY) {
   var targetWidth = Math.max(1, Math.round(bitmapWidth * scale));
   var targetHeight = Math.max(1, Math.round(bitmapHeight * scale));
   var x = Math.round((panelWidth - targetWidth) * 0.5 + panX);
   var y = Math.round((panelHeight - targetHeight) * 0.5 + panY);
   return new Rect(x, y, x + targetWidth, y + targetHeight);
}

function acmGetVisibleBitmapRectForScale(panelWidth, panelHeight, bitmapWidth, bitmapHeight, scale, panX, panY) {
   var viewportRect = acmGetViewportRectForScale(panelWidth, panelHeight, bitmapWidth, bitmapHeight, scale, panX, panY);
   var left = acmClamp((0 - viewportRect.x0) / Math.max(ACM_EPSILON, scale), 0, bitmapWidth);
   var top = acmClamp((0 - viewportRect.y0) / Math.max(ACM_EPSILON, scale), 0, bitmapHeight);
   var right = acmClamp((panelWidth - viewportRect.x0) / Math.max(ACM_EPSILON, scale), 0, bitmapWidth);
   var bottom = acmClamp((panelHeight - viewportRect.y0) / Math.max(ACM_EPSILON, scale), 0, bitmapHeight);
   return {
      x0: left,
      y0: top,
      x1: right,
      y1: bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top)
   };
}

function acmGetFitScale(panelWidth, panelHeight, bitmapWidth, bitmapHeight) {
   var usableWidth = Math.max(1, panelWidth - 8);
   var usableHeight = Math.max(1, panelHeight - 8);
   return Math.min(usableWidth / bitmapWidth, usableHeight / bitmapHeight);
}

function acmDownsampleRgbNearest(rgb, width, height, maxEdge) {
   var longest = Math.max(width, height);
   if (longest <= maxEdge)
      return { width: width, height: height, rgb: new Float32Array(rgb) };

   var scale = maxEdge / longest;
   var targetWidth = Math.max(1, Math.round(width * scale));
   var targetHeight = Math.max(1, Math.round(height * scale));
   var output = new Float32Array(targetWidth * targetHeight * 3);

   for (var y = 0; y < targetHeight; ++y) {
      var srcY = Math.min(height - 1, Math.round(y / scale));
      for (var x = 0; x < targetWidth; ++x) {
         var srcX = Math.min(width - 1, Math.round(x / scale));
         var srcBase = (srcY * width + srcX) * 3;
         var dstBase = (y * targetWidth + x) * 3;
         output[dstBase] = rgb[srcBase];
         output[dstBase + 1] = rgb[srcBase + 1];
         output[dstBase + 2] = rgb[srcBase + 2];
      }
   }

   return { width: targetWidth, height: targetHeight, rgb: output };
}

function acmCloneBand(band) {
   return {
      id: band.id,
      center: band.center,
      label: band.label,
      color: band.color,
      hueShift: band.hueShift,
      saturation: band.saturation,
      luminance: band.luminance,
      width: band.width,
      feather: band.feather,
      maskSoftenRadius: acmGetMaskSoftenRadius({ radius: band.maskSoftenRadius })
   };
}

function acmCreateDefaultPass(id, name) {
   return {
      id: id,
      name: name,
      enabled: true,
      selectedBandId: "red",
      bands: acmCreateBandDefaults(),
      neutralLuminance: acmCreateDefaultNeutralLuminance(),
      rangeMask: acmCreateDefaultRangeMask()
   };
}

function acmClonePass(pass, newId, newName) {
   var clone = acmCreateDefaultPass(newId, newName);
   clone.enabled = pass.enabled !== false;
   clone.selectedBandId = pass.selectedBandId || "red";
   clone.bands = [];
   for (var i = 0; i < pass.bands.length; ++i)
      clone.bands.push(acmCloneBand(pass.bands[i]));
   clone.neutralLuminance = {
      luminance: pass.neutralLuminance.luminance,
      satStart: pass.neutralLuminance.satStart,
      satFull: pass.neutralLuminance.satFull
   };
   clone.rangeMask = {
      enabled: pass.rangeMask.enabled,
      low: pass.rangeMask.low,
      high: pass.rangeMask.high,
      feather: pass.rangeMask.feather,
      preset: pass.rangeMask.preset,
      maskSoftenRadius: acmGetMaskSoftenRadius({ radius: pass.rangeMask.maskSoftenRadius }),
      boostEnabled: acmRangeMaskBoostEnabled(pass.rangeMask)
   };
   return clone;
}

function acmPassHasAdjustments(pass) {
   for (var i = 0; i < pass.bands.length; ++i) {
      var band = pass.bands[i];
      if (Math.abs(band.hueShift) > ACM_EPSILON || Math.abs(band.saturation) > ACM_EPSILON || Math.abs(band.luminance) > ACM_EPSILON)
         return true;
   }
   return Math.abs(pass.neutralLuminance.luminance) > ACM_EPSILON;
}

function acmBandDiffersFromDefault(band) {
   if (!band)
      return false;
   return Math.abs(band.hueShift) > ACM_EPSILON ||
      Math.abs(band.saturation) > ACM_EPSILON ||
      Math.abs(band.luminance) > ACM_EPSILON ||
      Math.abs((typeof band.width === "number" ? band.width : 45) - 45) > ACM_EPSILON ||
      Math.abs((typeof band.feather === "number" ? band.feather : 0.75) - 0.75) > ACM_EPSILON ||
      acmGetMaskSoftenRadius({ radius: band.maskSoftenRadius }) > ACM_EPSILON;
}

function acmRangeMaskDiffersFromDefault(rangeMask) {
   if (!rangeMask)
      return false;
   return rangeMask.enabled === true ||
      Math.abs((typeof rangeMask.low === "number" ? rangeMask.low : 0) - 0.0) > ACM_EPSILON ||
      Math.abs((typeof rangeMask.high === "number" ? rangeMask.high : 1) - 1.0) > ACM_EPSILON ||
      Math.abs((typeof rangeMask.feather === "number" ? rangeMask.feather : 0.10) - 0.10) > ACM_EPSILON ||
      acmGetMaskSoftenRadius({ radius: rangeMask.maskSoftenRadius }) > ACM_EPSILON ||
      acmRangeMaskBoostEnabled(rangeMask) ||
      (rangeMask.preset || "All") !== "All";
}

function acmNeutralDiffersFromDefault(neutral) {
   if (!neutral)
      return false;
   return Math.abs((typeof neutral.luminance === "number" ? neutral.luminance : 0) - 0) > ACM_EPSILON ||
      Math.abs((typeof neutral.satStart === "number" ? neutral.satStart : 0.04) - 0.04) > ACM_EPSILON ||
      Math.abs((typeof neutral.satFull === "number" ? neutral.satFull : 0.16) - 0.16) > ACM_EPSILON;
}

function acmEditorStateHasPendingChanges(state) {
   if (!state)
      return false;
   if ((state.imageType || "stars") !== "stars")
      return true;
   if ((state.sensitivity || "Normal") !== "Normal")
      return true;
   var protections = state.protectionControls || acmCreateDefaultProtectionControls();
   if (protections.protectStars === false || protections.protectLowSaturation === false)
      return true;
   if (state.passes.length !== 1)
      return true;
   for (var passIndex = 0; passIndex < state.passes.length; ++passIndex) {
      var pass = state.passes[passIndex];
      if (pass.enabled === false)
         return true;
      if (acmRangeMaskDiffersFromDefault(pass.rangeMask))
         return true;
      if (acmNeutralDiffersFromDefault(pass.neutralLuminance))
         return true;
      for (var bandIndex = 0; bandIndex < pass.bands.length; ++bandIndex)
         if (acmBandDiffersFromDefault(pass.bands[bandIndex]))
            return true;
   }
   return false;
}

function acmPromptTargetSwitchAction(dialog) {
   var result = { action: "cancel" };
   var prompt = new Dialog;
   prompt.windowTitle = "Switch target image?";
   var copy = new Label(prompt);
   copy.wordWrapping = true;
   copy.text = "There are unapplied Astro Color Mixer adjustments for the current target image.";
   var createButton = new PushButton(prompt);
   createButton.text = "Create Image";
   createButton.onClick = function() { result.action = "create"; prompt.ok(); };
   var applyButton = new PushButton(prompt);
   applyButton.text = "Apply to Target";
   applyButton.onClick = function() { result.action = "apply"; prompt.ok(); };
   var discardButton = new PushButton(prompt);
   discardButton.text = "Discard Changes";
   discardButton.onClick = function() { result.action = "discard"; prompt.ok(); };
   var cancelButton = new PushButton(prompt);
   cancelButton.text = "Cancel";
   cancelButton.onClick = function() { result.action = "cancel"; prompt.cancel(); };
   var buttons = new HorizontalSizer;
   buttons.spacing = 6;
   buttons.add(createButton);
   buttons.add(applyButton);
   buttons.add(discardButton);
   buttons.addStretch();
   buttons.add(cancelButton);
   prompt.sizer = new VerticalSizer;
   prompt.sizer.margin = 10;
   prompt.sizer.spacing = 10;
   prompt.sizer.add(copy);
   prompt.sizer.add(buttons);
   prompt.adjustToContents();
   prompt.execute();
   return result.action;
}

function acmCountEnabledPasses(state) {
   var count = 0;
   for (var i = 0; i < state.passes.length; ++i)
      if (state.passes[i].enabled !== false)
         ++count;
   return count;
}

function acmCreateBaseEditorState() {
   return {
      version: "acm-recipe-1.0",
      imageType: "stars",
      sensitivity: "Normal",
      globalStrength: 1.0,
      protectionControls: acmCreateDefaultProtectionControls(),
      activePassId: "pass-1",
      passes: [
         acmCreateDefaultPass("pass-1", "Base Pass")
      ]
   };
}

function acmBuildRecipeFromEditorState(state) {
   var passes = [];
   for (var passIndex = 0; passIndex < state.passes.length; ++passIndex) {
      var pass = state.passes[passIndex];
      var bandsObject = {};
      for (var i = 0; i < pass.bands.length; ++i) {
         var band = pass.bands[i];
         bandsObject[band.id] = {
            hueShift: band.hueShift,
            saturation: band.saturation,
            luminance: band.luminance,
            width: band.width,
            feather: band.feather,
            maskSoftenRadius: acmGetMaskSoftenRadius({ radius: band.maskSoftenRadius })
         };
      }
      passes.push({
         id: pass.id,
         name: pass.name,
         enabled: pass.enabled !== false,
         selectedBandId: pass.selectedBandId || "red",
         bands: bandsObject,
         neutralLuminance: {
            luminance: pass.neutralLuminance.luminance,
            satStart: pass.neutralLuminance.satStart,
            satFull: pass.neutralLuminance.satFull
         },
         rangeMask: {
            enabled: pass.rangeMask.enabled,
            low: pass.rangeMask.low,
            high: pass.rangeMask.high,
            feather: pass.rangeMask.feather,
            preset: pass.rangeMask.preset,
            maskSoftenRadius: acmGetMaskSoftenRadius({ radius: pass.rangeMask.maskSoftenRadius }),
            rangeMaskBoostEnabled: acmRangeMaskBoostEnabled(pass.rangeMask)
         }
      });
   }

   return {
      version: state.version || "acm-recipe-1.0",
      imageType: state.imageType || "stars",
      sensitivity: state.sensitivity || "Normal",
      globalStrength: typeof state.globalStrength === "number" ? state.globalStrength : 1.0,
      protectionControls: {
         protectStars: !state.protectionControls || state.protectionControls.protectStars !== false,
         protectLowSaturation: !state.protectionControls || state.protectionControls.protectLowSaturation !== false,
         starMaskStrength: acmNormalizeStarMaskStrength(state.protectionControls ? state.protectionControls.starMaskStrength : null)
      },
      activePassId: state.activePassId || (passes.length ? passes[0].id : "pass-1"),
      passes: passes
   };
}

function acmLoadPassesIntoEditorState(recipe) {
   var normalized = acmNormalizeRecipe(recipe);
   var state = acmCreateBaseEditorState();
   state.version = normalized.version;
   state.imageType = normalized.imageType;
   state.sensitivity = normalized.sensitivity;
   state.globalStrength = normalized.globalStrength;
   state.protectionControls = normalized.protectionControls || acmCreateDefaultProtectionControls();
   state.passes = [];
   for (var passIndex = 0; passIndex < normalized.passes.length; ++passIndex) {
      var sourcePass = normalized.passes[passIndex];
      var passName = passIndex === 0 ? "Base Pass" : (sourcePass.label || sourcePass.name || ("Pass " + (passIndex + 1)));
      state.passes.push(acmClonePass(sourcePass, sourcePass.id, passName));
   }
   state.activePassId = normalized.activePassId || (state.passes.length ? state.passes[0].id : "pass-1");
   var activeFound = false;
   for (var activeIndex = 0; activeIndex < state.passes.length; ++activeIndex)
      if (state.passes[activeIndex].id === state.activePassId)
         activeFound = true;
   if (!activeFound && state.passes.length > 0)
      state.activePassId = state.passes[0].id;
   return {
      state: state,
      enabledCount: acmCountEnabledPasses(state),
      totalPasses: normalized.passes.length,
      loadedPassName: state.passes.length ? state.passes[0].name : "Base Pass"
   };
}

function acmParameterLabelForTab(tabKey) {
   if (tabKey === ACM_TAB_HUE)
      return "Hue";
   if (tabKey === ACM_TAB_SAT)
      return "Saturation";
   return "Luminance";
}

function acmParameterRangeForTab(tabKey, sensitivity) {
   var range = ACM_SENSITIVITY_RANGES[sensitivity] || ACM_SENSITIVITY_RANGES.Normal;
   if (tabKey === ACM_TAB_HUE)
      return range.hueShift;
   if (tabKey === ACM_TAB_SAT)
      return range.saturation;
   return range.luminance;
}

function acmNeutralRangeForSensitivity(sensitivity) {
   return ACM_NEUTRAL_SENSITIVITY_RANGES[sensitivity] || ACM_NEUTRAL_SENSITIVITY_RANGES.Normal;
}

function acmGetRangeMaskPresetDefs() {
   return [
      { name: "All", enabled: false, low: 0.0, high: 1.0, feather: 0.10 },
      { name: "Shadows", enabled: true, low: 0.0, high: 0.33, feather: 0.08 },
      { name: "Midtones", enabled: true, low: 0.25, high: 0.75, feather: 0.10 },
      { name: "Highlights", enabled: true, low: 0.66, high: 1.0, feather: 0.08 },
      { name: "Faint Signal", enabled: true, low: 0.05, high: 0.45, feather: 0.08 },
      { name: "Bright Cores / Stars", enabled: true, low: 0.75, high: 1.0, feather: 0.05 }
   ];
}

function acmFindRangeMaskPreset(name) {
   var presets = acmGetRangeMaskPresetDefs();
   for (var i = 0; i < presets.length; ++i)
      if (presets[i].name === name)
         return presets[i];
   return null;
}

function acmSummarizeRangeMaskStatus(rangeMask) {
   var blur = acmGetMaskSoftenRadius({ radius: rangeMask ? rangeMask.maskSoftenRadius : 0 });
   var shaping = "Mask Shaping: Blur " + (blur > 0 ? blur.toFixed(0) + " px" : "Off") +
      " (starless only) · Boost " + (acmRangeMaskBoostEnabled(rangeMask) ? "On" : "Off");
   if (!rangeMask || !rangeMask.enabled)
      return "Range Mask: Off · Active range: All\n" + shaping;
   var label = rangeMask.preset && rangeMask.preset !== "All" && rangeMask.preset !== "Custom"
      ? " · Preset: " + rangeMask.preset
      : "";
   return "Range Mask: On" + label + " · Active range: " + rangeMask.low.toFixed(3) + "–" + rangeMask.high.toFixed(3) +
      " · Feather " + rangeMask.feather.toFixed(3) + "\n" + shaping;
}

function acmSummarizeMaskSoftenStatus(maskSoften) {
   var radius = acmGetMaskSoftenRadius(maskSoften);
   return radius > 0
      ? "Selected Band Blur: " + radius.toFixed(1) + " px. Starless only."
      : "Selected Band Blur: Off";
}

function acmSummarizeBandMaskStatus(band, imageType, boostEnabled) {
   var blur = acmGetMaskSoftenRadius({ radius: band ? band.maskSoftenRadius : 0 });
   var blurText = blur > 0 ? blur.toFixed(0) + " px" : "Off";
   var scopeText = imageType === "starless" ? "Starless active" : "Starless only";
   return "Band Shaping: Blur " + blurText + " · Boost " + (boostEnabled ? "On" : "Off") + " · " + scopeText;
}

function acmRangeMaskStatusShort(rangeMask) {
   return rangeMask && rangeMask.enabled ? "Range Mask: On" : "Range Mask: Off";
}

function acmProbeBandShortLabel(probeData) {
   if (!probeData)
      return "";
   if (probeData.suggestedNeutral)
      return "Neutral";
   if (probeData.nearestBand)
      return probeData.nearestBand.shortLabel || probeData.nearestBand.label || "";
   return "";
}

function acmFormatProbeDiagnostics(probeData, rangeMaskState) {
   var rangeText = acmRangeMaskStatusShort(rangeMaskState);
   if (!probeData)
      return "Preview diagnostics · Probe: none · " + rangeText;
   return "Preview diagnostics · Probe active · " + rangeText;
}

function acmPolarInfoLine(text, color, bold) {
   return acmThemeRichText(text, color || ACM_GRAY_UI_THEME.muted, !!bold);
}

function acmFormatPolarInfoHtml(probeData, band, rangeMask, neutralActive, changeStats) {
   var lines = [];
   lines.push(acmPolarInfoLine("Angle = Hue", ACM_GRAY_UI_THEME.muted, false));
   lines.push(acmPolarInfoLine("Radius = Sat", ACM_GRAY_UI_THEME.muted, false));
   if (probeData) {
      var probeText = "Probe L" + probeData.y709.toFixed(3);
      if (probeData.suggestedNeutral)
         probeText += " · H unreliable";
      else
         probeText += " · H" + probeData.h.toFixed(0) + "°";
      probeText += " · S" + probeData.s.toFixed(2);
      lines.push(acmPolarInfoLine(probeText, ACM_GRAY_UI_THEME.muted, false));
   } else {
      lines.push(acmPolarInfoLine("Probe: none", ACM_GRAY_UI_THEME.muted, false));
   }
   if (neutralActive) {
      lines.push(acmPolarInfoLine("Band: Neutral / Low-Sat", ACM_GRAY_UI_THEME.text, true));
      lines.push(acmPolarInfoLine("Hue radius not used", ACM_GRAY_UI_THEME.muted, false));
   } else if (band) {
      lines.push(acmPolarInfoLine("Band: " + band.label, ACM_GRAY_UI_THEME.text, true));
      lines.push(acmPolarInfoLine("C " + acmFormatAngleDegrees(band.center) + "° · R ±" + acmFormatAngleDegrees(band.width) + "°", ACM_GRAY_UI_THEME.muted, false));
   } else {
      lines.push(acmPolarInfoLine("Band: none", ACM_GRAY_UI_THEME.muted, false));
   }
   if (rangeMask && rangeMask.enabled) {
      var blur = acmGetMaskSoftenRadius({ radius: rangeMask.maskSoftenRadius });
      lines.push(acmPolarInfoLine("Range " + rangeMask.low.toFixed(3) + "–" + rangeMask.high.toFixed(3), ACM_GRAY_UI_THEME.muted, false));
      lines.push(acmPolarInfoLine("Blur " + (blur > 0 ? blur.toFixed(0) : "Off") + " · Boost " + (acmRangeMaskBoostEnabled(rangeMask) ? "On" : "Off"), ACM_GRAY_UI_THEME.muted, false));
   } else {
      lines.push(acmPolarInfoLine("Range Mask: Off", ACM_GRAY_UI_THEME.muted, false));
   }
   if (changeStats) {
      if (changeStats.state === "pending")
         lines.push(acmPolarInfoLine("Changed pending...", ACM_GRAY_UI_THEME.muted, false));
      else if (changeStats.active)
         lines.push(acmPolarInfoLine("Changed " + Math.round(changeStats.changed * 100) + "% · Strong " + Math.round(changeStats.strong * 100) + "%", ACM_GRAY_UI_THEME.muted, false));
   }
   return lines.join("<br/>");
}

function acmMaskSoftenDropdownIndexForRadius(radius) {
   return Math.round(acmGetMaskSoftenRadius({ radius: radius }));
}

function acmMaskSoftenRadiusForDropdownIndex(index) {
   return acmClamp(Math.round(index || 0), 0, 5);
}

function acmMaskSoftenLabelForRadius(radius, imageType) {
   var value = acmGetMaskSoftenRadius({ radius: radius });
   if (imageType !== "starless")
      return value > 0 ? "Blur saved: " + value.toFixed(0) + " px · active only in Starless" : "Blur: Off · starless only";
   return value > 0 ? "Blur: " + value.toFixed(0) + " px" : "Blur: Off";
}

function acmRangeMaskSoftenLabelForRadius(radius, imageType) {
   var value = acmGetMaskSoftenRadius({ radius: radius });
   if (imageType !== "starless")
      return value > 0 ? "Blur saved: " + value.toFixed(0) + " px · active only in Starless" : "Blur: Off · starless only";
   return value > 0 ? "Blur: " + value.toFixed(0) + " px" : "Blur: Off";
}

class AstroColorMixerUI03Dialog extends Dialog {
constructor() {
   super();
   acmHelpHostDialog = this;

   var self = this;
   this.windowTitle = "Astro Color Mixer v0.9.7.13-beta";
   this.recipeFilePath = "";
   this.activeTab = ACM_TAB_SAT;
   this.activeToolPanel = "selectedBand";
   this.editorState = acmCreateBaseEditorState();
   this.bandControls = [];
   this.targetViewId = null;
   this.previewSource = null;
   this.previewLuminanceValues = null;
   this.previewSourceHsl = null;
   this.previewOriginalRgb = null;
   this.previewAdjustedRgb = null;
   this.previewInfluenceStats = null;
   this.previewChangeStats = null;
   this.previewChangeStatsStamp = 0;
   this.previewChangeStatsPendingStamp = 0;
   this.previewBitmapOriginal = null;
   this.previewBitmapAdjusted = null;
   this.previewBitmapDifference = null;
   this.previewBitmapBandMask = null;
   this.previewBitmapRangeMask = null;
   this.previewBitmapCombinedMask = null;
   this.previewBitmapStarMask = null;
   this.previewBitmapLastPass = null;
   this.previewBandMaskRgb = null;
   this.previewRangeMaskRgb = null;
   this.previewCombinedMaskRgb = null;
   this.previewStarMaskRgb = null;
   this.previewLastPassRgb = null;
   this.previewTempCompare = false;
   this.previewCompareBitmap = null;
   this.previewCompareRgb = null;
   this.previewCompareMetrics = null;
   this.previewCompareLabel = "Original";
   this.maskBoostEnabled = false;
   this.maskBoostSyncing = false;
   this.linearWarningViewIds = {};
   this.protectionControlsSyncing = false;
   this.compareMode = "auto";
   this.layoutMode = "standard";
   this.compactDiagnosticsDialog = null;
   this.compactDiagnosticsExpanded = false;
   this.standardDialogWidth = 0;
   this.standardDialogHeight = 0;
   this.previewDisplayOriginal = null;
   this.previewDisplayAdjusted = null;
   this.previewWidth = 0;
   this.previewHeight = 0;
   this.previewQualityMode = "auto";
   this.previewDetailThreshold = 4;
   this.previewDetailMaxPixels = 1600000;
   this.previewDetailCache = null;
   this.previewDetailStamp = 0;
   this.previewDetailRenderPending = false;
   this.previewZoomPresetSyncing = false;
   this.previewMode = "adjusted";
   this.previewModeBeforeHold = "adjusted";
   this.previewIsStale = true;
   this.sourceView = null;
   this.currentToolPanel = null;
   this.activeToolPanel = "selectedBand";
   this.previewCacheMaxEdge = 1000;
   this.previewSliderInteraction = false;
   this.userResizable = true;
   this.lastPreviewHostWidth = 0;
   this.lastPreviewHostHeight = 0;
   this.previewRenderInProgress = false;
   this.previewRenderPending = false;
   this.previewDisplayRect = null;
   this.previewZoomMode = "fit";
   this.previewZoomScale = 1;
   this.previewPanX = 0;
   this.previewPanY = 0;
   this.previewDragStartX = 0;
   this.previewDragStartY = 0;
   this.previewPanStartX = 0;
   this.previewPanStartY = 0;
   this.previewMouseDown = false;
   this.previewDragging = false;
   this.previewTempOriginal = false;
   this.previewHoldArmed = false;
   this.previewMoveThreshold = 5;
   this.targetApplyConfirmedThisSession = false;
   this.targetApplyMaskStatus = {
      message: "Target apply: no PixInsight mask detected",
      respected: false,
      inverted: false,
      propertyNames: ["mask", "maskEnabled", "maskInverted"]
   };
   this.histogramData = null;
   this.polarSamples = [];
   this.probeData = null;
   this.passViewerRows = [];
   this.previewDebounceTimer = null;
   if (typeof Timer !== "undefined") {
      this.previewDebounceTimer = new Timer;
      this.previewDebounceTimer.interval = 0.4;
      this.previewDebounceTimer.periodic = false;
      this.previewDebounceTimer.dialog = this;
      this.previewDebounceTimer.onTimeout = function() {
         this.dialog.renderPreview();
      };
   }
   this.previewDetailDebounceTimer = null;
   if (typeof Timer !== "undefined") {
      this.previewDetailDebounceTimer = new Timer;
      this.previewDetailDebounceTimer.interval = 0.15;
      this.previewDetailDebounceTimer.periodic = false;
      this.previewDetailDebounceTimer.dialog = this;
      this.previewDetailDebounceTimer.onTimeout = function() {
         this.dialog.previewDetailRenderPending = false;
         this.dialog.renderDetailPreviewForCurrentViewport();
      };
   }
   this.previewChangeStatsTimer = null;
   if (typeof Timer !== "undefined") {
      this.previewChangeStatsTimer = new Timer;
      this.previewChangeStatsTimer.interval = 1.4;
      this.previewChangeStatsTimer.periodic = false;
      this.previewChangeStatsTimer.dialog = this;
      this.previewChangeStatsTimer.onTimeout = function() {
         this.dialog.computeDeferredPreviewChangeStats();
      };
   }
   this.previewHoldTimer = null;
   if (typeof Timer !== "undefined") {
      this.previewHoldTimer = new Timer;
      this.previewHoldTimer.interval = 0.2;
      this.previewHoldTimer.periodic = false;
      this.previewHoldTimer.dialog = this;
      this.previewHoldTimer.onTimeout = function() {
         var dialog = this.dialog;
         if (dialog.previewMouseDown && !dialog.previewDragging) {
            var compareRef = dialog.getHoldCompareReference();
            dialog.previewTempOriginal = compareRef.mode === "original";
            dialog.previewTempCompare = true;
            dialog.previewCompareBitmap = compareRef.bitmap;
            dialog.previewCompareRgb = compareRef.rgb;
            dialog.previewCompareMetrics = compareRef.metrics || null;
            dialog.previewCompareLabel = compareRef.label;
            dialog.refreshPreviewDisplay();
            dialog.previewStatusLabel.text = "Preview compare: " + compareRef.label + " — release to return";
         }
      };
   }

   this.activeStatusLabel = new Label(this);
   this.activeStatusLabel.useRichText = true;
   this.activeStatusLabel.wordWrapping = false;
   this.activeStatusLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.activeStatusLabel.minWidth = 170;
   this.activeStatusLabel.scaledMinHeight = 20;

   this.logoBitmap = acmTryLoadFirstBitmap([
      "C:/Program Files/PixInsight/rsc/AstroColorMixer/logo/logo.png",
      "/Applications/PixInsight/rsc/AstroColorMixer/logo/logo.png",
      "/Users/patrickcosgrove/Github/astro-color-mixer-pixinsight/astro-color-mixer-pixinsight/rsc/AstroColorMixer/logo/logo.png",
      "/Users/patrickcosgrove/Library/CloudStorage/Dropbox/Astronomy/Webpage Codeblocks/Colormixer/pixinsight_repo/rsc/AstroColorMixer/logo/logo.png",
      "/Users/patrickcosgrove/Documents/Playground/astro-color-mixer-web-prototype/pixinsight/logo.png"
   ]);
   this.headerLogoControl = new Control(this);
   this.headerLogoControl.acmDialogRef = this;
   this.headerLogoControl.scaledMinWidth = 230;
   this.headerLogoControl.scaledMinHeight = 96;
   this.headerLogoControl.onPaint = function() {
      var g = new Graphics(this);
      var dialog = this.acmDialogRef;
      g.pen = new Pen(0x00000000, 0);
      g.brush = new Brush(ACM_GRAY_UI_THEME.header);
      g.fillRect(0, 0, this.width, this.height, g.brush);
      if (dialog.logoBitmap) {
         var pad = -4;
         var h = Math.max(20, this.height - pad * 2);
         var w = Math.round(dialog.logoBitmap.width * (h / Math.max(1, dialog.logoBitmap.height)));
         if (w > this.width - pad * 2) {
            w = Math.max(20, this.width - pad * 2);
            h = Math.round(dialog.logoBitmap.height * (w / Math.max(1, dialog.logoBitmap.width)));
         }
         var x = Math.round((this.width - w) * 0.5);
         var y = Math.round((this.height - h) * 0.5);
         g.drawScaledBitmap(new Rect(x, y, x + w, y + h), dialog.logoBitmap);
      }
      g.end();
   };
   this.headerBrandControl = new Control(this);
   this.headerBrandControl.acmDialogRef = this;
   this.headerBrandControl.scaledMinWidth = 370;
   this.headerBrandControl.scaledMinHeight = 96;
   this.headerBrandControl.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0x00000000, 0);
      g.brush = new Brush(ACM_GRAY_UI_THEME.header);
      g.fillRect(0, 0, this.width, this.height, g.brush);
      var mainTitle = "Astro Color Mixer";
      var versionText = "v0.9.7.13-beta";
      var compactHeader = dialog.layoutMode === "compact" || this.height < 60;
      var titleFont = new Font;
      titleFont.bold = true;
      titleFont.pixelSize = compactHeader ? 24 : 36;
      var versionFont = new Font;
      versionFont.bold = false;
      versionFont.pixelSize = compactHeader ? 12 : 15;
      var minTitleSize = compactHeader ? 16 : 20;
      while (titleFont.pixelSize > minTitleSize) {
         g.font = titleFont;
         var totalWidth = g.font.width(mainTitle) + 8;
         g.font = versionFont;
         totalWidth += g.font.width(versionText);
         if (totalWidth <= Math.max(60, this.width - 8))
            break;
         --titleFont.pixelSize;
         if (versionFont.pixelSize > 11)
            --versionFont.pixelSize;
      }
      var baselineY = Math.round(this.height * 0.5 + titleFont.pixelSize * 0.25);
      g.font = titleFont;
      var astroText = "Astro ";
      var colorText = "Color Mixer";
      g.pen = new Pen(0xfff2f2f2);
      g.drawText(0, baselineY, astroText);
      var drawX = g.font.width(astroText);
      var rainbow = [0xffff1f2d, 0xffff6a00, 0xffffe600, 0xff39ff4f, 0xff14f5ff, 0xff1684ff, 0xff7a3cff, 0xffff3fd4];
      var visibleColorLetters = 0;
      for (var countIndex = 0; countIndex < colorText.length; ++countIndex)
         if (colorText.charAt(countIndex) !== " ")
            ++visibleColorLetters;
      var visibleColorIndex = 0;
      for (var ci = 0; ci < colorText.length; ++ci) {
         var ch = colorText.charAt(ci);
         if (ch === " ") {
            drawX += Math.round(g.font.width(" ") * 0.72);
            continue;
         }
         var colorT = visibleColorLetters <= 1 ? 0 : visibleColorIndex / (visibleColorLetters - 1);
         var colorPos = colorT * (rainbow.length - 1);
         var colorIndex = Math.min(rainbow.length - 1, Math.floor(colorPos));
         var nextColorIndex = Math.min(rainbow.length - 1, colorIndex + 1);
         var mixedColor = acmLerpColorArgb(rainbow[colorIndex], rainbow[nextColorIndex], colorPos - colorIndex);
         g.pen = new Pen(mixedColor);
         g.drawText(drawX, baselineY, ch);
         drawX += g.font.width(ch);
         ++visibleColorIndex;
      }
      var titleWidth = drawX;
      g.font = versionFont;
      g.pen = new Pen(0xffd8dcff);
      g.drawText(titleWidth + 6, baselineY, versionText);
      g.end();
   };

   this.floatingHelpBox = null;
   this.floatingHelpBoxParent = null;

   this.refreshButton = new Control(this);
   this.refreshButton.text = "Refresh";
   this.refreshButton.acmIconOnly = false;
   this.refreshButton.setFixedWidth(ACM_HOST_IS_WINDOWS ? 124 : 128);
   this.refreshButton.toolTip = "Refreshes the list of open PixInsight images and updates target/mask status.";
   this.refreshButton.onClick = function() { self.refreshAvailableTargets(true); };
   this.refreshButton.onMousePress = function() {
      if (typeof this.onClick === "function")
         this.onClick();
   };
   this.refreshButton.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0xff8e92a0);
      g.brush = new Brush(this.acmIconOnly ? 0xff55575d : 0xffeeeeee);
      g.drawRect(this.boundsRect);
      if (!this.acmIconOnly) {
         g.pen = new Pen(0xfff8fafc, 1);
         g.drawLine(1, 1, this.width - 2, 1);
         g.pen = new Pen(0xff4a4f58, 1);
         g.drawLine(1, this.height - 2, this.width - 2, this.height - 2);
      }
      if (this.acmIconOnly) {
         var iconFont = new Font;
         iconFont.pixelSize = 14;
         iconFont.bold = true;
         g.font = iconFont;
         var glyph = "\u21ba";
         var glyphW = g.font.width(glyph);
         var glyphX = Math.round((this.width - glyphW) * 0.5);
         var glyphY = Math.round((this.height + g.font.ascent - g.font.descent) * 0.5);
         g.pen = new Pen(0xfff2f2f2);
         g.drawText(glyphX, glyphY, glyph);
      } else {
         var f = new Font;
         f.pixelSize = ACM_HOST_IS_WINDOWS ? 15 : 14;
         g.font = f;
         var label = "Refresh";
         var tw = g.font.width(label);
         var x = Math.round((this.width - tw) * 0.5);
         var y = Math.round((this.height + g.font.ascent - g.font.descent) * 0.5);
         g.pen = new Pen(0xff202020);
         g.drawText(x, y, label);
      }
      g.end();
   };

   this.targetImageLabel = new Label(this);
   this.targetImageLabel.text = "Target Image:";
   this.targetImageLabel.minWidth = ACM_HOST_IS_WINDOWS ? 126 : 96;
   this.targetImageLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;

   this.targetImageCombo = new ComboBox(this);
   this.targetImageCombo.minWidth = ACM_HOST_IS_WINDOWS ? 420 : 344;
   this.targetImageCombo.setFixedWidth(ACM_HOST_IS_WINDOWS ? 420 : 344);
   this.targetImageCombo.toolTip = "Selects the PixInsight image/view Astro Color Mixer will process. Switching targets will prompt if there are unapplied adjustments.";
   this.targetImageCombo.onItemSelected = function(index) {
      if (self.targetComboSyncing)
         return;
      self.handleTargetSelectionChange(index);
   };

   this.pendingChangesLabel = new Label(this);
   this.pendingChangesLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.pendingChangesLabel.minWidth = 84;
   this.pendingChangesLabel.text = "";

   this.imageTypeLabel = new Label(this);
   this.imageTypeLabel.text = "Image Type";
   this.imageTypeLabel.minWidth = ACM_HOST_IS_WINDOWS ? 96 : 72;
   this.imageTypeLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.imageTypeHelpButton = acmCreateHelpButton(
      this,
      "Image Type",
      "Stars Present is the safer mode for images that still contain normal stars, bright cores, and halos. Starless is intended for images where stars have been removed, allowing more freedom for nebula, galaxy, dust, and faint-signal refinement. This setting does not remove stars; it changes the protection behavior used during adjustments.",
      "imageType"
   );
   this.imageTypeCombo = new ComboBox(this);
   this.imageTypeCombo.addItem("Stars Present");
   this.imageTypeCombo.addItem("Starless");
   this.imageTypeCombo.currentItem = 0;
   this.imageTypeCombo.onItemSelected = function(index) {
      self.editorState.imageType = index === 0 ? "stars" : "starless";
      self.invalidateMaskPreviewCaches();
      self.refreshSelectedBandControls();
      self.refreshRangeMaskControls();
      self.refreshProtectionControls();
      self.markPreviewStale();
      self.refreshSelectedBandMaskPreviewIfActive();
      self.refreshRangeMaskPreviewIfActive();
   };

   this.protectionPolicyLabel = new Label(this);
   this.protectionPolicyLabel.text = "Protections";
   this.protectionPolicyLabel.minWidth = ACM_HOST_IS_WINDOWS ? 96 : 72;
   this.protectionPolicyLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.protectionPolicyHelpButton = acmCreateHelpButton(
      this,
      "Protection Controls",
      "Protections are guardrails, not hard laws. Protect Stars uses a compact-star mask plus highlight protection to reduce damage to stars and many halos in Stars Present mode. In Starless mode, star protection is disabled because there should be no meaningful star layer to protect. Protect Low Sat prevents hue-band edits from chasing weak or noisy color in very low-saturation regions, and it also helps protect faint halo fields around bright stars. For aggressive faint-color galaxy or dust work, a starless image is strongly recommended. If Low Sat protection is off, use several modest passes rather than one extreme move.",
      "protectionControls"
   );
   this.protectStarsCheck = new CheckBox(this);
   this.protectStarsCheck.text = "Protect Stars";
   this.protectStarsCheck.checked = true;
   this.protectStarsCheck.toolTip = "Use compact-star and highlight protection to limit strong edits in stars and many halos.";
   this.protectStarsCheck.onCheck = function(checked) {
      if (self.protectionControlsSyncing)
         return;
      if (self.editorState.imageType === "starless") {
         self.refreshProtectionControls();
         return;
      }
      self.editorState.protectionControls = self.editorState.protectionControls || acmCreateDefaultProtectionControls();
      self.editorState.protectionControls.protectStars = checked;
      self.invalidateMaskPreviewCaches();
      self.refreshProtectionControls();
      self.markPreviewStale();
      self.refreshSelectedBandMaskPreviewIfActive();
   };
   this.protectLowSatCheck = new CheckBox(this);
   this.protectLowSatCheck.text = "Protect Low Sat";
   this.protectLowSatCheck.checked = true;
   this.protectLowSatCheck.toolTip = "Reduce hue-band edits in very low-saturation regions, including noisy neutral areas and faint halo fields.";
   this.protectLowSatCheck.onCheck = function(checked) {
      if (self.protectionControlsSyncing)
         return;
      self.editorState.protectionControls = self.editorState.protectionControls || acmCreateDefaultProtectionControls();
      self.editorState.protectionControls.protectLowSaturation = checked;
      self.invalidateMaskPreviewCaches();
      self.markPreviewStale();
      self.refreshSelectedBandMaskPreviewIfActive();
   };

   this.layoutModeLabel = new Label(this);
   this.layoutModeLabel.text = "Window";
   this.layoutModeLabel.setFixedWidth(ACM_HOST_IS_WINDOWS ? 82 : 56);
   this.layoutModeLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.layoutModeCombo = new ComboBox(this);
   this.layoutModeCombo.addItem("Standard");
   this.layoutModeCombo.addItem("Compact");
   this.layoutModeCombo.currentItem = 0;
   this.layoutModeCombo.setFixedWidth(ACM_HOST_IS_WINDOWS ? 154 : 112);
   this.layoutModeCombo.toolTip = "Standard shows the full embedded Diagnostics & Passes area. Compact reduces the header/preview footprint and moves diagnostics into a separate dialog.";
   this.layoutModeCombo.onItemSelected = function(index) {
      self.setLayoutMode(index === 1 ? "compact" : "standard");
   };
   this.windowSizeLabel = new Label(this);
   this.windowSizeLabel.text = "-- x --";
   this.windowSizeLabel.setFixedWidth(ACM_HOST_IS_WINDOWS ? 128 : 112);
   this.windowSizeLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.windowSizeStatusLabel = new Label(this);
   this.windowSizeStatusLabel.text = "";
   this.windowSizeStatusLabel.minWidth = ACM_HOST_IS_WINDOWS ? 94 : 78;
   this.windowSizeStatusLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.saveWindowSizeButton = new PushButton(this);
   this.saveWindowSizeButton.text = "Save";
   this.saveWindowSizeButton.setFixedWidth(ACM_HOST_IS_WINDOWS ? 154 : 112);
   this.saveWindowSizeButton.backgroundColor = 0xffffc43a;
   this.saveWindowSizeButton.foregroundColor = 0xff101010;
   this.saveWindowSizeButton.toolTip = "Saves the current window size for the current Layout mode.";
   this.saveWindowSizeButton.onClick = function() { self.saveCurrentWindowSizePreference(); };
   this.resetWindowSizeButton = new PushButton(this);
   this.resetWindowSizeButton.text = "Reset";
   this.resetWindowSizeButton.setFixedWidth(ACM_HOST_IS_WINDOWS ? 150 : 112);
   this.resetWindowSizeButton.backgroundColor = 0xffeeeeee;
   this.resetWindowSizeButton.foregroundColor = 0xff101010;
   this.resetWindowSizeButton.toolTip = "Clears saved window sizes for both Standard and Compact, then returns the current layout to its default size.";
   this.resetWindowSizeButton.onClick = function() { self.resetWindowSizePreferences(); };

   this.sensitivityLabel = new Label(this);
   this.sensitivityLabel.text = "Sensitivity";
   this.sensitivityLabel.toolTip = "Controls slider response: Fine for subtle changes, Normal for general work, Strong for larger visible changes.";
   this.sensitivityLabel.setFixedWidth(ACM_HOST_IS_WINDOWS ? 108 : 64);
   this.sensitivityLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.sensitivityCombo = new ComboBox(this);
   this.sensitivityCombo.addItem("Fine");
   this.sensitivityCombo.addItem("Normal");
   this.sensitivityCombo.addItem("Strong");
   this.sensitivityCombo.toolTip = "Controls slider response: Fine for subtle changes, Normal for general work, Strong for larger visible changes.";
   this.sensitivityCombo.currentItem = 1;
   this.sensitivityCombo.setFixedHeight(24);
   this.sensitivityCombo.setFixedWidth(ACM_HOST_IS_WINDOWS ? 128 : 112);
   this.sensitivityCombo.onItemSelected = function(index) {
      var sensitivity = self.sensitivityCombo.itemText(index);
      self.editorState.sensitivity = sensitivity === "Strong" ? "Advanced" : sensitivity;
      self.clampBandValuesForSensitivity();
      self.refreshBandControls();
      self.markPreviewStale();
   };
   this.sensitivityHelpButton = acmCreateHelpButton(
      this,
      "Sensitivity",
      "Sensitivity controls slider response. Fine gives smaller, more precise slider movement. Normal is the default general-purpose setting. Strong gives larger visible changes for the same slider movement.",
      "sensitivity"
   );

   this.editorState.globalStrength = 1.0;

   this.passSectionLabel = new Label(this);
   this.passSectionLabel.useRichText = true;
   this.passSectionLabel.text = "";
   this.passSectionLabel.visible = false;
   this.passSectionLabel.hide();

   this.passActiveCombo = new ComboBox(this);
   if (ACM_HOST_IS_WINDOWS)
      this.passActiveCombo.setFixedWidth(148);
   this.passActiveCombo.onItemSelected = function(index) {
      if (self.passComboSyncing)
         return;
      if (index < 0 || index >= self.editorState.passes.length)
         return;
      self.editorState.activePassId = self.editorState.passes[index].id;
      self.refreshFromState();
      self.markPreviewStale();
   };

   this.passEnabledCheck = new CheckBox(this);
   this.passEnabledCheck.text = ACM_HOST_IS_WINDOWS ? "On" : "Enabled";
   this.passEnabledCheck.toolTip = "Enable or disable the active pass.";
   this.passEnabledCheck.onCheck = function(checked) {
      self.getActivePassState().enabled = checked;
      self.refreshPassControls();
      self.markPreviewStale();
   };

   this.newPassButton = new PushButton(this);
   this.newPassButton.text = "New";
   this.newPassButton.setFixedWidth(ACM_HOST_IS_WINDOWS ? 56 : 90);
   this.newPassButton.onClick = function() { self.createNewPass(); };

   this.duplicatePassButton = new PushButton(this);
   this.duplicatePassButton.text = ACM_HOST_IS_WINDOWS ? "Dup" : "Duplicate";
   this.duplicatePassButton.toolTip = "Duplicate the active pass.";
   this.duplicatePassButton.setFixedWidth(ACM_HOST_IS_WINDOWS ? 58 : 110);
   this.duplicatePassButton.onClick = function() { self.duplicateActivePass(); };

   this.deletePassButton = new PushButton(this);
   this.deletePassButton.text = ACM_HOST_IS_WINDOWS ? "Del" : "Delete";
   this.deletePassButton.toolTip = "Delete the active pass.";
   this.deletePassButton.setFixedWidth(ACM_HOST_IS_WINDOWS ? 56 : 90);
   this.deletePassButton.onClick = function() { self.deleteActivePass(); };

   this.passSummaryLabel = new Label(this);
   this.passSummaryLabel.wordWrapping = true;
   this.passSummaryLabel.text = "";
   this.passSummaryLabel.visible = false;
   this.passSummaryLabel.hide();

   this.passCountLabel = new Label(this);
   this.passCountLabel.wordWrapping = true;
   this.passCountLabel.text = "";
   this.passCountLabel.visible = false;
   this.passCountLabel.hide();

   this.tabHueButton = new PushButton(this);
   this.tabHueButton.text = "Hue";
   this.tabHueButton.setFixedWidth(ACM_HOST_IS_WINDOWS ? 72 : 36);
   this.tabHueButton.setFixedHeight(ACM_HOST_IS_WINDOWS ? 28 : 24);
   this.tabHueButton.onClick = function() { self.setActiveTab(ACM_TAB_HUE); };

   this.tabSaturationButton = new PushButton(this);
   this.tabSaturationButton.text = "Saturation";
   this.tabSaturationButton.setFixedWidth(ACM_HOST_IS_WINDOWS ? 112 : 48);
   this.tabSaturationButton.setFixedHeight(ACM_HOST_IS_WINDOWS ? 28 : 24);
   this.tabSaturationButton.onClick = function() { self.setActiveTab(ACM_TAB_SAT); };

   this.tabLuminanceButton = new PushButton(this);
   this.tabLuminanceButton.text = "Luminance";
   this.tabLuminanceButton.setFixedWidth(ACM_HOST_IS_WINDOWS ? 112 : 50);
   this.tabLuminanceButton.setFixedHeight(ACM_HOST_IS_WINDOWS ? 28 : 24);
   this.tabLuminanceButton.onClick = function() { self.setActiveTab(ACM_TAB_LUM); };

   this.toolSelectedBandButton = new PushButton(this);
   this.toolSelectedBandButton.text = "Selected Band";
   this.toolSelectedBandButton.onClick = function() { self.setActiveToolPanel("selectedBand"); };

   this.toolRangeMaskButton = new PushButton(this);
   this.toolRangeMaskButton.text = "Range Mask";
   this.toolRangeMaskButton.onClick = function() { self.setActiveToolPanel("rangeMask"); };

   this.toolDiagnosticsButton = new PushButton(this);
   this.toolDiagnosticsButton.text = "Diagnostics";
   this.toolDiagnosticsButton.onClick = function() { self.setActiveToolPanel("diagnostics"); };
   this.toolDiagnosticsButton.visible = false;
   this.toolDiagnosticsButton.hide();

   this.toolPreviewOutputButton = new PushButton(this);
   this.toolPreviewOutputButton.text = "Output / Sets";
   this.toolPreviewOutputButton.onClick = function() { self.setActiveToolPanel("previewOutput"); };
   this.toolPreviewOutputButton.visible = false;
   this.toolPreviewOutputButton.hide();

   this.bandSectionLabel = new Label(this);
   this.bandSectionLabel.useRichText = true;
   this.bandSectionLabel.scaledMinHeight = 18;
   this.colorMixerHelpButton = acmCreateHelpButton(
      this,
      "Color Mixer",
      "The Color Mixer adjusts nonlinear RGB color by band. Hue changes color direction, Saturation changes color intensity, and Luminance changes brightness for the selected color regions. The sliders affect the active Refinement Pass.\n\nSensitivity controls slider response. Fine gives smaller, more precise slider movement. Normal is the default general-purpose setting. Strong gives larger visible changes for the same slider movement.",
      "colorMixer"
   );
   this.colorMixerHelpBox = acmCreateHelpBox(this);

   this.selectedBandSectionLabel = new Label(this);
   this.selectedBandSectionLabel.useRichText = true;
   this.selectedBandSectionLabel.text = "<b>Selected Band</b>";
   this.selectedBandHelpButton = acmCreateHelpButton(
      this,
      "Selected Band",
      "Selected Band controls which hue region is being shaped. Hue Radius sets the outer limit on each side of the hue center, and Feather controls how quickly the selection falls from the strong core to that outer limit. Blur is a spatial mask blur for the selected band and is active only in Starless mode. Neutral / Low-Saturation is selected by low chroma rather than hue angle, so Hue Radius does not apply there.",
      "selectedBand"
   );
   this.selectedBandHelpBox = acmCreateHelpBox(this);

   this.selectedBandHelpLabel = new Label(this);
   this.selectedBandHelpLabel.wordWrapping = true;
   this.selectedBandHelpLabel.text = "Hue Radius sets the outer limit on each side of the hue center. Feather controls how quickly the selection falls from the strong core to that outer limit.";
   this.selectedBandHelpLabel.visible = false;
   this.selectedBandHelpLabel.hide();

   this.selectedBandReadoutTitle = new Label(this);
   this.selectedBandReadoutTitle.useRichText = true;
   this.selectedBandReadoutTitle.text = "<b>Selection</b>";

   this.selectedBandReadoutPrimary = new Label(this);
   this.selectedBandReadoutPrimary.useRichText = false;
   this.selectedBandReadoutPrimary.text = ACM_HOST_IS_WINDOWS ? "Hue 0°  R ±45°  Core ±11.25°" : "Hue center: 0°  Hue Radius: ±45°  Strong core: ±11.25°";
   this.selectedBandReadoutPrimary.scaledMinWidth = ACM_HOST_IS_WINDOWS ? 390 : 360;
   acmApplyLightText(this.selectedBandReadoutPrimary);

   this.selectedBandReadoutSecondary = new Label(this);
   this.selectedBandReadoutSecondary.useRichText = false;
   this.selectedBandReadoutSecondary.text = ACM_HOST_IS_WINDOWS ? "Fall 11.25–45°  Range 315–45°  F 0.75" : "Falloff: 11.25°–45°  Affected range: 315°–45°  Feather: 0.75";
   this.selectedBandReadoutSecondary.scaledMinWidth = ACM_HOST_IS_WINDOWS ? 390 : 360;
   acmApplyLightText(this.selectedBandReadoutSecondary);

   this.selectedBandProfileBar = new Control(this);
   this.selectedBandProfileBar.scaledMinHeight = 26;
   this.selectedBandProfileBar.scaledMinWidth = ACM_HOST_IS_WINDOWS ? 390 : 360;
   this.selectedBandProfileBar.acmDialogRef = this;
   this.selectedBandProfileBar.toolTip = "Mask response profile. Bright center = strong core, darker shoulders = feather falloff, dark ends = off.";
   this.selectedBandProfileBar.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0xff404854);
      g.brush = new Brush(0xff161a22);
      g.drawRect(this.boundsRect);
      var left = Math.min(6, Math.max(1, Math.floor(this.width * 0.08)));
      var right = Math.max(left + 1, this.width - left - 1);
      var top = 7;
      var bottom = this.height - 9;
      var w = Math.max(1, right - left);
      var h = Math.max(1, bottom - top);
      var neutral = this.acmDialogRef.activeTab === ACM_TAB_LUM && this.acmDialogRef.getHighlightedRowId && this.acmDialogRef.getHighlightedRowId() === "neutral";
      g.pen = new Pen(0x00000000, 0);
      if (neutral) {
         g.brush = new Brush(0xff2d333c);
         g.fillRect(left, top, right, bottom, g.brush);
         g.brush = new Brush(0xffd7d9dd);
         g.fillRect(left, top, left + Math.round(w * 0.35), bottom, g.brush);
      } else {
         var band = this.acmDialogRef.getSelectedBand();
         var outerWidth = Math.max(0, band.width);
         var innerWidth = band.feather <= ACM_EPSILON ? outerWidth : outerWidth * (1 - band.feather);
         innerWidth = acmClamp(innerWidth, 0, outerWidth);
         var domain = Math.max(75, 1);
         var coreColor = 0xfff5be2d;
         var featherStartColor = 0xffc7972d;
         var featherEndColor = 0xff4d4127;
         for (var x = left; x < right; ++x) {
            var t = ((x - left) / Math.max(1, w - 1)) * 2 - 1;
            var distance = Math.abs(t) * domain;
            var color = 0xff232831;
            if (distance <= innerWidth + ACM_EPSILON) {
               color = coreColor;
            } else if (distance <= outerWidth + ACM_EPSILON) {
               var falloffT = outerWidth <= innerWidth + ACM_EPSILON ? 1 : (distance - innerWidth) / (outerWidth - innerWidth);
               color = acmLerpColorArgb(featherStartColor, featherEndColor, falloffT);
            }
            g.brush = new Brush(color);
            g.fillRect(x, top, x + 1, bottom, g.brush);
         }
         var innerFrac = domain > 0 ? acmClamp01(innerWidth / domain) : 0;
         var outerFrac = domain > 0 ? acmClamp01(outerWidth / domain) : 0;
         var innerDx = Math.round(innerFrac * (w * 0.5));
         var outerDx = Math.round(outerFrac * (w * 0.5));
         var centerX = Math.round((left + right) * 0.5);
         var innerLeft = acmClamp(centerX - innerDx, left, right);
         var innerRight = acmClamp(centerX + innerDx, left, right);
         var outerLeft = acmClamp(centerX - outerDx, left, right);
         var outerRight = acmClamp(centerX + outerDx, left, right);
         g.pen = new Pen(0xfff5f5f5, 1);
         g.drawLine(centerX, top - 1, centerX, bottom + 1);
         g.pen = new Pen(0xffd9dce2, 1);
         g.drawLine(innerLeft, top - 1, innerLeft, bottom + 1);
         g.drawLine(innerRight, top - 1, innerRight, bottom + 1);
         g.pen = new Pen(0xff8f97a3, 1);
         g.drawLine(outerLeft, top - 1, outerLeft, bottom + 1);
         g.drawLine(outerRight, top - 1, outerRight, bottom + 1);
      }
      g.end();
   };

   this.selectedBandReadoutPanel = new Control(this);
   acmSetThemePanel(this.selectedBandReadoutPanel, ACM_GRAY_UI_THEME.panelInset, ACM_GRAY_UI_THEME.line);
   this.selectedBandReadoutPanel.scaledMinWidth = ACM_HOST_IS_WINDOWS ? 410 : 380;
   this.selectedBandReadoutPanel.sizer = new VerticalSizer;
   this.selectedBandReadoutPanel.sizer.margin = 8;
   this.selectedBandReadoutPanel.sizer.spacing = 6;
   this.selectedBandReadoutPanel.sizer.addStretch();
   this.selectedBandReadoutPanel.sizer.add(this.selectedBandReadoutTitle);
   this.selectedBandReadoutPanel.sizer.add(this.selectedBandReadoutPrimary);
   this.selectedBandReadoutPanel.sizer.add(this.selectedBandReadoutSecondary);
   this.selectedBandReadoutPanel.sizer.add(this.selectedBandProfileBar);
   this.selectedBandReadoutPanel.sizer.addStretch();

   this.selectedBandViz = new Control(this);
   this.selectedBandViz.scaledMinWidth = 112;
   this.selectedBandViz.scaledMinHeight = 112;
   this.selectedBandViz.acmDialogRef = this;
   this.selectedBandViz.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0xff404854);
      g.brush = new Brush(0xff161a22);
      g.drawRect(this.boundsRect);
      var cx = Math.round(this.width * 0.5);
      var cy = Math.round(this.height * 0.54);
      var baseOuterR = Math.max(20, Math.min(this.width, this.height) * 0.325);
      var baseInnerR = Math.max(10, baseOuterR * 0.64);
      var trackInnerR = baseOuterR + 2;
      var trackOuterR = baseOuterR + 12;
      var neutralActive = this.acmDialogRef.activeTab === ACM_TAB_LUM && this.acmDialogRef.getHighlightedRowId && this.acmDialogRef.getHighlightedRowId() === "neutral";

      for (var deg = 0; deg < 360; deg += 6) {
         var basePolygons = [];
         acmAppendAnnularSectorPolygons(basePolygons, cx, cy, baseInnerR, baseOuterR, deg, deg + 6);
         var rgb = acmHueToRgb01(deg + 3);
         var baseColor = acmRgb01ToArgb(0.20 + rgb.r * 0.72, 0.20 + rgb.g * 0.72, 0.20 + rgb.b * 0.72, neutralActive ? 90 : 175);
         g.brush = new Brush(baseColor);
         g.pen = new Pen(0x00000000, 0);
         for (var bp = 0; bp < basePolygons.length; ++bp)
            g.fillPolygon(basePolygons[bp]);
      }

      var trackPolygons = [];
      acmAppendAnnularSectorPolygons(trackPolygons, cx, cy, trackInnerR, trackOuterR, 0, 360);
      g.brush = new Brush(0xff343943);
      g.pen = new Pen(0x00000000, 0);
      for (var tp = 0; tp < trackPolygons.length; ++tp)
         g.fillPolygon(trackPolygons[tp]);

      var band = neutralActive ? null : this.acmDialogRef.getSelectedBand();
      if (band) {
         var centerA = band.center * Math.PI / 180;
         var outerWidth = Math.max(0, Math.min(175, band.width));
         var innerWidth = band.feather <= ACM_EPSILON ? outerWidth : outerWidth * (1 - band.feather);
         innerWidth = acmClamp(innerWidth, 0, outerWidth);
         var featherInnerR = trackInnerR + 1;
         var featherOuterR = trackOuterR - 2;
         var sectorInnerR = trackInnerR;
         var sectorOuterR = trackOuterR;
         var coreColor = 0xfff5be2d;
         var featherStartColor = 0xffc7972d;
         var featherEndColor = 0xff4d4127;
         if (innerWidth + ACM_EPSILON < outerWidth) {
            var featherSegments = Math.max(12, Math.ceil((outerWidth - innerWidth) / 2));
            for (var fs = 0; fs < featherSegments; ++fs) {
               var t0 = fs / featherSegments;
               var t1 = (fs + 1) / featherSegments;
               var segColor = acmLerpColorArgb(featherStartColor, featherEndColor, (t0 + t1) * 0.5);
               var lowSegPolygons = [];
               acmAppendAnnularSectorPolygons(
                  lowSegPolygons,
                  cx,
                  cy,
                  featherInnerR,
                  featherOuterR,
                  band.center - (innerWidth + (outerWidth - innerWidth) * t1),
                  band.center - (innerWidth + (outerWidth - innerWidth) * t0)
               );
               var highSegPolygons = [];
               acmAppendAnnularSectorPolygons(
                  highSegPolygons,
                  cx,
                  cy,
                  featherInnerR,
                  featherOuterR,
                  band.center + (innerWidth + (outerWidth - innerWidth) * t0),
                  band.center + (innerWidth + (outerWidth - innerWidth) * t1)
               );
               g.brush = new Brush(segColor);
               g.pen = new Pen(0x00000000, 0);
               for (var lsp = 0; lsp < lowSegPolygons.length; ++lsp)
                  g.fillPolygon(lowSegPolygons[lsp]);
               for (var hsp = 0; hsp < highSegPolygons.length; ++hsp)
                  g.fillPolygon(highSegPolygons[hsp]);
            }
         }

         if (innerWidth > ACM_EPSILON) {
            var corePolygons = [];
            acmAppendAnnularSectorPolygons(corePolygons, cx, cy, sectorInnerR, sectorOuterR, band.center - innerWidth, band.center + innerWidth);
            g.brush = new Brush(coreColor);
            g.pen = new Pen(0x00000000, 0);
            for (var cp = 0; cp < corePolygons.length; ++cp)
               g.fillPolygon(corePolygons[cp]);
         }

         g.brush = new Brush(0xff0f1218);
         g.pen = new Pen(0xff20242c);
         g.drawEllipse(Math.round(cx - baseInnerR + 2), Math.round(cy - baseInnerR + 2), Math.round(cx + baseInnerR - 2), Math.round(cy + baseInnerR - 2));
         g.pen = new Pen(0xffd6b366, 2);
         var lowOuterA = (band.center - outerWidth) * Math.PI / 180;
         var highOuterA = (band.center + outerWidth) * Math.PI / 180;
         var tickInnerR = trackOuterR - 3;
         var tickOuterR = trackOuterR + 4;
         g.drawLine(
            Math.round(cx + Math.cos(lowOuterA) * tickInnerR),
            Math.round(cy - Math.sin(lowOuterA) * tickInnerR),
            Math.round(cx + Math.cos(lowOuterA) * tickOuterR),
            Math.round(cy - Math.sin(lowOuterA) * tickOuterR)
         );
         g.drawLine(
            Math.round(cx + Math.cos(highOuterA) * tickInnerR),
            Math.round(cy - Math.sin(highOuterA) * tickInnerR),
            Math.round(cx + Math.cos(highOuterA) * tickOuterR),
            Math.round(cy - Math.sin(highOuterA) * tickOuterR)
         );
         g.pen = new Pen(0xfff5f5f5, 2);
         var xCenter0 = cx + Math.cos(centerA) * (baseInnerR - 2);
         var yCenter0 = cy - Math.sin(centerA) * (baseInnerR - 2);
         var xCenter1 = cx + Math.cos(centerA) * (trackOuterR + 2);
         var yCenter1 = cy - Math.sin(centerA) * (trackOuterR + 2);
         g.drawLine(Math.round(xCenter0), Math.round(yCenter0), Math.round(xCenter1), Math.round(yCenter1));
      } else {
         g.brush = new Brush(0xff0f1218);
         g.pen = new Pen(0xff20242c);
         g.drawEllipse(Math.round(cx - baseInnerR + 2), Math.round(cy - baseInnerR + 2), Math.round(cx + baseInnerR - 2), Math.round(cy + baseInnerR - 2));
         var centerFont = new Font;
         centerFont.pixelSize = 9;
         centerFont.bold = true;
         g.font = centerFont;
         g.pen = new Pen(0xffc4c8cf);
         var centerText = "LOW SAT";
         var tw = g.font.width(centerText);
         var tx = Math.round(cx - tw * 0.5);
         var ty = Math.round(cy + (g.font.ascent - g.font.descent) * 0.5);
         g.drawText(tx, ty, centerText);
      }
      g.end();
   };

    this.selectedBandLabel = new Label(this);
    this.selectedBandLabel.text = "Band:";
    this.selectedBandCombo = new ComboBox(this);
    for (var bandItemIndex = 0; bandItemIndex < ACM_BAND_DEFS.length; ++bandItemIndex)
       this.selectedBandCombo.addItem(ACM_BAND_DEFS[bandItemIndex].label);
    this.selectedBandCombo.currentItem = 0;
   this.selectedBandCombo.onItemSelected = function(index) {
      self.getActivePassState().selectedBandId = ACM_BAND_DEFS[index].id;
      self.setHighlightedRowId(ACM_BAND_DEFS[index].id);
      self.refreshSelectedBandControls();
      self.refreshSelectedBandMaskPreviewIfActive();
      self.markPreviewStaleForMaskControl("Current Band Mask");
   };

    this.widthControl = new NumericControl(this);
    this.widthControl.label.text = "Hue Radius:";
    this.widthControl.real = false;
   this.widthControl.setRange(10, 75);
   this.widthControl.slider.setRange(0, 65);
   this.widthControl.setValue(45);
   this.widthControl.__acmOnSliderPress = function() {
      self.deferSelectedBandTextUpdates = true;
   };
   this.widthControl.__acmOnSliderRelease = function() {
      self.deferSelectedBandTextUpdates = false;
      self.refreshSelectedBandReadoutAndVisualization(true);
   };
   this.widthControl.onValueUpdated = function(value) {
      self.getSelectedBand().width = value;
      self.refreshSelectedBandReadoutAndVisualization(!self.deferSelectedBandTextUpdates);
      self.refreshSelectedBandMaskPreviewIfActive();
      self.markPreviewStaleForMaskControl("Current Band Mask");
   };
   acmAttachPreviewSliderHooks(this, this.widthControl);

    this.featherControl = new NumericControl(this);
    this.featherControl.label.text = "Feather:";
    this.featherControl.real = true;
    this.featherControl.setPrecision(2);
   this.featherControl.setRange(0.15, 1.0);
   this.featherControl.slider.setRange(0, 100);
   this.featherControl.setValue(0.75);
   this.featherControl.__acmOnSliderPress = function() {
      self.deferSelectedBandTextUpdates = true;
   };
   this.featherControl.__acmOnSliderRelease = function() {
      self.deferSelectedBandTextUpdates = false;
      self.refreshSelectedBandReadoutAndVisualization(true);
   };
   this.featherControl.onValueUpdated = function(value) {
      self.getSelectedBand().feather = value;
      self.refreshSelectedBandReadoutAndVisualization(!self.deferSelectedBandTextUpdates);
      self.refreshSelectedBandMaskPreviewIfActive();
      self.markPreviewStaleForMaskControl("Current Band Mask");
   };
   acmAttachPreviewSliderHooks(this, this.featherControl);

   this.resetSelectedButton = new PushButton(this);
   this.resetSelectedButton.text = "Reset Selected Band";
   this.resetSelectedButton.onClick = function() {
      self.resetSelectedBand();
   };

   this.rangeMaskSectionLabel = new Label(this);
   this.rangeMaskSectionLabel.useRichText = true;
   this.rangeMaskSectionLabel.text = "<b>Range Mask</b>";
   this.rangeMaskHelpButton = acmCreateHelpButton(
      this,
      "Range Mask",
      "Range Mask limits adjustments to a luminance range. Use it when you want a pass to affect shadows, faint signal, highlights, bright cores, or other brightness-defined regions without changing the whole image. Presets are starting points; use Low, High, and Feather to tune the range for the current image stretch.",
      "rangeMask"
   );
   this.rangeMaskHelpBox = acmCreateHelpBox(this);

   this.rangeMaskEnabledCheck = new CheckBox(this);
   this.rangeMaskEnabledCheck.text = "Enable Range Mask";
   this.rangeMaskEnabledCheck.toolTip = "Limits the current pass adjustment to the selected luminance range.";
   this.rangeMaskEnabledCheck.checked = false;
   this.rangeMaskEnabledCheck.onCheck = function(checked) {
      var pass = self.getActivePassState();
      if (checked && !pass.rangeMask.enabled && acmPassHasAdjustments(pass)) {
         var decision = self.promptRangeMaskOnActivePass();
         if (decision === "cancel") {
            self.rangeMaskEnabledCheck.checked = false;
            return;
         }
         if (decision === "new") {
            var presetName = self.rangeMaskPresetCombo.itemText(self.rangeMaskPresetCombo.currentItem) || pass.rangeMask.preset || "All";
            self.createRangeMaskPassFromPrompt(presetName);
            return;
         }
      }
      pass.rangeMask.enabled = checked;
      if (!checked)
         pass.rangeMask.preset = "All";
      self.refreshRangeMaskControls();
      self.refreshHistogramRangeMaskOverlay();
      self.refreshRangeMaskPreviewIfActive();
      self.markPreviewStaleForMaskControl("Range Mask");
   };

   this.rangeMaskPresetLabel = new Label(this);
   this.rangeMaskPresetLabel.text = "Preset";
   this.rangeMaskPresetCombo = new ComboBox(this);
   var presetDefs = acmGetRangeMaskPresetDefs();
   for (var presetIndex = 0; presetIndex < presetDefs.length; ++presetIndex)
      this.rangeMaskPresetCombo.addItem(presetDefs[presetIndex].name);
   this.rangeMaskPresetCombo.onItemSelected = function(index) {
      self.applyRangeMaskPreset(self.rangeMaskPresetCombo.itemText(index));
      self.refreshHistogramRangeMaskOverlay();
      self.refreshRangeMaskPreviewIfActive();
      self.markPreviewStaleForMaskControl("Range Mask");
   };

   this.rangeMaskLowControl = new NumericControl(this);
   this.rangeMaskLowControl.label.text = "Low";
   this.rangeMaskLowControl.real = true;
   this.rangeMaskLowControl.setPrecision(3);
   this.rangeMaskLowControl.setRange(0, 1);
   this.rangeMaskLowControl.slider.setRange(0, 1000);
   this.rangeMaskLowControl.onValueUpdated = function(value) {
      var pass = self.getActivePassState();
      pass.rangeMask.low = value;
      if (pass.rangeMask.low > pass.rangeMask.high)
         pass.rangeMask.high = pass.rangeMask.low;
      self.updateRangeMaskPresetFromCustomValues();
      self.refreshRangeMaskControls();
      self.refreshHistogramRangeMaskOverlay();
      self.refreshRangeMaskPreviewIfActive();
      self.markPreviewStaleForMaskControl("Range Mask");
   };
   acmAttachPreviewSliderHooks(this, this.rangeMaskLowControl);
   acmConfigureNumericRowControl(this.rangeMaskLowControl);

   this.rangeMaskHighControl = new NumericControl(this);
   this.rangeMaskHighControl.label.text = "High";
   this.rangeMaskHighControl.real = true;
   this.rangeMaskHighControl.setPrecision(3);
   this.rangeMaskHighControl.setRange(0, 1);
   this.rangeMaskHighControl.slider.setRange(0, 1000);
   this.rangeMaskHighControl.onValueUpdated = function(value) {
      var pass = self.getActivePassState();
      pass.rangeMask.high = value;
      if (pass.rangeMask.high < pass.rangeMask.low)
         pass.rangeMask.low = pass.rangeMask.high;
      self.updateRangeMaskPresetFromCustomValues();
      self.refreshRangeMaskControls();
      self.refreshHistogramRangeMaskOverlay();
      self.refreshRangeMaskPreviewIfActive();
      self.markPreviewStaleForMaskControl("Range Mask");
   };
   acmAttachPreviewSliderHooks(this, this.rangeMaskHighControl);
   acmConfigureNumericRowControl(this.rangeMaskHighControl);

   this.rangeMaskFeatherControl = new NumericControl(this);
   this.rangeMaskFeatherControl.label.text = "Feather";
   this.rangeMaskFeatherControl.real = true;
   this.rangeMaskFeatherControl.setPrecision(3);
   this.rangeMaskFeatherControl.setRange(0, 0.5);
   this.rangeMaskFeatherControl.slider.setRange(0, 500);
   this.rangeMaskFeatherControl.onValueUpdated = function(value) {
      self.getActivePassState().rangeMask.feather = value;
      self.updateRangeMaskPresetFromCustomValues();
      self.refreshRangeMaskControls();
      self.refreshHistogramRangeMaskOverlay();
      self.refreshRangeMaskPreviewIfActive();
      self.markPreviewStaleForMaskControl("Range Mask");
   };
   acmAttachPreviewSliderHooks(this, this.rangeMaskFeatherControl);
   acmConfigureNumericRowControl(this.rangeMaskFeatherControl);

   this.rangeMaskSoftenLabel = new Label(this);
   this.rangeMaskSoftenLabel.text = "Blur";
   this.rangeMaskSoftenLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.rangeMaskSoftenCombo = new ComboBox(this);
   this.rangeMaskSoftenCombo.addItem("Off");
   this.rangeMaskSoftenCombo.addItem("1 px");
   this.rangeMaskSoftenCombo.addItem("2 px");
   this.rangeMaskSoftenCombo.addItem("3 px");
   this.rangeMaskSoftenCombo.addItem("4 px");
   this.rangeMaskSoftenCombo.addItem("5 px");
   this.rangeMaskSoftenCombo.currentItem = 0;
   this.rangeMaskSoftenCombo.setFixedWidth(70);
   this.rangeMaskSoftenCombo.toolTip = "Blurs the Range Mask to soften transitions and reduce hard edges.";
   this.rangeMaskSoftenCombo.onItemSelected = function(index) {
      self.getActivePassState().rangeMask.maskSoftenRadius = acmMaskSoftenRadiusForDropdownIndex(index);
      self.refreshRangeMaskControls();
      self.refreshHistogramRangeMaskOverlay();
      self.refreshRangeMaskPreviewIfActive();
      self.markPreviewStaleForMaskControl("Range Mask");
   };

   this.rangeMaskBoostCheck = new CheckBox(this);
   this.rangeMaskBoostCheck.text = "Boost";
   this.rangeMaskBoostCheck.toolTip = "Boost increases Range Mask contrast, pushing brighter mask areas toward white and darker areas toward black. Inspect the mask view before using it.";
   this.rangeMaskBoostCheck.onCheck = function(checked) {
      self.getActivePassState().rangeMask.boostEnabled = checked;
      self.refreshRangeMaskControls();
      self.refreshHistogramRangeMaskOverlay();
      self.refreshRangeMaskPreviewIfActive();
      self.markPreviewStaleForMaskControl("Range Mask");
   };

   this.maskSoftenLabel = new Label(this);
   this.maskSoftenLabel.text = "Blur";
   this.maskSoftenLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.maskSoftenCombo = new ComboBox(this);
   this.maskSoftenCombo.addItem("Off");
   this.maskSoftenCombo.addItem("1 px");
   this.maskSoftenCombo.addItem("2 px");
   this.maskSoftenCombo.addItem("3 px");
   this.maskSoftenCombo.addItem("4 px");
   this.maskSoftenCombo.addItem("5 px");
   this.maskSoftenCombo.currentItem = 0;
   this.maskSoftenCombo.setFixedWidth(70);
   this.maskSoftenCombo.toolTip = "Selected-band mask blur. It is applied only in Starless mode.";
   this.maskSoftenCombo.onItemSelected = function(index) {
      self.getSelectedBand().maskSoftenRadius = acmMaskSoftenRadiusForDropdownIndex(index);
      self.refreshSelectedBandReadoutAndVisualization(true);
      self.refreshSelectedBandMaskPreviewIfActive();
      self.markPreviewStaleForMaskControl("Current Band Mask");
   };

   this.resetRangeMaskButton = new PushButton(this);
   this.resetRangeMaskButton.text = "Reset Range Mask";
   this.resetRangeMaskButton.onClick = function() {
      self.resetRangeMask();
   };

   this.rangeMaskStatusLabel = new Label(this);
   this.rangeMaskStatusLabel.wordWrapping = true;

   this.rangeMaskSoftenStatusLabel = new Label(this);
   this.rangeMaskSoftenStatusLabel.wordWrapping = false;
   this.rangeMaskSoftenStatusLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;

   this.maskSoftenStatusLabel = new Label(this);
   this.maskSoftenStatusLabel.wordWrapping = false;
   this.maskSoftenStatusLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;

   this.bandMaskShapingLabel = new Label(this);
   this.bandMaskShapingLabel.text = "Band Mask Shaping:";
   this.bandMaskShapingLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;

   this.rangeMaskShapingLabel = new Label(this);
   this.rangeMaskShapingLabel.text = "Range Mask Shaping:";
   this.rangeMaskShapingLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;

   this.rangeMaskHistogramHintLabel = new Label(this);
   this.rangeMaskHistogramHintLabel.wordWrapping = false;
   this.rangeMaskHistogramHintLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.rangeMaskHistogramHintLabel.text = "Histogram shows the active Range Mask selection.";

   this.previewSectionLabel = new Label(this);
   this.previewSectionLabel.useRichText = true;
   this.previewSectionLabel.text = "";
   this.previewSectionLabel.visible = false;
   this.previewSectionLabel.hide();

   this.previewHelpLabel = new Label(this);
   this.previewHelpLabel.wordWrapping = true;
   this.previewHelpLabel.text = "";
   this.previewHelpLabel.visible = false;
   this.previewHelpLabel.hide();

   this.previewModeLabel = new Label(this);
   this.previewModeLabel.text = "Preview Mode";
   this.previewModeLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.previewHelpButton = acmCreateHelpButton(
      this,
      "Preview / Mask Views",
      "Preview uses downsampled data for speed. Difference preview shows where the current adjustment changes the image with preview-only 5x display gain; it does not affect saved output. At 6x and higher, Auto preview switches to Detail Crop Preview and renders the visible region from source pixels instead of only enlarging the fast preview. Apply to New Image processes the full-resolution image. Mask views show what the active selection or Range Mask is affecting.",
      "preview"
   );
   this.previewHelpBox = acmCreateHelpBox(this);
   this.previewModeCombo = new ComboBox(this);
   this.previewModeCombo.addItem("Adjusted");
   this.previewModeCombo.addItem("Original");
   this.previewModeCombo.addItem("Current Band Mask");
   this.previewModeCombo.addItem("Range Mask");
   this.previewModeCombo.addItem("Combined Mask");
   this.previewModeCombo.addItem("Difference");
   this.previewModeCombo.currentItem = 0;
   this.previewModeCombo.setFixedWidth(196);
   this.previewModeCombo.onItemSelected = function(index) {
      var modeMap = {
         "Adjusted": "adjusted",
         "Difference": "difference",
         "Original": "original",
         "Current Band Mask": "bandMask",
         "Range Mask": "rangeMask",
         "Star Protection Mask": "starMask",
         "Combined Mask": "combinedMask"
      };
      self.previewMode = modeMap[self.previewModeCombo.itemText(index)] || "adjusted";
      self.previewTempOriginal = false;
      self.refreshPreviewModeButtons();
      self.refreshPreviewDisplay();
   };

   this.previewZoomLabel = new Label(this);
   this.previewZoomLabel.text = "Zoom";
   this.previewZoomLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.previewZoomLabel.scaledMinHeight = 20;

   this.previewZoomPresetCombo = new ComboBox(this);
   this.previewZoomPresetCombo.addItem("Fit");
   this.previewZoomPresetCombo.addItem("1x");
   this.previewZoomPresetCombo.addItem("2x");
   this.previewZoomPresetCombo.addItem("4x");
   this.previewZoomPresetCombo.addItem("6x");
   this.previewZoomPresetCombo.addItem("8x");
   this.previewZoomPresetCombo.addItem("12x");
   this.previewZoomPresetCombo.addItem("16x");
   this.previewZoomPresetCombo.currentItem = 0;
   this.previewZoomPresetCombo.setFixedWidth(84);
   this.previewZoomPresetCombo.toolTip =
      "Higher zoom levels use Detail Crop Preview in Auto mode, rendering the visible region from source pixels instead of simply enlarging the fast preview.";
   this.previewZoomPresetCombo.onItemSelected = function(index) {
      if (self.previewZoomPresetSyncing)
         return;
      var label = self.previewZoomPresetCombo.itemText(index);
      if (label === "Fit")
         self.setPreviewZoomState("fit", 1, true);
      else
         self.setPreviewZoomState("manual", parseFloat(label), false);
   };

   this.previewZoomControl = new NumericControl(this);
   this.previewZoomControl.label.visible = false;
   this.previewZoomControl.edit.visible = false;
   this.previewZoomControl.setRange(0.25, 16.0);
   this.previewZoomControl.setPrecision(2);
   this.previewZoomControl.slider.setRange(25, 1600);
   this.previewZoomControl.setValue(1.0);
   this.previewZoomControl.toolTip = this.previewZoomPresetCombo.toolTip;
   this.previewZoomControl.visible = false;
   this.previewZoomControl.hide();
   this.previewZoomControl.onValueUpdated = function(value) {
      self.setPreviewZoomState("manual", value, false);
   };

   this.previewZoomReadout = new Label(this);
   this.previewZoomReadout.text = "Fit";
   this.previewZoomReadout.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.previewZoomReadout.scaledMinHeight = 20;
   this.previewZoomReadout.minWidth = 34;

   this.previewInteractionHintLabel = new Label(this);
   this.previewInteractionHintLabel.wordWrapping = false;
   this.previewInteractionHintLabel.text =
      "Click: probe · Hold: compare · Drag: pan";
   this.previewInteractionHintLabel.textAlignment = TextAlign_Right|TextAlign_VertCenter;
   this.previewInteractionHintLabel.setFixedWidth(ACM_HOST_IS_WINDOWS ? 286 : 236);
   this.previewInteractionHintLabel.toolTip =
      "Click a preview pixel to probe it. Click and hold in the preview to temporarily show the selected Compare reference. Drag to pan when zoomed.";

   this.previewSamplingStatusLabel = new Label(this);
   this.previewSamplingStatusLabel.wordWrapping = false;
   this.previewSamplingStatusLabel.text = "Preview: Fast";
   this.previewSamplingStatusLabel.toolTip = this.previewZoomPresetCombo.toolTip;

   this.previewHost = new Control(this);
   this.previewHost.scaledMinWidth = 420;
   this.previewHost.scaledMinHeight = 500;
   this.previewHost.toolTip =
      "Click to probe a pixel. Click and hold to temporarily show the selected Compare reference. Drag to pan when zoomed.";
   this.previewHost.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0xff404854);
      g.brush = new Brush(0xff161a22);
      g.drawRect(this.boundsRect);

      var bmp = this.dialog.getCurrentPreviewBitmap();
      if (bmp) {
         this.dialog.previewDisplayRect = this.dialog.getCurrentViewportRect(bmp);
         g.drawScaledBitmap(this.dialog.previewDisplayRect, bmp);
         if (this.dialog.probeData && this.dialog.previewDisplayRect) {
            var metrics = this.dialog.getCurrentPreviewMetrics();
            var rect = this.dialog.previewDisplayRect;
            var px = rect.x0 + Math.round((this.dialog.probeData.x / Math.max(1, metrics.width - 1)) * (rect.x1 - rect.x0));
            var py = rect.y0 + Math.round((this.dialog.probeData.y / Math.max(1, metrics.height - 1)) * (rect.y1 - rect.y0));
            g.pen = new Pen(0xffffff66);
            g.drawLine(px - 4, py, px + 4, py);
            g.drawLine(px, py - 4, px, py + 4);
         }
      }
      g.end();
   };
   this.previewHost.onMousePress = function(x, y) {
      var dialog = this.dialog;
      dialog.previewMouseDown = true;
      dialog.previewDragging = false;
      dialog.previewTempOriginal = false;
      dialog.previewTempCompare = false;
      dialog.previewCompareMetrics = null;
      dialog.previewDragStartX = x;
      dialog.previewDragStartY = y;
      dialog.previewPanStartX = dialog.previewPanX;
      dialog.previewPanStartY = dialog.previewPanY;
      if (dialog.previewHoldTimer)
         dialog.previewHoldTimer.start();
   };
   this.previewHost.onMouseMove = function(x, y) {
      var dialog = this.dialog;
      if (!dialog.previewMouseDown)
         return;
      var dx = x - dialog.previewDragStartX;
      var dy = y - dialog.previewDragStartY;
      if (!dialog.previewDragging && Math.sqrt(dx * dx + dy * dy) > dialog.previewMoveThreshold) {
         dialog.previewDragging = true;
         if (dialog.previewHoldTimer)
            dialog.previewHoldTimer.stop();
         if (dialog.previewTempCompare) {
            dialog.previewTempOriginal = false;
            dialog.previewTempCompare = false;
            dialog.previewCompareBitmap = null;
            dialog.previewCompareRgb = null;
            dialog.previewCompareMetrics = null;
         }
      }
      if (dialog.previewDragging) {
         dialog.previewPanX = dialog.previewPanStartX + dx;
         dialog.previewPanY = dialog.previewPanStartY + dy;
         if (dialog.shouldUseDetailCropPreview() && !dialog.previewIsStale) {
            dialog.previewSamplingStatusLabel.text = "Preview: Detail Crop moved — release to update";
            dialog.requestDetailPreviewUpdate(false);
         }
         dialog.previewHost.update();
      }
   };
   this.previewHost.onMouseRelease = function(x, y) {
      var dialog = this.dialog;
      if (dialog.previewHoldTimer)
         dialog.previewHoldTimer.stop();
      var wasDragging = dialog.previewDragging;
      var hadTempCompare = dialog.previewTempCompare;
      dialog.previewMouseDown = false;
      dialog.previewDragging = false;
      if (hadTempCompare) {
         dialog.previewTempOriginal = false;
         dialog.previewTempCompare = false;
         dialog.previewCompareBitmap = null;
         dialog.previewCompareRgb = null;
         dialog.previewCompareMetrics = null;
         dialog.refreshPreviewDisplay();
         return;
      }
      if (dialog.shouldUseDetailCropPreview() && !dialog.previewIsStale)
         dialog.renderDetailPreviewForCurrentViewport();
      if (!wasDragging)
         dialog.setProbeFromPreviewClick(x, y);
   };

   this.previewStatusLabel = this.previewSamplingStatusLabel;

   this.compactDiagnosticsLabel = new Label(this);
   this.compactDiagnosticsLabel.useRichText = true;
   this.compactDiagnosticsLabel.wordWrapping = true;
   this.compactDiagnosticsLabel.text = "";
   this.compactDiagnosticsLabel.toolTip = "Compact diagnostic summary. Open Diagnostics & Passes for the full pass summary.";
   this.compactDiagnosticsLabel.visible = false;
   this.compactDiagnosticsLabel.hide();
   this.compactDiagnosticsButton = new PushButton(this);
   this.compactDiagnosticsButton.text = "Show Diagnostics / Passes";
   this.compactDiagnosticsButton.toolTip = "Expands or collapses compact diagnostics and pass details at the bottom of the preview area.";
   this.compactDiagnosticsButton.onClick = function() { self.toggleCompactDiagnosticsPanel(); };
   this.compactDiagnosticsBodyLabel = new Label(this);
   this.compactDiagnosticsBodyLabel.useRichText = false;
   this.compactDiagnosticsBodyLabel.wordWrapping = true;
   this.compactDiagnosticsBodyLabel.textAlignment = TextAlign_Left|TextAlign_Top;
   this.compactDiagnosticsBodyLabel.text = "";
   this.compactDiagnosticsBodyLabel.visible = false;
   this.compactDiagnosticsBodyLabel.hide();

   this.diagnosticsSectionLabel = new Label(this);
   this.diagnosticsSectionLabel.useRichText = true;
   this.diagnosticsSectionLabel.text = "<b>Diagnostics &amp; Passes</b>";
   this.diagnosticsHelpButton = acmCreateHelpButton(
      this,
      "Diagnostics",
      "Click the preview to probe a pixel. The histogram shows preview luminance distribution; gold overlay/markers show active Range Mask selection. The polar plot shows sampled preview pixels by hue angle and saturation radius.",
      "diagnostics"
   );
   this.diagnosticsHelpBox = acmCreateHelpBox(this);

   this.diagnosticsHelpLabel = new Label(this);
   this.diagnosticsHelpLabel.wordWrapping = true;
   this.diagnosticsHelpLabel.text = "Preview diagnostics";
   this.diagnosticsHelpLabel.visible = false;
   this.diagnosticsHelpLabel.hide();

   this.histogramLabel = new Label(this);
   this.histogramLabel.useRichText = true;
   this.histogramLabel.text = "<b>Histogram</b>";

   this.histogramSubtitleLabel = new Label(this);
   this.histogramSubtitleLabel.wordWrapping = false;
   this.histogramSubtitleLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.histogramSubtitleLabel.text = acmHistogramSubtitleText(false);
   if (ACM_HOST_IS_WINDOWS)
      this.histogramSubtitleLabel.setFixedWidth(128);

   this.histogramControl = new Control(this);
   this.histogramControl.scaledMinHeight = ACM_HOST_IS_WINDOWS ? 154 : 122;
   this.histogramControl.acmDialogRef = this;
   this.histogramControl.toolTip = "Shows preview luminance distribution. Gold overlay/markers show the active Range Mask selection.";
   this.histogramControl.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0xff404854);
      g.brush = new Brush(0xff161a22);
      g.drawRect(this.boundsRect);
      var dialog = this.acmDialogRef;
      var data = dialog.histogramData;
      var left = 8;
      var top = 6;
      var plotW = Math.max(1, this.width - 16);
      var plotH = Math.max(1, this.height - 8);
      if (data && data.maxBin > 0) {
         var rangeMask = dialog.getActivePassState().rangeMask;
         acmPaintRangeMaskOverlay(g, rangeMask, left, top, plotW, plotH, !!(rangeMask && rangeMask.enabled));
         for (var i = 0; i < data.bins.length; ++i) {
            var x0 = left + Math.floor((i / data.bins.length) * plotW);
            var h = Math.round((data.bins[i] / data.maxBin) * (plotH - 4));
            g.pen = new Pen(0xffc5cedf);
            g.drawLine(x0, top + plotH, x0, top + plotH - h);
            g.drawLine(x0 + 1, top + plotH, x0 + 1, top + plotH - h);
         }
         if (data.probeY !== null) {
            var probeX = left + Math.round(data.probeY * plotW);
            g.pen = new Pen(0xff00f5ff, 2);
            g.drawLine(probeX, top, probeX, top + plotH);
            g.pen = new Pen(0xffffffff, 1);
            g.drawLine(probeX + 1, top, probeX + 1, top + plotH);
         }
      }
      g.end();
   };

   this.histogramRampControl = new Control(this);
   this.histogramRampControl.scaledMinHeight = 12;
   this.histogramRampControl.acmDialogRef = this;
   this.histogramRampControl.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0xff404854);
      g.brush = new Brush(0xff161a22);
      g.drawRect(this.boundsRect);
      var innerX = 4;
      var innerY = 2;
      var innerW = Math.max(1, this.width - 8);
      var innerH = Math.max(1, this.height - 4);
      for (var x = 0; x < innerW; ++x) {
         var v = Math.round((x / Math.max(1, innerW - 1)) * 255) & 0xff;
         var c = 0xff000000 | (v << 16) | (v << 8) | v;
         g.pen = new Pen(c);
         g.drawLine(innerX + x, innerY, innerX + x, innerY + innerH);
      }
      var dialog = this.acmDialogRef;
      var rangeMask = dialog.getActivePassState().rangeMask;
      acmPaintRangeMaskOverlay(g, rangeMask, innerX, innerY, innerW, innerH, !!(rangeMask && rangeMask.enabled));
      g.end();
   };

   this.histogramRampLabel = new Label(this);
   this.histogramRampLabel.wordWrapping = false;
   this.histogramRampLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.histogramRampLabel.text = "";

   this.polarLabel = new Label(this);
   this.polarLabel.useRichText = true;
   this.polarLabel.text = "<b>Polar Plot</b>";

   this.plotInfoLabel = new Label(this);
   this.plotInfoLabel.useRichText = true;
   this.plotInfoLabel.textAlignment = TextAlign_Left|TextAlign_Top;
   this.plotInfoLabel.text = "<b>Plot Info</b>";

   this.polarSubtitleLabel = new Label(this);
   this.polarSubtitleLabel.wordWrapping = false;
   this.polarSubtitleLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.polarSubtitleLabel.text = "Hue angle · Saturation radius";

   this.polarInfoLabel = new Label(this);
   this.polarInfoLabel.useRichText = true;
   this.polarInfoLabel.wordWrapping = true;
   this.polarInfoLabel.textAlignment = TextAlign_Left;
   this.polarInfoLabel.text = "";
   this.polarInfoLabel.toolTip = "Shows the active color-band selection used by the current pass, current probe color position, and active Range Mask state.";
   if (ACM_HOST_IS_WINDOWS) {
      var polarInfoFont = new Font;
      polarInfoFont.pixelSize = 14;
      this.polarInfoLabel.font = polarInfoFont;
   }

   this.polarControl = new Control(this);
   this.polarControl.scaledMinHeight = ACM_HOST_IS_WINDOWS ? 166 : 134;
   this.polarControl.acmDialogRef = this;
   this.polarControl.toolTip = "Shows preview color distribution. Angle represents hue; distance from center represents saturation.";
   this.polarControl.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0xff1f242c);
      g.brush = new Brush(0xff0f1319);
      g.drawRect(this.boundsRect);
      var dialog = this.acmDialogRef;
      var cx = Math.round(this.width * 0.5);
      var cy = Math.round(this.height * 0.5);
      var radius = Math.round(Math.max(18, Math.min(this.width, this.height) * 0.39));
      g.brush = new Brush(0xff171c24);
      g.pen = new Pen(0xff303844);
      g.drawEllipse(cx - radius - 9, cy - radius - 9, cx + radius + 9, cy + radius + 9);
      g.pen = new Pen(0xff222832, 1);
      for (var halo = 1; halo <= 3; ++halo)
         g.drawEllipse(cx - radius - halo * 3, cy - radius - halo * 3, cx + radius + halo * 3, cy + radius + halo * 3);
      for (var ring = 1; ring <= 4; ++ring) {
         var rr = Math.round(radius * ring / 4);
         g.pen = new Pen(ring === 4 ? 0xff66717f : 0xff414b58, ring === 4 ? 2 : 1);
         g.drawEllipse(cx - rr, cy - rr, cx + rr, cy + rr);
      }
      g.pen = new Pen(0xff29313c, 1);
      for (var fineDeg = 0; fineDeg < 360; fineDeg += 15) {
         if (fineDeg % 45 === 0)
            continue;
         var fineRad = fineDeg * Math.PI / 180;
         var fineX = cx + Math.round(Math.cos(fineRad) * radius);
         var fineY = cy - Math.round(Math.sin(fineRad) * radius);
         g.drawLine(cx, cy, fineX, fineY);
      }
      for (var deg = 0; deg < 360; deg += 15) {
         if (deg % 45 !== 0)
            continue;
         var rad = deg * Math.PI / 180;
         var x = cx + Math.round(Math.cos(rad) * radius);
         var y = cy - Math.round(Math.sin(rad) * radius);
         g.pen = new Pen(deg % 90 === 0 ? 0xff737e8d : 0xff56616f, deg % 90 === 0 ? 2 : 1);
         g.drawLine(cx, cy, x, y);
      }
      g.pen = new Pen(0xff242b35, 1);
      g.drawEllipse(cx - Math.round(radius * 0.07), cy - Math.round(radius * 0.07), cx + Math.round(radius * 0.07), cy + Math.round(radius * 0.07));
      var points = dialog.polarSamples || [];
      for (var i = 0; i < points.length; ++i) {
         var p = points[i];
         var radp = p.h * Math.PI / 180;
         var rp = Math.max(2, p.s * radius);
         var px = cx + Math.round(Math.cos(radp) * rp);
         var py = cy - Math.round(Math.sin(radp) * rp);
         var color = 0xff000000 | ((Math.round(p.r * 255) & 0xff) << 16) | ((Math.round(p.g * 255) & 0xff) << 8) | (Math.round(p.b * 255) & 0xff);
         g.pen = new Pen(color, 1);
         if (p.s > 0.45) {
            g.drawLine(px - 1, py - 1, px + 1, py - 1);
            g.drawLine(px - 1, py, px + 1, py);
            g.drawLine(px - 1, py + 1, px + 1, py + 1);
         } else {
            g.drawLine(px - 1, py, px + 1, py);
            g.drawLine(px, py - 1, px, py + 1);
         }
      }
      if (dialog.probeData) {
         var probeRad = dialog.probeData.h * Math.PI / 180;
         var probeR = dialog.probeData.s * radius;
         var mx = cx + Math.round(Math.cos(probeRad) * probeR);
         var my = cy - Math.round(Math.sin(probeRad) * probeR);
         g.pen = new Pen(0xff7df8ff, 2);
         g.drawEllipse(mx - 5, my - 5, mx + 5, my + 5);
         g.pen = new Pen(0xffffffff, 1);
         g.drawEllipse(mx - 3, my - 3, mx + 3, my + 3);
         g.pen = new Pen(0xff7df8ff, 1);
         g.drawLine(mx - 8, my, mx - 4, my);
         g.drawLine(mx + 4, my, mx + 8, my);
         g.drawLine(mx, my - 8, mx, my - 4);
         g.drawLine(mx, my + 4, mx, my + 8);
         g.pen = new Pen(0xffffffff, 1);
         g.drawLine(mx - 1, my, mx + 1, my);
         g.drawLine(mx, my - 1, mx, my + 1);
      }
      g.end();
   };

   this.probeReadoutLabel = new Label(this);
   this.probeReadoutLabel.wordWrapping = true;
   this.probeReadoutLabel.text = "Preview diagnostics · Probe: none · Range Mask: Off";
   this.probeReadoutLabel.toolTip = "Click the preview to inspect pixel luminance, hue, saturation, and band position.";
   this.probeReadoutLabel.visible = false;
   this.probeReadoutLabel.hide();

   this.autoSelectProbeBandCheck = new CheckBox(this);
   this.autoSelectProbeBandCheck.text = ACM_HOST_IS_WINDOWS ? "Auto probe band" : "Auto-select band from probe";
   this.autoSelectProbeBandCheck.toolTip = "Auto-select the nearest reliable color band when probing the preview.";
   this.autoSelectProbeBandCheck.checked = true;
   this.autoSelectProbeBandCheck.onCheck = function() {
      self.refreshDiagnosticsData();
   };

   this.passViewerLabel = new Label(this);
   this.passViewerLabel.useRichText = true;
   this.passViewerLabel.text = "<b>Pass Viewer</b>";
   this.refinementPassHelpButton = acmCreateHelpButton(
      this,
      "Refinement Pass",
      "A Refinement Pass is an editable set of adjustments. Use the Base Pass for broad/global color work, then add new passes for targeted refinements such as Range Mask background changes or halo cleanup. Enabled passes are applied sequentially. Astro Color Mixer allows up to four passes for layout stability and preview performance.",
      "refinementPass"
   );
   this.refinementPassHelpBox = acmCreateHelpBox(this);
   this.refinementPassHelpBox.visible = false;
   this.refinementPassHelpBox.hide();

   this.passViewerHost = new ScrollBox(this);
   this.passViewerHost.autoScroll = false;
   this.passViewerHost.tracking = true;
   this.passViewerHost.setFixedHeight(118);
   this.passViewerHost.viewport.acmDialogRef = this;
   this.passViewerHost.viewport.sizer = new VerticalSizer;
   this.passViewerHost.viewport.sizer.margin = 0;
   this.passViewerHost.viewport.sizer.spacing = 0;
   acmSetThemePanel(this.passViewerHost.viewport, ACM_GRAY_UI_THEME.passViewer, 0xffb5b5b5);
   this.passViewerHost.viewport.onResize = function() {
      if (this.acmDialogRef)
         this.acmDialogRef.updatePassViewerScrollBars();
   };
   this.passViewerBody = new Control(this.passViewerHost.viewport);
   acmSetThemePanel(this.passViewerBody, ACM_GRAY_UI_THEME.passViewer, ACM_GRAY_UI_THEME.passViewer);
   this.passViewerBody.sizer = new VerticalSizer;
   this.passViewerBody.sizer.margin = 0;
   this.passViewerBody.sizer.spacing = 1;
   this.passViewerHost.viewport.sizer.add(this.passViewerBody);

   this.previewOutputSectionLabel = new Label(this);
   this.previewOutputSectionLabel.useRichText = true;
   this.previewOutputSectionLabel.text = "";
   this.previewOutputSectionLabel.visible = false;
   this.previewOutputSectionLabel.hide();

   this.recipeSectionLabel = new Label(this);
   this.recipeSectionLabel.useRichText = true;
   this.recipeSectionLabel.text = "<b>Adjustment Set</b>";
   this.recipeHelpButton = acmCreateHelpButton(
      this,
      "Adjustment Set",
      "An adjustment set saves the current adjustment setup, including passes, color settings, selected-band settings, Range Mask values, and related controls. Use adjustment sets to reuse or document a processing approach.",
      "recipe"
   );
   this.recipeHelpBox = acmCreateHelpBox(this);

   this.helpSectionLabel = new Label(this);
   this.helpSectionLabel.useRichText = true;
   this.helpSectionLabel.text = "<b>Help</b>";
   this.helpSectionLabel.visible = false;
   this.helpSectionLabel.hide();

   this.footerNoticeLabel = new Label(this);
   this.footerNoticeLabel.useRichText = false;
   this.footerNoticeLabel.wordWrapping = false;
   this.footerNoticeLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.footerNoticeLabel.text = "Developed by Patrick A. Cosgrove for Cosgrove's Cosmos · © 2026";
   var footerFont = new Font;
   footerFont.pixelSize = ACM_HOST_IS_WINDOWS ? 11 : 10;
   this.footerNoticeLabel.font = footerFont;
   this.footerNoticeLabel.scaledMinHeight = ACM_HOST_IS_WINDOWS ? 18 : 14;

   this.previewOutputHelpLabel = new Label(this);
   this.previewOutputHelpLabel.wordWrapping = true;
   this.previewOutputHelpLabel.text = "Use the preview to judge settings first. 'Create Image' leaves the target unchanged. 'Apply to Target' writes the adjusted result back and respects the active PixInsight mask.";

   this.updatePreviewButton = new PushButton(this);
   this.updatePreviewButton.text = "Update Preview";
   this.updatePreviewButton.onClick = function() { self.renderPreview(); };

   this.autoPreviewCheck = new CheckBox(this);
   this.autoPreviewCheck.text = "Auto Preview";
   this.autoPreviewCheck.checked = true;
   this.autoPreviewCheck.onCheck = function() {
      if (self.autoPreviewCheck.checked)
         self.requestPreviewUpdate(true);
   };

   this.compareModeLabel = new Label(this);
   this.compareModeLabel.text = "Compare";
   this.compareModeLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;

   this.compareModeHelpButton = acmCreateHelpButton(
      this,
      "Compare",
      "Controls what click-and-hold shows while previewing. Auto chooses the most useful reference, Original compares against the loaded source, and Last Pass compares against the result before the active refinement pass.",
      "compare"
   );

   this.compareModeCombo = new ComboBox(this);
   this.compareModeCombo.addItem("Auto");
   this.compareModeCombo.addItem("Original");
   this.compareModeCombo.addItem("Last Pass");
   this.compareModeCombo.currentItem = 0;
   this.compareModeCombo.setFixedWidth(128);
   this.compareModeCombo.onItemSelected = function(index) {
      self.compareMode = index === 1 ? "original" : index === 2 ? "lastPass" : "auto";
      self.refreshCompareModeControls();
      self.refreshPreviewDisplay();
   };

   this.bandControlsHost = new Control(this);
   this.bandControlsHost.sizer = new VerticalSizer;
   this.bandControlsHost.sizer.margin = 0;
   this.bandControlsHost.sizer.spacing = 1;

   this.neutralFieldRow = acmCreateMixerFieldRow(this.bandControlsHost, this, {
      isNeutral: true,
      bandDef: { id: "neutral", color: "#b8b8b8", shortLabel: "Neutral" },
      label: "Neutral / Low-Saturation",
      secondaryLabel: "Low-saturation luminance",
      precision: 1,
      onValueUpdated: function(value) {
         self.getActivePassState().neutralLuminance.luminance = value;
         self.markPreviewStale();
      }
   });
   this.neutralFieldRow.resetButton.toolTip = "Reset this band";
   this.neutralFieldRow.resetButton.onClick = function() {
      self.getActivePassState().neutralLuminance.luminance = 0;
      self.refreshBandControls();
      self.markPreviewStale();
   };
   this.neutralRowHost = this.neutralFieldRow.host;
   this.neutralControl = this.neutralFieldRow;
   this.bandControlsHost.sizer.add(this.neutralRowHost);

   for (var i = 0; i < ACM_BAND_DEFS.length; ++i) {
      (function(def, dialog) {
         var fieldRow = acmCreateMixerFieldRow(dialog.bandControlsHost, dialog, {
            bandId: def.id,
            bandDef: def,
            label: def.label,
            secondaryLabel: "Center " + def.center + "\u00b0",
            precision: 1,
            onValueUpdated: function(value) {
               dialog.getBandById(def.id)[dialog.activeTab] = value;
               dialog.markPreviewStale();
            }
         });
         fieldRow.resetButton.toolTip = "Reset this band";
         fieldRow.resetButton.onClick = function() {
            dialog.getBandById(def.id)[dialog.activeTab] = 0;
            dialog.refreshBandControls();
            dialog.markPreviewStale();
         };
         dialog.bandControlsHost.sizer.add(fieldRow.host);

         dialog.bandControls.push({
            bandId: def.id,
            swatch: fieldRow.swatch,
            rowHost: fieldRow.host,
            numeric: fieldRow,
            resetButton: fieldRow.resetButton,
            fieldRow: fieldRow
         });
      })(ACM_BAND_DEFS[i], this);
   }

   this.outputModeHelpButton = acmCreateHelpButton(
      this,
      "Output Mode",
      "'Create Image' creates a new adjusted image window and leaves the target image unchanged. 'Apply to Target' writes the adjusted result back into the target image. If the target image has an active PixInsight mask, that mask is respected.",
      "outputMode"
   );

   this.applyButton = new PushButton(this);
   this.applyButton.text = "Create Image";
   this.applyButton.setFixedWidth(ACM_HOST_IS_WINDOWS ? 220 : 180);
   this.applyButton.defaultButton = true;
   this.applyButton.toolTip = "Creates a new adjusted image window and leaves the target unchanged.";
   this.applyButton.onClick = function() { self.handlePrimaryOutputAction(); };

   this.bandMaskBoostCheck = new CheckBox(this);
   this.bandMaskBoostCheck.text = "Boost";
   this.bandMaskBoostCheck.toolTip = "Boost increases mask contrast by pushing brighter mask areas toward white and darker areas toward black. Inspect the mask view before using it.";
   this.bandMaskBoostCheck.checked = false;
   this.bandMaskBoostCheck.onCheck = function(checked) {
      if (self.maskBoostSyncing)
         return;
      self.maskBoostEnabled = checked;
      self.refreshOutputButtons();
      self.refreshSelectedBandMaskPreviewIfActive();
      self.markPreviewStaleForMaskControl("Current Band Mask");
   };
   this.bandMaskBoostHelpButton = acmCreateHelpButton(
      this,
      "Boost Mask",
      "Boost applies a display/output contrast enhancement to the current selected-band mask preview. Mid-gray mask values become brighter, while black and white stay anchored.",
      "maskBoost"
   );
   this.rangeMaskBoostHelpButton = acmCreateHelpButton(
      this,
      "Range Mask Shaping",
      "Blur softens the Range Mask. Boost increases mask contrast. Inspect the mask view before applying strong changes.",
      "maskBoost"
   );

   this.applyToTargetButton = new PushButton(this);
   this.applyToTargetButton.text = "Apply to Target";
   this.applyToTargetButton.setFixedWidth(ACM_HOST_IS_WINDOWS ? 190 : 160);
   this.applyToTargetButton.toolTip = "Writes the adjusted result back into the target image. If the target has an active PixInsight mask, it is respected.";
   this.applyToTargetButton.onClick = function() { self.applyToTargetImage(); };

   this.targetApplyMaskStatusLabel = new Label(this);
   this.targetApplyMaskStatusLabel.wordWrapping = true;
   this.targetApplyMaskStatusLabel.text = "Target Mask: none";
   this.targetApplyMaskStatusLabel.toolTip = "Apply to Target respects the active PixInsight mask on the target image.";

   this.outputFeedbackLabel = new Label(this);
   this.outputFeedbackLabel.wordWrapping = true;
   this.outputFeedbackLabel.text = "";

   this.resetActivePassButton = new PushButton(this);
   this.resetActivePassButton.text = "Reset Active Pass";
   this.resetActivePassButton.onClick = function() { self.resetActivePass(); };
   this.resetActivePassButton.visible = false;
   this.resetActivePassButton.hide();

   this.resetAllButton = new PushButton(this);
   this.resetAllButton.text = "Reset All Passes";
   this.resetAllButton.onClick = function() { self.resetAllPasses(); };
   this.resetAllButton.visible = false;
   this.resetAllButton.hide();

   this.saveRecipeButton = new PushButton(this);
   this.saveRecipeButton.text = "Save Set";
   this.saveRecipeButton.onClick = function() { self.saveRecipeJson(); };

   this.loadRecipeButton = new PushButton(this);
   this.loadRecipeButton.text = "Load Set";
   this.loadRecipeButton.onClick = function() { self.loadRecipeJson(); };

   this.faqButton = new PushButton(this);
   this.faqButton.text = "FAQ";
   this.faqButton.setFixedWidth(70);
   this.faqButton.onClick = function() { self.showDocumentation("faq"); };

   this.technicalButton = new PushButton(this);
   this.technicalButton.text = "Tech Appx";
   this.technicalButton.toolTip = "Technical Appendix";
   this.technicalButton.setFixedWidth(140);
   this.technicalButton.onClick = function() { self.showDocumentation("technical"); };

   this.aboutButton = new PushButton(this);
   this.aboutButton.text = "About";
   this.aboutButton.setFixedWidth(82);
   this.aboutButton.onClick = function() { self.showDocumentation("about"); };

   this.closeButton = new PushButton(this);
   this.closeButton.text = "Close";
   this.closeButton.onClick = function() { self.cancel(); };

   this.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0x00000000, 0);
      g.brush = new Brush(ACM_GRAY_UI_THEME.window);
      g.fillRect(0, 0, this.width, this.height, g.brush);
      g.end();
   };

   acmSetThemeLabel(this.targetImageLabel, "Target Image:", ACM_GRAY_UI_THEME.text, true);
   acmSetThemeLabel(this.imageTypeLabel, "Image Type", ACM_GRAY_UI_THEME.text, true);
   acmSetThemeLabel(this.protectionPolicyLabel, "Protections", ACM_GRAY_UI_THEME.text, true);
   acmSetThemeLabel(this.layoutModeLabel, "Window", "#ffc43a", true);
   acmSetThemeLabel(this.windowSizeLabel, "-- x --", ACM_GRAY_UI_THEME.muted, false);
   acmSetThemeLabel(this.windowSizeStatusLabel, "", "#7fe38a", true);
   acmApplyLightText(this.protectStarsCheck);
   acmApplyLightText(this.protectLowSatCheck);
   acmSetThemeLabel(this.sensitivityLabel, "Sensitivity", ACM_GRAY_UI_THEME.text, true);
   acmSetThemeLabel(this.selectedBandSectionLabel, "Selected Band", ACM_GRAY_UI_THEME.text, true);
   acmSetThemeLabel(this.selectedBandHelpLabel, "Hue Radius sets the outer limit on each side of the hue center. Feather controls how quickly the selection falls from the strong core to that outer limit.", ACM_GRAY_UI_THEME.muted, false);
   acmSetThemeLabel(this.selectedBandReadoutTitle, "Selection", ACM_GRAY_UI_THEME.text, true);
   acmPlainLightLabel(this.selectedBandReadoutPrimary, ACM_HOST_IS_WINDOWS ? "Hue 0°  R ±45°  Core ±11.25°" : "Hue center: 0°  Hue Radius: ±45°  Strong core: ±11.25°");
   acmPlainLightLabel(this.selectedBandReadoutSecondary, ACM_HOST_IS_WINDOWS ? "Fall 11.25–45°  Range 315–45°  F 0.75" : "Falloff: 11.25°–45°  Affected range: 315°–45°  Feather: 0.75");
   acmSetThemeLabel(this.selectedBandLabel, "Band:", ACM_GRAY_UI_THEME.text, true);
   acmSetThemeLabel(this.rangeMaskSectionLabel, "Range Mask", ACM_GRAY_UI_THEME.text, true);
   acmSetThemeLabel(this.rangeMaskPresetLabel, "Preset", ACM_GRAY_UI_THEME.text, true);
   acmSetThemeLabel(this.previewModeLabel, "Preview Mode", ACM_GRAY_UI_THEME.text, true);
   acmSetThemeLabel(this.previewZoomLabel, "Zoom", ACM_GRAY_UI_THEME.text, true);
   acmSetThemeLabel(this.compareModeLabel, "Compare", ACM_GRAY_UI_THEME.text, true);
   acmSetThemeLabel(this.diagnosticsSectionLabel, "Diagnostics &amp; Passes", ACM_GRAY_UI_THEME.text, true);
   acmSetGoldTitleLabel(this.histogramLabel, "Histogram");
   acmSetThemeLabel(this.histogramSubtitleLabel, acmHistogramSubtitleText(false), ACM_GRAY_UI_THEME.muted, false);
   acmSetThemeLabel(this.histogramRampLabel, "Gray level ramp 0.0–1.0", ACM_GRAY_UI_THEME.muted, false);
   acmSetGoldTitleLabel(this.polarLabel, "Polar Plot");
   acmSetGoldTitleLabel(this.plotInfoLabel, "Plot Info");
   acmSetThemeLabel(this.polarSubtitleLabel, "", ACM_GRAY_UI_THEME.muted, false);
   acmSetThemeLabel(this.polarInfoLabel, "", ACM_GRAY_UI_THEME.muted, false);
   acmSetThemeLabel(this.passViewerLabel, "Pass Viewer", ACM_GRAY_UI_THEME.text, true);
   acmSetThemeLabel(this.recipeSectionLabel, "Adjustment Set", ACM_GRAY_UI_THEME.text, true);
   acmSetThemeLabel(this.previewOutputHelpLabel, "Use the preview to judge settings first. 'Create Image' leaves the target unchanged. 'Apply to Target' writes the adjusted result back and respects the active PixInsight mask.", ACM_GRAY_UI_THEME.muted, false);
   acmSetThemeLabel(this.footerNoticeLabel, "Developed by Patrick A. Cosgrove for Cosgrove's Cosmos · © 2026", ACM_GRAY_UI_THEME.muted, false);
   acmSetThemeLabel(this.previewZoomReadout, "Fit", ACM_GRAY_UI_THEME.text, false);
   acmSetThemeLabel(this.previewInteractionHintLabel, "Click: probe • Hold: compare • Drag: pan", ACM_GRAY_UI_THEME.text, true);
   acmSetThemeLabel(this.previewSamplingStatusLabel, "Preview: Fast", ACM_GRAY_UI_THEME.text, true);
   acmSetThemeLabel(this.probeReadoutLabel, "Preview diagnostics · Probe: none · Range Mask: Off", ACM_GRAY_UI_THEME.muted, false);
   acmSetThemeLabel(this.compactDiagnosticsLabel, "", ACM_GRAY_UI_THEME.text, false);
   acmSetThemeLabel(this.compactDiagnosticsBodyLabel, "", ACM_GRAY_UI_THEME.text, false);
   acmSetThemeLabel(this.targetApplyMaskStatusLabel, "Target Mask: none", ACM_GRAY_UI_THEME.text, true);
   acmApplyLightText(this.activeStatusLabel);
   acmApplyLightText(this.pendingChangesLabel);
   acmApplyLightText(this.bandSectionLabel);
   acmApplyLightText(this.rangeMaskStatusLabel);
   acmApplyLightText(this.outputFeedbackLabel);
   acmApplyLightText(this.passEnabledCheck);
   acmApplyLightText(this.rangeMaskEnabledCheck);
   acmApplyLightText(this.bandMaskBoostCheck);
   acmApplyLightText(this.rangeMaskBoostCheck);
   acmApplyLightText(this.autoPreviewCheck);
   acmApplyLightText(this.autoSelectProbeBandCheck);
   acmApplyLightText(this.widthControl.label);
   acmApplyLightText(this.featherControl.label);
   acmApplyLightText(this.rangeMaskLowControl.label);
   acmApplyLightText(this.rangeMaskHighControl.label);
   acmApplyLightText(this.rangeMaskFeatherControl.label);
   acmApplyLightText(this.rangeMaskSoftenLabel);
   acmApplyLightText(this.rangeMaskSoftenStatusLabel);
   acmApplyLightText(this.maskSoftenLabel);
   acmApplyLightText(this.maskSoftenStatusLabel);
   acmApplyLightText(this.bandMaskShapingLabel);
   acmApplyLightText(this.rangeMaskShapingLabel);
   acmApplyLightText(this.rangeMaskHistogramHintLabel);
   this.widthControl.label.useRichText = true;
   this.widthControl.label.text = acmThemeRichText("Hue Radius:", ACM_GRAY_UI_THEME.text, false);
   this.featherControl.label.useRichText = true;
   this.featherControl.label.text = acmThemeRichText("Feather:", ACM_GRAY_UI_THEME.text, false);
   this.rangeMaskLowControl.label.useRichText = true;
   this.rangeMaskLowControl.label.text = acmThemeRichText("Low", ACM_GRAY_UI_THEME.text, false);
   this.rangeMaskHighControl.label.useRichText = true;
   this.rangeMaskHighControl.label.text = acmThemeRichText("High", ACM_GRAY_UI_THEME.text, false);
   this.rangeMaskFeatherControl.label.useRichText = true;
   this.rangeMaskFeatherControl.label.text = acmThemeRichText("Feather", ACM_GRAY_UI_THEME.text, false);
   acmSetThemeLabel(this.rangeMaskSoftenLabel, "Blur", ACM_GRAY_UI_THEME.text, false);
   acmSetThemeLabel(this.maskSoftenLabel, "Blur", ACM_GRAY_UI_THEME.text, false);
   acmSetThemeLabel(this.bandMaskShapingLabel, "Band Mask Shaping:", ACM_GRAY_UI_THEME.text, true);
   acmSetThemeLabel(this.rangeMaskShapingLabel, "Range Mask Shaping:", ACM_GRAY_UI_THEME.text, true);
   acmSetThemeLabel(this.rangeMaskHistogramHintLabel, "Histogram shows the active Range Mask selection.", ACM_GRAY_UI_THEME.muted, false);

   this.faqButton.setFixedWidth(132);
   this.technicalButton.setFixedWidth(170);
   this.aboutButton.setFixedWidth(122);
   this.imageTypeCombo.setFixedWidth(ACM_HOST_IS_WINDOWS ? 270 : 236);
   this.activeStatusLabel.minWidth = 0;

   var targetTopRow = new HorizontalSizer;
   targetTopRow.spacing = 4;
   targetTopRow.add(this.targetImageLabel);
   targetTopRow.add(this.targetImageCombo);
   targetTopRow.addSpacing(ACM_HOST_IS_WINDOWS ? 4 : 14);
   targetTopRow.add(this.refreshButton);
   targetTopRow.addStretch();

   var targetBottomRow = new HorizontalSizer;
   targetBottomRow.spacing = 4;
   targetBottomRow.addSpacing(ACM_HOST_IS_WINDOWS ? 94 : 100);
   targetBottomRow.add(this.activeStatusLabel);
   targetBottomRow.addSpacing(6);
   targetBottomRow.add(this.pendingChangesLabel);
   targetBottomRow.addStretch();

   var targetModeRow = new HorizontalSizer;
   targetModeRow.spacing = 4;
   targetModeRow.add(this.imageTypeLabel);
   targetModeRow.add(this.imageTypeHelpButton);
   targetModeRow.add(this.imageTypeCombo);
   targetModeRow.addStretch();

   var windowModeRow = new HorizontalSizer;
   windowModeRow.spacing = 6;
   windowModeRow.add(this.layoutModeLabel);
   windowModeRow.add(this.layoutModeCombo);
   windowModeRow.addSpacing(6);
   windowModeRow.add(this.windowSizeLabel);
   windowModeRow.addStretch();

   var windowSizeButtonRow = new HorizontalSizer;
   windowSizeButtonRow.spacing = 6;
   var windowButtonIndent = new Control(this);
   windowButtonIndent.setFixedWidth(ACM_HOST_IS_WINDOWS ? 82 : 56);
   windowSizeButtonRow.add(windowButtonIndent);
   windowSizeButtonRow.add(this.saveWindowSizeButton);
   windowSizeButtonRow.add(this.resetWindowSizeButton);
   windowSizeButtonRow.addSpacing(6);
   windowSizeButtonRow.add(this.windowSizeStatusLabel);
   windowSizeButtonRow.addStretch();

   var windowControlsHost = new Control(this);
   windowControlsHost.onPaint = function() {
      var g = new Graphics(this);
      g.brush = new Brush(ACM_GRAY_UI_THEME.header);
      g.pen = new Pen(0xff8a8a8a, 1);
      g.fillRect(0, 0, this.width, this.height, g.brush);
      g.drawRect(new Rect(0, 0, this.width - 1, this.height - 1));
      g.pen = new Pen(0xff555555, 1);
      g.drawLine(4, this.height - 2, this.width - 5, this.height - 2);
      g.end();
   };
   var windowControlsStack = new Control(this);
   windowControlsStack.sizer = new VerticalSizer;
   windowControlsStack.sizer.margin = 0;
   windowControlsStack.sizer.spacing = 2;
   windowControlsStack.sizer.add(windowModeRow);
   windowControlsStack.sizer.add(windowSizeButtonRow);

   windowControlsHost.sizer = new VerticalSizer;
   windowControlsHost.sizer.margin = 4;
   windowControlsHost.sizer.spacing = 0;
   windowControlsHost.sizer.addStretch();
   windowControlsHost.sizer.add(windowControlsStack);
   windowControlsHost.sizer.addStretch();

   var protectionPolicyRow = new HorizontalSizer;
   protectionPolicyRow.spacing = 8;
   protectionPolicyRow.add(this.protectionPolicyLabel);
   protectionPolicyRow.add(this.protectionPolicyHelpButton);
   protectionPolicyRow.add(this.protectStarsCheck);
   protectionPolicyRow.add(this.protectLowSatCheck);
   protectionPolicyRow.addStretch();

   var protectionPolicyHost = new Control(this);
   protectionPolicyHost.sizer = new VerticalSizer;
   protectionPolicyHost.sizer.margin = 0;
   protectionPolicyHost.sizer.spacing = 0;
   protectionPolicyHost.sizer.addSpacing(3);
   protectionPolicyHost.sizer.add(protectionPolicyRow);

   var targetColumn = new VerticalSizer;
   targetColumn.margin = 0;
   targetColumn.spacing = 2;
   targetColumn.add(targetTopRow);
   targetColumn.add(targetBottomRow);
   targetColumn.add(targetModeRow);
   targetColumn.add(protectionPolicyHost);

   var docsStack = new VerticalSizer;
   docsStack.margin = 0;
   docsStack.spacing = 2;
   docsStack.add(this.faqButton);
   docsStack.add(this.technicalButton);
   docsStack.add(this.aboutButton);

   var rightMetaRow = new HorizontalSizer;
   rightMetaRow.spacing = 4;
   rightMetaRow.add(docsStack);
   rightMetaRow.addStretch();

   var workflowRow = new HorizontalSizer;
   workflowRow.spacing = 4;
   workflowRow.add(this.headerLogoControl);
   workflowRow.addSpacing(2);
   workflowRow.add(this.headerBrandControl);
   if (ACM_HOST_IS_WINDOWS)
      workflowRow.addSpacing(0);
   else
      workflowRow.addStretch();
   workflowRow.add(targetColumn, 100);
   workflowRow.addSpacing(8);
   workflowRow.add(windowControlsHost);
   workflowRow.addStretch();
   workflowRow.addSpacing(8);
   workflowRow.add(rightMetaRow);

   var passControlsRow = new HorizontalSizer;
   passControlsRow.spacing = ACM_HOST_IS_WINDOWS ? 4 : 6;
   if (ACM_HOST_IS_WINDOWS)
      passControlsRow.add(this.passActiveCombo);
   else
      passControlsRow.add(this.passActiveCombo, 100);
   passControlsRow.add(this.passEnabledCheck);
   if (ACM_HOST_IS_WINDOWS)
      passControlsRow.addStretch();
   var passButtonsRow = null;
   if (ACM_HOST_IS_WINDOWS) {
      passButtonsRow = new HorizontalSizer;
      passButtonsRow.spacing = 6;
      passButtonsRow.add(this.newPassButton);
      passButtonsRow.add(this.duplicatePassButton);
      passButtonsRow.add(this.deletePassButton);
      passButtonsRow.addStretch();
   } else {
      passControlsRow.add(this.newPassButton);
      passControlsRow.add(this.duplicatePassButton);
      passControlsRow.add(this.deletePassButton);
   }

   var selectedBandRow = new HorizontalSizer;
   selectedBandRow.spacing = 8;
   selectedBandRow.add(this.selectedBandLabel);
   selectedBandRow.add(this.selectedBandHelpButton);
   selectedBandRow.add(this.selectedBandCombo, 100);
   selectedBandRow.add(this.resetSelectedButton);

   var selectedBandControlsRow = new HorizontalSizer;
   selectedBandControlsRow.spacing = 8;
   selectedBandControlsRow.add(this.widthControl, 100);
   selectedBandControlsRow.add(this.featherControl, 100);

   var selectedBandMaskOptionsRow = new HorizontalSizer;
   selectedBandMaskOptionsRow.spacing = 6;
   selectedBandMaskOptionsRow.add(this.bandMaskShapingLabel);
   selectedBandMaskOptionsRow.add(this.maskSoftenLabel);
   selectedBandMaskOptionsRow.add(this.maskSoftenCombo);
   selectedBandMaskOptionsRow.add(this.bandMaskBoostCheck);
   selectedBandMaskOptionsRow.add(this.bandMaskBoostHelpButton);
   selectedBandMaskOptionsRow.addStretch();

   var selectedBandVizRow = new HorizontalSizer;
   selectedBandVizRow.spacing = 10;
   selectedBandVizRow.add(this.selectedBandViz, 100);
   selectedBandVizRow.add(this.selectedBandReadoutPanel);

   var tabsRow = new HorizontalSizer;
   tabsRow.spacing = 0;
   tabsRow.addSpacing(6);
   tabsRow.add(this.tabHueButton);
   tabsRow.add(this.tabSaturationButton);
   tabsRow.add(this.tabLuminanceButton);
   var colorMixerSensitivityRow = new HorizontalSizer;
   colorMixerSensitivityRow.spacing = 4;
   colorMixerSensitivityRow.add(this.sensitivityLabel);
   colorMixerSensitivityRow.add(this.sensitivityCombo);
   if (ACM_HOST_IS_WINDOWS) {
      colorMixerSensitivityRow.addSpacing(6);
      colorMixerSensitivityRow.add(this.sensitivityHelpButton);
   }
   tabsRow.addSpacing(2);
   tabsRow.add(colorMixerSensitivityRow);
   tabsRow.addStretch();

   var workflowTabsRow = new HorizontalSizer;
   workflowTabsRow.spacing = 6;
   workflowTabsRow.add(this.toolSelectedBandButton);
   workflowTabsRow.add(this.toolRangeMaskButton);
   workflowTabsRow.addStretch();

   var previewButtonsTopRow = new HorizontalSizer;
   previewButtonsTopRow.spacing = 6;
   previewButtonsTopRow.add(this.previewModeLabel);
   previewButtonsTopRow.add(this.previewHelpButton);
   previewButtonsTopRow.add(this.previewModeCombo);
   previewButtonsTopRow.add(this.updatePreviewButton);
   previewButtonsTopRow.add(this.autoPreviewCheck);
   previewButtonsTopRow.addStretch();
   previewButtonsTopRow.add(this.previewSamplingStatusLabel);
   previewButtonsTopRow.addSpacing(8);

   var previewButtonsBottomRow = new HorizontalSizer;
   previewButtonsBottomRow.spacing = 6;
   previewButtonsBottomRow.add(this.previewZoomLabel);
   previewButtonsBottomRow.add(this.previewZoomPresetCombo);
   previewButtonsBottomRow.add(this.previewZoomReadout);
   previewButtonsBottomRow.addSpacing(10);
   previewButtonsBottomRow.add(this.compareModeLabel);
   previewButtonsBottomRow.add(this.compareModeHelpButton);
   previewButtonsBottomRow.add(this.compareModeCombo);
   previewButtonsBottomRow.addStretch();
   previewButtonsBottomRow.add(this.previewInteractionHintLabel);
   previewButtonsBottomRow.addSpacing(8);

   var previewToolbarColumn = new VerticalSizer;
   previewToolbarColumn.margin = 0;
   previewToolbarColumn.spacing = 2;
   previewToolbarColumn.add(previewButtonsTopRow);
   previewToolbarColumn.add(previewButtonsBottomRow);

   var buttonsRow = new HorizontalSizer;
   buttonsRow.spacing = 6;
   buttonsRow.add(this.applyButton);
   buttonsRow.add(this.resetActivePassButton);
   buttonsRow.add(this.resetAllButton);
   buttonsRow.add(this.saveRecipeButton);
   buttonsRow.add(this.loadRecipeButton);
   buttonsRow.addStretch();
   buttonsRow.add(this.closeButton);

   var rangeMaskPresetRow = new HorizontalSizer;
   rangeMaskPresetRow.spacing = 8;
   rangeMaskPresetRow.add(this.rangeMaskPresetLabel);
   rangeMaskPresetRow.add(this.rangeMaskPresetCombo, 100);
   rangeMaskPresetRow.add(this.resetRangeMaskButton);

   var rangeMaskEnableRow = new HorizontalSizer;
   rangeMaskEnableRow.spacing = 4;
   rangeMaskEnableRow.add(this.rangeMaskEnabledCheck);
   rangeMaskEnableRow.add(this.rangeMaskHelpButton);
   rangeMaskEnableRow.addStretch();

   var rangeMaskSoftenRow = new HorizontalSizer;
   rangeMaskSoftenRow.spacing = 5;
   rangeMaskSoftenRow.add(this.rangeMaskShapingLabel);
   rangeMaskSoftenRow.add(this.rangeMaskSoftenLabel);
   rangeMaskSoftenRow.add(this.rangeMaskSoftenCombo);
   rangeMaskSoftenRow.add(this.rangeMaskBoostCheck);
   rangeMaskSoftenRow.add(this.rangeMaskBoostHelpButton);
   rangeMaskSoftenRow.addStretch();

   var diagnosticsHeaderRow = new HorizontalSizer;
   diagnosticsHeaderRow.spacing = 4;
   diagnosticsHeaderRow.add(this.diagnosticsSectionLabel);
   diagnosticsHeaderRow.add(this.diagnosticsHelpButton);
   diagnosticsHeaderRow.addStretch();

   var passViewerHeaderRow = new HorizontalSizer;
   passViewerHeaderRow.spacing = 4;
   passViewerHeaderRow.add(this.passViewerLabel);
   passViewerHeaderRow.add(this.refinementPassHelpButton);
   passViewerHeaderRow.addStretch();
   if (!ACM_HOST_IS_WINDOWS)
      passViewerHeaderRow.add(this.autoSelectProbeBandCheck);

   var previewOutputHeaderRow = new HorizontalSizer;
   this.previewOutputHeaderRow = previewOutputHeaderRow;
   previewOutputHeaderRow.spacing = 4;
   previewOutputHeaderRow.add(this.previewOutputSectionLabel);
   previewOutputHeaderRow.addStretch();

   this.colorMixerPanel = new Control(this);
   acmSetThemePanel(this.colorMixerPanel, ACM_GRAY_UI_THEME.panel, ACM_GRAY_UI_THEME.panel);
   this.colorMixerPanel.sizer = new VerticalSizer;
   this.colorMixerPanel.sizer.margin = 0;
   this.colorMixerPanel.sizer.spacing = 0;
   this.colorMixerPanel.sizer.add(tabsRow);
   this.colorMixerPanel.sizer.addSpacing(1);
   var bandSectionRow = new HorizontalSizer;
   bandSectionRow.spacing = 0;
   bandSectionRow.addSpacing(6);
   bandSectionRow.add(this.bandSectionLabel);
   bandSectionRow.addStretch();
   this.colorMixerPanel.sizer.add(bandSectionRow);
   this.colorMixerPanel.sizer.add(this.bandControlsHost);
   this.colorMixerPanel.sizer.addSpacing(ACM_HOST_IS_WINDOWS ? 10 : 4);
   this.colorMixerPanel.visible = true;

   this.selectedBandPanel = new Control(this);
   acmSetThemePanel(this.selectedBandPanel, ACM_GRAY_UI_THEME.panel, ACM_GRAY_UI_THEME.panel);
   this.selectedBandPanel.sizer = new VerticalSizer;
   this.selectedBandPanel.sizer.margin = 0;
   this.selectedBandPanel.sizer.spacing = 3;
   this.selectedBandPanel.sizer.add(selectedBandRow);
   this.selectedBandPanel.sizer.add(selectedBandControlsRow);
   this.selectedBandPanel.sizer.add(selectedBandMaskOptionsRow);
   this.selectedBandPanel.sizer.add(this.maskSoftenStatusLabel);
   this.selectedBandPanel.sizer.add(selectedBandVizRow, 100);
   this.selectedBandPanel.visible = true;

   this.rangeMaskPanel = new Control(this);
   acmSetThemePanel(this.rangeMaskPanel, ACM_GRAY_UI_THEME.panel, ACM_GRAY_UI_THEME.panel);
   this.rangeMaskPanel.sizer = new VerticalSizer;
   this.rangeMaskPanel.sizer.margin = 0;
   this.rangeMaskPanel.sizer.spacing = 2;
   this.rangeMaskPanel.sizer.add(rangeMaskEnableRow);
   this.rangeMaskPanel.sizer.add(rangeMaskPresetRow);
   this.rangeMaskPanel.sizer.add(this.rangeMaskLowControl);
   this.rangeMaskPanel.sizer.add(this.rangeMaskHighControl);
   this.rangeMaskPanel.sizer.add(this.rangeMaskFeatherControl);
   this.rangeMaskPanel.sizer.add(rangeMaskSoftenRow);
   this.rangeMaskPanel.sizer.add(this.rangeMaskHistogramHintLabel);
   this.rangeMaskPanel.sizer.add(this.rangeMaskStatusLabel);
   this.rangeMaskPanel.visible = true;

   var diagnosticsMetaRow = new HorizontalSizer;
   diagnosticsMetaRow.spacing = 8;
   diagnosticsMetaRow.addStretch();

   var histogramPanel = new Control(this);
   this.histogramPanel = histogramPanel;
   acmSetThemePanel(histogramPanel, ACM_GRAY_UI_THEME.panel, ACM_GRAY_UI_THEME.panel);
   histogramPanel.sizer = new VerticalSizer;
   histogramPanel.sizer.margin = 0;
   histogramPanel.sizer.spacing = 0;
   var histogramTitleRow = new HorizontalSizer;
   histogramTitleRow.spacing = 4;
   histogramTitleRow.add(this.histogramLabel);
   histogramTitleRow.add(this.histogramSubtitleLabel);
   histogramTitleRow.addStretch();
   histogramPanel.sizer.add(histogramTitleRow);
   histogramPanel.sizer.add(this.histogramControl, 100);
   histogramPanel.sizer.add(this.histogramRampControl);

   var polarPanel = new Control(this);
   this.polarPanel = polarPanel;
   acmSetThemePanel(polarPanel, ACM_GRAY_UI_THEME.panel, ACM_GRAY_UI_THEME.panel);
   polarPanel.sizer = new VerticalSizer;
   polarPanel.sizer.margin = 0;
   polarPanel.sizer.spacing = 2;
   var plotInfoWidth = ACM_HOST_IS_WINDOWS ? 210 : 162;
   this.polarInfoLabel.setFixedWidth(plotInfoWidth);
   this.polarInfoLabel.setFixedHeight(ACM_HOST_IS_WINDOWS ? 166 : 134);
   this.plotInfoLabel.setFixedWidth(plotInfoWidth);
   var polarTitleRow = new HorizontalSizer;
   polarTitleRow.spacing = 4;
   polarTitleRow.add(this.polarLabel);
   polarTitleRow.addStretch();
   polarPanel.sizer.add(polarTitleRow);
   var polarBodyRow = new HorizontalSizer;
   polarBodyRow.spacing = 4;
   polarBodyRow.add(this.polarControl, 100);
   polarPanel.sizer.add(polarBodyRow, 100);

   var plotInfoPanel = new Control(this);
   this.plotInfoPanel = plotInfoPanel;
   acmSetThemePanel(plotInfoPanel, ACM_GRAY_UI_THEME.panel, ACM_GRAY_UI_THEME.panel);
   plotInfoPanel.setFixedWidth(plotInfoWidth);
   plotInfoPanel.sizer = new VerticalSizer;
   plotInfoPanel.sizer.margin = 0;
   plotInfoPanel.sizer.spacing = 0;
   var plotInfoTitleRow = new HorizontalSizer;
   plotInfoTitleRow.spacing = 4;
   plotInfoTitleRow.add(this.plotInfoLabel);
   plotInfoTitleRow.addStretch();
   plotInfoPanel.sizer.add(plotInfoTitleRow);
   var plotInfoBodySizer = new VerticalSizer;
   plotInfoBodySizer.margin = 0;
   plotInfoBodySizer.spacing = 0;
   plotInfoBodySizer.addSpacing(0);
   plotInfoBodySizer.add(this.polarInfoLabel, 100);
   plotInfoPanel.sizer.add(plotInfoBodySizer, 100);

   var passViewerPanel = new Control(this);
   acmSetThemePanel(passViewerPanel, ACM_GRAY_UI_THEME.panel, 0xffe6e6e6);
   this.passViewerPanel = passViewerPanel;
   passViewerPanel.sizer = new VerticalSizer;
   passViewerPanel.sizer.margin = ACM_HOST_IS_WINDOWS ? 6 : 4;
   passViewerPanel.sizer.spacing = 2;
   passViewerPanel.sizer.add(passViewerHeaderRow);
   passViewerPanel.sizer.add(this.refinementPassHelpBox);
   passViewerPanel.sizer.add(passControlsRow);
   if (passButtonsRow)
      passViewerPanel.sizer.add(passButtonsRow);
   passViewerPanel.sizer.add(this.passViewerHost);

   var diagnosticsPlotsRow = new HorizontalSizer;
   this.diagnosticsPlotsRow = diagnosticsPlotsRow;
   diagnosticsPlotsRow.spacing = 8;
   diagnosticsPlotsRow.add(histogramPanel, ACM_HOST_IS_WINDOWS ? 34 : 32);
   diagnosticsPlotsRow.add(polarPanel, ACM_HOST_IS_WINDOWS ? 26 : 28);
   diagnosticsPlotsRow.add(plotInfoPanel, ACM_HOST_IS_WINDOWS ? 18 : 0);
   diagnosticsPlotsRow.add(passViewerPanel, ACM_HOST_IS_WINDOWS ? 40 : 30);

   this.diagnosticsPanel = new Control(this);
   acmSetThemePanel(this.diagnosticsPanel, ACM_GRAY_UI_THEME.panel, ACM_GRAY_UI_THEME.panel);
   this.diagnosticsPanel.sizer = new VerticalSizer;
   this.diagnosticsPanel.sizer.margin = 0;
   this.diagnosticsPanel.sizer.spacing = 2;
   this.diagnosticsPanel.sizer.add(diagnosticsPlotsRow);
   this.diagnosticsPanel.visible = true;
   this.refinementPassHelpButton.acmDialogRef = this;
   this.refinementPassHelpButton.onMousePress = function() {
      if (this.acmDialogRef && typeof this.acmDialogRef.showInlineHelp === "function")
         this.acmDialogRef.showInlineHelp(this.acmHelpKey, this.acmHelpTitle, this.acmHelpText, this);
   };
   this.refinementPassHelpButton.onMouseRelease = function() {
      if (this.acmDialogRef && typeof this.acmDialogRef.hideInlineHelp === "function")
         this.acmDialogRef.hideInlineHelp();
   };

   this.compactDiagnosticsPanel = new Control(this);
   acmSetThemePanel(this.compactDiagnosticsPanel, ACM_GRAY_UI_THEME.panel, ACM_GRAY_UI_THEME.line);
   this.compactDiagnosticsPanel.sizer = new VerticalSizer;
   this.compactDiagnosticsPanel.sizer.margin = 4;
   this.compactDiagnosticsPanel.sizer.spacing = 4;
   var compactDiagnosticsHeaderRow = new HorizontalSizer;
   compactDiagnosticsHeaderRow.spacing = 8;
   compactDiagnosticsHeaderRow.addStretch();
   compactDiagnosticsHeaderRow.add(this.compactDiagnosticsButton);
   this.compactDiagnosticsPanel.sizer.add(compactDiagnosticsHeaderRow);
   this.compactDiagnosticsPanel.visible = false;
   this.compactDiagnosticsPanel.hide();

   var previewOutputButtonsRow = new HorizontalSizer;
   this.previewOutputButtonsRow = previewOutputButtonsRow;
   previewOutputButtonsRow.spacing = 6;
   previewOutputButtonsRow.add(this.applyButton);
   previewOutputButtonsRow.add(this.applyToTargetButton);
   previewOutputButtonsRow.add(this.outputModeHelpButton);
   previewOutputButtonsRow.addSpacing(8);
   previewOutputButtonsRow.add(this.targetApplyMaskStatusLabel, 100);
   previewOutputButtonsRow.addStretch();

   var recipeButtonGroup = new Control(this);
   this.recipeButtonGroup = recipeButtonGroup;
   var recipeButtonHeaderRow = new HorizontalSizer;
   recipeButtonHeaderRow.spacing = 4;
   recipeButtonHeaderRow.add(this.recipeSectionLabel);
   recipeButtonHeaderRow.add(this.recipeHelpButton);
   recipeButtonHeaderRow.addStretch();
   var recipeButtonButtonsRow = new HorizontalSizer;
   recipeButtonButtonsRow.spacing = 6;
   recipeButtonButtonsRow.add(this.saveRecipeButton);
   recipeButtonButtonsRow.add(this.loadRecipeButton);
   recipeButtonButtonsRow.addStretch();
   recipeButtonGroup.sizer = new VerticalSizer;
   recipeButtonGroup.sizer.margin = 4;
   recipeButtonGroup.sizer.spacing = 2;
   recipeButtonGroup.sizer.add(recipeButtonHeaderRow);
   recipeButtonGroup.sizer.add(recipeButtonButtonsRow);
   recipeButtonGroup.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0xff8a8f98);
      g.brush = new Brush(0x00000000);
      g.drawRect(this.boundsRect);
      g.end();
   };

   var helpButtonsRow = new HorizontalSizer;
   helpButtonsRow.spacing = 6;
   helpButtonsRow.add(this.faqButton);
   helpButtonsRow.add(this.technicalButton);
   helpButtonsRow.add(this.aboutButton);
   helpButtonsRow.addStretch();

   var bottomActionsRow = new HorizontalSizer;
   this.bottomActionsRow = bottomActionsRow;
   bottomActionsRow.spacing = 8;
   bottomActionsRow.add(recipeButtonGroup);
   bottomActionsRow.addStretch();
   bottomActionsRow.add(this.closeButton);

   this.previewOutputPanel = new Control(this);
   acmSetThemePanel(this.previewOutputPanel, ACM_GRAY_UI_THEME.panel, ACM_GRAY_UI_THEME.panel);
   this.previewOutputPanel.sizer = new VerticalSizer;
   this.previewOutputPanel.sizer.margin = 0;
   this.previewOutputPanel.sizer.spacing = 4;
   this.previewOutputPanel.sizer.add(previewOutputHeaderRow);
   this.previewOutputPanel.sizer.add(this.previewOutputHelpLabel);
   this.previewOutputPanel.sizer.add(previewOutputButtonsRow);
   this.previewOutputPanel.sizer.add(this.outputFeedbackLabel);
   this.previewOutputPanel.sizer.addSpacing(6);
   this.previewOutputPanel.sizer.add(bottomActionsRow);
   this.previewOutputPanel.sizer.addSpacing(2);
   this.previewOutputPanel.sizer.add(this.footerNoticeLabel);
   this.previewOutputPanel.visible = true;
   this.recipeHelpBox = acmCreateHelpBox(this.previewOutputPanel);
   this.recipeHelpBox.bodyLabel.minWidth = 320;
   this.recipeHelpBox.scaledMinWidth = 340;
   this.recipeHelpBox.hide();

   this.recipeHelpButton.acmDialogRef = this;
   this.recipeHelpButton.onMousePress = function() {
      if (this.acmDialogRef)
         this.acmDialogRef.showRecipeInlineHelp();
   };
   this.recipeHelpButton.onMouseRelease = function() {
      if (this.acmDialogRef)
         this.acmDialogRef.hideRecipeInlineHelp();
   };

   this.leftPanel = new Control(this);
   acmSetThemePanel(this.leftPanel, ACM_GRAY_UI_THEME.panel, ACM_GRAY_UI_THEME.panel);
   this.leftPanel.scaledMinWidth = ACM_HOST_IS_WINDOWS ? 500 : 468;
   this.leftPanel.maxWidth = ACM_HOST_IS_WINDOWS ? 560 : 520;
   this.leftPanel.sizer = new VerticalSizer;
   this.leftPanel.sizer.margin = 0;
   this.leftPanel.sizer.spacing = 3;
   var colorMixerGroup = new GroupBox(this.leftPanel);
   this.colorMixerGroup = colorMixerGroup;
   acmSetThemePanel(colorMixerGroup, ACM_GRAY_UI_THEME.panel, ACM_GRAY_UI_THEME.line);
   colorMixerGroup.title = "";
   colorMixerGroup.sizer = new VerticalSizer;
   colorMixerGroup.sizer.margin = 0;
   colorMixerGroup.sizer.spacing = 0;
   var colorMixerTitleLabel = new Label(this.leftPanel);
   acmSetThemeLabel(colorMixerTitleLabel, "Color Mixer", ACM_GRAY_UI_THEME.text, true);
   acmApplyLightText(colorMixerTitleLabel);
   var colorMixerTitleHelpRow = new HorizontalSizer;
   colorMixerTitleHelpRow.spacing = 4;
   colorMixerTitleHelpRow.addSpacing(8);
   colorMixerTitleHelpRow.add(colorMixerTitleLabel);
   colorMixerTitleHelpRow.add(this.colorMixerHelpButton);
   colorMixerTitleHelpRow.addStretch();
   colorMixerGroup.sizer.add(colorMixerTitleHelpRow);
   colorMixerGroup.sizer.add(this.colorMixerPanel, ACM_HOST_IS_WINDOWS ? 100 : 0);
   var workflowToolsGroup = new GroupBox(this.leftPanel);
   this.workflowToolsGroup = workflowToolsGroup;
   acmSetThemePanel(workflowToolsGroup, ACM_GRAY_UI_THEME.panel, ACM_GRAY_UI_THEME.line);
   workflowToolsGroup.title = "";
   workflowToolsGroup.sizer = new VerticalSizer;
   workflowToolsGroup.sizer.margin = 4;
   workflowToolsGroup.sizer.spacing = 2;
   var workflowToolsTitleLabel = new Label(this.leftPanel);
   acmSetThemeLabel(workflowToolsTitleLabel, "Context Tools", ACM_GRAY_UI_THEME.text, true);
   workflowToolsGroup.sizer.add(workflowToolsTitleLabel);
   workflowToolsGroup.sizer.add(workflowTabsRow);
   workflowToolsGroup.sizer.add(this.selectedBandPanel);
   workflowToolsGroup.sizer.add(this.rangeMaskPanel);

   var previewOutputGroup = new GroupBox(this.leftPanel);
   this.previewOutputGroup = previewOutputGroup;
   acmSetThemePanel(previewOutputGroup, ACM_GRAY_UI_THEME.panel, ACM_GRAY_UI_THEME.line);
   previewOutputGroup.title = "";
   previewOutputGroup.sizer = new VerticalSizer;
   previewOutputGroup.sizer.margin = 4;
   previewOutputGroup.sizer.spacing = 2;
   var previewOutputTitleLabel = new Label(this.leftPanel);
   this.previewOutputTitleLabel = previewOutputTitleLabel;
   acmSetThemeLabel(previewOutputTitleLabel, "Output", ACM_GRAY_UI_THEME.text, true);
   previewOutputGroup.sizer.add(previewOutputTitleLabel);
   previewOutputGroup.sizer.add(this.previewOutputPanel);
   this.leftPanel.sizer.add(colorMixerGroup, ACM_HOST_IS_WINDOWS ? 100 : 100);
   this.leftPanel.sizer.add(workflowToolsGroup);
   this.leftPanel.sizer.add(previewOutputGroup);

   this.rightPanel = new Control(this);
   acmSetThemePanel(this.rightPanel, ACM_GRAY_UI_THEME.panel, ACM_GRAY_UI_THEME.panel);
   this.rightPanel.sizer = new VerticalSizer;
   this.rightPanel.sizer.margin = 0;
   this.rightPanel.sizer.spacing = 3;
   this.rightPanel.sizer.add(previewToolbarColumn);
   this.rightPanel.sizer.add(this.previewHost, 100);
   this.rightPanel.sizer.add(this.compactDiagnosticsPanel);
   this.rightPanel.sizer.add(this.diagnosticsPanel);

   var mainContentRow = new HorizontalSizer;
   mainContentRow.spacing = 8;
   mainContentRow.add(this.leftPanel, 24);
   mainContentRow.add(this.rightPanel, 76);

   var globalSettingsGroup = new Control(this);
   acmSetThemePanel(globalSettingsGroup, ACM_GRAY_UI_THEME.header, ACM_GRAY_UI_THEME.line);
   globalSettingsGroup.sizer = new VerticalSizer;
   globalSettingsGroup.sizer.margin = 8;
   globalSettingsGroup.sizer.spacing = 0;
   globalSettingsGroup.sizer.add(workflowRow);

   var headerDivider = new Control(this);
   headerDivider.setFixedHeight(4);
   headerDivider.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0x00000000, 0);
      g.brush = new Brush(0xff090909);
      g.fillRect(0, 0, this.width, this.height, g.brush);
      g.end();
   };

   this.sizer = new VerticalSizer;
   this.sizer.margin = 8;
   this.sizer.spacing = 0;
   this.sizer.add(globalSettingsGroup);
   this.sizer.add(headerDivider);
   this.sizer.add(mainContentRow, 100);
   this.globalSettingsGroup = globalSettingsGroup;

   this.updateActiveStatus();
   this.refreshFromState();
   this.applyLayoutMode(false);
   if (ACM_LAST_RECIPE_PATH)
      this.loadRecipePath(ACM_LAST_RECIPE_PATH);

   acmParkHiddenControl(this.passSectionLabel);
   acmParkHiddenControl(this.passSummaryLabel);
   acmParkHiddenControl(this.passCountLabel);
   acmParkHiddenControl(this.toolDiagnosticsButton);
   acmParkHiddenControl(this.toolPreviewOutputButton);
   acmParkHiddenControl(this.previewSectionLabel);
   acmParkHiddenControl(this.previewHelpLabel);
   acmParkHiddenControl(this.diagnosticsHelpLabel);
   acmParkHiddenControl(this.diagnosticsSectionLabel);
   acmParkHiddenControl(this.diagnosticsHelpButton);
   acmParkHiddenControl(this.probeReadoutLabel);
   acmParkHiddenControl(this.selectedBandSectionLabel);
   acmParkHiddenControl(this.rangeMaskSectionLabel);
   acmParkHiddenControl(this.rangeMaskSoftenStatusLabel);
   acmParkHiddenControl(this.histogramRampLabel);
   acmParkHiddenControl(this.polarSubtitleLabel);
   acmParkHiddenControl(this.selectedBandHelpLabel);
   acmParkHiddenControl(this.previewOutputSectionLabel);
   acmParkHiddenControl(this.helpSectionLabel);
   this.selectedBandSectionLabel = null;
   this.rangeMaskSectionLabel = null;
   this.rangeMaskSoftenStatusLabel = null;
   this.histogramRampLabel = null;
   this.polarSubtitleLabel = null;
   this.diagnosticsSectionLabel = null;
   this.diagnosticsHelpButton = null;

   this.adjustToContents();
   acmConfigureResponsiveDialogBounds(this);
   this.standardDialogWidth = this.width;
   this.standardDialogHeight = this.height;
   if (acmReadSavedWindowSize("standard"))
      this.applyLayoutMode(true);
   this.updateWindowSizeLabel();
   this.refreshActiveSource();
   this.refreshBandControls();
   this.bandControlsHost.update();
   this.neutralRowHost.update();
   if (this.autoPreviewCheck.checked)
      this.requestPreviewUpdate(true);

   this.onResize = function() {
      if (self.acmResizeGuard)
         return;
      var minW = self.acmMinDialogWidth || 0;
      var minH = self.acmMinDialogHeight || 0;
      if (self.layoutMode === "compact" && self.compactDiagnosticsExpanded)
         minH = Math.max(minH, ACM_HOST_IS_WINDOWS ? 760 : 740);
      if ((minW && self.width < minW) || (minH && self.height < minH)) {
         self.acmResizeGuard = true;
         try {
            self.resize(Math.max(self.width, minW), Math.max(self.height, minH));
         } finally {
            self.acmResizeGuard = false;
         }
         return;
      }
      self.updateWindowSizeLabel();
      self.setWindowSizeStatus("");
      var previewWidth = self.previewHost ? self.previewHost.width : 0;
      var previewHeight = self.previewHost ? self.previewHost.height : 0;
      if (previewWidth === self.lastPreviewHostWidth && previewHeight === self.lastPreviewHostHeight)
         return;
      self.lastPreviewHostWidth = previewWidth;
      self.lastPreviewHostHeight = previewHeight;
      if (self.previewHost)
         self.previewHost.update();
      if (!self.previewIsStale)
         self.handleViewportInteractionChange(false);
   };
}
}

var AstroColorMixerPOC8Dialog = AstroColorMixerUI03Dialog;

AstroColorMixerPOC8Dialog.prototype.updateWindowSizeLabel = function() {
   if (!this.windowSizeLabel)
      return;
   var text = Math.round(this.width || 0) + " x " + Math.round(this.height || 0);
   acmSetThemeLabel(this.windowSizeLabel, text, ACM_GRAY_UI_THEME.muted, false);
};

AstroColorMixerPOC8Dialog.prototype.setWindowSizeStatus = function(text, color) {
   if (!this.windowSizeStatusLabel)
      return;
   acmSetThemeLabel(this.windowSizeStatusLabel, text || "", color || "#7fe38a", true);
};

AstroColorMixerPOC8Dialog.prototype.saveCurrentWindowSizePreference = function() {
   var mode = this.layoutMode === "compact" ? "compact" : "standard";
   var ok = acmWriteSavedWindowSize(mode, this.width, this.height);
   this.updateWindowSizeLabel();
   this.setWindowSizeStatus(ok ? "Saved" : "Save failed", ok ? "#7fe38a" : "#ff7070");
};

AstroColorMixerPOC8Dialog.prototype.resetWindowSizePreferences = function() {
   acmResetSavedWindowSizes();
   this.acmUseDefaultWindowSizeOnce = true;
   this.applyLayoutMode(true);
   this.updateWindowSizeLabel();
   this.setWindowSizeStatus("Reset", "#ffc43a");
};

AstroColorMixerPOC8Dialog.prototype.setLayoutMode = function(mode) {
   var nextMode = mode === "compact" ? "compact" : "standard";
   if (nextMode === this.layoutMode) {
      this.applyLayoutMode(false);
      this.refreshBandControls();
      this.updateWindowSizeLabel();
      this.setWindowSizeStatus("");
      return;
   }
   this.layoutMode = nextMode;
   this.setWindowSizeStatus("");
   if (this.layoutMode === "compact")
      this.compactDiagnosticsExpanded = true;
   if (this.layoutModeCombo)
      this.layoutModeCombo.currentItem = this.layoutMode === "compact" ? 1 : 0;
   this.applyLayoutMode(true);
   this.refreshBandControls();
};

AstroColorMixerPOC8Dialog.prototype.scheduleWindowsCompactSettleResize = function(width, height) {
   if (!ACM_HOST_IS_WINDOWS || this.layoutMode !== "compact" || typeof this.resize !== "function")
      return;
   var self = this;
   var targetWidth = Math.max(1700, Math.round(width || 1700));
   var targetHeight = Math.max(980, Math.round(height || 980));
   if (this.acmCompactSettleResizeTimer && typeof this.acmCompactSettleResizeTimer.stop === "function")
      this.acmCompactSettleResizeTimer.stop();
   if (typeof Timer !== "undefined") {
      this.acmCompactSettleResizeTimer = new Timer;
      this.acmCompactSettleResizeTimer.interval = 0.20;
      this.acmCompactSettleResizeTimer.periodic = false;
      this.acmCompactSettleResizeTimer.onTimeout = function() {
         if (self.layoutMode !== "compact")
            return;
         self.acmResizeGuard = true;
         try {
            self.resize(targetWidth, targetHeight);
         } finally {
            self.acmResizeGuard = false;
         }
         self.updateWindowSizeLabel();
         self.update();
      };
      this.acmCompactSettleResizeTimer.start();
      return;
   }
   acmFlushUi();
   this.acmResizeGuard = true;
   try {
      this.resize(targetWidth, targetHeight);
   } finally {
      this.acmResizeGuard = false;
   }
};

AstroColorMixerPOC8Dialog.prototype.applyLayoutMode = function(allowResize) {
   var compact = this.layoutMode === "compact";
   var pendingWindowSize = null;
   if (compact && allowResize) {
      var compactDefault = acmDefaultWindowSizeForMode(this, "compact");
      var targetWidth = compactDefault.width;
      var targetHeight = compactDefault.height;
      var minWidth = ACM_HOST_IS_WINDOWS ? 1700 : 1360;
      var minHeight = ACM_HOST_IS_WINDOWS ? 980 : 760;
      var savedSize = this.acmUseDefaultWindowSizeOnce ? null : acmReadSavedWindowSize("compact");
      if (acmSavedWindowSizeIsSaneForMode("compact", savedSize)) {
         targetWidth = savedSize.width;
         targetHeight = savedSize.height;
      }
      var compactSize = acmClampWindowSize(this, targetWidth, targetHeight, minWidth, minHeight);
      this.setMinWidth(minWidth);
      this.setMinHeight(minHeight);
      this.acmMinDialogWidth = minWidth;
      this.acmMinDialogHeight = minHeight;
      pendingWindowSize = compactSize;
   } else if (!compact) {
      var standardMinWidth = ACM_HOST_IS_WINDOWS ? 1680 : 1240;
      var standardMinHeight = ACM_HOST_IS_WINDOWS ? 820 : 900;
      this.setMinWidth(standardMinWidth);
      this.setMinHeight(standardMinHeight);
      this.acmMinDialogWidth = standardMinWidth;
      this.acmMinDialogHeight = standardMinHeight;
      if (allowResize && typeof this.resize === "function") {
         var standardDefault = acmDefaultWindowSizeForMode(this, "standard");
         var standardTarget = this.acmUseDefaultWindowSizeOnce ? null : acmReadSavedWindowSize("standard");
         var standardW = acmSavedWindowSizeIsSaneForMode("standard", standardTarget) ? standardTarget.width : standardDefault.width;
         var standardH = acmSavedWindowSizeIsSaneForMode("standard", standardTarget) ? standardTarget.height : standardDefault.height;
         var standardSize = acmClampWindowSize(this, standardW, standardH, standardMinWidth, standardMinHeight);
         pendingWindowSize = standardSize;
      }
   }
   this.acmUseDefaultWindowSizeOnce = false;
   if (this.headerLogoControl) {
      this.headerLogoControl.scaledMinWidth = compact ? 128 : 230;
      this.headerLogoControl.scaledMinHeight = compact ? 52 : 96;
      this.headerLogoControl.update();
   }
   if (this.headerBrandControl) {
      this.headerBrandControl.scaledMinWidth = compact ? (ACM_HOST_IS_WINDOWS ? 220 : 330) : 370;
      this.headerBrandControl.scaledMinHeight = compact ? 52 : 96;
      this.headerBrandControl.update();
   }
   if (this.targetImageCombo) {
      var targetComboWidth = compact
         ? (ACM_HOST_IS_WINDOWS ? 286 : 220)
         : (ACM_HOST_IS_WINDOWS ? 280 : 344);
      this.targetImageCombo.minWidth = targetComboWidth;
      this.targetImageCombo.setFixedWidth(targetComboWidth);
   }
   if (this.refreshButton) {
      this.refreshButton.text = compact ? "" : "Refresh";
      this.refreshButton.acmIconOnly = compact;
      if (ACM_HOST_IS_WINDOWS)
         this.refreshButton.setFixedWidth(compact ? 34 : 112);
      else
         this.refreshButton.setFixedWidth(compact ? 34 : 92);
      this.refreshButton.update();
   }
   if (this.protectLowSatCheck && ACM_HOST_IS_WINDOWS)
      this.protectLowSatCheck.text = compact ? "Low Sat" : "Protect Low Sat";
   if (this.previewHost) {
      this.previewHost.scaledMinHeight = compact ? (ACM_HOST_IS_WINDOWS ? 220 : 230) : 500;
      this.previewHost.update();
   }
   if (this.histogramControl) {
      this.histogramControl.scaledMinHeight = compact ? (ACM_HOST_IS_WINDOWS ? 108 : 128) : (ACM_HOST_IS_WINDOWS ? 154 : 122);
      this.histogramControl.update();
   }
   if (this.polarControl) {
      this.polarControl.scaledMinHeight = compact ? (ACM_HOST_IS_WINDOWS ? 126 : 150) : (ACM_HOST_IS_WINDOWS ? 166 : 134);
      this.polarControl.scaledMinWidth = compact ? (ACM_HOST_IS_WINDOWS ? 126 : 150) : (ACM_HOST_IS_WINDOWS ? 166 : 134);
      this.polarControl.update();
   }
   if (this.polarInfoLabel) {
      var plotInfoWidth = compact ? (ACM_HOST_IS_WINDOWS ? 156 : 146) : (ACM_HOST_IS_WINDOWS ? 210 : 162);
      this.polarInfoLabel.setFixedWidth(plotInfoWidth);
      this.polarInfoLabel.setFixedHeight(compact ? (ACM_HOST_IS_WINDOWS ? 132 : 150) : (ACM_HOST_IS_WINDOWS ? 166 : 134));
      if (this.plotInfoPanel) {
         this.plotInfoPanel.setFixedWidth(plotInfoWidth);
         if (ACM_HOST_IS_WINDOWS)
            this.plotInfoPanel.setFixedHeight(compact ? 196 : 252);
      }
   }
   if (this.plotInfoLabel) {
      this.plotInfoLabel.setFixedWidth(compact ? (ACM_HOST_IS_WINDOWS ? 156 : 146) : (ACM_HOST_IS_WINDOWS ? 210 : 162));
      if (ACM_HOST_IS_WINDOWS)
         this.plotInfoLabel.setFixedHeight(20);
   }
   if (this.passViewerHost)
      this.passViewerHost.setFixedHeight(compact ? (ACM_HOST_IS_WINDOWS ? 96 : 104) : (ACM_HOST_IS_WINDOWS ? 106 : 118));
   if (this.passViewerPanel && ACM_HOST_IS_WINDOWS) {
      if (this.passViewerPanel.sizer)
         this.passViewerPanel.sizer.margin = 6;
      if (compact) {
         this.passViewerPanel.setFixedWidth(400);
         this.passViewerPanel.scaledMinWidth = 400;
      } else {
         if (typeof this.passViewerPanel.setVariableWidth === "function")
            this.passViewerPanel.setVariableWidth();
         this.passViewerPanel.scaledMinWidth = 0;
      }
   }
   if (this.sensitivityLabel && ACM_HOST_IS_WINDOWS) {
      this.sensitivityLabel.text = compact ? "Sens." : "Sensitivity";
      this.sensitivityLabel.setFixedWidth(compact ? 58 : 108);
   }
   if (this.sensitivityCombo) {
      if (ACM_HOST_IS_WINDOWS)
         this.sensitivityCombo.setFixedWidth(compact ? 146 : 128);
      else
         this.sensitivityCombo.setFixedWidth(compact ? 96 : 112);
   }
   if (this.sensitivityHelpButton) {
      var showSensitivityHelp = !(compact && ACM_HOST_IS_WINDOWS) && ACM_HOST_IS_WINDOWS;
      this.sensitivityHelpButton.visible = showSensitivityHelp;
      if (showSensitivityHelp)
         this.sensitivityHelpButton.show();
      else
         this.sensitivityHelpButton.hide();
   }
   if (this.passActiveCombo && ACM_HOST_IS_WINDOWS)
      this.passActiveCombo.setFixedWidth(compact ? 190 : 180);
   if (this.passEnabledCheck && ACM_HOST_IS_WINDOWS)
      this.passEnabledCheck.setFixedWidth(78);
   if (this.passEnabledCheck && ACM_HOST_IS_WINDOWS)
      this.passEnabledCheck.text = compact ? "On" : "On";
   if (this.autoSelectProbeBandCheck && ACM_HOST_IS_WINDOWS) {
      this.autoSelectProbeBandCheck.visible = false;
      this.autoSelectProbeBandCheck.hide();
   }
   if (this.newPassButton && ACM_HOST_IS_WINDOWS) {
      this.newPassButton.text = "New";
      this.newPassButton.visible = true;
      this.newPassButton.show();
      this.newPassButton.setFixedWidth(compact ? 82 : 76);
   }
   if (this.duplicatePassButton && ACM_HOST_IS_WINDOWS) {
      this.duplicatePassButton.text = "Dup";
      this.duplicatePassButton.visible = true;
      this.duplicatePassButton.show();
      this.duplicatePassButton.setFixedWidth(compact ? 82 : 76);
   }
   if (this.deletePassButton && ACM_HOST_IS_WINDOWS) {
      this.deletePassButton.text = "Del";
      this.deletePassButton.visible = true;
      this.deletePassButton.show();
      this.deletePassButton.setFixedWidth(compact ? 78 : 76);
   }
   if (this.leftPanel) {
      if (compact && ACM_HOST_IS_WINDOWS && typeof this.leftPanel.setFixedWidth === "function") {
         this.leftPanel.setFixedWidth(450);
         this.leftPanel.scaledMinWidth = 450;
      } else {
         if (typeof this.leftPanel.setVariableWidth === "function")
            this.leftPanel.setVariableWidth();
         this.leftPanel.scaledMinWidth = compact ? 490 : (ACM_HOST_IS_WINDOWS ? 500 : 468);
      }
      this.leftPanel.maxWidth = compact ? (ACM_HOST_IS_WINDOWS ? 450 : 520) : (ACM_HOST_IS_WINDOWS ? 560 : 520);
      this.refreshLeftPanelLayout(compact);
   }
   if (ACM_HOST_IS_WINDOWS) {
      if (this.workflowToolsGroup && this.workflowToolsGroup.sizer) {
         this.workflowToolsGroup.sizer.margin = compact ? 2 : 4;
         this.workflowToolsGroup.sizer.spacing = compact ? 1 : 2;
      }
      if (this.previewOutputGroup && this.previewOutputGroup.sizer) {
         this.previewOutputGroup.sizer.margin = compact ? 2 : 4;
         this.previewOutputGroup.sizer.spacing = compact ? 1 : 2;
      }
      if (this.previewOutputPanel && this.previewOutputPanel.sizer) {
         this.previewOutputPanel.sizer.spacing = compact ? 1 : 4;
      }
      if (this.recipeButtonGroup && this.recipeButtonGroup.sizer) {
         this.recipeButtonGroup.sizer.margin = compact ? 1 : 4;
         this.recipeButtonGroup.sizer.spacing = compact ? 0 : 2;
      }
   }
   if (this.selectedBandViz) {
      this.selectedBandViz.scaledMinWidth = compact ? (ACM_HOST_IS_WINDOWS ? 68 : 104) : 112;
      this.selectedBandViz.scaledMinHeight = compact ? (ACM_HOST_IS_WINDOWS ? 68 : 104) : 112;
      this.selectedBandViz.update();
   }
   if (this.selectedBandReadoutPanel) {
      var selectedReadoutWidth = compact ? (ACM_HOST_IS_WINDOWS ? 470 : 320) : (ACM_HOST_IS_WINDOWS ? 470 : 380);
      var selectedReadoutInnerWidth = compact ? (ACM_HOST_IS_WINDOWS ? 446 : 300) : (ACM_HOST_IS_WINDOWS ? 446 : 360);
      this.selectedBandReadoutPanel.scaledMinWidth = selectedReadoutWidth;
      if (this.selectedBandReadoutPrimary)
         this.selectedBandReadoutPrimary.scaledMinWidth = selectedReadoutInnerWidth;
      if (this.selectedBandReadoutSecondary)
         this.selectedBandReadoutSecondary.scaledMinWidth = selectedReadoutInnerWidth;
      if (this.selectedBandProfileBar) {
         this.selectedBandProfileBar.scaledMinWidth = selectedReadoutInnerWidth;
         if (ACM_HOST_IS_WINDOWS && typeof this.selectedBandProfileBar.setFixedWidth === "function")
            this.selectedBandProfileBar.setFixedWidth(selectedReadoutInnerWidth);
         if (compact && ACM_HOST_IS_WINDOWS && typeof this.selectedBandProfileBar.setFixedHeight === "function") {
            this.selectedBandProfileBar.setFixedHeight(18);
            this.selectedBandProfileBar.scaledMinHeight = 18;
         } else if (typeof this.selectedBandProfileBar.setFixedHeight === "function") {
            this.selectedBandProfileBar.setFixedHeight(26);
            this.selectedBandProfileBar.scaledMinHeight = 26;
         }
      }
      if (this.selectedBandReadoutPanel.sizer && ACM_HOST_IS_WINDOWS) {
         this.selectedBandReadoutPanel.sizer.margin = compact ? 4 : 8;
         this.selectedBandReadoutPanel.sizer.spacing = compact ? 3 : 6;
      }
      this.selectedBandReadoutPanel.visible = true;
      this.selectedBandReadoutPanel.show();
   }
   var compactHiddenControls = [
      this.previewOutputHelpLabel,
      this.footerNoticeLabel,
      this.rangeMaskPresetLabel,
      this.rangeMaskPresetCombo,
      this.resetRangeMaskButton,
      this.activeStatusLabel,
      this.pendingChangesLabel
   ];
   for (var i = 0; i < compactHiddenControls.length; ++i) {
      var ctl = compactHiddenControls[i];
      if (!ctl)
         continue;
      ctl.visible = !compact;
      if (compact)
         ctl.hide();
      else
         ctl.show();
   }
   var windowsCompactStripControls = [
      this.previewOutputTitleLabel,
      this.recipeSectionLabel,
      this.recipeHelpButton
   ];
   for (var stripIndex = 0; stripIndex < windowsCompactStripControls.length; ++stripIndex) {
      var stripCtl = windowsCompactStripControls[stripIndex];
      if (!stripCtl)
         continue;
      var showStripCtl = !(compact && ACM_HOST_IS_WINDOWS);
      stripCtl.visible = showStripCtl;
      if (showStripCtl)
         stripCtl.show();
      else
         stripCtl.hide();
   }
   if (this.diagnosticsPanel) {
      var showDiagnostics = !compact || this.compactDiagnosticsExpanded;
      this.diagnosticsPanel.visible = showDiagnostics;
      if (showDiagnostics)
         this.diagnosticsPanel.show();
      else
         this.diagnosticsPanel.hide();
   }
   if (this.compactDiagnosticsPanel) {
      if (this.compactDiagnosticsPanel.sizer && ACM_HOST_IS_WINDOWS) {
         this.compactDiagnosticsPanel.sizer.margin = compact ? 2 : 4;
         this.compactDiagnosticsPanel.sizer.spacing = compact ? 2 : 4;
      }
      this.compactDiagnosticsPanel.visible = compact;
      if (compact)
         this.compactDiagnosticsPanel.show();
      else
         this.compactDiagnosticsPanel.hide();
   }
   if (!compact && this.compactDiagnosticsBodyLabel) {
      this.compactDiagnosticsExpanded = false;
      this.compactDiagnosticsBodyLabel.hide();
      this.compactDiagnosticsBodyLabel.visible = false;
   }
   if (this.compactDiagnosticsButton)
      this.compactDiagnosticsButton.text = this.compactDiagnosticsExpanded ? "Hide Diagnostics / Passes" : "Show Diagnostics / Passes";
   this.refreshBandControls();
   this.refreshPreviewOutputLayout(compact);
   if (this.passViewerHost && this.passViewerHost.viewport && this.editorState && this.editorState.passes)
      this.refreshPassViewer();
   this.refreshCompactDiagnosticsStrip();
   if (allowResize && pendingWindowSize && typeof this.resize === "function") {
      this.acmResizeGuard = true;
      try {
         this.resize(pendingWindowSize.width, pendingWindowSize.height);
      } finally {
         this.acmResizeGuard = false;
      }
      if (compact)
         this.scheduleWindowsCompactSettleResize(pendingWindowSize.width, pendingWindowSize.height);
   }
   this.updateWindowSizeLabel();
   if (!allowResize)
      this.update();
   else
      this.update();
};

AstroColorMixerPOC8Dialog.prototype.refreshLeftPanelLayout = function(compact) {
   if (!this.leftPanel || !this.leftPanel.sizer || !this.colorMixerGroup || !this.workflowToolsGroup || !this.previewOutputGroup)
      return;
   try { this.leftPanel.sizer.remove(this.colorMixerGroup); } catch (error1) {}
   try { this.leftPanel.sizer.remove(this.workflowToolsGroup); } catch (error2) {}
   try { this.leftPanel.sizer.remove(this.previewOutputGroup); } catch (error3) {}
   this.leftPanel.sizer.add(this.colorMixerGroup, compact ? 0 : 100);
   this.leftPanel.sizer.add(this.workflowToolsGroup, compact ? 0 : 0);
   this.leftPanel.sizer.add(this.previewOutputGroup, compact ? 0 : 0);
   this.leftPanel.update();
};

AstroColorMixerPOC8Dialog.prototype.refreshPreviewOutputLayout = function(compact) {
   if (!this.previewOutputPanel)
      return;
   if (typeof this.previewOutputPanel.setVariableSize === "function")
      this.previewOutputPanel.setVariableSize();
   this.previewOutputPanel.update();
};

AstroColorMixerPOC8Dialog.prototype.toggleCompactDiagnosticsPanel = function() {
   this.compactDiagnosticsExpanded = !this.compactDiagnosticsExpanded;
   if (this.layoutMode === "compact") {
      var minH = this.compactDiagnosticsExpanded ? (ACM_HOST_IS_WINDOWS ? 980 : 780) : (ACM_HOST_IS_WINDOWS ? 900 : 780);
      this.setMinHeight(minH);
      this.acmMinDialogHeight = minH;
      if (this.compactDiagnosticsExpanded && typeof this.resize === "function" && this.height < minH)
         this.resize(this.width, minH);
   }
   if (this.diagnosticsPanel) {
      this.diagnosticsPanel.visible = this.compactDiagnosticsExpanded;
      if (this.compactDiagnosticsExpanded)
         this.diagnosticsPanel.show();
      else
         this.diagnosticsPanel.hide();
   }
   if (this.compactDiagnosticsButton)
      this.compactDiagnosticsButton.text = this.compactDiagnosticsExpanded ? "Hide Diagnostics / Passes" : "Show Diagnostics / Passes";
   if (this.rightPanel)
      this.rightPanel.update();
   this.update();
};

AstroColorMixerPOC8Dialog.prototype.refreshCompactDiagnosticsStrip = function() {
   if (!this.compactDiagnosticsLabel)
      return;
   if (!ACM_HOST_IS_WINDOWS) {
      this.compactDiagnosticsLabel.text = "";
      return;
   }
   var activePass = this.getActivePassState ? this.getActivePassState() : null;
   var rangeMask = activePass ? activePass.rangeMask : null;
   var rangeText = rangeMask && rangeMask.enabled
      ? ("Range " + rangeMask.low.toFixed(3) + "-" + rangeMask.high.toFixed(3))
      : "Range Off";
   var passText = activePass ? ("Pass " + (this.passActiveCombo ? (this.passActiveCombo.currentItem + 1) : 1) + "/" + this.editorState.passes.length + ": " + activePass.name) : "Pass: none";
   this.compactDiagnosticsLabel.text = acmThemeRichText(passText + "  \u00b7  " + rangeText, ACM_GRAY_UI_THEME.text, false);
   if (this.compactDiagnosticsExpanded && this.compactDiagnosticsBodyLabel)
      this.compactDiagnosticsBodyLabel.text = this.formatCompactDiagnosticsText();
};

AstroColorMixerPOC8Dialog.prototype.formatCompactDiagnosticsText = function() {
   var activePass = this.getActivePassState();
   var rangeMask = activePass.rangeMask;
   var lines = [];
   lines.push("Preview");
   lines.push(this.previewStatusLabel ? this.previewStatusLabel.text : "Preview status unavailable");
   lines.push("");
   lines.push("Probe");
   if (this.probeData)
      lines.push("Luminance " + this.probeData.y.toFixed(4) + "   Hue " + this.probeData.h.toFixed(1) + "\u00b0   Saturation " + this.probeData.s.toFixed(4));
   else
      lines.push("No probe yet. Click the preview to sample a pixel.");
   lines.push("");
   lines.push("Selected Band");
   lines.push(this.selectedBandReadoutPrimary ? this.selectedBandReadoutPrimary.text : "");
   lines.push(this.selectedBandReadoutSecondary ? this.selectedBandReadoutSecondary.text : "");
   lines.push("");
   lines.push("Range Mask");
   if (rangeMask && rangeMask.enabled)
      lines.push("Enabled   Low " + rangeMask.low.toFixed(3) + "   High " + rangeMask.high.toFixed(3) + "   Feather " + rangeMask.feather.toFixed(3));
   else
      lines.push("Off");
   lines.push("");
   lines.push("Changed / Strong");
   if (this.previewChangeStats && this.previewChangeStats.state !== "pending" && this.previewChangeStats.active)
      lines.push((this.previewChangeStats.changed * 100).toFixed(2) + "% changed   " + (this.previewChangeStats.strong * 100).toFixed(2) + "% strong");
   else
      lines.push("Pending or unavailable until the adjusted preview is current.");
   lines.push("");
   lines.push("Passes");
   for (var i = 0; i < this.editorState.passes.length; ++i) {
      var pass = this.editorState.passes[i];
      lines.push((pass.id === this.editorState.activePassId ? "> " : "  ") + acmFormatPassViewerRowText(pass));
   }
   return lines.join("\n");
};

AstroColorMixerPOC8Dialog.prototype.showCompactDiagnosticsDialog = function() {
   var owner = this;
   var dialog = new Dialog;
   dialog.windowTitle = "Diagnostics & Passes";
   var title = new Label(dialog);
   title.useRichText = true;
   title.text = acmThemeRichText("Diagnostics & Passes", ACM_GRAY_UI_THEME.text, true);
   var body = new Label(dialog);
   body.wordWrapping = true;
   body.useRichText = false;
   body.textAlignment = TextAlign_Left|TextAlign_Top;
   body.text = this.formatCompactDiagnosticsText();
   body.minWidth = ACM_HOST_IS_WINDOWS ? 620 : 560;
   body.setMinHeight(ACM_HOST_IS_WINDOWS ? 380 : 320);
   acmApplyLightText(body);
   var refreshButton = new PushButton(dialog);
   refreshButton.text = "Refresh";
   refreshButton.onClick = function() {
      body.text = owner.formatCompactDiagnosticsText();
   };
   var closeButton = new PushButton(dialog);
   closeButton.text = "Close";
   closeButton.onClick = function() { dialog.ok(); };
   var buttons = new HorizontalSizer;
   buttons.addStretch();
   buttons.add(refreshButton);
   buttons.add(closeButton);
   dialog.sizer = new VerticalSizer;
   dialog.sizer.margin = 10;
   dialog.sizer.spacing = 6;
   dialog.sizer.add(title);
   dialog.sizer.add(body, 100);
   dialog.sizer.add(buttons);
   dialog.adjustToContents();
   dialog.execute();
};

AstroColorMixerPOC8Dialog.prototype.getActivePassState = function() {
   for (var i = 0; i < this.editorState.passes.length; ++i)
      if (this.editorState.passes[i].id === this.editorState.activePassId)
         return this.editorState.passes[i];
   if (this.editorState.passes.length === 0)
      this.editorState.passes.push(acmCreateDefaultPass("pass-1", "Base Pass"));
   this.editorState.activePassId = this.editorState.passes[0].id;
   return this.editorState.passes[0];
};

AstroColorMixerPOC8Dialog.prototype.showInlineHelp = function(helpKey, title, text, anchor) {
   if (!anchor)
      return;
   var parent = anchor.parent ? anchor.parent : this;
   if (!parent || parent.width < 320 || parent.height < 140)
      parent = this;
   if (!this.floatingHelpBox || this.floatingHelpBoxParent !== parent) {
      this.floatingHelpBox = acmCreateHelpBox(parent);
      this.floatingHelpBoxParent = parent;
   }
   var box = this.floatingHelpBox;
   acmSetThemeLabel(box.titleLabel, title, ACM_GRAY_UI_THEME.text, true);
   box.titleLabel.textAlignment = TextAlign_Left|TextAlign_Top;
   box.bodyLabel.text = text;
   box.bodyLabel.textAlignment = TextAlign_Left|TextAlign_Top;
   acmApplyLightText(box.bodyLabel);
   var targetWidth = Math.min(Math.max(ACM_HOST_IS_WINDOWS ? 360 : 260, parent.width - 24), ACM_HOST_IS_WINDOWS ? 720 : 360);
   box.bodyLabel.minWidth = Math.max(220, targetWidth - 16);
   box.bodyLabel.setMinWidth(Math.max(220, targetWidth - 16));
   var titleHeight = ACM_HOST_IS_WINDOWS ? 24 : 18;
   var bodyHeight = acmEstimateWrappedTextHeight(text, targetWidth - 16, ACM_HOST_IS_WINDOWS ? 22 : 16, ACM_HOST_IS_WINDOWS ? 56 : 36);
   box.titleLabel.setMinHeight(titleHeight);
   box.bodyLabel.setMinHeight(bodyHeight);
   if (ACM_HOST_IS_WINDOWS) {
      box.titleLabel.setFixedHeight(titleHeight);
      box.bodyLabel.setFixedHeight(bodyHeight);
   }
   box.adjustToContents();
   var x = 12;
   var y = 12;
   if (anchor.boundsRect) {
      x = anchor.boundsRect.x0;
      y = anchor.boundsRect.y1 + 6;
   }
   if (parent === this && anchor.boundsRect && anchor.parent && anchor.parent.boundsRect) {
      x += anchor.parent.boundsRect.x0;
      y += anchor.parent.boundsRect.y0;
   }
   var w = Math.max(targetWidth, 240);
   var h = Math.max(titleHeight + bodyHeight + (ACM_HOST_IS_WINDOWS ? 44 : 18), 56);
   if (parent && parent.height)
      h = Math.min(h, Math.max(80, parent.height - 16));
   if (x + w > parent.width - 8)
      x = Math.max(8, parent.width - w - 8);
   if (y + h > parent.height - 8)
      y = Math.max(8, anchor.boundsRect.y0 - h - 6);
   box.setFixedSize(w, h);
   box.move(x, y);
   box.show();
   box.update();
};

AstroColorMixerPOC8Dialog.prototype.hideInlineHelp = function() {
   if (this.floatingHelpBox)
      this.floatingHelpBox.hide();
};

AstroColorMixerPOC8Dialog.prototype.hideRecipeInlineHelp = function() {
   if (this.recipeHelpBox)
      this.recipeHelpBox.hide();
};

AstroColorMixerPOC8Dialog.prototype.hidePassViewerInlineHelp = function() {
   if (this.refinementPassHelpBox)
      this.refinementPassHelpBox.hide();
};

AstroColorMixerPOC8Dialog.prototype.showRecipeInlineHelp = function() {
   if (!this.recipeHelpBox || !this.previewOutputPanel || !this.recipeButtonGroup)
      return;
   if (this.floatingHelpBox)
      this.floatingHelpBox.hide();
   this.hidePassViewerInlineHelp();
   var box = this.recipeHelpBox;
   acmSetThemeLabel(box.titleLabel, "Adjustment Set", ACM_GRAY_UI_THEME.text, true);
   box.bodyLabel.text = this.recipeHelpButton ? this.recipeHelpButton.acmHelpText : "";
   acmApplyLightText(box.bodyLabel);
   box.adjustToContents();
   var desiredWidth = Math.max(340, Math.min(420, this.previewOutputPanel.width - 24));
   box.setFixedWidth(desiredWidth);
   box.adjustToContents();
   var w = Math.max(desiredWidth, box.width);
   var h = Math.max(72, box.height);
   var x = this.recipeButtonGroup.boundsRect.x0 + 4;
   var y = this.recipeButtonGroup.boundsRect.y0 - h - 6;
   if (x + w > this.previewOutputPanel.width - 8)
      x = Math.max(8, this.previewOutputPanel.width - w - 8);
   if (y < 8)
      y = 8;
   box.setFixedSize(w, h);
   box.move(x, y);
   box.show();
   box.update();
};

AstroColorMixerPOC8Dialog.prototype.toggleRecipeInlineHelp = function() {
   if (!this.recipeHelpBox)
      return;
   if (this.recipeHelpBox.visible)
      this.hideRecipeInlineHelp();
   else
      this.showRecipeInlineHelp();
};

AstroColorMixerPOC8Dialog.prototype.showPassViewerInlineHelp = function() {
   if (!this.refinementPassHelpBox || !this.passViewerPanel || !this.refinementPassHelpButton)
      return;
   if (this.floatingHelpBox)
      this.floatingHelpBox.hide();
   this.hideRecipeInlineHelp();
   var box = this.refinementPassHelpBox;
   acmSetThemeLabel(box.titleLabel, "Refinement Pass", ACM_GRAY_UI_THEME.text, true);
   box.bodyLabel.text = this.refinementPassHelpButton ? this.refinementPassHelpButton.acmHelpText : "";
   acmApplyLightText(box.bodyLabel);
   box.bodyLabel.minWidth = 260;
   box.scaledMinWidth = 280;
   box.setVariableSize();
   box.adjustToContents();
   box.show();
   if (this.passViewerPanel)
      this.passViewerPanel.adjustToContents();
   box.update();
};

AstroColorMixerPOC8Dialog.prototype.togglePassViewerInlineHelp = function() {
   if (!this.refinementPassHelpBox)
      return;
   if (this.refinementPassHelpBox.visible)
      this.hidePassViewerInlineHelp();
   else
      this.showPassViewerInlineHelp();
};

AstroColorMixerPOC8Dialog.prototype.showDocumentation = function(kind) {
   acmShowTextDialog(acmGetDocumentationTitle(kind), acmGetDocumentationText(kind));
};

AstroColorMixerPOC8Dialog.prototype.refreshPassSummary = function() {
   var activePass = this.getActivePassState();
   var canAddPass = this.canCreateAdditionalPass(false);
   this.passEnabledCheck.checked = activePass.enabled !== false;
   this.deletePassButton.enabled = activePass.id !== "pass-1";
   this.newPassButton.enabled = canAddPass;
   this.duplicatePassButton.enabled = canAddPass;
   this.passSummaryLabel.text = "Active Pass: " + activePass.name + "\n" + activePass.name + " · " + acmSummarizePass(activePass) + " · " + acmSummarizePassMaskControls(activePass);
   this.passCountLabel.text = "Passes: " + acmCountEnabledPasses(this.editorState) + " enabled / " + this.editorState.passes.length + " total";
};

AstroColorMixerPOC8Dialog.prototype.refreshPassControls = function() {
   this.passComboSyncing = true;
   while (this.passActiveCombo.numberOfItems > 0)
      this.passActiveCombo.removeItem(0);
   var activeIndex = 0;
   for (var i = 0; i < this.editorState.passes.length; ++i) {
      var pass = this.editorState.passes[i];
      this.passActiveCombo.addItem(acmPassComboDisplayName(pass, this));
      if (pass.id === this.editorState.activePassId)
         activeIndex = i;
   }
   if (this.passActiveCombo.numberOfItems > 0)
      this.passActiveCombo.currentItem = activeIndex;
   this.passComboSyncing = false;
   this.refreshPassSummary();
   this.refreshPassViewer();
   this.refreshCompactDiagnosticsStrip();
};

AstroColorMixerPOC8Dialog.prototype.syncPendingChangesIndicator = function() {
   this.pendingChanges = acmEditorStateHasPendingChanges(this.editorState);
   if (this.pendingChangesLabel)
      this.pendingChangesLabel.text = ACM_HOST_IS_WINDOWS ? "" : (this.pendingChanges ? "Pending changes" : "");
};

AstroColorMixerPOC8Dialog.prototype.refreshAvailableTargets = function(reloadCurrent) {
   this.availableTargets = acmGetEligibleTargetViews();
   this.targetComboSyncing = true;
   while (this.targetImageCombo.numberOfItems > 0)
      this.targetImageCombo.removeItem(0);
   if (!this.availableTargets.length) {
      this.targetImageCombo.addItem("No eligible RGB images");
      this.targetImageCombo.currentItem = 0;
      this.targetImageCombo.enabled = false;
      this.targetComboSyncing = false;
      this.targetViewId = null;
      this.updateActiveStatus();
      if (reloadCurrent) {
         this.previewSource = null;
         this.previewLuminanceValues = null;
         this.previewSourceHsl = null;
         this.previewOriginalRgb = null;
         this.previewAdjustedRgb = null;
         this.previewInfluenceStats = null;
         this.previewBitmapOriginal = null;
         this.previewBitmapAdjusted = null;
         this.previewBitmapDifference = null;
         this.previewBitmapBandMask = null;
         this.previewBitmapRangeMask = null;
         this.previewBitmapCombinedMask = null;
         this.previewBitmapStarMask = null;
         this.previewBitmapLastPass = null;
         this.probeData = null;
         this.polarSamples = [];
         this.histogramData = null;
         this.previewStatusLabel.text = "Preview failed: no target RGB image";
         this.previewHost.update();
      }
      this.setOutputFeedback("No eligible RGB images are currently open.");
      return;
   }

   var selectedIndex = 0;
   var preferredViewId = this.targetViewId;
   if (!preferredViewId) {
      var activeStatus = getActiveImageStatus();
      preferredViewId = activeStatus && activeStatus.ok ? activeStatus.viewId : this.availableTargets[0].viewId;
   }

   for (var i = 0; i < this.availableTargets.length; ++i) {
      var target = this.availableTargets[i];
      this.targetImageCombo.addItem(target.label);
      if (target.viewId === preferredViewId)
         selectedIndex = i;
   }
   this.targetImageCombo.currentItem = selectedIndex;
   this.targetImageCombo.enabled = true;
   if (this.availableTargets[selectedIndex]) {
      var fullTargetToolTip = "Full target image name: " + this.availableTargets[selectedIndex].label;
      this.targetImageCombo.toolTip = fullTargetToolTip;
      if (this.targetImageLabel)
         this.targetImageLabel.toolTip = fullTargetToolTip;
   }
   this.targetComboSyncing = false;

   if (!this.targetViewId || !acmFindViewForViewId(this.targetViewId))
      this.targetViewId = this.availableTargets[selectedIndex].viewId;

   this.updateActiveStatus();
   if (reloadCurrent)
      this.loadTargetByViewId(this.targetViewId, false, "Target image refreshed: " + this.availableTargets[selectedIndex].label);
};

AstroColorMixerPOC8Dialog.prototype.restoreTargetComboSelection = function() {
   if (!this.targetImageCombo || !this.availableTargets)
      return;
   this.targetComboSyncing = true;
   for (var i = 0; i < this.availableTargets.length; ++i)
      if (this.availableTargets[i].viewId === this.targetViewId) {
         this.targetImageCombo.currentItem = i;
         break;
      }
   this.targetComboSyncing = false;
};

AstroColorMixerPOC8Dialog.prototype.handleTargetSelectionChange = function(index) {
   if (!(this.availableTargets instanceof Array) || index < 0 || index >= this.availableTargets.length)
      return;
   var target = this.availableTargets[index];
   if (!target || !target.viewId)
      return;
   var fullTargetToolTip = "Full target image name: " + target.label;
   this.targetImageCombo.toolTip = fullTargetToolTip;
   if (this.targetImageLabel)
      this.targetImageLabel.toolTip = fullTargetToolTip;
   if (target.viewId === this.targetViewId)
      return;
   this.switchTargetImage(target.viewId);
};

AstroColorMixerPOC8Dialog.prototype.warnIfTargetAppearsLinear = function() {
   if (!this.previewSource || !this.targetViewId)
      return;

   if (this.linearWarningViewIds[this.targetViewId])
      return;

   var analysis = acmComputeStretchAnalysis(this.previewSource.rgb, this.previewSource.width, this.previewSource.height);
   if (!analysis || !analysis.likelyLinear)
      return;

   this.linearWarningViewIds[this.targetViewId] = true;
   this.setOutputFeedback("Target image may be linear or only weakly stretched. Astro Color Mixer is intended for nonlinear RGB finishing.");
   showMessage(
      "This image appears to be linear or only weakly stretched.\n\n" +
      "Astro Color Mixer is intended for nonlinear RGB images after calibration, integration, background correction, color calibration, and stretch. On linear data, the sliders may appear to do little or the preview may be misleading.\n\n" +
      "You can continue if this is intentional.",
      "Astro Color Mixer - Linear Image Check",
      StdIcon_Warning
   );
};

AstroColorMixerPOC8Dialog.prototype.loadTargetByViewId = function(viewId, resetZoom, feedbackText) {
   var target = acmReadRgbImageForViewId(viewId);
   var preview = acmDownsampleRgbNearest(target.rgb, target.width, target.height, this.previewCacheMaxEdge);
   this.targetViewId = target.viewId;
   this.sourceView = { viewId: target.viewId, width: target.width, height: target.height };
   this.previewSource = preview;
   this.previewLuminanceValues = acmComputeLuminanceValues(preview.rgb, preview.width, preview.height);
   this.previewSourceHsl = null;
   this.previewOriginalRgb = preview.rgb;
   this.previewAdjustedRgb = null;
   this.previewInfluenceStats = null;
   this.previewBandMaskRgb = null;
   this.previewRangeMaskRgb = null;
   this.previewCombinedMaskRgb = null;
   this.previewStarMaskRgb = null;
   this.previewLastPassRgb = null;
   this.previewBitmapOriginal = acmRenderBitmapFromRgb(preview.width, preview.height, preview.rgb);
   this.previewBitmapAdjusted = null;
   this.previewBitmapDifference = null;
   this.previewBitmapLastPass = null;
   this.previewBitmapBandMask = null;
   this.previewBitmapRangeMask = null;
   this.previewBitmapCombinedMask = null;
   this.previewBitmapStarMask = null;
   this.previewWidth = preview.width;
   this.previewHeight = preview.height;
   this.previewDetailCache = null;
   ++this.previewDetailStamp;
   this.previewMode = "adjusted";
   this.previewIsStale = true;
   this.probeData = null;
   this.previewTempCompare = false;
   this.previewCompareBitmap = null;
   this.previewCompareRgb = null;
   this.previewCompareMetrics = null;
   if (resetZoom)
      this.previewZoomMode = "fit";
   this.refreshPreviewModeButtons();
   this.refreshDiagnosticsData();
   this.refreshTargetMaskStatus();
   this.updateActiveStatus();
   this.pendingChanges = false;
   this.syncPendingChangesIndicator();
   this.previewStatusLabel.text = "Reading target preview...";
   this.previewHost.update();
   if (feedbackText)
      this.setOutputFeedback(feedbackText);
   this.warnIfTargetAppearsLinear();
};

AstroColorMixerPOC8Dialog.prototype.switchTargetImage = function(viewId) {
   if (!viewId || viewId === this.targetViewId)
      return;
   if (!this.pendingChanges) {
      this.loadTargetByViewId(viewId, true, "Target image changed to: " + viewId);
      this.restoreTargetComboSelection();
      return;
   }
   var action = acmPromptTargetSwitchAction(this);
   if (action === "cancel") {
      this.restoreTargetComboSelection();
      return;
   }
   var succeeded = false;
   if (action === "create")
      succeeded = this.applyRecipe();
   else if (action === "apply")
      succeeded = this.applyToTargetImage();
   else if (action === "discard")
      succeeded = true;
   if (!succeeded) {
      this.restoreTargetComboSelection();
      return;
   }
   this.loadTargetByViewId(viewId, true, "Target image changed to: " + viewId);
   this.restoreTargetComboSelection();
};

AstroColorMixerPOC8Dialog.prototype.updatePassViewerScrollBars = function() {
   if (!this.passViewerHost || !this.passViewerHost.viewport || !this.passViewerBody)
      return;
   var visibleHeight = Math.max(1, this.passViewerHost.viewport.height);
   var contentHeight = Math.max(0, this.passViewerBody.height);
   this.passViewerHost.pageHeight = visibleHeight;
   this.passViewerHost.setHorizontalScrollRange(0, 0);
   this.passViewerHost.setVerticalScrollRange(0, Math.max(0, contentHeight - visibleHeight));
};

AstroColorMixerPOC8Dialog.prototype.refreshPassViewer = function() {
   if (this.passViewerBody) {
      this.passViewerHost.viewport.sizer.remove(this.passViewerBody);
      this.passViewerBody.hide();
   }
   this.passViewerBody = new Control(this.passViewerHost.viewport);
   acmSetThemePanel(this.passViewerBody, ACM_GRAY_UI_THEME.passViewer, ACM_GRAY_UI_THEME.passViewer);
   this.passViewerBody.sizer = new VerticalSizer;
   this.passViewerBody.sizer.margin = 0;
   this.passViewerBody.sizer.spacing = 1;
   this.passViewerHost.viewport.sizer.add(this.passViewerBody);
   this.passViewerRows = [];
   if (ACM_HOST_IS_WINDOWS) {
      acmConfigureWindowsPassViewerCanvas(this.passViewerBody, this);
      this.passViewerHost.verticalScrollPosition = 0;
      this.updatePassViewerScrollBars();
      return;
   }
   var self = this;
   var passViewerContentHeight = 0;
   for (var i = 0; i < this.editorState.passes.length; ++i) {
      var pass = this.editorState.passes[i];
      var rowHost = new Control(this.passViewerBody);
      acmSetThemePanel(rowHost, ACM_GRAY_UI_THEME.passViewer, ACM_GRAY_UI_THEME.passViewer);
      var rowBar = new HorizontalSizer;
      rowBar.spacing = 4;
      rowHost.sizer = rowBar;
      var rowTextInfo = acmFormatPassViewerWrappedRowText(pass, this, pass.id !== "pass-1");
      var rowSelect = new Control(rowHost);
      var rowHeight = acmConfigurePassViewerRowControl(rowSelect, rowTextInfo, this, pass.id !== "pass-1", pass.id === this.editorState.activePassId, pass.id);
      rowSelect.onMousePress = function() {
         self.editorState.activePassId = this.acmPassId;
         self.refreshFromState();
         self.markPreviewStale();
      };
      rowHost.acmPassViewerRowHeight = rowHeight;
      rowHost.setFixedHeight(rowHeight);
      rowHost.scaledMinHeight = rowHeight;
      rowHost.maxHeight = rowHeight;
      rowBar.add(rowSelect, 100);
      if (pass.id !== "pass-1") {
         var deleteButton = acmCreateTinyDeleteButton(rowHost, "Delete " + pass.name, (function(passId) {
            return function() {
               self.editorState.activePassId = passId;
               self.deleteActivePass();
            };
         })(pass.id));
         rowBar.addSpacing(4);
         rowBar.add(deleteButton);
         rowBar.addSpacing(3);
      }
      this.passViewerBody.sizer.add(rowHost);
      passViewerContentHeight += rowHeight + (i > 0 ? this.passViewerBody.sizer.spacing : 0);
      this.passViewerRows.push({
         passId: pass.id,
         host: rowHost,
         select: rowSelect
      });
   }
   var passViewerBodyHeight = acmPassViewerBodyHeight(this, passViewerContentHeight);
   this.passViewerBody.setFixedHeight(passViewerBodyHeight);
   this.passViewerBody.scaledMinHeight = passViewerBodyHeight;
   this.passViewerHost.verticalScrollPosition = 0;
   this.updatePassViewerScrollBars();
};

AstroColorMixerPOC8Dialog.prototype.updatePassViewerSummaries = function() {
   if (ACM_HOST_IS_WINDOWS && this.passViewerBody) {
      acmConfigureWindowsPassViewerCanvas(this.passViewerBody, this);
      this.passViewerBody.update();
      this.passViewerHost.verticalScrollPosition = 0;
      this.updatePassViewerScrollBars();
      return;
   }
   if (!(this.passViewerRows instanceof Array))
      return;
   for (var rowIndex = 0; rowIndex < this.passViewerRows.length; ++rowIndex) {
      var row = this.passViewerRows[rowIndex];
      if (!row || !row.select)
         continue;
      var pass = null;
      for (var passIndex = 0; passIndex < this.editorState.passes.length; ++passIndex) {
         if (this.editorState.passes[passIndex].id === row.passId) {
            pass = this.editorState.passes[passIndex];
            break;
         }
      }
      if (!pass)
         continue;
      var textInfo = acmFormatPassViewerWrappedRowText(pass, this, pass.id !== "pass-1");
      row.select.toolTip = textInfo.raw;
      if (row.select) {
         var rowHeight = acmConfigurePassViewerRowControl(row.select, textInfo, this, pass.id !== "pass-1", pass.id === this.editorState.activePassId, pass.id);
         if (row.host) {
            row.host.acmPassViewerRowHeight = rowHeight;
            row.host.setFixedHeight(rowHeight);
            row.host.scaledMinHeight = rowHeight;
            row.host.maxHeight = rowHeight;
         }
         row.select.update();
      }
   }
   if (this.passViewerBody) {
      var passViewerContentHeight = 0;
      for (var heightIndex = 0; heightIndex < this.passViewerRows.length; ++heightIndex) {
         var heightRow = this.passViewerRows[heightIndex];
         if (heightRow && heightRow.host)
            passViewerContentHeight += (heightRow.host.acmPassViewerRowHeight || heightRow.host.height) + (heightIndex > 0 ? this.passViewerBody.sizer.spacing : 0);
      }
      var passViewerBodyHeight = acmPassViewerBodyHeight(this, passViewerContentHeight);
      this.passViewerBody.setFixedHeight(passViewerBodyHeight);
      this.passViewerBody.scaledMinHeight = passViewerBodyHeight;
      this.passViewerHost.verticalScrollPosition = 0;
      this.passViewerBody.update();
   }
   this.updatePassViewerScrollBars();
};

AstroColorMixerPOC8Dialog.prototype.populateMaskPreviewCache = function(cache, sourceRgb, width, height) {
   if (!cache || !sourceRgb || !width || !height)
      return;
   var activePass = this.getActivePassState();
   var maskData = acmComputePreviewMaskData(sourceRgb, width, height, activePass, this.editorState.imageType, this.editorState.protectionControls);
   var bandMaskValues = maskData.bandMaskValues;
   var rangeMaskValues = maskData.rangeMaskValues;
   var combinedMaskValues = maskData.combinedMaskValues;
   var starMaskValues = maskData.starMaskValues;
   if (this.maskBoostEnabled) {
      bandMaskValues = acmBoostMaskValues(bandMaskValues);
      starMaskValues = acmBoostMaskValues(starMaskValues);
   }
   cache.bandMaskRgb = new Float32Array(width * height * 3);
   cache.rangeMaskRgb = new Float32Array(width * height * 3);
   cache.combinedMaskRgb = new Float32Array(width * height * 3);
   cache.starMaskRgb = new Float32Array(width * height * 3);
   for (var i = 0; i < bandMaskValues.length; ++i) {
      var base = i * 3;
      var bv = bandMaskValues[i], rv = rangeMaskValues[i], cv = combinedMaskValues[i], sv = starMaskValues[i];
      cache.bandMaskRgb[base] = cache.bandMaskRgb[base + 1] = cache.bandMaskRgb[base + 2] = bv;
      cache.rangeMaskRgb[base] = cache.rangeMaskRgb[base + 1] = cache.rangeMaskRgb[base + 2] = rv;
      cache.combinedMaskRgb[base] = cache.combinedMaskRgb[base + 1] = cache.combinedMaskRgb[base + 2] = cv;
      cache.starMaskRgb[base] = cache.starMaskRgb[base + 1] = cache.starMaskRgb[base + 2] = sv;
   }
   cache.bandMaskBitmap = acmRenderGrayBitmapFromMask(width, height, bandMaskValues);
   cache.rangeMaskBitmap = acmRenderGrayBitmapFromMask(width, height, rangeMaskValues);
   cache.combinedMaskBitmap = acmRenderGrayBitmapFromMask(width, height, combinedMaskValues);
   cache.starMaskBitmap = acmRenderGrayBitmapFromMask(width, height, starMaskValues);
};

AstroColorMixerPOC8Dialog.prototype.ensurePreviewMaskCache = function() {
   if (this.previewBandMaskRgb && this.previewRangeMaskRgb && this.previewCombinedMaskRgb && this.previewStarMaskRgb)
      return;
   if (!this.previewSource || !this.previewSource.rgb)
      return;
   var cache = {};
   this.populateMaskPreviewCache(cache, this.previewSource.rgb, this.previewSource.width, this.previewSource.height);
   this.previewBandMaskRgb = cache.bandMaskRgb;
   this.previewRangeMaskRgb = cache.rangeMaskRgb;
   this.previewCombinedMaskRgb = cache.combinedMaskRgb;
   this.previewStarMaskRgb = cache.starMaskRgb;
   this.previewBitmapBandMask = cache.bandMaskBitmap;
   this.previewBitmapRangeMask = cache.rangeMaskBitmap;
   this.previewBitmapCombinedMask = cache.combinedMaskBitmap;
   this.previewBitmapStarMask = cache.starMaskBitmap;
};

AstroColorMixerPOC8Dialog.prototype.ensureDetailPreviewMaskCache = function() {
   if (!this.previewDetailCache || !this.previewDetailCache.originalRgb)
      return;
   if (this.previewDetailCache.bandMaskRgb && this.previewDetailCache.rangeMaskRgb && this.previewDetailCache.combinedMaskRgb && this.previewDetailCache.starMaskRgb)
      return;
   this.populateMaskPreviewCache(this.previewDetailCache, this.previewDetailCache.originalRgb, this.previewDetailCache.width, this.previewDetailCache.height);
};

AstroColorMixerPOC8Dialog.prototype.getCurrentPreviewBitmap = function() {
   if (this.previewTempCompare && this.previewCompareBitmap)
      return this.previewCompareBitmap;
   if (this.previewTempOriginal)
      return this.shouldUseDetailCropPreview() && this.previewDetailCache && this.previewDetailCache.originalBitmap
         ? this.previewDetailCache.originalBitmap
         : this.previewBitmapOriginal;
   if (this.shouldUseDetailCropPreview() && this.previewDetailCache) {
      switch (this.previewMode) {
      case "original":
         return this.previewDetailCache.originalBitmap || this.previewBitmapOriginal;
      case "difference":
         if (!this.previewDetailCache.differenceBitmap && this.previewDetailCache.originalRgb && this.previewDetailCache.adjustedRgb)
            this.previewDetailCache.differenceBitmap = acmRenderDifferenceBitmapFromRgb(this.previewDetailCache.width, this.previewDetailCache.height, this.previewDetailCache.originalRgb, this.previewDetailCache.adjustedRgb, 5);
         return this.previewDetailCache.differenceBitmap || this.previewDetailCache.adjustedBitmap || this.previewBitmapAdjusted || this.previewBitmapOriginal;
      case "bandMask":
         this.ensureDetailPreviewMaskCache();
         return this.previewDetailCache.bandMaskBitmap || this.previewBitmapBandMask || this.previewBitmapOriginal;
      case "rangeMask":
         this.ensureDetailPreviewMaskCache();
         return this.previewDetailCache.rangeMaskBitmap || this.previewBitmapRangeMask || this.previewBitmapOriginal;
      case "combinedMask":
         this.ensureDetailPreviewMaskCache();
         return this.previewDetailCache.combinedMaskBitmap || this.previewBitmapCombinedMask || this.previewBitmapOriginal;
      case "starMask":
         this.ensureDetailPreviewMaskCache();
         return this.previewDetailCache.starMaskBitmap || this.previewBitmapStarMask || this.previewBitmapOriginal;
      case "adjusted":
      default:
         return this.previewDetailCache.adjustedBitmap || this.previewBitmapAdjusted || this.previewBitmapOriginal;
      }
   }
   switch (this.previewMode) {
   case "original":
      return this.previewBitmapOriginal;
   case "difference":
      if (!this.previewBitmapDifference && this.previewOriginalRgb && this.previewAdjustedRgb)
         this.previewBitmapDifference = acmRenderDifferenceBitmapFromRgb(this.previewWidth, this.previewHeight, this.previewOriginalRgb, this.previewAdjustedRgb, 5);
      return this.previewBitmapDifference || this.previewBitmapAdjusted || this.previewBitmapOriginal;
   case "bandMask":
      this.ensurePreviewMaskCache();
      return this.previewBitmapBandMask || this.previewBitmapOriginal;
   case "rangeMask":
      this.ensurePreviewMaskCache();
      return this.previewBitmapRangeMask || this.previewBitmapOriginal;
   case "combinedMask":
      this.ensurePreviewMaskCache();
      return this.previewBitmapCombinedMask || this.previewBitmapOriginal;
   case "starMask":
      this.ensurePreviewMaskCache();
      return this.previewBitmapStarMask || this.previewBitmapOriginal;
   case "adjusted":
   default:
      return this.previewBitmapAdjusted || this.previewBitmapOriginal;
   }
};

AstroColorMixerPOC8Dialog.prototype.isUsingDetailComparePreview = function() {
   return !!(this.previewTempCompare && this.previewCompareMetrics && !this.previewCompareMetrics.fallbackToFast);
};

AstroColorMixerPOC8Dialog.prototype.getCurrentViewportScale = function(bitmap) {
   if (!bitmap)
      return 1;
   if (this.isUsingDetailComparePreview() && bitmap === this.getCurrentPreviewBitmap() && this.previewSource && this.sourceView) {
      var compareSourceScale = this.sourceView.width / Math.max(1, this.previewSource.width);
      return this.previewZoomScale / Math.max(ACM_EPSILON, compareSourceScale);
   }
   if (this.shouldUseDetailCropPreview() && this.previewDetailCache && bitmap === this.getCurrentPreviewBitmap() && this.previewSource && this.sourceView) {
      var sourceScale = this.sourceView.width / Math.max(1, this.previewSource.width);
      return this.previewZoomScale / Math.max(ACM_EPSILON, sourceScale);
   }
   return this.getPreviewZoomValue(bitmap);
};

AstroColorMixerPOC8Dialog.prototype.getCurrentViewportRect = function(bitmap) {
   if (!bitmap)
      return null;
   if (this.isUsingDetailComparePreview() && bitmap === this.getCurrentPreviewBitmap())
      return acmGetViewportRectForScale(
         this.previewHost.width,
         this.previewHost.height,
         bitmap.width,
         bitmap.height,
         this.getCurrentViewportScale(bitmap),
         0,
         0
      );
   if (this.shouldUseDetailCropPreview() && this.previewDetailCache && bitmap === this.getCurrentPreviewBitmap())
      return acmGetViewportRectForScale(
         this.previewHost.width,
         this.previewHost.height,
         bitmap.width,
         bitmap.height,
         this.getCurrentViewportScale(bitmap),
         0,
         0
      );
   return acmGetViewportRectForScale(
      this.previewHost.width,
      this.previewHost.height,
      bitmap.width,
      bitmap.height,
      this.getCurrentViewportScale(bitmap),
      this.previewPanX,
      this.previewPanY
   );
};

AstroColorMixerPOC8Dialog.prototype.refreshViewportControls = function() {
   if (this.previewZoomMode === "fit")
      this.previewZoomReadout.text = "Fit";
   else
      this.previewZoomReadout.text = this.previewZoomScale.toFixed(2) + "x";
   this.previewZoomControl.setValue(this.previewZoomMode === "fit" ? 1 : this.previewZoomScale);
   if (this.previewZoomPresetCombo) {
      var matchLabel = this.previewZoomMode === "fit" ? "Fit" : this.previewZoomScale.toFixed(0) + "x";
      var selectedIndex = -1;
      for (var i = 0; i < this.previewZoomPresetCombo.numberOfItems; ++i)
         if (this.previewZoomPresetCombo.itemText(i) === matchLabel) {
            selectedIndex = i;
            break;
         }
      if (selectedIndex >= 0) {
         this.previewZoomPresetSyncing = true;
         this.previewZoomPresetCombo.currentItem = selectedIndex;
         this.previewZoomPresetSyncing = false;
      }
   }
};

AstroColorMixerPOC8Dialog.prototype.getPreviewZoomValue = function(bitmap) {
   if (!bitmap)
      return 1;
   return this.previewZoomMode === "fit"
      ? acmGetFitScale(this.previewHost.width, this.previewHost.height, bitmap.width, bitmap.height)
      : this.previewZoomScale;
};

AstroColorMixerPOC8Dialog.prototype.getPreviewBitmapCenter = function(bitmap) {
   if (!bitmap)
      return { x: 0, y: 0 };
   var scale = this.getPreviewZoomValue(bitmap);
   return {
      x: bitmap.width * 0.5 - this.previewPanX / Math.max(ACM_EPSILON, scale),
      y: bitmap.height * 0.5 - this.previewPanY / Math.max(ACM_EPSILON, scale)
   };
};

AstroColorMixerPOC8Dialog.prototype.setPreviewZoomState = function(mode, scale, resetPan) {
   var bitmap = this.previewBitmapOriginal || this.getCurrentPreviewBitmap();
   var center = this.getPreviewBitmapCenter(bitmap);
   this.previewZoomMode = mode === "fit" ? "fit" : "manual";
   this.previewZoomScale = acmClamp(scale, 0.25, 16.0);
   if (this.previewZoomMode === "fit" || resetPan) {
      this.previewPanX = 0;
      this.previewPanY = 0;
   } else if (bitmap) {
      this.previewPanX = (bitmap.width * 0.5 - center.x) * this.previewZoomScale;
      this.previewPanY = (bitmap.height * 0.5 - center.y) * this.previewZoomScale;
   }
   this.refreshViewportControls();
   this.handleViewportInteractionChange(true);
};

AstroColorMixerPOC8Dialog.prototype.shouldUseDetailCropPreview = function() {
   if (this.previewQualityMode === "fast")
      return false;
   if (this.previewZoomMode === "fit")
      return false;
   if (this.previewTempCompare)
      return false;
   if (this.previewZoomScale <= this.previewDetailThreshold)
      return this.previewQualityMode === "detail";
   return true;
};

AstroColorMixerPOC8Dialog.prototype.getCurrentPreviewMetrics = function() {
   if (this.previewTempCompare && this.previewCompareMetrics)
      return this.previewCompareMetrics;
   if (this.previewTempCompare)
      return {
         width: this.previewSource ? this.previewSource.width : this.previewWidth,
         height: this.previewSource ? this.previewSource.height : this.previewHeight,
         sourceX0: 0,
         sourceY0: 0,
         sourceWidth: this.sourceView ? this.sourceView.width : (this.previewSource ? this.previewSource.width : this.previewWidth),
         sourceHeight: this.sourceView ? this.sourceView.height : (this.previewSource ? this.previewSource.height : this.previewHeight),
         fullWidth: this.sourceView ? this.sourceView.width : (this.previewSource ? this.previewSource.width : this.previewWidth),
         fullHeight: this.sourceView ? this.sourceView.height : (this.previewSource ? this.previewSource.height : this.previewHeight)
      };
   if (this.shouldUseDetailCropPreview() && this.previewDetailCache && this.previewDetailCache.width > 0 && this.previewDetailCache.height > 0)
      return this.previewDetailCache;
   return {
      width: this.previewSource ? this.previewSource.width : this.previewWidth,
      height: this.previewSource ? this.previewSource.height : this.previewHeight,
      sourceX0: 0,
      sourceY0: 0,
      sourceWidth: this.sourceView ? this.sourceView.width : (this.previewSource ? this.previewSource.width : this.previewWidth),
      sourceHeight: this.sourceView ? this.sourceView.height : (this.previewSource ? this.previewSource.height : this.previewHeight),
      fullWidth: this.sourceView ? this.sourceView.width : (this.previewSource ? this.previewSource.width : this.previewWidth),
      fullHeight: this.sourceView ? this.sourceView.height : (this.previewSource ? this.previewSource.height : this.previewHeight)
   };
};

AstroColorMixerPOC8Dialog.prototype.getDetailCropRequest = function() {
   if (!this.previewSource || !this.sourceView || this.previewZoomMode === "fit")
      return null;
   var scale = this.previewZoomScale;
   var visiblePreviewRect = acmGetVisibleBitmapRectForScale(
      this.previewHost.width,
      this.previewHost.height,
      this.previewSource.width,
      this.previewSource.height,
      scale,
      this.previewPanX,
      this.previewPanY
   );
   if (visiblePreviewRect.width <= 0 || visiblePreviewRect.height <= 0)
      return null;
   var scaleX = this.sourceView.width / Math.max(1, this.previewSource.width);
   var scaleY = this.sourceView.height / Math.max(1, this.previewSource.height);
   var x0 = acmClamp(Math.floor(visiblePreviewRect.x0 * scaleX), 0, this.sourceView.width - 1);
   var y0 = acmClamp(Math.floor(visiblePreviewRect.y0 * scaleY), 0, this.sourceView.height - 1);
   var x1 = acmClamp(Math.ceil(visiblePreviewRect.x1 * scaleX), x0 + 1, this.sourceView.width);
   var y1 = acmClamp(Math.ceil(visiblePreviewRect.y1 * scaleY), y0 + 1, this.sourceView.height);
   var width = Math.max(1, x1 - x0);
   var height = Math.max(1, y1 - y0);
   return {
      x0: x0,
      y0: y0,
      x1: x1,
      y1: y1,
      width: width,
      height: height,
      key: [x0, y0, x1, y1, this.previewMode, this.previewZoomScale.toFixed(3), this.previewDetailStamp].join(":")
   };
};

AstroColorMixerPOC8Dialog.prototype.requestDetailPreviewUpdate = function(immediate) {
   if (!this.shouldUseDetailCropPreview() || this.previewIsStale)
      return;
   if (immediate || !this.previewDetailDebounceTimer) {
      this.previewDetailRenderPending = false;
      this.renderDetailPreviewForCurrentViewport();
      return;
   }
   this.previewDetailRenderPending = true;
   this.previewDetailDebounceTimer.stop();
   this.previewDetailDebounceTimer.start();
};

AstroColorMixerPOC8Dialog.prototype.handleViewportInteractionChange = function(immediate) {
   if (!this.shouldUseDetailCropPreview()) {
      this.refreshPreviewDisplay();
      return;
   }
   if (this.previewIsStale) {
      this.refreshPreviewDisplay();
      return;
   }
   this.requestDetailPreviewUpdate(immediate);
};

AstroColorMixerPOC8Dialog.prototype.makeNextPassId = function() {
   var maxNumber = 0;
   for (var i = 0; i < this.editorState.passes.length; ++i) {
      var match = /pass-(\d+)/.exec(this.editorState.passes[i].id);
      if (match)
         maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
   }
   return "pass-" + (maxNumber + 1);
};

AstroColorMixerPOC8Dialog.prototype.makeNextPassName = function() {
   var maxLabel = 1;
   for (var i = 0; i < this.editorState.passes.length; ++i) {
      var match = /^Pass\s+(\d+)/.exec(this.editorState.passes[i].name);
      if (match)
         maxLabel = Math.max(maxLabel, parseInt(match[1], 10));
   }
   return "Pass " + (maxLabel + 1);
};

AstroColorMixerPOC8Dialog.prototype.canCreateAdditionalPass = function(showWarning) {
   if (this.editorState.passes.length < ACM_MAX_REFINEMENT_PASSES)
      return true;
   if (showWarning)
      showMessage("Astro Color Mixer is limited to " + ACM_MAX_REFINEMENT_PASSES + " passes for layout stability and preview performance.", this.windowTitle, StdIcon_Information);
   return false;
};

AstroColorMixerPOC8Dialog.prototype.createNewPass = function() {
   if (!this.canCreateAdditionalPass(true))
      return;
   var pass = acmCreateDefaultPass(this.makeNextPassId(), this.makeNextPassName());
   this.editorState.passes.push(pass);
   this.editorState.activePassId = pass.id;
   this.refreshFromState();
   this.markPreviewStale();
};

AstroColorMixerPOC8Dialog.prototype.duplicateActivePass = function() {
   if (!this.canCreateAdditionalPass(true))
      return;
   var activePass = this.getActivePassState();
   var clone = acmClonePass(activePass, this.makeNextPassId(), "Copy of " + activePass.name);
   clone.enabled = true;
   this.editorState.passes.push(clone);
   this.editorState.activePassId = clone.id;
   this.refreshFromState();
   this.markPreviewStale();
};

AstroColorMixerPOC8Dialog.prototype.deleteActivePass = function() {
   var activePass = this.getActivePassState();
   if (activePass.id === "pass-1") {
      showMessage("Base Pass cannot be deleted.", this.windowTitle, StdIcon_Warning);
      return;
   }
   if ((new MessageBox("Delete refinement pass \"" + activePass.name + "\"?", this.windowTitle, StdIcon_Warning, StdButton_Yes, StdButton_No)).execute() !== StdButton_Yes)
      return;
   var index = 0;
   for (var i = 0; i < this.editorState.passes.length; ++i)
      if (this.editorState.passes[i].id === activePass.id)
         index = i;
   this.editorState.passes.splice(index, 1);
   if (index >= this.editorState.passes.length)
      index = this.editorState.passes.length - 1;
   this.editorState.activePassId = this.editorState.passes[Math.max(0, index)].id;
   this.refreshFromState();
   this.markPreviewStale();
};

AstroColorMixerPOC8Dialog.prototype.promptRangeMaskOnActivePass = function() {
   var result = new MessageBox(
      "This pass already has active adjustments.\n\nUse Yes to limit the current pass,\nNo to start a new refinement pass for targeted work,\nor Cancel to leave Range Mask off.",
      "Range Mask on an active pass",
      StdIcon_Question,
      StdButton_Yes,
      StdButton_No,
      StdButton_Cancel
   ).execute();
   if (result === StdButton_Yes)
      return "current";
   if (result === StdButton_No)
      return "new";
   return "cancel";
};

AstroColorMixerPOC8Dialog.prototype.createRangeMaskPassFromPrompt = function(presetName) {
   if (!this.canCreateAdditionalPass(true))
      return;
   var currentPass = this.getActivePassState();
   var pass = acmCreateDefaultPass(this.makeNextPassId(), this.makeNextPassName() + ": Range Mask");
   pass.rangeMask.enabled = true;
   pass.rangeMask.low = currentPass.rangeMask.low;
   pass.rangeMask.high = currentPass.rangeMask.high;
   pass.rangeMask.feather = currentPass.rangeMask.feather;
   pass.rangeMask.preset = presetName || "Custom";
   pass.rangeMask.maskSoftenRadius = acmGetMaskSoftenRadius({ radius: currentPass.rangeMask.maskSoftenRadius });
   pass.rangeMask.boostEnabled = acmRangeMaskBoostEnabled(currentPass.rangeMask);
   this.editorState.passes.push(pass);
   this.editorState.activePassId = pass.id;
   this.refreshFromState();
   this.markPreviewStale();
};

AstroColorMixerPOC8Dialog.prototype.getBandById = function(bandId) {
   var activePass = this.getActivePassState();
   for (var i = 0; i < activePass.bands.length; ++i)
      if (activePass.bands[i].id === bandId)
         return activePass.bands[i];
   return null;
};

AstroColorMixerPOC8Dialog.prototype.getSelectedBand = function() {
   return this.getBandById(this.getActivePassState().selectedBandId || "red");
};

AstroColorMixerPOC8Dialog.prototype.getHighlightedRowId = function() {
   return this.highlightedRowId || (this.getActivePassState().selectedBandId || "red");
};

AstroColorMixerPOC8Dialog.prototype.setHighlightedRowId = function(rowId) {
   this.highlightedRowId = rowId || (this.getActivePassState().selectedBandId || "red");
   if (this.neutralFieldRow && this.neutralFieldRow.field)
      this.neutralFieldRow.field.update();
   for (var i = 0; i < this.bandControls.length; ++i)
      if (this.bandControls[i].fieldRow && this.bandControls[i].fieldRow.field)
         this.bandControls[i].fieldRow.field.update();
};

AstroColorMixerPOC8Dialog.prototype.updateActiveStatus = function() {
   this.activeStatus = getActiveImageStatus(this.targetViewId);
   this.activeStatusLabel.text = this.activeStatus.warning
      ? "<color=#ffb0b0>" + this.activeStatus.message + "</color>"
      : this.activeStatus.message;
   this.applyButton.enabled = !!(this.activeStatus && this.activeStatus.ok);
   this.updatePreviewButton.enabled = !!(this.activeStatus && this.activeStatus.ok);
   if (this.applyToTargetButton)
      this.applyToTargetButton.enabled = !!(this.activeStatus && this.activeStatus.ok) && !this.currentPreviewModeIsMask();
   this.refreshTargetMaskStatus();
};

AstroColorMixerPOC8Dialog.prototype.refreshTargetMaskStatus = function() {
   if (!this.targetApplyMaskStatusLabel)
      return;
   if (!(this.activeStatus && this.activeStatus.ok) || !this.sourceView || !this.sourceView.viewId) {
      this.targetApplyMaskStatus = {
         assigned: false,
         enabled: false,
         inverted: false,
         respected: false,
         values: null,
         message: "Target Mask: none"
      };
      this.targetApplyMaskStatusLabel.text = this.targetApplyMaskStatus.message;
      return;
   }
   var targetInfo = acmFindViewForViewId(this.sourceView.viewId);
   if (!targetInfo || !targetInfo.window || !targetInfo.view || targetInfo.view.isNull || !targetInfo.view.image) {
      this.targetApplyMaskStatus = {
         assigned: false,
         enabled: false,
         inverted: false,
         respected: false,
         values: null,
         message: "Target Mask: unavailable"
      };
      this.targetApplyMaskStatusLabel.text = this.targetApplyMaskStatus.message;
      return;
   }
   this.targetApplyMaskStatus = acmReadMaskState(targetInfo.window, targetInfo.view.image.width, targetInfo.view.image.height);
   this.targetApplyMaskStatusLabel.text = this.targetApplyMaskStatus.message;
};

AstroColorMixerPOC8Dialog.prototype.refreshActiveSource = function() {
   this.refreshAvailableTargets(false);
   if (!(this.availableTargets instanceof Array) || !this.availableTargets.length) {
      this.updateActiveStatus();
      this.previewSource = null;
      this.previewLuminanceValues = null;
      this.previewSourceHsl = null;
      this.previewOriginalRgb = null;
      this.previewAdjustedRgb = null;
      this.previewInfluenceStats = null;
      this.previewBitmapOriginal = null;
      this.previewBitmapAdjusted = null;
      this.previewBitmapDifference = null;
      this.previewHost.update();
      this.previewStatusLabel.text = "Preview failed: no target RGB image";
      return;
   }
   if (!this.targetViewId || !acmFindViewForViewId(this.targetViewId))
      this.targetViewId = this.availableTargets[0].viewId;
   this.loadTargetByViewId(this.targetViewId, true, "Target image refreshed: " + this.targetViewId);
   this.restoreTargetComboSelection();
   this.previewStatusLabel.text = "Preview stale";
};

AstroColorMixerPOC8Dialog.prototype.clampBandValuesForSensitivity = function() {
   var range = ACM_SENSITIVITY_RANGES[this.editorState.sensitivity] || ACM_SENSITIVITY_RANGES.Normal;
   for (var passIndex = 0; passIndex < this.editorState.passes.length; ++passIndex) {
      for (var i = 0; i < this.editorState.passes[passIndex].bands.length; ++i) {
         var band = this.editorState.passes[passIndex].bands[i];
         band.hueShift = acmClamp(band.hueShift, -range.hueShift, range.hueShift);
         band.saturation = acmClamp(band.saturation, -range.saturation, range.saturation);
         band.luminance = acmClamp(band.luminance, -range.luminance, range.luminance);
      }
      this.editorState.passes[passIndex].neutralLuminance.luminance = acmClamp(
         this.editorState.passes[passIndex].neutralLuminance.luminance,
         -acmNeutralRangeForSensitivity(this.editorState.sensitivity),
         acmNeutralRangeForSensitivity(this.editorState.sensitivity)
      );
   }
};

AstroColorMixerPOC8Dialog.prototype.setActiveTab = function(tabKey) {
   this.activeTab = tabKey;
   this.refreshBandControls();
};

AstroColorMixerPOC8Dialog.prototype.refreshToolTabButtons = function() {
   var selectedActive = this.activeToolPanel === "selectedBand";
   var rangeActive = this.activeToolPanel === "rangeMask";
   this.toolSelectedBandButton.enabled = true;
   this.toolSelectedBandButton.backgroundColor = selectedActive ? 0xffffc43a : 0xffeeeeee;
   this.toolSelectedBandButton.foregroundColor = 0xff101010;
   this.toolSelectedBandButton.textColor = 0xff101010;
   this.toolRangeMaskButton.enabled = true;
   this.toolRangeMaskButton.backgroundColor = rangeActive ? 0xffffc43a : 0xffeeeeee;
   this.toolRangeMaskButton.foregroundColor = 0xff101010;
   this.toolRangeMaskButton.textColor = 0xff101010;
};

AstroColorMixerPOC8Dialog.prototype.setActiveToolPanel = function(panelKey) {
   this.activeToolPanel = panelKey;
   var selectedVisible = panelKey === "selectedBand";
   var rangeVisible = panelKey === "rangeMask";
   this.selectedBandPanel.visible = selectedVisible;
   this.rangeMaskPanel.visible = rangeVisible;
   if (selectedVisible)
      this.selectedBandPanel.show();
   else
      this.selectedBandPanel.hide();
   if (rangeVisible)
      this.rangeMaskPanel.show();
   else
      this.rangeMaskPanel.hide();
   this.diagnosticsPanel.visible = true;
   this.previewOutputPanel.visible = true;
   this.refreshToolTabButtons();
   this.refreshLeftPanelLayout(this.layoutMode === "compact");
   this.update();
};

AstroColorMixerPOC8Dialog.prototype.refreshSelectedBandReadoutAndVisualization = function(updateText) {
   if (updateText == null)
      updateText = !this.deferSelectedBandTextUpdates;
   var selectedBand = this.getSelectedBand();
   var neutralActive = this.activeTab === ACM_TAB_LUM && this.getHighlightedRowId && this.getHighlightedRowId() === "neutral";
   var effectiveRange = acmComputeSelectedBandRange(selectedBand.center, selectedBand.width);
   if (updateText) {
      var compactWindows = ACM_HOST_IS_WINDOWS;
      if (neutralActive) {
         this.selectedBandHelpLabel.text = acmThemeRichText("Neutral / Low-Saturation is selected by low chroma, not hue angle. Feather softens the transition into more saturated color.", ACM_GRAY_UI_THEME.muted, false);
         if (this.selectedBandReadoutPrimary)
            acmPlainLightLabel(this.selectedBandReadoutPrimary, compactWindows ? "Selection: Low sat  Radius: n/a" : "Selection: Low-saturation  Hue Radius: Not used");
         if (this.selectedBandReadoutSecondary)
            acmPlainLightLabel(this.selectedBandReadoutSecondary, compactWindows ? "Feather " + selectedBand.feather.toFixed(2) : "Feather: " + selectedBand.feather.toFixed(2));
      } else {
         var outerWidth = selectedBand.width;
         var innerWidth = selectedBand.feather <= ACM_EPSILON ? outerWidth : outerWidth * (1 - selectedBand.feather);
         innerWidth = acmClamp(innerWidth, 0, outerWidth);
         this.selectedBandHelpLabel.text = acmThemeRichText("Hue Radius sets the outer limit on each side of the hue center. Feather controls how quickly the selection falls from the strong core to that outer limit.", ACM_GRAY_UI_THEME.muted, false);
         if (this.selectedBandReadoutPrimary)
            acmPlainLightLabel(this.selectedBandReadoutPrimary, compactWindows ? ("Hue " + selectedBand.center + "°  R ±" + acmFormatAngleDegrees(outerWidth) + "°  Core ±" + acmFormatAngleDegrees(innerWidth) + "°") : ("Hue center: " + selectedBand.center + "°  Hue Radius: ±" + acmFormatAngleDegrees(outerWidth) + "°  Strong core: ±" + acmFormatAngleDegrees(innerWidth) + "°"));
         if (this.selectedBandReadoutSecondary)
            acmPlainLightLabel(this.selectedBandReadoutSecondary, compactWindows ? ("Fall " + acmFormatAngleDegrees(innerWidth) + "–" + acmFormatAngleDegrees(outerWidth) + "°  Range " + effectiveRange.low + "–" + effectiveRange.high + "°  F " + selectedBand.feather.toFixed(2)) : ("Falloff: " + acmFormatAngleDegrees(innerWidth) + "°–" + acmFormatAngleDegrees(outerWidth) + "°  Affected range: " + effectiveRange.low + "°–" + effectiveRange.high + "°  Feather: " + selectedBand.feather.toFixed(2)));
      }
   }
   this.setHighlightedRowId(this.getHighlightedRowId());
   if (this.selectedBandProfileBar)
      this.selectedBandProfileBar.update();
   if (this.selectedBandViz)
      this.selectedBandViz.update();
};

AstroColorMixerPOC8Dialog.prototype.refreshSelectedBandControls = function() {
   var selectedBand = this.getSelectedBand();
   var neutralActive = this.activeTab === ACM_TAB_LUM && this.getHighlightedRowId && this.getHighlightedRowId() === "neutral";
   var selectedIndex = 0;
   for (var i = 0; i < ACM_BAND_DEFS.length; ++i) {
      if (ACM_BAND_DEFS[i].id === selectedBand.id) {
         selectedIndex = i;
         break;
      }
   }
   this.selectedBandCombo.currentItem = selectedIndex;
   if (this.getHighlightedRowId() !== "neutral")
      this.highlightedRowId = selectedBand.id;
   this.widthControl.label.useRichText = true;
   this.widthControl.label.text = acmThemeRichText(neutralActive ? "Hue Radius: Not used" : "Hue Radius:", ACM_GRAY_UI_THEME.text, false);
   acmApplyLightText(this.widthControl.label);
   this.widthControl.enabled = !neutralActive;
   if (this.widthControl.slider)
      this.widthControl.slider.enabled = !neutralActive;
   if (this.widthControl.edit)
      this.widthControl.edit.enabled = !neutralActive;
   this.widthControl.setValue(selectedBand.width);
   this.featherControl.setValue(selectedBand.feather);
   if (this.maskSoftenCombo) {
      this.maskSoftenCombo.currentItem = acmMaskSoftenDropdownIndexForRadius(selectedBand.maskSoftenRadius);
      this.maskSoftenCombo.enabled = this.editorState.imageType === "starless" && !neutralActive;
   }
   if (this.maskSoftenLabel)
      this.maskSoftenLabel.enabled = this.editorState.imageType === "starless" && !neutralActive;
   if (this.maskSoftenStatusLabel)
      acmSetThemeLabel(this.maskSoftenStatusLabel, acmSummarizeBandMaskStatus(selectedBand, this.editorState.imageType, this.maskBoostEnabled), ACM_GRAY_UI_THEME.muted, this.maskBoostEnabled === true);
   this.refreshSelectedBandReadoutAndVisualization();
   if (this.refreshPolarInfoReadout)
      this.refreshPolarInfoReadout();
};

AstroColorMixerPOC8Dialog.prototype.applyRangeMaskPreset = function(presetName) {
   var preset = acmFindRangeMaskPreset(presetName) || acmFindRangeMaskPreset("All");
   var pass = this.getActivePassState();
   pass.rangeMask.enabled = preset.enabled;
   pass.rangeMask.low = preset.low;
   pass.rangeMask.high = preset.high;
   pass.rangeMask.feather = preset.feather;
   pass.rangeMask.preset = preset.name;
   this.refreshRangeMaskControls();
};

AstroColorMixerPOC8Dialog.prototype.updateRangeMaskPresetFromCustomValues = function() {
   var rangeMask = this.getActivePassState().rangeMask;
   var defs = acmGetRangeMaskPresetDefs();
   for (var i = 0; i < defs.length; ++i) {
      var def = defs[i];
      if (
         rangeMask.enabled === def.enabled &&
         Math.abs(rangeMask.low - def.low) < 0.0005 &&
         Math.abs(rangeMask.high - def.high) < 0.0005 &&
         Math.abs(rangeMask.feather - def.feather) < 0.0005
      ) {
         rangeMask.preset = def.name;
         return;
      }
   }
   if (!rangeMask.enabled)
      rangeMask.preset = "All";
   else
      rangeMask.preset = "Custom";
};

AstroColorMixerPOC8Dialog.prototype.refreshRangeMaskControls = function() {
   var rangeMask = this.getActivePassState().rangeMask;
   rangeMask.low = acmClamp(rangeMask.low, 0, 1);
   rangeMask.high = acmClamp(rangeMask.high, 0, 1);
   if (rangeMask.low > rangeMask.high)
      rangeMask.high = rangeMask.low;
   rangeMask.feather = acmClamp(rangeMask.feather, 0, 0.5);
   rangeMask.maskSoftenRadius = acmGetMaskSoftenRadius({ radius: rangeMask.maskSoftenRadius });
   rangeMask.boostEnabled = acmRangeMaskBoostEnabled(rangeMask);

   this.rangeMaskEnabledCheck.checked = rangeMask.enabled;
   var presetIndex = 0;
   for (var i = 0; i < this.rangeMaskPresetCombo.numberOfItems; ++i) {
      if (this.rangeMaskPresetCombo.itemText(i) === (rangeMask.preset || "All")) {
         presetIndex = i;
         break;
      }
   }
   this.rangeMaskPresetCombo.currentItem = presetIndex;
   this.rangeMaskLowControl.setValue(rangeMask.low);
   this.rangeMaskHighControl.setValue(rangeMask.high);
   this.rangeMaskFeatherControl.setValue(rangeMask.feather);
   if (this.rangeMaskSoftenCombo) {
      this.rangeMaskSoftenCombo.currentItem = acmMaskSoftenDropdownIndexForRadius(rangeMask.maskSoftenRadius);
      this.rangeMaskSoftenCombo.enabled = this.editorState.imageType === "starless";
   }
   if (this.rangeMaskSoftenLabel)
      this.rangeMaskSoftenLabel.enabled = this.editorState.imageType === "starless";
   if (this.rangeMaskBoostCheck)
      this.rangeMaskBoostCheck.checked = acmRangeMaskBoostEnabled(rangeMask);
   acmSetThemeLabel(this.rangeMaskStatusLabel, acmSummarizeRangeMaskStatus(rangeMask), ACM_GRAY_UI_THEME.muted, rangeMask.enabled === true || acmRangeMaskBoostEnabled(rangeMask));
   if (this.rangeMaskSoftenStatusLabel)
      this.rangeMaskSoftenStatusLabel.text = "";
   if (this.refreshPolarInfoReadout)
      this.refreshPolarInfoReadout();
};

AstroColorMixerPOC8Dialog.prototype.refreshPreviewModeButtons = function() {
   var rangeMaskEnabled = this.getActivePassState().rangeMask.enabled;
   var starMaskAvailable = this.editorState.imageType !== "starless";
   var items = [
      { id: "adjusted", label: "Adjusted" },
      { id: "original", label: "Original" },
      { id: "bandMask", label: "Current Band Mask" }
   ];
   if (rangeMaskEnabled)
      items.push({ id: "rangeMask", label: "Range Mask" });
   if (starMaskAvailable)
      items.push({ id: "starMask", label: "Star Protection Mask" });
   items.push({ id: "combinedMask", label: "Combined Mask" });
   items.push({ id: "difference", label: "Difference" });
   if (this.previewMode === "rangeMask" && !rangeMaskEnabled)
      this.previewMode = "adjusted";
   if (this.previewMode === "starMask" && !starMaskAvailable)
      this.previewMode = "adjusted";
   while (this.previewModeCombo.numberOfItems > 0)
      this.previewModeCombo.removeItem(0);
   var selectedIndex = 0;
   for (var i = 0; i < items.length; ++i) {
      this.previewModeCombo.addItem(items[i].label);
      if (items[i].id === this.previewMode)
         selectedIndex = i;
   }
   this.previewModeCombo.currentItem = selectedIndex;
   this.refreshCompareModeControls();
   this.refreshOutputButtons();
   this.refreshViewportControls();
};

AstroColorMixerPOC8Dialog.prototype.refreshCompareModeControls = function() {
   var hasLastPass = this.hasLastPassCompareAvailable();
   if (!hasLastPass && this.compareMode === "lastPass")
      this.compareMode = "auto";
   if (this.compareModeCombo) {
      this.compareModeCombo.currentItem =
         this.compareMode === "original" ? 1 :
         this.compareMode === "lastPass" ? 2 : 0;
      this.compareModeCombo.toolTip = hasLastPass
         ? "Auto chooses the most useful compare reference. Original uses the loaded source. Last Pass compares against the result before the active pass."
         : "Auto chooses the most useful compare reference. Original uses the loaded source. Last Pass becomes available when a previous enabled pass exists.";
   }
};

AstroColorMixerPOC8Dialog.prototype.getPreviousEnabledPassIndex = function() {
   var activeIndex = -1;
   for (var i = 0; i < this.editorState.passes.length; ++i)
      if (this.editorState.passes[i].id === this.editorState.activePassId)
         activeIndex = i;
   if (activeIndex <= 0)
      return -1;
   for (var j = activeIndex - 1; j >= 0; --j)
      if (this.editorState.passes[j].enabled !== false)
         return j;
   return -1;
};

AstroColorMixerPOC8Dialog.prototype.hasLastPassCompareAvailable = function() {
   return this.getPreviousEnabledPassIndex() >= 0;
};

AstroColorMixerPOC8Dialog.prototype.buildDetailCompareReference = function(mode) {
   if (!this.shouldUseDetailCropPreview() || !this.sourceView || !this.sourceView.viewId || !this.previewSource)
      return null;
   var cropRequest = this.getDetailCropRequest();
   if (!cropRequest)
      return null;
   if (cropRequest.width * cropRequest.height > this.previewDetailMaxPixels)
      return null;
   var targetInfo = acmFindViewForViewId(this.sourceView.viewId);
   if (!targetInfo || !targetInfo.view)
      return null;

   var crop = acmReadRgbCropFromView(targetInfo.view, cropRequest);
   var rgb = crop.rgb;
   var label = mode === "lastPass" ? "Last Pass" : "Original";
   if (mode === "lastPass") {
      var previousIndex = this.getPreviousEnabledPassIndex();
      if (previousIndex < 0)
         return null;
      var tempState = {
         version: this.editorState.version,
         imageType: this.editorState.imageType,
         sensitivity: this.editorState.sensitivity,
         globalStrength: this.editorState.globalStrength,
         activePassId: this.editorState.passes[previousIndex].id,
         passes: this.editorState.passes.slice(0, previousIndex + 1)
      };
      rgb = applyAstroColorMixerPasses(crop.rgb, crop.width, crop.height, acmBuildRecipeFromEditorState(tempState)).rgb;
   }

   return {
      mode: mode,
      label: label,
      rgb: rgb,
      bitmap: acmRenderBitmapFromRgb(crop.width, crop.height, rgb),
      metrics: {
         width: crop.width,
         height: crop.height,
         sourceX0: crop.x0,
         sourceY0: crop.y0,
         sourceWidth: crop.width,
         sourceHeight: crop.height,
         fullWidth: this.sourceView.width,
         fullHeight: this.sourceView.height
      }
   };
};

AstroColorMixerPOC8Dialog.prototype.buildLastPassPreviewReference = function() {
   var previousIndex = this.getPreviousEnabledPassIndex();
   if (previousIndex < 0 || !this.previewSource)
      return null;
   var tempState = {
      version: this.editorState.version,
      imageType: this.editorState.imageType,
      sensitivity: this.editorState.sensitivity,
      globalStrength: this.editorState.globalStrength,
      protectionControls: this.editorState.protectionControls,
      activePassId: this.editorState.passes[previousIndex].id,
      passes: this.editorState.passes.slice(0, previousIndex + 1)
   };
   var result = applyAstroColorMixerPasses(this.previewSource.rgb, this.previewSource.width, this.previewSource.height, acmBuildRecipeFromEditorState(tempState));
   return {
      label: "Last Pass",
      rgb: result.rgb,
      bitmap: acmRenderBitmapFromRgb(this.previewSource.width, this.previewSource.height, result.rgb)
   };
};

AstroColorMixerPOC8Dialog.prototype.getHoldCompareReference = function() {
   if (this.compareMode === "original")
      return this.buildDetailCompareReference("original") || {
         mode: "original",
         label: "Original",
         rgb: this.previewOriginalRgb,
         bitmap: this.previewBitmapOriginal
      };
   if (this.compareMode === "lastPass" && this.previewBitmapLastPass && this.previewLastPassRgb)
      return this.buildDetailCompareReference("lastPass") || {
         mode: "lastPass",
         label: "Last Pass",
         rgb: this.previewLastPassRgb,
         bitmap: this.previewBitmapLastPass
      };
   if (this.compareMode === "lastPass") {
      var forcedLastPass = this.buildLastPassPreviewReference();
      if (forcedLastPass) {
         this.previewLastPassRgb = forcedLastPass.rgb;
         this.previewBitmapLastPass = forcedLastPass.bitmap;
         return this.buildDetailCompareReference("lastPass") || {
            mode: "lastPass",
            label: "Last Pass",
            rgb: this.previewLastPassRgb,
            bitmap: this.previewBitmapLastPass
         };
      }
   }
   if (this.previewBitmapLastPass && this.previewLastPassRgb)
      return this.buildDetailCompareReference("lastPass") || {
         mode: "lastPass",
         label: "Last Pass",
         rgb: this.previewLastPassRgb,
         bitmap: this.previewBitmapLastPass
      };
   if (this.compareMode === "auto") {
      var autoLastPass = this.buildLastPassPreviewReference();
      if (autoLastPass) {
         this.previewLastPassRgb = autoLastPass.rgb;
         this.previewBitmapLastPass = autoLastPass.bitmap;
         return this.buildDetailCompareReference("lastPass") || {
            mode: "lastPass",
            label: "Last Pass",
            rgb: this.previewLastPassRgb,
            bitmap: this.previewBitmapLastPass
         };
      }
   }
   return this.buildDetailCompareReference("original") || {
      mode: "original",
      label: "Original",
      rgb: this.previewOriginalRgb,
      bitmap: this.previewBitmapOriginal
   };
};

AstroColorMixerPOC8Dialog.prototype.refreshOutputButtons = function() {
   if (this.currentPreviewModeIsMask()) {
      if (this.previewMode === "rangeMask")
         this.applyButton.text = "Save Range Mask";
      else if (this.previewMode === "combinedMask")
         this.applyButton.text = "Save Combined";
      else if (this.previewMode === "starMask")
         this.applyButton.text = "Save Star Mask";
      else
         this.applyButton.text = "Save Band Mask";
      this.maskBoostSyncing = true;
      if (this.bandMaskBoostCheck)
         this.bandMaskBoostCheck.checked = this.maskBoostEnabled;
      this.maskBoostSyncing = false;
      if (this.applyToTargetButton)
         this.applyToTargetButton.enabled = false;
   } else {
      this.applyButton.text = "Create Image";
      this.maskBoostSyncing = true;
      if (this.bandMaskBoostCheck)
         this.bandMaskBoostCheck.checked = this.maskBoostEnabled;
      this.maskBoostSyncing = false;
      if (this.applyToTargetButton)
         this.applyToTargetButton.enabled = !!(this.activeStatus && this.activeStatus.ok);
   }
};

AstroColorMixerPOC8Dialog.prototype.handlePrimaryOutputAction = function() {
   if (this.currentPreviewModeIsMask())
      this.exportCurrentMask();
   else
      this.applyRecipe();
};

AstroColorMixerPOC8Dialog.prototype.currentPreviewModeIsMask = function() {
   return this.previewMode === "bandMask" || this.previewMode === "rangeMask" || this.previewMode === "combinedMask" || this.previewMode === "starMask";
};

AstroColorMixerPOC8Dialog.prototype.invalidateMaskPreviewCaches = function() {
   this.previewBandMaskRgb = null;
   this.previewRangeMaskRgb = null;
   this.previewCombinedMaskRgb = null;
   this.previewStarMaskRgb = null;
   this.previewBitmapBandMask = null;
   this.previewBitmapRangeMask = null;
   this.previewBitmapCombinedMask = null;
   this.previewBitmapStarMask = null;
   if (this.previewDetailCache) {
      this.previewDetailCache.bandMaskRgb = null;
      this.previewDetailCache.rangeMaskRgb = null;
      this.previewDetailCache.combinedMaskRgb = null;
      this.previewDetailCache.starMaskRgb = null;
      this.previewDetailCache.bandMaskBitmap = null;
      this.previewDetailCache.rangeMaskBitmap = null;
      this.previewDetailCache.combinedMaskBitmap = null;
      this.previewDetailCache.starMaskBitmap = null;
   }
   if (this.previewHost)
      this.previewHost.update();
};

AstroColorMixerPOC8Dialog.prototype.markPreviewStale = function() {
   this.previewIsStale = true;
   this.previewDetailCache = null;
   ++this.previewDetailStamp;
   this.invalidatePreviewChangeStats();
   this.syncPendingChangesIndicator();
   this.refreshPassSummary();
   this.updatePassViewerSummaries();
   this.previewStatusLabel.text = this.previewMode === "original" ? "Preview: Original · Adjusted stale" : "Preview stale — click Update Preview";
   this.refreshPolarInfoReadout();
   if (this.autoPreviewCheck.checked)
      this.requestPreviewUpdate();
};

AstroColorMixerPOC8Dialog.prototype.markPreviewStaleWithoutAutoPreview = function(statusText) {
   this.previewIsStale = true;
   this.invalidatePreviewChangeStats();
   this.syncPendingChangesIndicator();
   this.refreshPassSummary();
   this.updatePassViewerSummaries();
   this.previewStatusLabel.text = statusText || "Adjusted preview stale";
   this.refreshPolarInfoReadout();
};

AstroColorMixerPOC8Dialog.prototype.markPreviewStaleForMaskControl = function(maskLabel) {
   if (this.currentPreviewModeIsMask()) {
      this.markPreviewStaleWithoutAutoPreview("Preview: " + (maskLabel || "Mask") + " current · Adjusted stale");
      return;
   }
   this.markPreviewStale();
};

AstroColorMixerPOC8Dialog.prototype.requestPreviewUpdate = function(immediate) {
   if (!this.autoPreviewCheck.checked && !immediate)
      return;
   if (this.previewSliderInteraction && !immediate)
      return;
   if (this.previewDetailDebounceTimer)
      this.previewDetailDebounceTimer.stop();
   if (this.previewDebounceTimer && !immediate) {
      this.previewRenderPending = true;
      this.previewDebounceTimer.stop();
      this.previewDebounceTimer.start();
      return;
   }
   this.renderPreview();
};

AstroColorMixerPOC8Dialog.prototype.refreshPreviewDisplay = function() {
   if (!this.getCurrentPreviewBitmap())
      return;
   this.previewHost.update();
   if (this.previewTempCompare)
      this.previewStatusLabel.text = "Preview compare: " + (this.previewCompareLabel || "Original") + " — release to return";
   else if (this.shouldUseDetailCropPreview()) {
      if (this.previewDetailCache && this.previewDetailCache.fallbackToFast)
         this.previewStatusLabel.text = "Preview: Fast fallback — detail region too large";
      else if (this.previewIsStale)
         this.previewStatusLabel.text = "Preview: Detail Crop pending";
      else if (this.previewMode === "difference")
         this.previewStatusLabel.text = "Preview: Difference · 5x display gain · Detail Crop";
      else
         this.previewStatusLabel.text = this.previewMode === "original" ? "Preview: Original · Detail Crop" : "Preview: Detail Crop";
   } else if (this.previewMode === "original")
      this.previewStatusLabel.text = this.previewIsStale ? "Preview: Original · Adjusted stale" : "Preview: Original · Fast";
   else if (this.previewMode === "difference")
      this.previewStatusLabel.text = this.previewIsStale ? "Preview stale — click Update Preview" : "Preview: Difference · 5x display gain";
   else
      this.previewStatusLabel.text = this.previewIsStale ? "Preview stale — click Update Preview" : "Preview: Fast";
   this.refreshDiagnosticsData();
};

AstroColorMixerPOC8Dialog.prototype.getDiagnosticsRgb = function() {
   if (this.previewTempCompare && this.previewCompareRgb)
      return this.previewCompareRgb;
   if (this.shouldUseDetailCropPreview() && this.previewDetailCache) {
      if (this.previewTempOriginal && this.previewDetailCache.originalRgb)
         return this.previewDetailCache.originalRgb;
      if (this.previewMode === "adjusted" && this.previewDetailCache.adjustedRgb)
         return this.previewDetailCache.adjustedRgb;
      if (this.previewMode === "difference" && this.previewDetailCache.adjustedRgb)
         return this.previewDetailCache.adjustedRgb;
      if (this.previewMode === "original" && this.previewDetailCache.originalRgb)
         return this.previewDetailCache.originalRgb;
      if (this.previewMode === "bandMask")
         this.ensureDetailPreviewMaskCache();
      if (this.previewMode === "bandMask" && this.previewDetailCache.bandMaskRgb)
         return this.previewDetailCache.bandMaskRgb;
      if (this.previewMode === "rangeMask")
         this.ensureDetailPreviewMaskCache();
      if (this.previewMode === "rangeMask" && this.previewDetailCache.rangeMaskRgb)
         return this.previewDetailCache.rangeMaskRgb;
      if (this.previewMode === "combinedMask")
         this.ensureDetailPreviewMaskCache();
      if (this.previewMode === "combinedMask" && this.previewDetailCache.combinedMaskRgb)
         return this.previewDetailCache.combinedMaskRgb;
      if (this.previewMode === "starMask")
         this.ensureDetailPreviewMaskCache();
      if (this.previewMode === "starMask" && this.previewDetailCache.starMaskRgb)
         return this.previewDetailCache.starMaskRgb;
   }
   if (this.previewMode === "adjusted" && this.previewAdjustedRgb)
      return this.previewAdjustedRgb;
   if (this.previewMode === "difference" && this.previewAdjustedRgb)
      return this.previewAdjustedRgb;
   if (this.previewMode === "bandMask")
      this.ensurePreviewMaskCache();
   if (this.previewMode === "bandMask" && this.previewBandMaskRgb)
      return this.previewBandMaskRgb;
   if (this.previewMode === "rangeMask")
      this.ensurePreviewMaskCache();
   if (this.previewMode === "rangeMask" && this.previewRangeMaskRgb)
      return this.previewRangeMaskRgb;
   if (this.previewMode === "combinedMask")
      this.ensurePreviewMaskCache();
   if (this.previewMode === "combinedMask" && this.previewCombinedMaskRgb)
      return this.previewCombinedMaskRgb;
   if (this.previewMode === "starMask")
      this.ensurePreviewMaskCache();
   if (this.previewMode === "starMask" && this.previewStarMaskRgb)
      return this.previewStarMaskRgb;
   return this.previewOriginalRgb;
};

AstroColorMixerPOC8Dialog.prototype.invalidatePreviewChangeStats = function() {
   ++this.previewChangeStatsStamp;
   this.previewChangeStats = null;
   if (this.previewChangeStatsTimer)
      this.previewChangeStatsTimer.stop();
};

AstroColorMixerPOC8Dialog.prototype.schedulePreviewChangeStats = function() {
   if (!this.previewChangeStatsTimer || !this.previewOriginalRgb || !this.previewAdjustedRgb)
      return;
   ++this.previewChangeStatsStamp;
   this.previewChangeStatsPendingStamp = this.previewChangeStatsStamp;
   this.previewChangeStats = { state: "pending" };
   this.refreshPolarInfoReadout();
   this.previewChangeStatsTimer.stop();
   this.previewChangeStatsTimer.start();
};

AstroColorMixerPOC8Dialog.prototype.computeDeferredPreviewChangeStats = function() {
   if (this.previewIsStale || this.previewRenderInProgress)
      return;
   if (this.previewChangeStatsPendingStamp !== this.previewChangeStatsStamp)
      return;
   var stamp = this.previewChangeStatsPendingStamp;
   var stats = acmComputePreviewChangeStats(this.previewOriginalRgb, this.previewAdjustedRgb, this.previewWidth, this.previewHeight);
   if (stamp !== this.previewChangeStatsStamp)
      return;
   this.previewChangeStats = stats;
   this.refreshPolarInfoReadout();
   this.refreshCompactDiagnosticsStrip();
};

AstroColorMixerPOC8Dialog.prototype.refreshPolarInfoReadout = function() {
   if (!this.polarInfoLabel || !this.editorState)
      return;
   var band = this.getSelectedBand ? this.getSelectedBand() : null;
   var neutralActive = this.activeTab === ACM_TAB_LUM && this.getHighlightedRowId && this.getHighlightedRowId() === "neutral";
   var activePass = this.getActivePassState ? this.getActivePassState() : null;
   var rangeMask = activePass ? activePass.rangeMask : null;
   this.polarInfoLabel.useRichText = true;
   this.polarInfoLabel.text = acmFormatPolarInfoHtml(this.probeData, band, rangeMask, neutralActive, this.previewChangeStats);
   this.polarInfoLabel.update();
};

AstroColorMixerPOC8Dialog.prototype.refreshHistogramRangeMaskOverlay = function() {
   var rangeMaskState = this.getActivePassState ? this.getActivePassState().rangeMask : null;
   if (this.histogramData)
      this.histogramData.rangeMaskState = rangeMaskState || null;
   acmSetThemeLabel(
      this.histogramSubtitleLabel,
      acmHistogramSubtitleText(!!(rangeMaskState && rangeMaskState.enabled)),
      ACM_GRAY_UI_THEME.muted,
      false
   );
   acmSetThemeLabel(
      this.histogramRampLabel,
      rangeMaskState && rangeMaskState.enabled ? "Gray level ramp · Range Mask markers" : "Gray level ramp 0.0–1.0",
      ACM_GRAY_UI_THEME.muted,
      false
   );
   if (this.probeData)
      this.probeReadoutLabel.text = acmFormatProbeDiagnostics(this.probeData, rangeMaskState);
   else
      this.probeReadoutLabel.text = acmFormatProbeDiagnostics(null, rangeMaskState);
   this.refreshPolarInfoReadout();
   if (this.histogramControl)
      this.histogramControl.update();
   if (this.histogramRampControl)
      this.histogramRampControl.update();
   this.refreshCompactDiagnosticsStrip();
};

AstroColorMixerPOC8Dialog.prototype.ensurePreviewSourceHsl = function() {
   if (!this.previewSource || !this.previewSource.rgb)
      return null;
   var expectedLength = this.previewSource.width * this.previewSource.height;
   if (!this.previewSourceHsl || !this.previewSourceHsl.h || this.previewSourceHsl.h.length !== expectedLength)
      this.previewSourceHsl = acmApplySourceHsl(this.previewSource.rgb, this.previewSource.width, this.previewSource.height);
   return this.previewSourceHsl;
};

AstroColorMixerPOC8Dialog.prototype.refreshSelectedBandMaskPreviewIfActive = function() {
   if (this.previewMode !== "bandMask" && this.previewMode !== "combinedMask")
      return;
   var activePass = this.getActivePassState ? this.getActivePassState() : null;
   if (!activePass)
      return;

   if (this.previewMode === "combinedMask") {
      this.invalidateMaskPreviewCaches();
      this.getCurrentPreviewBitmap();
      if (this.previewHost)
         this.previewHost.update();
      return;
   }

   if (this.shouldUseDetailCropPreview() && this.previewDetailCache && this.previewDetailCache.originalRgb && !this.previewDetailCache.fallbackToFast) {
      var detailMask = acmComputeSelectedBandMaskData(
         this.previewDetailCache.originalRgb,
         this.previewDetailCache.width,
         this.previewDetailCache.height,
         activePass,
         this.editorState.imageType,
         "bandMask",
         this.editorState.protectionControls
      );
      if (this.maskBoostEnabled)
         detailMask = acmBoostMaskValues(detailMask);
      var detailRgb = new Float32Array(this.previewDetailCache.width * this.previewDetailCache.height * 3);
      for (var d = 0; d < detailMask.length; ++d) {
         var detailBase = d * 3;
         var detailValue = detailMask[d];
         detailRgb[detailBase] = detailRgb[detailBase + 1] = detailRgb[detailBase + 2] = detailValue;
      }
      this.previewDetailCache.bandMaskRgb = detailRgb;
      this.previewDetailCache.bandMaskBitmap = acmRenderGrayBitmapFromMask(this.previewDetailCache.width, this.previewDetailCache.height, detailMask);
   } else if (this.previewSource && this.previewSource.rgb) {
      var sourceHsl = this.ensurePreviewSourceHsl();
      var bandMask = acmComputeSelectedBandMaskData(
         this.previewSource.rgb,
         this.previewSource.width,
         this.previewSource.height,
         activePass,
         this.editorState.imageType,
         "bandMask",
         this.editorState.protectionControls,
         sourceHsl
      );
      if (this.maskBoostEnabled)
         bandMask = acmBoostMaskValues(bandMask);
      this.previewBandMaskRgb = new Float32Array(this.previewSource.width * this.previewSource.height * 3);
      for (var i = 0; i < bandMask.length; ++i) {
         var base = i * 3;
         var v = bandMask[i];
         this.previewBandMaskRgb[base] = this.previewBandMaskRgb[base + 1] = this.previewBandMaskRgb[base + 2] = v;
      }
      this.previewBitmapBandMask = acmRenderGrayBitmapFromMask(this.previewSource.width, this.previewSource.height, bandMask);
   }

   if (this.previewHost)
      this.previewHost.update();
};

AstroColorMixerPOC8Dialog.prototype.refreshRangeMaskPreviewIfActive = function() {
   if (this.previewMode !== "rangeMask" && this.previewMode !== "combinedMask")
      return;
   var rangeMaskState = this.getActivePassState ? this.getActivePassState().rangeMask : null;
   if (!rangeMaskState)
      return;

   if (this.previewMode === "combinedMask") {
      this.invalidateMaskPreviewCaches();
      this.getCurrentPreviewBitmap();
      if (this.previewHost)
         this.previewHost.update();
      return;
   }

   if (this.shouldUseDetailCropPreview() && this.previewDetailCache && this.previewDetailCache.originalRgb && !this.previewDetailCache.fallbackToFast) {
      var detailLum = acmComputeLuminanceValues(this.previewDetailCache.originalRgb, this.previewDetailCache.width, this.previewDetailCache.height);
      var detailMask = acmBuildRangeMaskValues(
         detailLum,
         this.previewDetailCache.width,
         this.previewDetailCache.height,
         rangeMaskState,
         this.editorState.imageType === "starless" ? { radius: rangeMaskState.maskSoftenRadius } : null
      );
      var detailRgb = new Float32Array(this.previewDetailCache.width * this.previewDetailCache.height * 3);
      for (var d = 0; d < detailMask.length; ++d) {
         var detailBase = d * 3;
         var detailValue = detailMask[d];
         detailRgb[detailBase] = detailRgb[detailBase + 1] = detailRgb[detailBase + 2] = detailValue;
      }
      this.previewDetailCache.rangeMaskRgb = detailRgb;
      this.previewDetailCache.rangeMaskBitmap = acmRenderGrayBitmapFromMask(this.previewDetailCache.width, this.previewDetailCache.height, detailMask);
   } else if (this.previewSource && this.previewLuminanceValues) {
      var maskValues = acmBuildRangeMaskValues(
         this.previewLuminanceValues,
         this.previewSource.width,
         this.previewSource.height,
         rangeMaskState,
         this.editorState.imageType === "starless" ? { radius: rangeMaskState.maskSoftenRadius } : null
      );
      this.previewRangeMaskRgb = new Float32Array(this.previewSource.width * this.previewSource.height * 3);
      for (var i = 0; i < maskValues.length; ++i) {
         var base = i * 3;
         var v = maskValues[i];
         this.previewRangeMaskRgb[base] = this.previewRangeMaskRgb[base + 1] = this.previewRangeMaskRgb[base + 2] = v;
      }
      this.previewBitmapRangeMask = acmRenderGrayBitmapFromMask(this.previewSource.width, this.previewSource.height, maskValues);
   }

   if (this.previewHost)
      this.previewHost.update();
};

AstroColorMixerPOC8Dialog.prototype.refreshDiagnosticsData = function() {
   var rgb = this.getDiagnosticsRgb();
   var metrics = this.getCurrentPreviewMetrics();
   if (!rgb || !metrics.width || !metrics.height) {
      var emptyRangeMaskState = this.getActivePassState().rangeMask;
      this.histogramData = null;
      this.polarSamples = [];
      this.probeReadoutLabel.text = acmFormatProbeDiagnostics(null, emptyRangeMaskState);
      this.refreshPolarInfoReadout();
      this.histogramControl.update();
      this.polarControl.update();
      if (this.selectedBandViz)
         this.selectedBandViz.update();
      return;
   }

   var rangeMaskState = this.getActivePassState().rangeMask;
   acmSetThemeLabel(
      this.histogramSubtitleLabel,
      acmHistogramSubtitleText(!!(rangeMaskState && rangeMaskState.enabled)),
      ACM_GRAY_UI_THEME.muted,
      false
   );
   acmSetThemeLabel(
      this.histogramRampLabel,
      rangeMaskState && rangeMaskState.enabled ? "Gray level ramp · Range Mask markers" : "Gray level ramp 0.0–1.0",
      ACM_GRAY_UI_THEME.muted,
      false
   );
   var histogramRangeMaskState = rangeMaskState;
   var probeY = this.probeData ? this.probeData.y709 : null;
   this.histogramData = acmComputeHistogramData(rgb, metrics.width, metrics.height, 256, histogramRangeMaskState, probeY);
   this.polarSamples = acmComputePolarSamplesData(rgb, metrics.width, metrics.height, 1800);

   if (this.probeData) {
      var localX = this.probeData.sourceX != null
         ? ((this.probeData.sourceX - metrics.sourceX0) / Math.max(1, metrics.sourceWidth - 1)) * Math.max(1, metrics.width - 1)
         : this.probeData.x;
      var localY = this.probeData.sourceY != null
         ? ((this.probeData.sourceY - metrics.sourceY0) / Math.max(1, metrics.sourceHeight - 1)) * Math.max(1, metrics.height - 1)
         : this.probeData.y;
      this.probeData = acmComputeProbeData(rgb, metrics.width, metrics.height, localX, localY, rangeMaskState);
      this.probeData.sourceX = metrics.sourceX0 + (this.probeData.x / Math.max(1, metrics.width - 1)) * Math.max(1, metrics.sourceWidth - 1);
      this.probeData.sourceY = metrics.sourceY0 + (this.probeData.y / Math.max(1, metrics.height - 1)) * Math.max(1, metrics.sourceHeight - 1);
      this.probeReadoutLabel.text = acmFormatProbeDiagnostics(this.probeData, rangeMaskState);
   } else {
      this.probeReadoutLabel.text = acmFormatProbeDiagnostics(null, rangeMaskState);
   }
   this.refreshPolarInfoReadout();

   if (this.selectedBandViz)
      this.selectedBandViz.update();
   this.histogramControl.update();
   this.polarControl.update();
   this.refreshCompactDiagnosticsStrip();
};

AstroColorMixerPOC8Dialog.prototype.setProbeFromPreviewClick = function(x, y) {
   var rgb = this.getDiagnosticsRgb();
   var bmp = this.getCurrentPreviewBitmap();
   var metrics = this.getCurrentPreviewMetrics();
   if (!rgb || !bmp)
      return;
   var rect = this.getCurrentViewportRect(bmp);
   if (x < rect.x0 || x > rect.x1 || y < rect.y0 || y > rect.y1)
      return;
   var px = ((x - rect.x0) / Math.max(1, rect.x1 - rect.x0)) * (metrics.width - 1);
   var py = ((y - rect.y0) / Math.max(1, rect.y1 - rect.y0)) * (metrics.height - 1);
   this.probeData = acmComputeProbeData(rgb, metrics.width, metrics.height, px, py, this.getActivePassState().rangeMask);
   this.probeData.sourceX = metrics.sourceX0 + (this.probeData.x / Math.max(1, metrics.width - 1)) * Math.max(1, metrics.sourceWidth - 1);
   this.probeData.sourceY = metrics.sourceY0 + (this.probeData.y / Math.max(1, metrics.height - 1)) * Math.max(1, metrics.sourceHeight - 1);
   if (this.autoSelectProbeBandCheck.checked && this.probeData.reliableColor && this.probeData.nearestBand) {
      this.getActivePassState().selectedBandId = this.probeData.nearestBand.id;
      this.setHighlightedRowId(this.probeData.nearestBand.id);
      this.refreshSelectedBandControls();
      this.refreshSelectedBandMaskPreviewIfActive();
   }
   this.refreshDiagnosticsData();
   this.previewHost.update();
};

AstroColorMixerPOC8Dialog.prototype.renderDetailPreviewForCurrentViewport = function() {
   if (!this.shouldUseDetailCropPreview() || this.previewIsStale || !this.sourceView || !this.sourceView.viewId || !this.previewSource)
      return;
   var cropRequest = this.getDetailCropRequest();
   if (!cropRequest)
      return;
   if (this.previewDetailCache && this.previewDetailCache.key === cropRequest.key) {
      this.refreshPreviewDisplay();
      return;
   }

   if (cropRequest.width * cropRequest.height > this.previewDetailMaxPixels) {
      this.previewDetailCache = {
         key: cropRequest.key,
         width: this.previewSource.width,
         height: this.previewSource.height,
         sourceX0: 0,
         sourceY0: 0,
         sourceWidth: this.sourceView.width,
         sourceHeight: this.sourceView.height,
         fullWidth: this.sourceView.width,
         fullHeight: this.sourceView.height,
         fallbackToFast: true
      };
      this.previewStatusLabel.text = "Preview: Fast fallback — detail region too large";
      this.refreshPreviewDisplay();
      return;
   }

   var targetInfo = acmFindViewForViewId(this.sourceView.viewId);
   if (!targetInfo || !targetInfo.view)
      return;

   this.previewStatusLabel.text = "Preview: Detail Crop rendering...";
   var crop = acmReadRgbCropFromView(targetInfo.view, cropRequest);
   var recipe = acmBuildRecipeFromEditorState(this.editorState);
   var result = applyAstroColorMixerPasses(crop.rgb, crop.width, crop.height, recipe);

   this.previewDetailCache = {
      key: cropRequest.key,
      width: crop.width,
      height: crop.height,
      sourceX0: crop.x0,
      sourceY0: crop.y0,
      sourceWidth: crop.width,
      sourceHeight: crop.height,
      fullWidth: this.sourceView.width,
      fullHeight: this.sourceView.height,
      originalRgb: crop.rgb,
      adjustedRgb: result.rgb,
      bandMaskRgb: null,
      rangeMaskRgb: null,
      combinedMaskRgb: null,
      starMaskRgb: null,
      originalBitmap: acmRenderBitmapFromRgb(crop.width, crop.height, crop.rgb),
      adjustedBitmap: acmRenderBitmapFromRgb(crop.width, crop.height, result.rgb),
      differenceBitmap: null,
      bandMaskBitmap: null,
      rangeMaskBitmap: null,
      combinedMaskBitmap: null,
      starMaskBitmap: null
   };
   this.refreshPreviewDisplay();
};

AstroColorMixerPOC8Dialog.prototype.renderPreview = function() {
   try {
      if (this.previewRenderInProgress) {
         this.previewRenderPending = true;
         return;
      }
      this.previewRenderInProgress = true;
      if (this.previewDebounceTimer)
         this.previewDebounceTimer.stop();
      this.updateActiveStatus();
      if (!(this.activeStatus && this.activeStatus.ok))
         fail("No active RGB image is available.");

      if (!this.previewSource)
         this.refreshActiveSource();
      if (!this.previewSource)
         fail("No cached preview source is available.");

      this.previewStatusLabel.text = "Rendering preview...";
      var recipe = acmBuildRecipeFromEditorState(this.editorState);
      var result = applyAstroColorMixerPasses(this.previewSource.rgb, this.previewSource.width, this.previewSource.height, recipe);
      var lastPassPreview = this.compareMode === "lastPass" ? this.buildLastPassPreviewReference() : null;
      this.previewOriginalRgb = this.previewSource.rgb;
      this.previewAdjustedRgb = result.rgb;
      this.previewInfluenceStats = null;
      this.previewBandMaskRgb = null;
      this.previewRangeMaskRgb = null;
      this.previewCombinedMaskRgb = null;
      this.previewStarMaskRgb = null;
      this.previewBitmapOriginal = this.previewBitmapOriginal || acmRenderBitmapFromRgb(this.previewSource.width, this.previewSource.height, this.previewSource.rgb);
      this.previewBitmapAdjusted = acmRenderBitmapFromRgb(this.previewSource.width, this.previewSource.height, result.rgb);
      this.previewBitmapDifference = null;
      this.previewLastPassRgb = lastPassPreview ? lastPassPreview.rgb : null;
      this.previewBitmapLastPass = lastPassPreview ? lastPassPreview.bitmap : null;
      this.previewBitmapBandMask = null;
      this.previewBitmapRangeMask = null;
      this.previewBitmapCombinedMask = null;
      this.previewBitmapStarMask = null;
      this.previewWidth = this.previewSource.width;
      this.previewHeight = this.previewSource.height;
      this.previewDetailCache = null;
      this.previewIsStale = false;
      if (this.shouldUseDetailCropPreview())
         this.renderDetailPreviewForCurrentViewport();
      this.refreshPreviewModeButtons();
      this.refreshPreviewDisplay();
      this.schedulePreviewChangeStats();
   } catch (error) {
      var message = "Preview failed: " + (error && error.message ? error.message : String(error));
      console.criticalln(message);
      this.previewStatusLabel.text = message;
      if (!(error && error.__acmHandled))
         showMessage(message, this.windowTitle, StdIcon_Error);
   } finally {
      this.previewRenderInProgress = false;
      if (this.previewRenderPending) {
         this.previewRenderPending = false;
         if (this.autoPreviewCheck.checked && this.previewIsStale)
            this.requestPreviewUpdate();
      }
   }
};

AstroColorMixerPOC8Dialog.prototype.exportCurrentMask = function() {
   try {
      if (!this.currentPreviewModeIsMask()) {
         var maskModeHint = this.editorState.imageType === "starless"
            ? "Switch Preview Mode to Current Band Mask, Range Mask, or Combined Mask first."
            : "Switch Preview Mode to Current Band Mask, Range Mask, Star Protection Mask, or Combined Mask first.";
         showMessage(maskModeHint, this.windowTitle, StdIcon_Warning);
         return;
      }

      var suffix = this.previewMode === "bandMask"
         ? "BandMask"
         : (this.previewMode === "rangeMask"
            ? "RangeMask"
            : (this.previewMode === "starMask" ? "StarProtectionMask" : "CombinedMask"));
      var boostSuffix = this.maskBoostEnabled && this.previewMode === "bandMask" ? "_Boosted" : "";
      var activePass = this.getActivePassState();
      var bandNameSuffix = (this.previewMode === "bandMask" || this.previewMode === "combinedMask")
         ? "_" + acmMaskExportBandName(activePass)
         : "";
      var maskModeText = acmFormatMaskModeForUser(suffix) + (boostSuffix ? " boosted" : "");
      var totalStart = acmNowMs();

      this.updateActiveStatus();
      if (!(this.activeStatus && this.activeStatus.ok))
         fail("No target RGB image is available.");

      this.setOutputFeedback("Creating full-resolution " + maskModeText + " image. Please wait for the completion message; PixInsight may look busy until it finishes. See PixInsight console for timings.", "#ffb13b", true);
      acmFlushUi();

      console.noteln("Astro Color Mixer mask output started: Create " + maskModeText);
      var readStart = acmNowMs();
      var active = acmReadRgbImageForViewId(this.targetViewId || (this.activeStatus ? this.activeStatus.viewId : null));
      var readEnd = acmNowMs();
      console.writeln("Target: " + active.viewId + " (" + active.width + "x" + active.height + ")");
      console.writeln("Mask: " + maskModeText);
      console.writeln("Image type: " + acmFormatImageTypeForUser(this.editorState.imageType));
      this.logOutputTiming("Read target image", readStart, readEnd);

      var processStart = acmNowMs();
      var maskValues = acmComputeMaskValuesForPreviewMode(
         active.rgb,
         active.width,
         active.height,
         activePass,
         this.editorState.imageType,
         this.previewMode,
         this.editorState.protectionControls,
         this.maskBoostEnabled
      );
      var processEnd = acmNowMs();
      this.logOutputTiming("Build full-resolution mask", processStart, processEnd);

      var outputId = "AstroColorMixer_" + sanitizeViewId(active.viewId) + "_" + suffix + bandNameSuffix + boostSuffix;
      var writeStart = acmNowMs();
      var outputWindow = writeGrayResultImage(active.width, active.height, maskValues, outputId);
      var writeEnd = acmNowMs();
      this.logOutputTiming("Write mask image", writeStart, writeEnd);
      console.noteln("Created mask image: " + outputWindow.mainView.id);
      var totalEnd = acmNowMs();
      console.noteln("Astro Color Mixer mask output complete in " + acmFormatElapsedSeconds(totalStart, totalEnd) + ".");
      this.setOutputFeedback("Created full-resolution " + maskModeText + ": " + outputWindow.mainView.id + " (" + acmFormatElapsedSeconds(totalStart, totalEnd) + ")", "#7fe38a", true);
   } catch (error) {
      if (!(error && error.__acmHandled)) {
         var message = "Unexpected mask output failure: " + (error && error.message ? error.message : String(error));
         console.criticalln(message);
         this.setOutputFeedback(message);
         showMessage(message, this.windowTitle, StdIcon_Error);
      }
   }
};

AstroColorMixerPOC8Dialog.prototype.refreshBandControls = function() {
   var tabLabel = acmParameterLabelForTab(this.activeTab);
   var range = acmParameterRangeForTab(this.activeTab, this.editorState.sensitivity);
   this.bandSectionLabel.text = acmThemeRichText(tabLabel + " Controls", ACM_GRAY_UI_THEME.text, true);
   var activePass = this.getActivePassState();
   var compactLumRows = this.activeTab === ACM_TAB_LUM || this.layoutMode === "compact";

   if (this.bandControlsHost && this.bandControlsHost.sizer)
      this.bandControlsHost.sizer.spacing = (ACM_HOST_IS_WINDOWS && this.layoutMode !== "compact") ? 0 : (compactLumRows ? 0 : 1);
   this.neutralRowHost.visible = this.activeTab === ACM_TAB_LUM;
   if (ACM_HOST_IS_WINDOWS && this.layoutMode !== "compact" && this.neutralRowHost) {
      if (this.activeTab === ACM_TAB_LUM) {
         this.neutralRowHost.setFixedHeight(32);
         this.neutralRowHost.scaledMinHeight = 32;
      } else {
         this.neutralRowHost.setFixedHeight(0);
         this.neutralRowHost.scaledMinHeight = 0;
      }
   }
   if (this.activeTab === ACM_TAB_LUM || this.layoutMode === "compact")
      acmSetMixerFieldRowDensity(this.neutralControl, compactLumRows);
   if (ACM_HOST_IS_WINDOWS && this.layoutMode !== "compact" && this.activeTab !== ACM_TAB_LUM && this.neutralRowHost) {
      this.neutralRowHost.setFixedHeight(0);
      this.neutralRowHost.scaledMinHeight = 0;
      this.neutralRowHost.update();
   }
   if (this.activeTab === ACM_TAB_LUM) {
      var neutralRange = acmNeutralRangeForSensitivity(this.editorState.sensitivity);
      this.neutralControl.setRange(-neutralRange, neutralRange);
      this.neutralControl.setPrecision(1);
      this.neutralControl.setValue(activePass.neutralLuminance.luminance);
      this.neutralControl.setLabel("Neutral / Low-Saturation");
      this.neutralControl.setSecondaryLabel("Low-saturation luminance");
      this.neutralRowHost.update();
   }

   for (var i = 0; i < this.bandControls.length; ++i) {
      var control = this.bandControls[i];
      acmSetMixerFieldRowDensity(control.fieldRow, compactLumRows);
      var band = this.getBandById(control.bandId);
      control.numeric.setRange(-range, range);
      control.numeric.setPrecision(this.activeTab === ACM_TAB_SAT ? 0 : 1);
      var bandDef = acmFindBandDefById(band.id);
      control.numeric.setValue(band[this.activeTab]);
      control.numeric.setLabel(bandDef && bandDef.label ? bandDef.label : band.label);
      control.numeric.setSecondaryLabel("Center " + (bandDef && bandDef.center != null ? bandDef.center : 0) + "\u00b0");
      control.rowHost.update();
   }

   if (this.bandControlsHost && ACM_HOST_IS_WINDOWS && this.layoutMode !== "compact") {
      var visibleRows = this.activeTab === ACM_TAB_LUM ? 9 : 8;
      var rowHeight = 24;
      var fixedBandControlsHeight = visibleRows * rowHeight + 4;
      this.bandControlsHost.scaledMinHeight = fixedBandControlsHeight;
      if (typeof this.bandControlsHost.setMinHeight === "function")
         this.bandControlsHost.setMinHeight(fixedBandControlsHeight);
      if (typeof this.bandControlsHost.setFixedHeight === "function")
         this.bandControlsHost.setFixedHeight(fixedBandControlsHeight);
   } else if (this.bandControlsHost && typeof this.bandControlsHost.setVariableHeight === "function") {
      this.bandControlsHost.setVariableHeight();
   }
   var mixerMinHeight = this.layoutMode === "compact"
      ? (this.activeTab === ACM_TAB_LUM ? 230 : 190)
      : (ACM_HOST_IS_WINDOWS ? (this.activeTab === ACM_TAB_LUM ? 296 : 283) : 306);
   this.colorMixerPanel.scaledMinHeight = mixerMinHeight;
   if (typeof this.colorMixerPanel.setMinHeight === "function")
      this.colorMixerPanel.setMinHeight(mixerMinHeight);
   if (ACM_HOST_IS_WINDOWS && this.layoutMode !== "compact" && typeof this.colorMixerPanel.setFixedHeight === "function")
      this.colorMixerPanel.setFixedHeight(mixerMinHeight);
   if (this.colorMixerGroup && ACM_HOST_IS_WINDOWS && this.layoutMode !== "compact") {
      var mixerGroupMinHeight = this.activeTab === ACM_TAB_LUM ? 324 : 311;
      this.colorMixerGroup.scaledMinHeight = mixerGroupMinHeight;
      if (typeof this.colorMixerGroup.setMinHeight === "function")
         this.colorMixerGroup.setMinHeight(mixerGroupMinHeight);
      if (typeof this.colorMixerGroup.setFixedHeight === "function")
         this.colorMixerGroup.setFixedHeight(mixerGroupMinHeight);
   }
   if (this.bandControlsHost)
      this.bandControlsHost.update();
   this.colorMixerPanel.update();

   var hueActive = this.activeTab === ACM_TAB_HUE;
   var saturationActive = this.activeTab === ACM_TAB_SAT;
   var luminanceActive = this.activeTab === ACM_TAB_LUM;
   this.tabHueButton.enabled = true;
   this.tabHueButton.backgroundColor = hueActive ? 0xffffc43a : 0xffeeeeee;
   this.tabHueButton.foregroundColor = 0xff101010;
   this.tabHueButton.textColor = 0xff101010;
   this.tabSaturationButton.enabled = true;
   this.tabSaturationButton.backgroundColor = saturationActive ? 0xffffc43a : 0xffeeeeee;
   this.tabSaturationButton.foregroundColor = 0xff101010;
   this.tabSaturationButton.textColor = 0xff101010;
   this.tabLuminanceButton.enabled = true;
   this.tabLuminanceButton.backgroundColor = luminanceActive ? 0xffffc43a : 0xffeeeeee;
   this.tabLuminanceButton.foregroundColor = 0xff101010;
   this.tabLuminanceButton.textColor = 0xff101010;
};

AstroColorMixerPOC8Dialog.prototype.refreshFromState = function() {
   this.imageTypeCombo.currentItem = this.editorState.imageType === "starless" ? 1 : 0;
   this.sensitivityCombo.currentItem = this.editorState.sensitivity === "Fine" ? 0 : (this.editorState.sensitivity === "Advanced" || this.editorState.sensitivity === "Strong") ? 2 : 1;
   this.editorState.globalStrength = typeof this.editorState.globalStrength === "number" ? this.editorState.globalStrength : 1.0;
   this.refreshProtectionControls();
   this.refreshPassControls();
   this.refreshSelectedBandControls();
   this.refreshRangeMaskControls();
   this.refreshBandControls();
   this.setActiveToolPanel(this.activeToolPanel || "selectedBand");
   this.refreshPreviewModeButtons();
   this.refreshDiagnosticsData();
   this.syncPendingChangesIndicator();
};

AstroColorMixerPOC8Dialog.prototype.refreshProtectionControls = function() {
   this.editorState.protectionControls = this.editorState.protectionControls || acmCreateDefaultProtectionControls();
   var controls = this.editorState.protectionControls;
   controls.protectStars = controls.protectStars !== false;
   controls.protectLowSaturation = controls.protectLowSaturation !== false;
   controls.starMaskStrength = acmNormalizeStarMaskStrength(controls.starMaskStrength);
   var starlessMode = this.editorState.imageType === "starless";
   var effectiveProtectStars = !starlessMode && controls.protectStars !== false;

   this.protectionControlsSyncing = true;
   if (this.protectStarsCheck) {
      this.protectStarsCheck.checked = effectiveProtectStars;
      this.protectStarsCheck.enabled = !starlessMode;
      this.protectStarsCheck.toolTip = starlessMode
         ? "Star protection is disabled in Starless mode."
         : "Use compact-star and highlight protection to limit strong edits in stars and many halos.";
   }
   if (this.protectLowSatCheck) {
      this.protectLowSatCheck.checked = controls.protectLowSaturation;
      this.protectLowSatCheck.enabled = true;
   }
   this.protectionControlsSyncing = false;
};

AstroColorMixerPOC8Dialog.prototype.resetEditorStateAfterSuccessfulOutput = function() {
   var imageType = this.editorState.imageType;
   var sensitivity = this.editorState.sensitivity;
   var protectionControls = this.editorState.protectionControls || acmCreateDefaultProtectionControls();
   this.editorState = acmCreateBaseEditorState();
   this.editorState.imageType = imageType;
   this.editorState.sensitivity = sensitivity;
   this.editorState.protectionControls = {
      protectStars: protectionControls.protectStars !== false,
      protectLowSaturation: protectionControls.protectLowSaturation !== false,
      starMaskStrength: acmNormalizeStarMaskStrength(protectionControls.starMaskStrength)
   };
   this.refreshFromState();
   this.previewIsStale = true;
   this.syncPendingChangesIndicator();
};

AstroColorMixerPOC8Dialog.prototype.resetSelectedBand = function() {
   var band = this.getSelectedBand();
   band.hueShift = 0;
   band.saturation = 0;
   band.luminance = 0;
   band.width = 45;
   band.feather = 0.75;
   band.maskSoftenRadius = 0;
   this.refreshSelectedBandControls();
   this.refreshBandControls();
   this.markPreviewStale();
   this.refreshSelectedBandMaskPreviewIfActive();
   console.noteln("Reset selected band: " + band.label);
};

AstroColorMixerPOC8Dialog.prototype.resetRangeMask = function() {
   var rangeMask = this.getActivePassState().rangeMask;
   rangeMask.enabled = false;
   rangeMask.low = 0.0;
   rangeMask.high = 1.0;
   rangeMask.feather = 0.10;
   rangeMask.preset = "All";
   rangeMask.maskSoftenRadius = 0;
   rangeMask.boostEnabled = false;
   this.refreshRangeMaskControls();
   this.markPreviewStale();
   console.noteln("Reset Range Mask to defaults.");
};

AstroColorMixerPOC8Dialog.prototype.resetActivePass = function() {
   var activePass = this.getActivePassState();
   var resetPass = acmCreateDefaultPass(activePass.id, activePass.name);
   resetPass.enabled = activePass.enabled;
   for (var i = 0; i < this.editorState.passes.length; ++i)
      if (this.editorState.passes[i].id === activePass.id)
         this.editorState.passes[i] = resetPass;
   this.refreshFromState();
   this.markPreviewStale();
   console.noteln("Reset active pass: " + resetPass.name);
};

AstroColorMixerPOC8Dialog.prototype.resetAllPasses = function() {
   if ((new MessageBox("Reset all passes back to one Base Pass?", this.windowTitle, StdIcon_Warning, StdButton_Yes, StdButton_No)).execute() !== StdButton_Yes)
      return;
   var imageType = this.editorState.imageType;
   var sensitivity = this.editorState.sensitivity;
   this.editorState = acmCreateBaseEditorState();
   this.editorState.imageType = imageType;
   this.editorState.sensitivity = sensitivity;
   this.refreshFromState();
   this.markPreviewStale();
   console.noteln("Reset all passes to one Base Pass.");
};

AstroColorMixerPOC8Dialog.prototype.saveRecipeJson = function() {
   try {
      var active = getActiveImageStatus(this.targetViewId);
      var baseName = active && active.viewId ? "AstroColorMixer_" + sanitizeViewId(active.viewId) : "AstroColorMixer_Recipe";
      var targetPath = chooseRecipeSaveFile(baseName);
      if (!targetPath)
         return;
      var recipe = acmBuildRecipeFromEditorState(this.editorState);
      saveRecipeToFile(targetPath, recipe);
      ACM_LAST_SAVE_PATH = targetPath;
      console.noteln("Saved adjustment set JSON: " + targetPath);
      showMessage("Adjustment set saved successfully:\n" + targetPath, this.windowTitle, StdIcon_Information);
   } catch (error) {
      var fallbackRecipe = acmBuildRecipeFromEditorState(this.editorState);
      console.criticalln("Adjustment set save failed; printing JSON to console.");
      console.writeln(JSON.stringify(fallbackRecipe, null, 2));
      showMessage("Adjustment set save failed. JSON has been written to the PixInsight console as a fallback.\n\n" + (error && error.message ? error.message : String(error)), this.windowTitle, StdIcon_Warning);
   }
};

AstroColorMixerPOC8Dialog.prototype.loadRecipePath = function(filePath) {
   try {
      var result = acmLoadPassesIntoEditorState(loadRecipeFromFile(filePath));
      this.editorState = result.state;
      this.recipeFilePath = filePath;
      ACM_LAST_RECIPE_PATH = filePath;
      this.refreshFromState();
      this.previewIsStale = true;
      this.previewStatusLabel.text = "Preview stale";
      console.noteln("Loaded adjustment set file: " + filePath);
      console.noteln("Loaded adjustment set with " + result.totalPasses + " passes.");
   } catch (error) {
      showMessage(error && error.message ? error.message : String(error), this.windowTitle, StdIcon_Error);
   }
};

AstroColorMixerPOC8Dialog.prototype.loadRecipeJson = function() {
   var selected = chooseRecipeFile();
   if (!selected)
      return;
   this.loadRecipePath(selected);
};

AstroColorMixerPOC8Dialog.prototype.setOutputFeedback = function(text, color, bold) {
   if (this.outputFeedbackLabel) {
      if (color) {
         this.outputFeedbackLabel.useRichText = true;
         this.outputFeedbackLabel.text = acmThemeRichText(text || "", color, !!bold);
         this.outputFeedbackLabel.foregroundColor = acmThemeColorToArgb(color, 0xffffb13b);
         this.outputFeedbackLabel.textColor = this.outputFeedbackLabel.foregroundColor;
      } else {
         this.outputFeedbackLabel.useRichText = false;
         this.outputFeedbackLabel.text = text || "";
         acmApplyLightText(this.outputFeedbackLabel);
      }
   }
   if (text)
      console.noteln(text);
};

AstroColorMixerPOC8Dialog.prototype.setLongOutputFeedback = function(actionName, enabledPassCount) {
   var passText = enabledPassCount + " enabled pass" + (enabledPassCount === 1 ? "" : "es");
   var caution = enabledPassCount >= 3 ? " This may take a while." : "";
   var text = actionName + " full-resolution output (" + passText + ")." + caution + " Please wait for the completion message; PixInsight may show a busy cursor until processing finishes. See PixInsight console for timings.";
   this.setOutputFeedback(text, "#ffb13b", true);
   acmFlushUi();
};

AstroColorMixerPOC8Dialog.prototype.logOutputTiming = function(label, startMs, endMs) {
   console.writeln(label + ": " + acmFormatElapsedSeconds(startMs, endMs));
};

AstroColorMixerPOC8Dialog.prototype.confirmApplyToTarget = function() {
   if (this.targetApplyConfirmedThisSession)
      return true;
   var response = (new MessageBox(
      "This will write the current Astro Color Mixer result back into the target image. PixInsight undo should be available, but Create Image is safer for experimentation.",
      "Apply adjustments to the target image?",
      StdIcon_Warning,
      StdButton_Yes,
      StdButton_Cancel
   )).execute();
   if (response === StdButton_Yes) {
      this.targetApplyConfirmedThisSession = true;
      return true;
   }
   return false;
};

AstroColorMixerPOC8Dialog.prototype.applyRecipe = function() {
   try {
      var totalStart = acmNowMs();
      this.updateActiveStatus();
      if (!(this.activeStatus && this.activeStatus.ok))
         fail("No target RGB image is available.");
      var readStart = acmNowMs();
      var active = acmReadRgbImageForViewId(this.targetViewId || (this.activeStatus ? this.activeStatus.viewId : null));
      var readEnd = acmNowMs();
      var recipe = acmBuildRecipeFromEditorState(this.editorState);
      var normalized = acmNormalizeRecipe(recipe);
      var enabledPassCount = acmCountEnabledPasses({ passes: normalized.passes });
      this.setLongOutputFeedback("Creating", enabledPassCount);
      console.noteln("Astro Color Mixer output started: Create New Image");
      console.writeln("Target: " + active.viewId + " (" + active.width + "x" + active.height + ")");
      console.writeln("Image type: " + acmFormatImageTypeForUser(recipe.imageType));
      console.writeln("Sensitivity: " + recipe.sensitivity);
      console.writeln("Passes: " + normalized.passes.length + " total / " + enabledPassCount + " enabled");
      if (enabledPassCount >= 3)
         console.noteln("Note: Multiple enabled passes on a full-resolution image can take a while. PixInsight may show a busy cursor until output completes.");
      this.logOutputTiming("Read target image", readStart, readEnd);
      for (var i = 0; i < normalized.passes.length; ++i)
         console.writeln(normalized.passes[i].label + " [" + (normalized.passes[i].enabled ? "enabled" : "disabled") + "] · " + acmSummarizePass(normalized.passes[i]) + " · " + acmSummarizePassMaskControls(normalized.passes[i]));

      var processStart = acmNowMs();
      var result = applyAstroColorMixerPasses(active.rgb, active.width, active.height, recipe, {
         timingLogger: function(label, startMs, endMs) {
            console.writeln(label + ": " + acmFormatElapsedSeconds(startMs, endMs));
         }
      });
      var processEnd = acmNowMs();
      this.logOutputTiming("Apply color adjustments", processStart, processEnd);
      var outputId = "AstroColorMixer_" + sanitizeViewId(active.viewId);
      var writeStart = acmNowMs();
      var outputWindow = writeResultImage(active.width, active.height, result.rgb, outputId);
      var writeEnd = acmNowMs();
      this.logOutputTiming("Write output image", writeStart, writeEnd);
      console.noteln("Created output image: " + outputWindow.mainView.id);
      var totalEnd = acmNowMs();
      console.noteln("Astro Color Mixer output complete in " + acmFormatElapsedSeconds(totalStart, totalEnd) + ".");
      this.setOutputFeedback("Created image: " + outputWindow.mainView.id + " (" + acmFormatElapsedSeconds(totalStart, totalEnd) + ")", "#7fe38a", true);
      this.resetEditorStateAfterSuccessfulOutput();
      return true;
   } catch (error) {
      if (!(error && error.__acmHandled)) {
         var message = "Unexpected processing failure: " + (error && error.message ? error.message : String(error));
         console.criticalln(message);
         this.setOutputFeedback(message);
         showMessage(message, this.windowTitle, StdIcon_Error);
      }
      return false;
   }
};

AstroColorMixerPOC8Dialog.prototype.applyToTargetImage = function() {
   try {
      if (this.currentPreviewModeIsMask()) {
         this.setOutputFeedback("Apply to Target is only available from the adjusted image preview.");
         showMessage("Apply to Target is only available for the adjusted image preview.", this.windowTitle, StdIcon_Warning);
         return false;
      }
      if (!this.confirmApplyToTarget())
         return false;
      if (!this.sourceView || !this.sourceView.viewId) {
         this.setOutputFeedback("Target image is no longer available. Refresh the target image or use Create Image.");
         showMessage("Target image is no longer available. Refresh the target image or use Create Image.", this.windowTitle, StdIcon_Warning);
         return false;
      }
      var targetInfo = acmFindViewForViewId(this.sourceView.viewId);
      if (!targetInfo || !targetInfo.view) {
         this.setOutputFeedback("Target image is no longer available. Refresh the target image or use Create Image.");
         showMessage("Target image is no longer available. Refresh the target image or use Create Image.", this.windowTitle, StdIcon_Warning);
         return false;
      }

      var totalStart = acmNowMs();
      var recipe = acmBuildRecipeFromEditorState(this.editorState);
      var normalized = acmNormalizeRecipe(recipe);
      var enabledPassCount = acmCountEnabledPasses({ passes: normalized.passes });
      this.setLongOutputFeedback("Applying", enabledPassCount);
      console.noteln("Astro Color Mixer output started: Apply to Target");
      console.writeln("Target: " + targetInfo.view.id);
      console.writeln("Image type: " + acmFormatImageTypeForUser(recipe.imageType));
      console.writeln("Sensitivity: " + recipe.sensitivity);
      console.writeln("Passes: " + normalized.passes.length + " total / " + enabledPassCount + " enabled");
      if (enabledPassCount >= 3)
         console.noteln("Note: Multiple enabled passes on a full-resolution image can take a while. PixInsight may show a busy cursor until output completes.");
      for (var i = 0; i < normalized.passes.length; ++i)
         console.writeln(normalized.passes[i].label + " [" + (normalized.passes[i].enabled ? "enabled" : "disabled") + "] · " + acmSummarizePass(normalized.passes[i]) + " · " + acmSummarizePassMaskControls(normalized.passes[i]));

      var readStart = acmNowMs();
      var target = acmReadRgbImageFromView(targetInfo.view);
      var readEnd = acmNowMs();
      this.logOutputTiming("Read target image", readStart, readEnd);
      console.writeln("Target size: " + target.width + "x" + target.height);
      var processStart = acmNowMs();
      var result = applyAstroColorMixerPasses(target.rgb, target.width, target.height, recipe, {
         timingLogger: function(label, startMs, endMs) {
            console.writeln(label + ": " + acmFormatElapsedSeconds(startMs, endMs));
         }
      });
      var processEnd = acmNowMs();
      this.logOutputTiming("Apply color adjustments", processStart, processEnd);
      var maskStart = acmNowMs();
      var maskInfo = acmReadMaskState(targetInfo.window, target.width, target.height);
      var outputRgb = maskInfo.respected
         ? acmBlendRgbWithMask(target.rgb, result.rgb, maskInfo.values)
         : result.rgb;
      var maskEnd = acmNowMs();
      this.logOutputTiming(maskInfo.respected ? "Read/blend PixInsight mask" : "Check PixInsight mask", maskStart, maskEnd);

      var writeStart = acmNowMs();
      acmWriteRgbToView(targetInfo.view, target.width, target.height, outputRgb);
      var writeEnd = acmNowMs();
      this.logOutputTiming("Write target image", writeStart, writeEnd);
      this.targetApplyMaskStatus = maskInfo;
      if (this.targetApplyMaskStatusLabel)
         this.targetApplyMaskStatusLabel.text = maskInfo.message;

      var totalEnd = acmNowMs();
      if (maskInfo.respected)
         this.setOutputFeedback(maskInfo.inverted
            ? "Applied adjustments to target image using inverted PixInsight mask (" + acmFormatElapsedSeconds(totalStart, totalEnd) + ")."
            : "Applied adjustments to target image using active PixInsight mask (" + acmFormatElapsedSeconds(totalStart, totalEnd) + ").",
            "#7fe38a",
            true);
      else
         this.setOutputFeedback("Applied adjustments to target image (" + acmFormatElapsedSeconds(totalStart, totalEnd) + ").", "#7fe38a", true);
      console.noteln("Astro Color Mixer output complete in " + acmFormatElapsedSeconds(totalStart, totalEnd) + ".");
      this.resetEditorStateAfterSuccessfulOutput();

      if (this.activeStatus && this.activeStatus.ok && this.activeStatus.viewId === target.viewId)
         this.refreshActiveSource();
      else
         this.markPreviewStale();
      return true;
   } catch (error) {
      if (!(error && error.__acmHandled)) {
         var message = "Target apply failed: " + (error && error.message ? error.message : String(error));
         console.criticalln(message);
         this.setOutputFeedback(message);
         showMessage(message, this.windowTitle, StdIcon_Error);
      }
      return false;
   }
};

try {
   var dialog = new AstroColorMixerUI03Dialog;
   acmShowSmallDisplayWorkspaceWarningIfNeeded(dialog);
   dialog.execute();
} catch (error) {
   if (!(error && error.__acmHandled)) {
      var message = "Unexpected dialog failure: " + (error && error.message ? error.message : String(error));
      console.criticalln(message);
      showMessage(message, "Astro Color Mixer v0.9.7.13-beta", StdIcon_Error);
   }
}

#endif
