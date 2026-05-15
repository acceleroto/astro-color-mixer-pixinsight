#feature-id    Cosgrove's Cosmos > Astro Color Mixer
#feature-info  Astro Color Mixer v0.9.6-beta. Nonlinear RGB color and luminance refinement for astrophotography.

/*
 * Astro Color Mixer for PixInsight
 *
 * Beta build:
 * Astro Color Mixer v0.9.6-beta
 */

#include <pjsr/UndoFlag.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/DataType.jsh>
#include <pjsr/Sizer.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/BitmapFormat.jsh>
#include <pjsr/ColorSpace.jsh>
#include <pjsr/SampleType.jsh>

function showMessage(text, title, icon) {
   (new MessageBox(text, title || "Astro Color Mixer v0.9.6-beta", icon || StdIcon_Information, StdButton_Ok)).execute();
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
   showMessage(text, "Astro Color Mixer v0.9.6-beta", StdIcon_Error);
   var error = new Error(text);
   error.__acmHandled = true;
   throw error;
}

function acmCreateHelpButton(parent, title, text, helpKey) {
   var button = new Control(parent);
   button.acmHelpTitle = title;
   button.acmHelpText = text;
   button.acmHelpKey = helpKey || "default";
   button.toolTip = title;
   button.setFixedSize(14, 14);
   button.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0xff7a7f89);
      g.brush = new Brush(0xffececec);
      g.drawRect(this.boundsRect);
      var f = new Font;
      f.pixelSize = 10;
      f.bold = true;
      g.font = f;
      var tw = g.font.width("?");
      var x = Math.round((this.width - tw) * 0.5);
      var y = Math.round((this.height + g.font.ascent - g.font.descent) * 0.5);
      g.pen = new Pen(0xff222222);
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
      g.pen = new Pen(0xff5a5f69);
      g.brush = new Brush(0xffececec);
      g.drawRect(this.boundsRect);
      g.pen = new Pen(0xff111111, 2);
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
   box.titleLabel.useRichText = true;
   box.titleLabel.text = "";
   box.bodyLabel = new Label(box);
   box.bodyLabel.wordWrapping = true;
   box.bodyLabel.useRichText = false;
    box.bodyLabel.text = "";
   box.sizer = new VerticalSizer;
   box.sizer.margin = 6;
   box.sizer.spacing = 2;
   box.sizer.add(box.titleLabel);
   box.sizer.add(box.bodyLabel);
   box.bodyLabel.minWidth = 220;
   box.scaledMinWidth = 240;
   box.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0xff7a7f89);
      g.brush = new Brush(0xfff4f4f4);
      g.drawRect(this.boundsRect);
      g.end();
   };
   box.hide();
   return box;
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
   var safeMargin = 72;
   var targetMinWidth = 1240;
   var targetMinHeight = 780;
   var defaultWidth = 2000;
   var defaultHeight = 920;
   var screenSize = acmGetDialogAvailableScreenSize(dialog);
   var minWidth = targetMinWidth;
   var minHeight = targetMinHeight;
   var width = defaultWidth;
   var height = defaultHeight;

   if (screenSize) {
      minWidth = Math.max(1120, Math.min(targetMinWidth, screenSize.width - safeMargin));
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

function acmCreateInfoBox(parent) {
   var box = new Control(parent);
   box.visible = false;
   box.hide();
   box.currentKind = "";

   box.titleLabel = new Label(box);
   box.titleLabel.useRichText = true;
   box.titleLabel.text = "<b>Info</b>";

   box.closeButton = new PushButton(box);
   box.closeButton.text = "x";
   box.closeButton.setFixedSize(18, 18);

   box.bodyLabel = new Label(box);
   box.bodyLabel.wordWrapping = true;
   box.bodyLabel.useRichText = false;
   box.bodyLabel.textAlignment = TextAlign_Left|TextAlign_Top;
    box.bodyLabel.minWidth = 380;
   box.bodyLabel.text = "";

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
      g.pen = new Pen(0xff7a7f89);
      g.brush = new Brush(0xfff4f4f4);
      g.drawRect(this.boundsRect);
      g.end();
   };
   return box;
}

console.writeln("<end><cbr><br><b>Astro Color Mixer v0.9.6-beta</b>");

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
var ACM_ROW_RESET_WIDTH = 18;
var ACM_ROW_SPACING = 2;
var ACM_MIXER_LABEL_WIDTH = 84;
var ACM_MIXER_SLIDER_MIN_WIDTH = 252;

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
   Advanced: { hueShift: 45, saturation: 100, luminance: 60 }
};

var ACM_NEUTRAL_SENSITIVITY_RANGES = {
   Fine: 5,
   Normal: 20,
   Advanced: 50
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
         feather: 0.75
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
      preset: "All"
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

function acmApplySourceHsl(sourceRgb, width, height) {
   var count = width * height;
   var h = new Float32Array(count);
   var s = new Float32Array(count);
   var l = new Float32Array(count);
   var y = new Float32Array(count);

   for (var i = 0; i < count; ++i) {
      var base = i * 3;
      var hsl = acmRgbToHsl(sourceRgb[base], sourceRgb[base + 1], sourceRgb[base + 2]);
      h[i] = hsl[0];
      s[i] = hsl[1];
      l[i] = hsl[2];
      y[i] = acmLuma709(sourceRgb[base], sourceRgb[base + 1], sourceRgb[base + 2]);
   }

   return { h: h, s: s, l: l, y: y };
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

function acmBuildMasks(hue, saturation, lightness, band, protection, globalStrength, rangeMaskValue) {
   var distance = acmCircularHueDistance(hue, band.center);
   var hueMask = acmMakeHueMask(distance, band.width, band.feather);
   var satMask = acmSmoothstep(protection.satFloor, protection.satFull, saturation);
   var darkMask = acmSmoothstep(protection.darkFloor, protection.darkFull, lightness);
   var highlightMask = 1 - acmSmoothstep(protection.highlightStart, protection.highlightFull, lightness);

   return {
      finalMask: hueMask * satMask * darkMask * highlightMask * rangeMaskValue * globalStrength
   };
}

function acmBuildNeutralMasks(saturation, lightness, neutralState, protection, globalStrength, rangeMaskValue, options) {
   var neutralMask = 1 - acmSmoothstep(neutralState.satStart, neutralState.satFull, saturation);
   var neutralDarkFloor = options && options.neutralDarkFloor != null ? options.neutralDarkFloor : protection.darkFloor;
   var neutralDarkFull = options && options.neutralDarkFull != null ? options.neutralDarkFull : protection.darkFull;
   var darkMask = acmSmoothstep(neutralDarkFloor, neutralDarkFull, lightness);
   var highlightMask = 1 - acmSmoothstep(protection.highlightStart, protection.highlightFull, lightness);
   return neutralMask * darkMask * highlightMask * rangeMaskValue * globalStrength;
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
   var output = new Float32Array(currentRgb);
   var count = width * height;
   var protection = options.protection;
   var globalStrength = options.globalStrength != null ? options.globalStrength : 1;
   var rangeMaskState = options.rangeMaskState || null;

   for (var i = 0; i < count; ++i) {
      var base = i * 3;
      var hue = sourceHsl.h[i];
      var saturation = sourceHsl.s[i];
      var lightness = sourceHsl.l[i];
      var luminance = sourceHsl.y[i];
      var rangeMaskValue = acmComputeRangeMask(luminance, rangeMaskState);
      var mask = acmBuildMasks(hue, saturation, lightness, band, protection, globalStrength, rangeMaskValue).finalMask;

      if (mask <= 0)
         continue;

      var r = output[base];
      var g = output[base + 1];
      var b = output[base + 2];
      var y = acmLuma709(r, g, b);
      var chroma = [r - y, g - y, b - y];

      var satAdjust = band.saturation / 100;
      var satScale = Math.max(0, 1 + satAdjust * mask);
      var chromaScaled = [chroma[0] * satScale, chroma[1] * satScale, chroma[2] * satScale];

      var angleRadians = (band.hueShift * Math.PI / 180) * mask;
      var rotated = acmRodriguesRotate(chromaScaled, ACM_AXIS, angleRadians);

      var lumAdjust = band.luminance / 100;
      var y2 = lumAdjust >= 0
         ? y + (lumAdjust * ACM_POSITIVE_LUMINANCE_GAIN) * mask * (1 - y)
         : y + lumAdjust * mask * y;

      output[base] = acmClamp01(y2 + rotated[0]);
      output[base + 1] = acmClamp01(y2 + rotated[1]);
      output[base + 2] = acmClamp01(y2 + rotated[2]);
   }

   return output;
}

function acmApplyNeutralLuminance(currentRgb, sourceHsl, width, height, neutralState, options) {
   var output = new Float32Array(currentRgb);
   var count = width * height;
   var protection = options.protection;
   var globalStrength = options.globalStrength != null ? options.globalStrength : 1;
   var rangeMaskState = options.rangeMaskState || null;

   for (var i = 0; i < count; ++i) {
      var base = i * 3;
      var saturation = sourceHsl.s[i];
      var lightness = sourceHsl.l[i];
      var luminance = sourceHsl.y[i];
      var rangeMaskValue = acmComputeRangeMask(luminance, rangeMaskState);
      var relaxedDarkFloor = rangeMaskState && rangeMaskState.enabled ? protection.darkFloor * 0.25 : protection.darkFloor;
      var relaxedDarkFull = rangeMaskState && rangeMaskState.enabled ? protection.darkFull * 0.6 : protection.darkFull;
      var mask = acmBuildNeutralMasks(
         saturation,
         lightness,
         neutralState,
         protection,
         globalStrength,
         rangeMaskValue,
         {
            neutralDarkFloor: relaxedDarkFloor,
            neutralDarkFull: relaxedDarkFull
         }
      );

      if (mask <= 0)
         continue;

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
      feather: sourceBand && typeof sourceBand.feather === "number" ? sourceBand.feather : defaultBand.feather
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
               feather: inputBands[key].feather
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
         preset: rangeMask.preset || "All"
      };

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
      activePassId: converted.activePassId || normalizedPasses[0].id,
      passes: normalizedPasses
   };
}

function applyAstroColorMixerPasses(rgbFloat, width, height, recipe) {
   var normalized = acmNormalizeRecipe(recipe);
   var working = new Float32Array(rgbFloat);
   var protection = ACM_PROTECTION_PRESETS[normalized.imageType] || ACM_PROTECTION_PRESETS.stars;

   for (var passIndex = 0; passIndex < normalized.passes.length; ++passIndex) {
      var pass = normalized.passes[passIndex];
      if (pass.enabled === false)
         continue;

      var sourceHsl = acmApplySourceHsl(working, width, height);

      for (var bandIndex = 0; bandIndex < pass.bands.length; ++bandIndex) {
         var band = pass.bands[bandIndex];
         if (
            Math.abs(band.hueShift) <= ACM_EPSILON &&
            Math.abs(band.saturation) <= ACM_EPSILON &&
            Math.abs(band.luminance) <= ACM_EPSILON
         ) {
            continue;
         }
         working = acmApplySingleBand(working, sourceHsl, width, height, band, {
            protection: protection,
            globalStrength: normalized.globalStrength,
            rangeMaskState: pass.rangeMask
         });
      }

      if (Math.abs(pass.neutralLuminance.luminance) > ACM_EPSILON) {
         working = acmApplyNeutralLuminance(working, sourceHsl, width, height, pass.neutralLuminance, {
            protection: protection,
            globalStrength: normalized.globalStrength,
            rangeMaskState: pass.rangeMask
         });
      }
   }

   return {
      recipe: normalized,
      rgb: working
   };
}

function acmSummarizeRangeMask(rangeMask) {
   if (!rangeMask || !rangeMask.enabled)
      return "Range Off";
   if (rangeMask.preset && rangeMask.preset !== "Custom" && rangeMask.preset !== "All")
      return "Range " + rangeMask.preset;
   return "Range " + rangeMask.low.toFixed(2) + "-" + rangeMask.high.toFixed(2) + " · F " + rangeMask.feather.toFixed(2);
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

var ACM_LAST_RECIPE_PATH = "";
var ACM_LAST_SAVE_PATH = "";
var ACM_TAB_HUE = "hueShift";
var ACM_TAB_SAT = "saturation";
var ACM_TAB_LUM = "luminance";
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
   var dialog = new Dialog;
   dialog.windowTitle = title;
   dialog.userResizable = true;
   var textBox = new TextBox(dialog);
   textBox.readOnly = true;
   textBox.wordWrapping = true;
   textBox.text = text;
   textBox.minWidth = 720;
   textBox.minHeight = 480;
   var closeButton = new PushButton(dialog);
   closeButton.text = "Close";
   closeButton.onClick = function() { dialog.ok(); };
   var buttons = new HorizontalSizer;
   buttons.addStretch();
   buttons.add(closeButton);
   dialog.sizer = new VerticalSizer;
   dialog.sizer.margin = 8;
   dialog.sizer.spacing = 8;
   dialog.sizer.add(textBox, 100);
   dialog.sizer.add(buttons);
   dialog.adjustToContents();
   dialog.execute();
}

var ACM_FAQ_TEXT = [
   "ASTRO COLOR MIXER FAQ & PRACTICAL GUIDE",
   "",
   "Astro Color Mixer is a nonlinear RGB color and luminance refinement tool for astrophotography. It is intended for images that have already been calibrated, combined, color balanced, and stretched. It is not a replacement for calibration, linear processing, or broad color correction; it is a focused tool for controlled color-band, luminance-range, and refinement-pass adjustments.",
   "",
   "1. WHAT IS ASTRO COLOR MIXER?",
   "",
   "Astro Color Mixer is built for nonlinear RGB color-band refinement. Instead of making arbitrary global color swings, it lets you work in practical astro editing regions such as H-alpha reds, OIII cyans, reflection blues, halo cleanup magentas, and background-oriented low-saturation areas.",
   "",
   "It is designed for nebulae, galaxies, dust, halos, stars, and background refinement, and it always creates a new output image instead of overwriting the source view.",
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
   "Typical placement is after the image is already nonlinear, when you want controlled final color and luminance refinement. It can be used on stars-present images, starless images, or both depending on the target and your workflow.",
   "",
   "3. WHAT KIND OF IMAGE SHOULD I USE?",
   "",
   "Use a nonlinear RGB image. Do not use the tool on raw linear stacks or as a substitute for earlier calibration work. It works on both stars-present and starless images, and the Image Type setting tells the tool which protection behavior to use. Preview is downsampled for speed, but Apply to New Image always runs on full-resolution data.",
   "",
   "3A. WHAT IS THE DIFFERENCE BETWEEN STARS PRESENT AND STARLESS / STAR-REDUCED?",
   "",
   "The Image Type setting changes how Astro Color Mixer protects the image during color and luminance adjustments.",
   "",
   "Stars Present is intended for images that still contain normal stars. It uses more conservative highlight and star-core protection so adjustments are less likely to damage bright stars, push star cores into odd colors, or exaggerate halos.",
   "",
   "Starless / Star-Reduced is intended for images where stars have been removed or greatly reduced. Since there are fewer bright star structures to protect, the tool can act more freely on nebulae, galaxies, dust, and faint color regions.",
   "",
   "This setting does not remove stars and does not create a star mask. It only changes the protection behavior used while applying the adjustment.",
   "",
   "Practical guidance:",
   "",
   "  - Use Stars Present for normal RGB images with stars.",
   "  - Use Starless / Star-Reduced for starless nebula, galaxy, or dust processing.",
   "  - If unsure, start with Stars Present because it is the safer mode.",
   "  - Always inspect the preview and mask views before applying strong changes.",
   "",
   "4. BASIC WORKFLOW",
   "",
   "  1. Open a nonlinear RGB image.",
   "  2. Choose Image Type:",
   "     - Stars Present for normal RGB images with stars.",
   "     - Starless / Star-Reduced for starless or strongly star-reduced images.",
   "  3. Start with Base Pass.",
   "  4. Use Hue, Saturation, and Luminance sliders for broad color work.",
   "  5. Use the probe, histogram, and polar plot to understand the image.",
   "  6. Adjust Width and Feather for the selected color band if needed.",
   "  7. Use Range Mask for brightness-targeted refinements.",
   "  8. Add a Refinement Pass for targeted changes.",
   "  9. Preview, compare Original and Adjusted, and inspect mask views.",
   "  10. Apply to New Image.",
   "  11. Save an adjustment set if the session is worth preserving.",
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
   "Hue shifts the color direction inside the selected band. Saturation strengthens or weakens color intensity inside that band. Luminance changes the brightness of selected color regions. These edits apply only to the active Refinement Pass, which means broad and targeted work can be separated cleanly.",
   "",
   "7. WHAT ARE WIDTH AND FEATHER?",
   "",
   "Width controls how much of the hue neighborhood around the selected band is affected. Narrow width is more selective; wide width reaches a broader family of colors. Feather controls how softly the selection falls off beyond the stronger inner region. Higher feather produces smoother transitions and lowers the chance of abrupt color boundaries.",
   "",
   "8. WHAT IS RANGE MASK?",
   "",
   "Range Mask is a luminance-based selection. Low and High define the brightness interval, while Feather softens the inclusion edges. Use it for background work, faint signal work, highlight protection, bright cores, stars, or any pass that should act only in a luminance slice. Range Mask belongs to the active pass, not the whole tool globally.",
   "",
   "9. WHAT IS NEUTRAL / LOW-SATURATION?",
   "",
   "When saturation is very low, hue becomes unreliable. Neutral / Low-Saturation is the luminance control for those pixels. It is useful for sky background, gray dust, halos, low-color transitions, and neutral structures where a hue-based edit would be misleading. This control appears with the Luminance controls.",
   "",
   "10. WHAT ARE REFINEMENT PASSES?",
   "",
   "Refinement Passes are editable sequential processing passes. Base Pass is usually where broad global work begins. Additional passes are best for targeted changes such as background control, halo cleanup, or highlight-specific luminance shaping. They are not Photoshop layers: there are no blend modes and no opacity sliders. Passes are applied in order.",
   "",
   "11. WHAT DO PROBE, HISTOGRAM, AND POLAR PLOT DO?",
   "",
   "The probe samples a preview pixel and reports luminance, hue, and saturation. The histogram helps you see the preview luminance distribution and place a Range Mask intelligently. The polar plot shows hue angle and saturation radius for sampled preview pixels. If hue is reliable, the probe can auto-select the nearest color band to help you navigate the image.",
   "",
   "12. WHAT ARE MASK VIEWS?",
   "",
   "Mask views let you see what the current band, the Range Mask, or the combined mask is including. In general terms, white means strongly included and black means largely excluded. They are especially useful before strong saturation, luminance, or cleanup adjustments.",
   "",
   "13. WHY CAN PREVIEW DIFFER FROM FINAL OUTPUT?",
   "",
   "Preview is based on downsampled data for speed and responsiveness. Apply to New Image uses full-resolution data. Fine detail and microstructure can differ slightly, but the overall direction of the result should remain consistent with the preview.",
   "",
   "14. WHAT IS AN ADJUSTMENT SET?",
   "",
   "Adjustment sets are JSON settings files. They preserve passes, sliders, selected band settings, Width and Feather, Range Mask values, image type, sensitivity, and related adjustment state. They are useful for repeatability, documentation, sharing, and complex multi-pass sessions.",
   "",
   "15. COMMON MISTAKES",
   "",
   "  - Using the tool on linear data instead of nonlinear RGB.",
   "  - Making extreme hue shifts when a narrower, more targeted pass would be cleaner.",
   "  - Enabling Range Mask without checking the mask views first.",
   "  - Doing highly targeted work in Base Pass instead of a new Refinement Pass.",
   "  - Trusting hue in neutral or low-saturation background regions.",
   "  - Forgetting that the preview is stale after changing controls.",
   "",
   "16. EXAMPLE WORKFLOWS",
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
   "For the complete package documentation, see README.md, docs/FAQ.md, and docs/TECHNICAL_APPENDIX.md in the PixInsight package folder."
].join("\n");

var ACM_TECHNICAL_APPENDIX_TEXT = [
   "ASTRO COLOR MIXER TECHNICAL APPENDIX",
   "",
   "This appendix describes the processing model used by Astro Color Mixer. The tool is designed for nonlinear RGB astrophotography images and combines hue-band selection, luminance-range masking, low-saturation handling, and sequential refinement passes.",
   "",
   "1. DESIGN GOALS",
   "",
   "Astro Color Mixer is designed for controlled nonlinear RGB color refinement. The main goals are to give the user practical astrophotography-specific color bands, avoid arbitrary global color swings, expose masks and diagnostics clearly, and preserve a non-destructive workflow by writing the result to a new image.",
   "",
   "2. PROCESSING ASSUMPTIONS",
   "",
   "  - input is nonlinear RGB",
   "  - values are normalized internally to 0..1",
   "  - source image is not overwritten",
   "  - preview uses a downsampled representation for responsiveness",
   "  - Apply to New Image uses the full-resolution image",
   "",
   "3. LUMINANCE MODEL",
   "",
   "Y = 0.2126 R + 0.7152 G + 0.0722 B",
   "",
   "Luminance is used as a practical structural guide for Range Masking, diagnostics, neutral luminance handling, and dark/highlight protection. In a nonlinear astrophotography workflow, luminance remains one of the most useful stable signals for selecting where an edit should be allowed to act.",
   "",
   "4. HUE AND SATURATION MODEL",
   "",
   "Hue and saturation are used for selection and editing. Hue is circular, so distances are measured around a wrapped 0..360 degree space. Low saturation makes hue unreliable, especially in backgrounds, halos, dust transitions, and weak-color structures. Selected bands therefore use circular hue distance, but the tool also reduces false confidence in very low-saturation regions.",
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
   "5A. IMAGE TYPE: STARS PRESENT VS STARLESS / STAR-REDUCED",
   "",
   "Astro Color Mixer uses the Image Type setting to choose protection behavior appropriate to the image being processed.",
   "",
   "In Stars Present mode, the tool assumes the image still contains stellar profiles, bright cores, and possible halos. The protection model is more conservative around high-luminance structures. This reduces the risk of color shifts in star cores, over-saturation around halos, or harsh luminance changes in bright stellar features.",
   "",
   "In Starless / Star-Reduced mode, the tool assumes stars have been removed or substantially reduced. The protection model can allow more freedom in nebular, galactic, dust, and faint-signal regions because fewer bright stellar features are present.",
   "",
   "This setting affects mask construction and protection weighting. It does not perform star detection, star removal, or explicit star masking.",
   "",
   "Conceptually:",
   "",
   "  - Stars Present: stronger low-saturation caution, stronger dark/background caution, and more conservative highlight/star-core protection.",
   "  - Starless / Star-Reduced: allows more effect in faint structures, uses less restrictive highlight protection, and is useful when stars will be recombined later.",
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
   "7. SATURATION RELIABILITY",
   "",
   "Very low-saturation pixels do not carry stable hue information. Astro Color Mixer therefore uses a saturation reliability term to reduce false hue selection in neutral areas. This prevents weakly colored background pixels from being treated like confidently blue, magenta, or green structures. The neutral / low-saturation luminance control provides a separate path for those pixels.",
   "",
   "8. DARK AND HIGHLIGHT PROTECTION",
   "",
   "Very dark pixels can be noisy and unstable. Very bright pixels often include star cores, clipped highlights, or structures where strong hue changes can look unnatural quickly. The tool includes dark and highlight protection terms, and the chosen image type changes the behavior so stars-present and starless workflows can be handled differently.",
   "",
   "9. RANGE MASK",
   "",
   "Range Mask limits the effect of a pass by luminance. Low and High define the included range, while Feather softens the shoulders at each edge.",
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
   "11. CHROMA-VECTOR ADJUSTMENT MODEL",
   "",
   "The processing model is practical rather than marketed as mathematically perfect color science. Conceptually, RGB is separated into a luminance-like neutral component and a chroma component. Saturation edits scale chroma magnitude, hue edits rotate chroma direction, and luminance edits modify the brightness component. The result is then recombined and clamped back into a valid nonlinear RGB range.",
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
   "  rangeMask *",
   "  pass terms",
   "",
   "The exact implementation details follow the actual code path, but conceptually the tool combines hue selection, saturation reliability, luminance gating, and protection terms before the adjustment is applied.",
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
   "14. PREVIEW AND DIAGNOSTICS",
   "",
   "Preview uses a downsampled image so the tool remains responsive. Histogram calculations use preview luminance. The polar plot uses sampled preview pixels. The probe reads preview pixels. Apply to New Image uses the full-resolution source data, which is why small local differences can appear even when the broad preview match is strong.",
   "",
   "15. ADJUSTMENT SET MODEL",
   "",
   "Adjustment sets are stored as JSON and preserve the important editing state, including image type, sensitivity, pass order, band settings, Width and Feather, Range Mask configuration, and neutral luminance terms. Diagnostic readouts are interactive session tools and are not the main purpose of the saved adjustment-set file.",
   "",
   "16. LIMITATIONS",
   "",
   "  - not intended for linear calibration",
   "  - extreme adjustments can create artifacts",
   "  - hue is unreliable in neutral pixels",
   "  - preview is approximate because it is downsampled",
   "  - Range Mask behavior depends on the current stretch",
   "  - saturated stars and bright cores may need careful handling",
   "  - user judgment is still required",
   "",
   "17. PRACTICAL GUIDANCE",
   "",
   "  - start with small adjustments",
   "  - preview masks before strong edits",
   "  - use a new pass for targeted work",
   "  - avoid using Range Mask to reinterpret finished global work unless that is intentional",
   "  - save adjustment sets for complex sessions",
   "",
   "For the complete package documentation, see docs/TECHNICAL_APPENDIX.md and AstroColorMixer.pidoc in the PixInsight package folder."
].join("\n");

var ACM_ABOUT_TEXT =
      "About Astro Color Mixer\n\n" +
      "Astro Color Mixer v0.9.6-beta\n\n" +
"A Cosgrove's Cosmos tool for nonlinear RGB chroma-vector color control in astrophotography.\n\n" +
"Core capabilities:\n" +
"- H/S/L color-band adjustment\n" +
"- Neutral / Low-Saturation luminance\n" +
"- Selected Band width and feather\n" +
"- Range Mask targeting\n" +
"- Refinement Passes\n" +
"- preview, histogram, polar plot, probe\n" +
"- adjustment-set save/load\n\n" +
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
   button.setFixedSize(ACM_ROW_RESET_WIDTH, 16);
   button.toolTip = "Reset this band";
   button.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0xff7a7f89);
      g.brush = new Brush(0xffececec);
      g.drawRect(this.boundsRect);

      var f = new Font;
      f.pixelSize = 10;
      g.font = f;
      var glyph = "\u21ba";
      var tw = g.font.width(glyph);
      var x = Math.round((this.width - tw) * 0.5);
      var y = Math.round((this.height + g.font.ascent - g.font.descent) * 0.5);
      g.pen = new Pen(0xff222222);
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

function acmGradientRgbForBand(tabKey, bandDef, t, isNeutral) {
   if (isNeutral) {
      if (tabKey === ACM_TAB_LUM)
         return t < 0.5 ? acmMixRgb01({ r: 0.1, g: 0.1, b: 0.1 }, { r: 0.5, g: 0.5, b: 0.5 }, t / 0.5)
                        : acmMixRgb01({ r: 0.5, g: 0.5, b: 0.5 }, { r: 0.92, g: 0.92, b: 0.92 }, (t - 0.5) / 0.5);
      return { r: 0.5, g: 0.5, b: 0.5 };
   }

   var base = acmHexToRgb01(bandDef.color);
   if (tabKey === ACM_TAB_HUE) {
      var bandIndex = 0;
      for (var i = 0; i < ACM_BAND_DEFS.length; ++i)
         if (ACM_BAND_DEFS[i].id === bandDef.id)
            bandIndex = i;
      var prev = acmHexToRgb01(ACM_BAND_DEFS[(bandIndex + ACM_BAND_DEFS.length - 1) % ACM_BAND_DEFS.length].color);
      var next = acmHexToRgb01(ACM_BAND_DEFS[(bandIndex + 1) % ACM_BAND_DEFS.length].color);
      return t < 0.5 ? acmMixRgb01(prev, base, t / 0.5) : acmMixRgb01(base, next, (t - 0.5) / 0.5);
   }
   if (tabKey === ACM_TAB_SAT) {
      var avg = (base.r + base.g + base.b) / 3;
      var gray = { r: avg, g: avg, b: avg };
      var muted = acmMixRgb01(gray, base, 0.45);
      return t < 0.5 ? acmMixRgb01(gray, muted, t / 0.5) : acmMixRgb01(muted, acmScaleRgb01(base, 1.08), (t - 0.5) / 0.5);
   }
   return t < 0.5 ? acmMixRgb01(acmScaleRgb01(base, 0.15), base, t / 0.5) : acmMixRgb01(base, acmMixRgb01(base, { r: 1, g: 1, b: 1 }, 0.45), (t - 0.5) / 0.5);
}

function acmCreateGradientBitmap(width, height, tabKey, bandDef, isNeutral) {
   width = Math.max(16, width | 0);
   height = Math.max(6, height | 0);
   var rgb = new Float32Array(width * height * 3);
   for (var x = 0; x < width; ++x) {
      var t = width > 1 ? x / (width - 1) : 0;
      var c = acmGradientRgbForBand(tabKey, bandDef, t, isNeutral);
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
      var key = this.acmDialogRef.activeTab + ":" + this.width + ":" + this.height + ":" + (this.isNeutral ? "neutral" : this.bandDef.id);
      if (this.cachedKey !== key) {
         this.cachedBitmap = acmCreateGradientBitmap(Math.max(16, this.width), Math.max(6, this.height), this.acmDialogRef.activeTab, this.bandDef, this.isNeutral);
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
   row.host.scaledMinHeight = 25;

   if (row.isNeutral) {
      row.swatch = new Control(row.host);
      row.swatch.setFixedWidth(ACM_SWATCH_WIDTH);
   } else {
      row.swatch = acmCreateColorSwatch(row.host, row.bandDef.color);
   }

   row.primaryLabelText = acmCompactMixerLabel(row.bandDef, row.isNeutral, options.label || row.bandDef.label || row.bandDef.shortLabel || "Value");
   row.secondaryLabelText = options.secondaryLabel || (row.isNeutral ? "Low-saturation luminance" : ("Center " + (row.bandDef.center != null ? row.bandDef.center : 0) + "\u00b0"));

   row.labelHost = new Label(row.host);
   row.labelHost.useRichText = false;
   row.labelHost.text = row.primaryLabelText;
   row.labelHost.textAlignment = TextAlign_Right | TextAlign_VertCenter;
   row.labelHost.minWidth = ACM_MIXER_LABEL_WIDTH;
   row.labelHost.scaledMinHeight = 18;
   row.labelHost.toolTip = acmMixerLabelTooltip(row.bandDef, row.isNeutral);

   row.edit = new Edit(row.host);
   row.edit.setFixedWidth(ACM_ROW_EDIT_WIDTH);
   row.edit.setFixedHeight(20);
   row.edit.text = acmFormatMixerDisplayValue(row.value, row.precision);

   row.field = new Control(row.host);
   row.field.rowRef = row;
   row.field.minWidth = ACM_MIXER_SLIDER_MIN_WIDTH;
   row.field.scaledMinHeight = 18;
   row.field.onPaint = function() {
      var g = new Graphics(this);
      var r = this.rowRef;
      var fieldTop = 3;
      var fieldBottom = this.height - 3;
      var fieldHeight = Math.max(12, fieldBottom - fieldTop);
      var fieldRect = new Rect(0, fieldTop, this.width - 1, fieldTop + fieldHeight);
      var key = r.dialog.activeTab + ":" + this.width + ":" + fieldHeight + ":" + (r.isNeutral ? "neutral" : r.bandDef.id);
      if (r.cachedKey !== key) {
         r.cachedBitmap = acmCreateGradientBitmap(Math.max(24, this.width - 2), Math.max(10, fieldHeight - 2), r.dialog.activeTab, r.bandDef, r.isNeutral);
         r.cachedKey = key;
      }
      g.pen = new Pen(0xff4a515c);
      g.brush = new Brush(0xff161a22);
      g.drawRect(fieldRect);
      if (r.cachedBitmap)
         g.drawScaledBitmap(new Rect(fieldRect.left + 1, fieldRect.top + 1, fieldRect.right - 1, fieldRect.bottom - 1), r.cachedBitmap);
      var cy = Math.round((fieldRect.top + fieldRect.bottom) * 0.5);
      g.pen = new Pen(0x90f2f4f8, 2);
      g.drawLine(fieldRect.left + 10, cy, fieldRect.right - 10, cy);
      var centerX = Math.round((fieldRect.left + fieldRect.right) * 0.5);
      g.pen = new Pen(0x50ffffff, 1);
      g.drawLine(centerX, fieldRect.top + 1, centerX, fieldRect.bottom - 1);
      var t = (r.value - r.minValue) / Math.max(ACM_EPSILON, r.maxValue - r.minValue);
      t = acmClamp01(t);
      var knobX = fieldRect.left + 10 + Math.round(t * Math.max(1, (fieldRect.right - fieldRect.left - 20)));
      g.pen = new Pen(0xff5f646d, 1);
      g.brush = new Brush(0xfff1f2f4);
      g.drawCircle(knobX, cy, 5);
      var selectedRowId = r.dialog && r.dialog.getHighlightedRowId ? r.dialog.getHighlightedRowId() : "";
      if ((r.isNeutral && selectedRowId === "neutral") || (!r.isNeutral && r.bandId === selectedRowId)) {
         g.pen = new Pen(0xff000000, 2);
         g.brush = new Brush(0x00000000);
         g.drawRect(new Rect(0, 0, this.width - 1, this.height - 1));
         g.pen = new Pen(0xffd02020, 4);
         g.drawRect(new Rect(3, 3, this.width - 4, this.height - 4));
      }
      g.end();
   };

   row.resetButton = acmCreateMiniResetButton(row.host);

   row.host.sizer.add(row.swatch);
   row.host.sizer.add(row.labelHost);
   row.host.sizer.add(row.edit);
   row.host.sizer.add(row.field, 100);
   row.host.sizer.add(row.resetButton);

   row.setLabel = function(text) {
      row.primaryLabelText = acmCompactMixerLabel(row.bandDef, row.isNeutral, text);
      row.labelHost.text = row.primaryLabelText;
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
      row.edit.text = acmFormatMixerDisplayValue(row.value, row.precision);
      row.field.update();
   };
   row.setPrecision = function(precision) {
      row.precision = precision;
      row.edit.text = acmFormatMixerDisplayValue(row.value, row.precision);
   };
   row.setValue = function(value) {
      row.value = acmClamp(value, row.minValue, row.maxValue);
      row.edit.text = acmFormatMixerDisplayValue(row.value, row.precision);
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
      }
   };
   row.commitValue = function(value) {
      row.activateSelection();
      row.value = acmClamp(value, row.minValue, row.maxValue);
      row.edit.text = acmFormatMixerDisplayValue(row.value, row.precision);
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

function acmPaintRangeMaskOverlay(g, rangeMask, left, top, plotW, plotH, enabled) {
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

   if (enabled) {
      if (featherLeftX < lowX) {
         g.brush = new Brush(0x60684612);
         g.fillRect(featherLeftX, top, lowX, top + plotH, g.brush);
      }
      if (lowX < highX) {
         g.brush = new Brush(0x807d5b19);
         g.fillRect(lowX, top, highX, top + plotH, g.brush);
      }
      if (highX < featherRightX) {
         g.brush = new Brush(0x60684612);
         g.fillRect(highX, top, featherRightX, top + plotH, g.brush);
      }
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
   numeric.scaledMinHeight = 9;
   if (numeric.label) {
      numeric.label.minWidth = ACM_ROW_LABEL_WIDTH;
      numeric.label.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   }
   if (numeric.edit && typeof numeric.edit.setFixedWidth === "function")
      numeric.edit.setFixedWidth(ACM_ROW_EDIT_WIDTH);
   if (numeric.slider)
      numeric.slider.minWidth = 252;
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
      if (hsl[1] < 0.02 || y < 0.015)
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

function acmComputeSelectedBandMaskData(sourceRgb, width, height, passState, imageType, mode) {
   var count = width * height;
   var masks = new Float32Array(count);
   var sourceHsl = acmApplySourceHsl(sourceRgb, width, height);
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
   for (var index = 0; index < count; ++index) {
      var hue = sourceHsl.h[index];
      var saturation = sourceHsl.s[index];
      var lightness = sourceHsl.l[index];
      var luminance = sourceHsl.y[index];
      var rangeMaskValue = acmComputeRangeMask(luminance, rangeMaskState);
      if (mode === "rangeMask") {
         masks[index] = rangeMaskValue;
         continue;
      }
      var built = acmBuildMasks(hue, saturation, lightness, band, protection, 1, rangeMaskValue);
      if (mode === "bandMask")
         masks[index] = acmClamp01(built.finalMask / Math.max(ACM_EPSILON, rangeMaskValue));
      else
         masks[index] = built.finalMask;
   }
   return masks;
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
      feather: band.feather
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
      preset: pass.rangeMask.preset
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
      Math.abs((typeof band.feather === "number" ? band.feather : 0.75) - 0.75) > ACM_EPSILON;
}

function acmRangeMaskDiffersFromDefault(rangeMask) {
   if (!rangeMask)
      return false;
   return rangeMask.enabled === true ||
      Math.abs((typeof rangeMask.low === "number" ? rangeMask.low : 0) - 0.0) > ACM_EPSILON ||
      Math.abs((typeof rangeMask.high === "number" ? rangeMask.high : 1) - 1.0) > ACM_EPSILON ||
      Math.abs((typeof rangeMask.feather === "number" ? rangeMask.feather : 0.10) - 0.10) > ACM_EPSILON ||
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
            feather: band.feather
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
            preset: pass.rangeMask.preset
         }
      });
   }

   return {
      version: state.version || "acm-recipe-1.0",
      imageType: state.imageType || "stars",
      sensitivity: state.sensitivity || "Normal",
      globalStrength: typeof state.globalStrength === "number" ? state.globalStrength : 1.0,
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
   if (!rangeMask || !rangeMask.enabled)
      return "Range Mask: Off";
   var label = rangeMask.preset && rangeMask.preset !== "All" && rangeMask.preset !== "Custom"
      ? rangeMask.preset + " · "
      : "";
   return "Range Mask: " + label + rangeMask.low.toFixed(2) + "–" + rangeMask.high.toFixed(2) + " · F " + rangeMask.feather.toFixed(2);
}

function AstroColorMixerUI03Dialog() {
   this.__base__ = Dialog;
   this.__base__();
   acmHelpHostDialog = this;

   var self = this;
   this.windowTitle = "Astro Color Mixer v0.9.6-beta";
   this.recipeFilePath = "";
   this.activeTab = ACM_TAB_SAT;
   this.activeToolPanel = "selectedBand";
   this.editorState = acmCreateBaseEditorState();
   this.bandControls = [];
   this.targetViewId = null;
   this.previewSource = null;
   this.previewOriginalRgb = null;
   this.previewAdjustedRgb = null;
   this.previewBitmapOriginal = null;
   this.previewBitmapAdjusted = null;
   this.previewBitmapBandMask = null;
   this.previewBitmapRangeMask = null;
   this.previewBitmapCombinedMask = null;
   this.previewBitmapLastPass = null;
   this.previewBandMaskRgb = null;
   this.previewRangeMaskRgb = null;
   this.previewCombinedMaskRgb = null;
   this.previewLastPassRgb = null;
   this.previewTempCompare = false;
   this.previewCompareBitmap = null;
   this.previewCompareRgb = null;
   this.previewCompareMetrics = null;
   this.previewCompareLabel = "Original";
   this.compareMode = "auto";
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
   this.headerLogoControl.scaledMinWidth = 170;
   this.headerLogoControl.scaledMinHeight = 74;
   this.headerLogoControl.onPaint = function() {
      var g = new Graphics(this);
      var dialog = this.acmDialogRef;
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
   this.headerBrandControl.scaledMinWidth = 300;
   this.headerBrandControl.scaledMinHeight = 74;
   this.headerBrandControl.onPaint = function() {
      var g = new Graphics(this);
      var mainTitle = "Astro Color Mixer";
      var versionText = "v0.9.6-beta";
      var titleFont = new Font;
      titleFont.bold = true;
      titleFont.pixelSize = 27;
      var versionFont = new Font;
      versionFont.bold = false;
      versionFont.pixelSize = 13;
      while (titleFont.pixelSize > 16) {
         g.font = titleFont;
         var totalWidth = g.font.width(mainTitle) + 8;
         g.font = versionFont;
         totalWidth += g.font.width(versionText);
         if (totalWidth <= Math.max(60, this.width - 8))
            break;
         --titleFont.pixelSize;
         if (versionFont.pixelSize > 10)
            --versionFont.pixelSize;
      }
      g.pen = new Pen(0xff101010);
      var baselineY = Math.round(this.height * 0.5 + titleFont.pixelSize * 0.25);
      g.font = titleFont;
      g.drawText(0, baselineY, mainTitle);
      var titleWidth = g.font.width(mainTitle);
      g.font = versionFont;
      g.drawText(titleWidth + 6, baselineY, versionText);
      g.end();
   };

   this.floatingHelpBox = null;
   this.floatingHelpBoxParent = null;

   this.refreshButton = new PushButton(this);
   this.refreshButton.text = "Refresh";
   this.refreshButton.toolTip = "Refreshes the list of open PixInsight images and updates target/mask status.";
   this.refreshButton.onClick = function() { self.refreshAvailableTargets(true); };

   this.targetImageLabel = new Label(this);
   this.targetImageLabel.text = "Target Image:";
   this.targetImageLabel.minWidth = 74;
   this.targetImageLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;

   this.targetImageCombo = new ComboBox(this);
   this.targetImageCombo.minWidth = 320;
   this.targetImageCombo.setFixedWidth(320);
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
   this.imageTypeLabel.minWidth = 56;
   this.imageTypeLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.imageTypeHelpButton = acmCreateHelpButton(
      this,
      "Image Type",
      "Stars Present is the safer mode for images that still contain normal stars, bright cores, and halos. Starless / Star-Reduced is intended for images where stars have been removed or greatly reduced, allowing more freedom for nebula, galaxy, dust, and faint-signal refinement. This setting does not remove stars; it changes the protection behavior used during adjustments.",
      "imageType"
   );
   this.imageTypeCombo = new ComboBox(this);
   this.imageTypeCombo.addItem("Stars Present");
   this.imageTypeCombo.addItem("Starless / Star-Reduced");
   this.imageTypeCombo.currentItem = 0;
   this.imageTypeCombo.onItemSelected = function(index) {
      self.editorState.imageType = index === 0 ? "stars" : "starless";
      self.markPreviewStale();
   };

   this.sensitivityLabel = new Label(this);
   this.sensitivityLabel.text = "Sensitivity";
   this.sensitivityLabel.setFixedWidth(56);
   this.sensitivityLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
   this.sensitivityCombo = new ComboBox(this);
   this.sensitivityCombo.addItem("Fine");
   this.sensitivityCombo.addItem("Normal");
   this.sensitivityCombo.addItem("Advanced");
   this.sensitivityCombo.currentItem = 1;
   this.sensitivityCombo.setFixedHeight(24);
   this.sensitivityCombo.setFixedWidth(104);
   this.sensitivityCombo.onItemSelected = function(index) {
      var sensitivity = self.sensitivityCombo.itemText(index);
      self.editorState.sensitivity = sensitivity;
      self.clampBandValuesForSensitivity();
      self.refreshBandControls();
      self.markPreviewStale();
   };

   this.editorState.globalStrength = 1.0;

   this.passSectionLabel = new Label(this);
   this.passSectionLabel.useRichText = true;
   this.passSectionLabel.text = "";
   this.passSectionLabel.visible = false;
   this.passSectionLabel.hide();

   this.passActiveCombo = new ComboBox(this);
   this.passActiveCombo.onItemSelected = function(index) {
      if (index < 0 || index >= self.editorState.passes.length)
         return;
      self.editorState.activePassId = self.editorState.passes[index].id;
      self.refreshFromState();
      self.markPreviewStale();
   };

   this.passEnabledCheck = new CheckBox(this);
   this.passEnabledCheck.text = "Enabled";
   this.passEnabledCheck.onCheck = function(checked) {
      self.getActivePassState().enabled = checked;
      self.refreshPassControls();
      self.markPreviewStale();
   };

   this.newPassButton = new PushButton(this);
   this.newPassButton.text = "New";
   this.newPassButton.onClick = function() { self.createNewPass(); };

   this.duplicatePassButton = new PushButton(this);
   this.duplicatePassButton.text = "Duplicate";
   this.duplicatePassButton.onClick = function() { self.duplicateActivePass(); };

   this.deletePassButton = new PushButton(this);
   this.deletePassButton.text = "Delete";
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
   this.tabHueButton.setFixedWidth(54);
   this.tabHueButton.setFixedHeight(24);
   this.tabHueButton.onClick = function() { self.setActiveTab(ACM_TAB_HUE); };

   this.tabSaturationButton = new PushButton(this);
   this.tabSaturationButton.text = "Saturation";
   this.tabSaturationButton.setFixedWidth(68);
   this.tabSaturationButton.setFixedHeight(24);
   this.tabSaturationButton.onClick = function() { self.setActiveTab(ACM_TAB_SAT); };

   this.tabLuminanceButton = new PushButton(this);
   this.tabLuminanceButton.text = "Luminance";
   this.tabLuminanceButton.setFixedWidth(70);
   this.tabLuminanceButton.setFixedHeight(24);
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
      "The Color Mixer adjusts nonlinear RGB color by band. Hue changes color direction, Saturation changes color intensity, and Luminance changes brightness for the selected color regions. The sliders affect the active Refinement Pass.",
      "colorMixer"
   );
   this.colorMixerHelpBox = acmCreateHelpBox(this);

   this.selectedBandSectionLabel = new Label(this);
   this.selectedBandSectionLabel.useRichText = true;
   this.selectedBandSectionLabel.text = "<b>Selected Band</b>";
   this.selectedBandHelpButton = acmCreateHelpButton(
      this,
      "Selected Band",
      "Selected Band controls which hue region is being shaped. The color sliders set how much to change; Hue Radius sets the outer limit on each side of the hue center, and Feather controls how quickly the selection falls from the strong core to that outer limit. Neutral / Low-Saturation is selected by low chroma rather than hue angle, so Hue Radius does not apply there.",
      "selectedBand"
   );
   this.selectedBandHelpBox = acmCreateHelpBox(this);

   this.selectedBandHelpLabel = new Label(this);
   this.selectedBandHelpLabel.wordWrapping = true;
   this.selectedBandHelpLabel.text = "Hue Radius sets the outer limit on each side of the hue center. Feather controls how quickly the selection falls from the strong core to that outer limit.";

   this.selectedBandReadoutTitle = new Label(this);
   this.selectedBandReadoutTitle.useRichText = true;
   this.selectedBandReadoutTitle.text = "<b>Selection</b>";

   this.selectedBandReadoutPrimary = new Label(this);
   this.selectedBandReadoutPrimary.useRichText = true;
   this.selectedBandReadoutPrimary.text = "<b>Hue center:</b> 0°\n<b>Hue Radius:</b> ±45°\n<b>Strong core:</b> ±11.25°";

   this.selectedBandReadoutSecondary = new Label(this);
   this.selectedBandReadoutSecondary.useRichText = true;
   this.selectedBandReadoutSecondary.text = "<b>Falloff:</b> 11.25°–45°\n<b>Affected range:</b> 315°–45°\n<b>Feather:</b> 0.75";

   this.selectedBandProfileBar = new Control(this);
   this.selectedBandProfileBar.scaledMinHeight = 26;
   this.selectedBandProfileBar.scaledMinWidth = 150;
   this.selectedBandProfileBar.acmDialogRef = this;
   this.selectedBandProfileBar.toolTip = "Mask response profile. Bright center = strong core, darker shoulders = feather falloff, dark ends = off.";
   this.selectedBandProfileBar.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0xff404854);
      g.brush = new Brush(0xff161a22);
      g.drawRect(this.boundsRect);
      var left = 6;
      var right = this.width - 6;
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
         g.pen = new Pen(0xfff5f5f5, 1);
         g.drawLine(centerX, top - 1, centerX, bottom + 1);
         g.pen = new Pen(0xffd9dce2, 1);
         g.drawLine(centerX - innerDx, top - 1, centerX - innerDx, bottom + 1);
         g.drawLine(centerX + innerDx, top - 1, centerX + innerDx, bottom + 1);
         g.pen = new Pen(0xff8f97a3, 1);
         g.drawLine(centerX - outerDx, top - 1, centerX - outerDx, bottom + 1);
         g.drawLine(centerX + outerDx, top - 1, centerX + outerDx, bottom + 1);
      }
      g.end();
   };

   this.selectedBandReadoutPanel = new Control(this);
   this.selectedBandReadoutPanel.scaledMinWidth = 150;
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
       self.markPreviewStale();
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
      self.markPreviewStale();
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
      self.markPreviewStale();
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
      self.markPreviewStale();
   };

   this.rangeMaskPresetLabel = new Label(this);
   this.rangeMaskPresetLabel.text = "Preset";
   this.rangeMaskPresetCombo = new ComboBox(this);
   var presetDefs = acmGetRangeMaskPresetDefs();
   for (var presetIndex = 0; presetIndex < presetDefs.length; ++presetIndex)
      this.rangeMaskPresetCombo.addItem(presetDefs[presetIndex].name);
   this.rangeMaskPresetCombo.onItemSelected = function(index) {
      self.applyRangeMaskPreset(self.rangeMaskPresetCombo.itemText(index));
      self.markPreviewStale();
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
      self.markPreviewStale();
   };
   acmAttachPreviewSliderHooks(this, this.rangeMaskLowControl);

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
      self.markPreviewStale();
   };
   acmAttachPreviewSliderHooks(this, this.rangeMaskHighControl);

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
      self.markPreviewStale();
   };
   acmAttachPreviewSliderHooks(this, this.rangeMaskFeatherControl);

   this.resetRangeMaskButton = new PushButton(this);
   this.resetRangeMaskButton.text = "Reset Range Mask";
   this.resetRangeMaskButton.onClick = function() {
      self.resetRangeMask();
   };

   this.rangeMaskStatusLabel = new Label(this);
   this.rangeMaskStatusLabel.wordWrapping = true;

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
      "Preview uses downsampled data for speed. At 6x and higher, Auto preview switches to Detail Crop Preview and renders the visible region from source pixels instead of only enlarging the fast preview. Apply to New Image processes the full-resolution image. Mask views show what the active selection or Range Mask is affecting.",
      "preview"
   );
   this.previewHelpBox = acmCreateHelpBox(this);
   this.previewModeCombo = new ComboBox(this);
   this.previewModeCombo.addItem("Adjusted");
   this.previewModeCombo.addItem("Original");
   this.previewModeCombo.addItem("Current Band Mask");
   this.previewModeCombo.addItem("Range Mask");
   this.previewModeCombo.addItem("Combined Mask");
   this.previewModeCombo.currentItem = 0;
   this.previewModeCombo.setFixedWidth(168);
   this.previewModeCombo.onItemSelected = function(index) {
      var modeMap = {
         "Adjusted": "adjusted",
         "Original": "original",
         "Current Band Mask": "bandMask",
         "Range Mask": "rangeMask",
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
   this.previewInteractionHintLabel.wordWrapping = true;
   this.previewInteractionHintLabel.text =
      "Click: probe · Hold: compare · Drag: pan";
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

   this.diagnosticsSectionLabel = new Label(this);
   this.diagnosticsSectionLabel.useRichText = true;
   this.diagnosticsSectionLabel.text = "<b>Diagnostics &amp; Passes</b>";
   this.diagnosticsHelpButton = acmCreateHelpButton(
      this,
      "Diagnostics",
      "Click the preview to probe a pixel. The histogram shows preview luminance distribution and helps you place Low, High, and Feather when Range Mask is enabled. The polar plot shows sampled preview pixels by hue angle and saturation radius.",
      "diagnostics"
   );
   this.diagnosticsHelpBox = acmCreateHelpBox(this);

   this.diagnosticsHelpLabel = new Label(this);
   this.diagnosticsHelpLabel.wordWrapping = true;
   this.diagnosticsHelpLabel.text = "Preview-resolution diagnostics";
   this.diagnosticsHelpLabel.visible = false;
   this.diagnosticsHelpLabel.hide();

   this.histogramLabel = new Label(this);
   this.histogramLabel.useRichText = true;
   this.histogramLabel.text = "<b>Histogram</b>";

   this.histogramControl = new Control(this);
   this.histogramControl.scaledMinHeight = 104;
   this.histogramControl.acmDialogRef = this;
   this.histogramControl.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0xff404854);
      g.brush = new Brush(0xff161a22);
      g.drawRect(this.boundsRect);
      var dialog = this.acmDialogRef;
      var data = dialog.histogramData;
      var left = 8;
      var top = 8;
      var plotW = Math.max(1, this.width - 16);
      var plotH = Math.max(1, this.height - 16);
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
            g.pen = new Pen(0xff00f5ff, 3);
            g.drawLine(probeX - 1, top, probeX - 1, top + plotH);
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

   this.polarLabel = new Label(this);
   this.polarLabel.useRichText = true;
   this.polarLabel.text = "<b>Polar Plot</b>";

   this.polarControl = new Control(this);
   this.polarControl.scaledMinHeight = 104;
   this.polarControl.acmDialogRef = this;
   this.polarControl.onPaint = function() {
      var g = new Graphics(this);
      g.pen = new Pen(0xff404854);
      g.brush = new Brush(0xff161a22);
      g.drawRect(this.boundsRect);
      var dialog = this.acmDialogRef;
      var cx = Math.round(this.width * 0.5);
      var cy = Math.round(this.height * 0.5);
      var radius = Math.max(12, Math.min(this.width, this.height) * 0.42);
      g.pen = new Pen(0xff7a838f, 1);
      for (var ring = 1; ring <= 4; ++ring) {
         var rr = Math.round(radius * ring / 4);
         g.drawEllipse(cx - rr, cy - rr, cx + rr, cy + rr);
      }
      for (var deg = 0; deg < 360; deg += 30) {
         var rad = deg * Math.PI / 180;
         var x = cx + Math.round(Math.cos(rad) * radius);
         var y = cy - Math.round(Math.sin(rad) * radius);
         g.drawLine(cx, cy, x, y);
      }
      var points = dialog.polarSamples || [];
      for (var i = 0; i < points.length; ++i) {
         var p = points[i];
         var radp = p.h * Math.PI / 180;
         var rp = Math.max(2, p.s * radius);
         var px = cx + Math.round(Math.cos(radp) * rp);
         var py = cy - Math.round(Math.sin(radp) * rp);
         var color = 0xff000000 | ((Math.round(p.r * 255) & 0xff) << 16) | ((Math.round(p.g * 255) & 0xff) << 8) | (Math.round(p.b * 255) & 0xff);
         g.pen = new Pen(color, 1);
         g.drawLine(px - 1, py, px + 1, py);
         g.drawLine(px, py - 1, px, py + 1);
      }
      if (dialog.probeData) {
         var probeRad = dialog.probeData.h * Math.PI / 180;
         var probeR = dialog.probeData.s * radius;
         var mx = cx + Math.round(Math.cos(probeRad) * probeR);
         var my = cy - Math.round(Math.sin(probeRad) * probeR);
         g.pen = new Pen(0xffffd86a, 1);
         g.drawEllipse(mx - 5, my - 5, mx + 5, my + 5);
         g.pen = new Pen(0xfffff3c2, 1);
         g.drawEllipse(mx - 2, my - 2, mx + 2, my + 2);
         g.pen = new Pen(0xffffd86a, 1);
         g.drawLine(mx - 7, my, mx - 3, my);
         g.drawLine(mx + 3, my, mx + 7, my);
         g.drawLine(mx, my - 7, mx, my - 3);
         g.drawLine(mx, my + 3, mx, my + 7);
      }
      g.end();
   };

   this.probeReadoutLabel = new Label(this);
   this.probeReadoutLabel.wordWrapping = true;
   this.probeReadoutLabel.text = "Preview-resolution diagnostics · Probe: none";

   this.autoSelectProbeBandCheck = new CheckBox(this);
   this.autoSelectProbeBandCheck.text = "Auto-select band from probe";
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
      "A Refinement Pass is an editable set of adjustments. Use the Base Pass for broad/global color work, then add new passes for targeted refinements such as Range Mask background changes or halo cleanup. Enabled passes are applied sequentially.",
      "refinementPass"
   );
   this.refinementPassHelpBox = acmCreateHelpBox(this);
   this.refinementPassHelpBox.visible = false;
   this.refinementPassHelpBox.hide();

   this.passViewerHost = new ScrollBox(this);
   this.passViewerHost.autoScroll = false;
   this.passViewerHost.tracking = true;
   this.passViewerHost.setFixedHeight(88);
   this.passViewerHost.viewport.acmDialogRef = this;
   this.passViewerHost.viewport.sizer = new VerticalSizer;
   this.passViewerHost.viewport.sizer.margin = 0;
   this.passViewerHost.viewport.sizer.spacing = 0;
   this.passViewerHost.viewport.onResize = function() {
      if (this.acmDialogRef)
         this.acmDialogRef.updatePassViewerScrollBars();
   };
   this.passViewerBody = new Control(this.passViewerHost.viewport);
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
   footerFont.pixelSize = 9;
   this.footerNoticeLabel.font = footerFont;
   this.footerNoticeLabel.scaledMinHeight = 12;

   this.previewOutputHelpLabel = new Label(this);
   this.previewOutputHelpLabel.wordWrapping = true;
   this.previewOutputHelpLabel.text = "Use the preview to judge settings first. 'Create Image' leaves the target unchanged. 'Apply to Target' writes the adjusted result back and respects the active PixInsight mask.";
   var previewOutputHelpFont = new Font;
   previewOutputHelpFont.pixelSize = 10;
   this.previewOutputHelpLabel.font = previewOutputHelpFont;

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
   this.applyButton.defaultButton = true;
   this.applyButton.toolTip = "Creates a new adjusted image window and leaves the target unchanged.";
   this.applyButton.onClick = function() { self.handlePrimaryOutputAction(); };

   this.applyToTargetButton = new PushButton(this);
   this.applyToTargetButton.text = "Apply to Target";
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
   this.technicalButton.text = "Technical Appendix";
   this.technicalButton.setFixedWidth(140);
   this.technicalButton.onClick = function() { self.showDocumentation("technical"); };

   this.aboutButton = new PushButton(this);
   this.aboutButton.text = "About";
   this.aboutButton.setFixedWidth(82);
   this.aboutButton.onClick = function() { self.showDocumentation("about"); };

   this.closeButton = new PushButton(this);
   this.closeButton.text = "Close";
   this.closeButton.onClick = function() { self.cancel(); };

   this.faqButton.setFixedWidth(118);
   this.technicalButton.setFixedWidth(118);
   this.aboutButton.setFixedWidth(118);
   this.imageTypeCombo.setFixedWidth(180);
   this.activeStatusLabel.minWidth = 0;

   var targetTopRow = new HorizontalSizer;
   targetTopRow.spacing = 4;
   targetTopRow.add(this.targetImageLabel);
   targetTopRow.add(this.targetImageCombo);
   targetTopRow.add(this.refreshButton);
   targetTopRow.addStretch();

   var targetBottomRow = new HorizontalSizer;
   targetBottomRow.spacing = 4;
   targetBottomRow.addSpacing(78);
   targetBottomRow.add(this.activeStatusLabel);
   targetBottomRow.addSpacing(6);
   targetBottomRow.add(this.pendingChangesLabel);
   targetBottomRow.addStretch();

   var targetModeRow = new HorizontalSizer;
   targetModeRow.spacing = 4;
   targetModeRow.addSpacing(78);
   targetModeRow.add(this.imageTypeLabel);
   targetModeRow.add(this.imageTypeHelpButton);
   targetModeRow.add(this.imageTypeCombo);
   targetModeRow.addStretch();

   var targetColumn = new VerticalSizer;
   targetColumn.margin = 0;
   targetColumn.spacing = 2;
   targetColumn.add(targetTopRow);
   targetColumn.add(targetBottomRow);
   targetColumn.add(targetModeRow);

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
   workflowRow.addStretch();
   workflowRow.add(targetColumn, 100);
   workflowRow.addStretch();
   workflowRow.addSpacing(8);
   workflowRow.add(rightMetaRow);

   var passControlsRow = new HorizontalSizer;
   passControlsRow.spacing = 6;
   passControlsRow.add(this.passActiveCombo, 100);
   passControlsRow.add(this.passEnabledCheck);
   passControlsRow.add(this.newPassButton);
   passControlsRow.add(this.duplicatePassButton);
   passControlsRow.add(this.deletePassButton);

   var selectedBandRow = new HorizontalSizer;
   selectedBandRow.spacing = 8;
   selectedBandRow.add(this.selectedBandLabel);
   selectedBandRow.add(this.selectedBandCombo, 100);
   selectedBandRow.add(this.resetSelectedButton);

   var selectedBandControlsRow = new HorizontalSizer;
   selectedBandControlsRow.spacing = 8;
   selectedBandControlsRow.add(this.widthControl, 100);
   selectedBandControlsRow.add(this.featherControl, 100);

   var selectedBandVizRow = new HorizontalSizer;
   selectedBandVizRow.spacing = 10;
   selectedBandVizRow.add(this.selectedBandViz, 100);
   selectedBandVizRow.add(this.selectedBandReadoutPanel);

   var tabsRow = new HorizontalSizer;
   tabsRow.spacing = 0;
   tabsRow.add(this.tabHueButton);
   tabsRow.add(this.tabSaturationButton);
   tabsRow.add(this.tabLuminanceButton);
   var colorMixerSensitivityRow = new HorizontalSizer;
   colorMixerSensitivityRow.spacing = 2;
   colorMixerSensitivityRow.add(this.sensitivityLabel);
   colorMixerSensitivityRow.add(this.sensitivityCombo);
   tabsRow.addSpacing(8);
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

   var selectedBandHeaderRow = new HorizontalSizer;
   selectedBandHeaderRow.spacing = 4;
   selectedBandHeaderRow.add(this.selectedBandSectionLabel);
   selectedBandHeaderRow.add(this.selectedBandHelpButton);
   selectedBandHeaderRow.addStretch();

   var rangeMaskHeaderRow = new HorizontalSizer;
   rangeMaskHeaderRow.spacing = 4;
   rangeMaskHeaderRow.add(this.rangeMaskSectionLabel);
   rangeMaskHeaderRow.add(this.rangeMaskHelpButton);
   rangeMaskHeaderRow.addStretch();

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

   var previewOutputHeaderRow = new HorizontalSizer;
   previewOutputHeaderRow.spacing = 4;
   previewOutputHeaderRow.add(this.previewOutputSectionLabel);
   previewOutputHeaderRow.addStretch();

   this.colorMixerPanel = new Control(this);
   this.colorMixerPanel.sizer = new VerticalSizer;
   this.colorMixerPanel.sizer.margin = 0;
   this.colorMixerPanel.sizer.spacing = 0;
   this.colorMixerPanel.sizer.add(tabsRow);
   this.colorMixerPanel.sizer.addSpacing(4);
   this.colorMixerPanel.sizer.add(this.bandSectionLabel);
    this.colorMixerPanel.sizer.add(this.bandControlsHost, 100);
   this.colorMixerPanel.visible = true;

   this.selectedBandPanel = new Control(this);
   this.selectedBandPanel.sizer = new VerticalSizer;
   this.selectedBandPanel.sizer.margin = 0;
   this.selectedBandPanel.sizer.spacing = 3;
   this.selectedBandPanel.sizer.add(selectedBandHeaderRow);
   this.selectedBandPanel.sizer.add(selectedBandRow);
   this.selectedBandPanel.sizer.add(selectedBandControlsRow);
   this.selectedBandPanel.sizer.add(this.selectedBandHelpLabel);
   this.selectedBandPanel.sizer.add(selectedBandVizRow, 100);
   this.selectedBandPanel.visible = true;

   this.rangeMaskPanel = new Control(this);
   this.rangeMaskPanel.sizer = new VerticalSizer;
   this.rangeMaskPanel.sizer.margin = 0;
   this.rangeMaskPanel.sizer.spacing = 2;
   this.rangeMaskPanel.sizer.add(rangeMaskHeaderRow);
   this.rangeMaskPanel.sizer.add(this.rangeMaskEnabledCheck);
   this.rangeMaskPanel.sizer.add(rangeMaskPresetRow);
   this.rangeMaskPanel.sizer.add(this.rangeMaskLowControl);
   this.rangeMaskPanel.sizer.add(this.rangeMaskHighControl);
   this.rangeMaskPanel.sizer.add(this.rangeMaskFeatherControl);
   this.rangeMaskPanel.sizer.add(this.rangeMaskStatusLabel);
   this.rangeMaskPanel.visible = true;

   var diagnosticsMetaRow = new HorizontalSizer;
   diagnosticsMetaRow.spacing = 8;
   diagnosticsMetaRow.add(this.probeReadoutLabel, 100);
   diagnosticsMetaRow.add(this.autoSelectProbeBandCheck);

   var histogramPanel = new Control(this);
   histogramPanel.sizer = new VerticalSizer;
   histogramPanel.sizer.margin = 0;
   histogramPanel.sizer.spacing = 2;
   histogramPanel.sizer.add(this.histogramLabel);
   histogramPanel.sizer.add(this.histogramControl, 100);
   histogramPanel.sizer.add(this.histogramRampControl);

   var polarPanel = new Control(this);
   polarPanel.sizer = new VerticalSizer;
   polarPanel.sizer.margin = 0;
   polarPanel.sizer.spacing = 2;
   polarPanel.sizer.add(this.polarLabel);
   polarPanel.sizer.add(this.polarControl, 100);

   var passViewerPanel = new Control(this);
   this.passViewerPanel = passViewerPanel;
   passViewerPanel.sizer = new VerticalSizer;
   passViewerPanel.sizer.margin = 0;
   passViewerPanel.sizer.spacing = 2;
   passViewerPanel.sizer.add(passViewerHeaderRow);
   passViewerPanel.sizer.add(this.refinementPassHelpBox);
   passViewerPanel.sizer.add(passControlsRow);
   passViewerPanel.sizer.add(this.passViewerHost, 100);

   var diagnosticsPlotsRow = new HorizontalSizer;
   diagnosticsPlotsRow.spacing = 8;
   diagnosticsPlotsRow.add(histogramPanel, 40);
   diagnosticsPlotsRow.add(polarPanel, 29);
   diagnosticsPlotsRow.add(passViewerPanel, 31);

   this.diagnosticsPanel = new Control(this);
   this.diagnosticsPanel.sizer = new VerticalSizer;
   this.diagnosticsPanel.sizer.margin = 0;
   this.diagnosticsPanel.sizer.spacing = 2;
   this.diagnosticsPanel.sizer.add(diagnosticsHeaderRow);
   this.diagnosticsPanel.sizer.add(this.diagnosticsHelpLabel);
   this.diagnosticsPanel.sizer.add(diagnosticsMetaRow);
   this.diagnosticsPanel.sizer.add(diagnosticsPlotsRow);
   this.diagnosticsPanel.visible = true;
   this.refinementPassHelpButton.acmDialogRef = this;
   this.refinementPassHelpButton.onMousePress = function() {
      if (this.acmDialogRef)
         this.acmDialogRef.togglePassViewerInlineHelp();
   };
   this.refinementPassHelpButton.onMouseRelease = function() {};

   var previewOutputButtonsRow = new HorizontalSizer;
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
   bottomActionsRow.spacing = 8;
   bottomActionsRow.add(recipeButtonGroup);
   bottomActionsRow.addStretch();
   bottomActionsRow.add(this.closeButton);

   this.previewOutputPanel = new Control(this);
   this.previewOutputPanel.sizer = new VerticalSizer;
   this.previewOutputPanel.sizer.margin = 0;
   this.previewOutputPanel.sizer.spacing = 4;
   this.previewOutputPanel.sizer.add(previewOutputHeaderRow);
   this.previewOutputPanel.sizer.add(this.previewOutputHelpLabel);
   this.previewOutputPanel.sizer.add(previewOutputButtonsRow);
   this.previewOutputPanel.sizer.add(this.outputFeedbackLabel);
   this.previewOutputPanel.sizer.addStretch();
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
         this.acmDialogRef.toggleRecipeInlineHelp();
   };
   this.recipeHelpButton.onMouseRelease = function() {};

   this.leftPanel = new Control(this);
   this.leftPanel.scaledMinWidth = 425;
   this.leftPanel.maxWidth = 455;
   this.leftPanel.sizer = new VerticalSizer;
   this.leftPanel.sizer.margin = 0;
   this.leftPanel.sizer.spacing = 3;
   var colorMixerGroup = new GroupBox(this.leftPanel);
   colorMixerGroup.title = "";
   colorMixerGroup.sizer = new VerticalSizer;
   colorMixerGroup.sizer.margin = 0;
   colorMixerGroup.sizer.spacing = 0;
   var colorMixerTitleLabel = new Label(this.leftPanel);
   colorMixerTitleLabel.useRichText = true;
   colorMixerTitleLabel.text = "<b><color=#2a5db0>Color Mixer</color></b>";
   var colorMixerTitleHelpRow = new HorizontalSizer;
   colorMixerTitleHelpRow.spacing = 4;
   colorMixerTitleHelpRow.add(colorMixerTitleLabel);
   colorMixerTitleHelpRow.add(this.colorMixerHelpButton);
   colorMixerTitleHelpRow.addStretch();
   colorMixerGroup.sizer.add(colorMixerTitleHelpRow);
   colorMixerGroup.sizer.add(this.colorMixerPanel, 100);
   var workflowToolsGroup = new GroupBox(this.leftPanel);
   workflowToolsGroup.title = "Context Tools";
   workflowToolsGroup.sizer = new VerticalSizer;
   workflowToolsGroup.sizer.margin = 4;
   workflowToolsGroup.sizer.spacing = 2;
   workflowToolsGroup.sizer.add(workflowTabsRow);
   workflowToolsGroup.sizer.add(this.selectedBandPanel);
   workflowToolsGroup.sizer.add(this.rangeMaskPanel);

   var previewOutputGroup = new GroupBox(this.leftPanel);
   previewOutputGroup.title = "Output";
   previewOutputGroup.sizer = new VerticalSizer;
   previewOutputGroup.sizer.margin = 4;
   previewOutputGroup.sizer.spacing = 2;
   previewOutputGroup.sizer.add(this.previewOutputPanel);
   this.leftPanel.sizer.add(colorMixerGroup, 100);
   this.leftPanel.sizer.add(workflowToolsGroup);
   this.leftPanel.sizer.add(previewOutputGroup);

   this.rightPanel = new Control(this);
   this.rightPanel.sizer = new VerticalSizer;
   this.rightPanel.sizer.margin = 0;
   this.rightPanel.sizer.spacing = 3;
   this.rightPanel.sizer.add(previewToolbarColumn);
   this.rightPanel.sizer.add(this.previewHost, 100);
   this.rightPanel.sizer.add(this.diagnosticsPanel);

   var mainContentRow = new HorizontalSizer;
   mainContentRow.spacing = 8;
   mainContentRow.add(this.leftPanel, 24);
   mainContentRow.add(this.rightPanel, 76);

   var globalSettingsGroup = new GroupBox(this);
   globalSettingsGroup.title = "Global Settings";
   globalSettingsGroup.sizer = new VerticalSizer;
   globalSettingsGroup.sizer.margin = 8;
   globalSettingsGroup.sizer.spacing = 0;
   globalSettingsGroup.sizer.add(workflowRow);
   globalSettingsGroup.title = "Target && Workflow";

   this.sizer = new VerticalSizer;
   this.sizer.margin = 8;
   this.sizer.spacing = 3;
   this.sizer.add(globalSettingsGroup);
   this.sizer.add(mainContentRow, 100);

   this.updateActiveStatus();
   this.refreshFromState();
   if (ACM_LAST_RECIPE_PATH)
      this.loadRecipePath(ACM_LAST_RECIPE_PATH);

   this.adjustToContents();
   acmConfigureResponsiveDialogBounds(this);
   this.refreshActiveSource();
   this.refreshBandControls();
   this.bandControlsHost.update();
   this.neutralRowHost.update();
   if (this.autoPreviewCheck.checked)
      this.requestPreviewUpdate(true);

   this.onResize = function() {
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

var AstroColorMixerPOC8Dialog = AstroColorMixerUI03Dialog;
AstroColorMixerUI03Dialog.prototype = new Dialog;

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
   box.titleLabel.text = "<b>" + title + "</b>";
   box.bodyLabel.text = text;
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
   var w = Math.max(box.width, 240);
   var h = Math.max(box.height, 56);
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
   box.titleLabel.text = "<b>Adjustment Set</b>";
   box.bodyLabel.text = this.recipeHelpButton ? this.recipeHelpButton.acmHelpText : "";
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
   box.titleLabel.text = "<b>Refinement Pass</b>";
   box.bodyLabel.text = this.refinementPassHelpButton ? this.refinementPassHelpButton.acmHelpText : "";
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
   this.passEnabledCheck.checked = activePass.enabled !== false;
   this.deletePassButton.enabled = activePass.id !== "pass-1";
   this.passSummaryLabel.text = "Active Pass: " + activePass.name + "\n" + activePass.name + " · " + acmSummarizePass(activePass) + " · " + acmSummarizeRangeMask(activePass.rangeMask);
   this.passCountLabel.text = "Passes: " + acmCountEnabledPasses(this.editorState) + " enabled / " + this.editorState.passes.length + " total";
};

AstroColorMixerPOC8Dialog.prototype.refreshPassControls = function() {
   while (this.passActiveCombo.numberOfItems > 0)
      this.passActiveCombo.removeItem(0);
   var activeIndex = 0;
   for (var i = 0; i < this.editorState.passes.length; ++i) {
      var pass = this.editorState.passes[i];
      this.passActiveCombo.addItem(pass.name);
      if (pass.id === this.editorState.activePassId)
         activeIndex = i;
   }
   if (this.passActiveCombo.numberOfItems > 0)
      this.passActiveCombo.currentItem = activeIndex;
   this.refreshPassSummary();
   this.refreshPassViewer();
};

AstroColorMixerPOC8Dialog.prototype.syncPendingChangesIndicator = function() {
   this.pendingChanges = acmEditorStateHasPendingChanges(this.editorState);
   if (this.pendingChangesLabel)
      this.pendingChangesLabel.text = this.pendingChanges ? "Pending changes" : "";
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
         this.previewOriginalRgb = null;
         this.previewAdjustedRgb = null;
         this.previewBitmapOriginal = null;
         this.previewBitmapAdjusted = null;
         this.previewBitmapBandMask = null;
         this.previewBitmapRangeMask = null;
         this.previewBitmapCombinedMask = null;
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
   if (target.viewId === this.targetViewId)
      return;
   this.switchTargetImage(target.viewId);
};

AstroColorMixerPOC8Dialog.prototype.loadTargetByViewId = function(viewId, resetZoom, feedbackText) {
   var target = acmReadRgbImageForViewId(viewId);
   var preview = acmDownsampleRgbNearest(target.rgb, target.width, target.height, this.previewCacheMaxEdge);
   this.targetViewId = target.viewId;
   this.sourceView = { viewId: target.viewId, width: target.width, height: target.height };
   this.previewSource = preview;
   this.previewOriginalRgb = preview.rgb;
   this.previewAdjustedRgb = null;
   this.previewBandMaskRgb = null;
   this.previewRangeMaskRgb = null;
   this.previewCombinedMaskRgb = null;
   this.previewLastPassRgb = null;
   this.previewBitmapOriginal = acmRenderBitmapFromRgb(preview.width, preview.height, preview.rgb);
   this.previewBitmapAdjusted = null;
   this.previewBitmapLastPass = null;
   this.previewBitmapBandMask = null;
   this.previewBitmapRangeMask = null;
   this.previewBitmapCombinedMask = null;
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
   this.passViewerBody.sizer = new VerticalSizer;
   this.passViewerBody.sizer.margin = 0;
   this.passViewerBody.sizer.spacing = 1;
   this.passViewerHost.viewport.sizer.add(this.passViewerBody);
   this.passViewerRows = [];
   var self = this;
   var passRowFont = new Font;
   passRowFont.pixelSize = 9;
   for (var i = 0; i < this.editorState.passes.length; ++i) {
      var pass = this.editorState.passes[i];
      var rowBar = new HorizontalSizer;
      rowBar.spacing = 2;
      var rowSelect = new RadioButton(this.passViewerBody);
      rowSelect.text = (pass.enabled !== false ? "✓ " : "□ ") + pass.name + " · " + acmSummarizePass(pass) + " · " + acmSummarizeRangeMask(pass.rangeMask);
      rowSelect.toolTip = rowSelect.text;
      rowSelect.font = passRowFont;
      rowSelect.checked = pass.id === this.editorState.activePassId;
      rowSelect.scaledMinHeight = 10;
      rowSelect.passId = pass.id;
      rowSelect.onCheck = function(checked) {
         if (!checked)
            return;
         self.editorState.activePassId = this.passId;
         self.refreshFromState();
         self.markPreviewStale();
      };
      rowBar.add(rowSelect, 100);
      if (pass.id !== "pass-1") {
         var deleteButton = acmCreateTinyDeleteButton(this.passViewerBody, "Delete " + pass.name, (function(passId) {
            return function() {
               self.editorState.activePassId = passId;
               self.deleteActivePass();
            };
         })(pass.id));
         rowBar.addSpacing(4);
         rowBar.add(deleteButton);
         rowBar.addSpacing(3);
      }
      this.passViewerBody.sizer.add(rowBar);
   }
   this.updatePassViewerScrollBars();
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
      case "bandMask":
         return this.previewDetailCache.bandMaskBitmap || this.previewBitmapBandMask || this.previewBitmapOriginal;
      case "rangeMask":
         return this.previewDetailCache.rangeMaskBitmap || this.previewBitmapRangeMask || this.previewBitmapOriginal;
      case "combinedMask":
         return this.previewDetailCache.combinedMaskBitmap || this.previewBitmapCombinedMask || this.previewBitmapOriginal;
      case "adjusted":
      default:
         return this.previewDetailCache.adjustedBitmap || this.previewBitmapAdjusted || this.previewBitmapOriginal;
      }
   }
   switch (this.previewMode) {
   case "original":
      return this.previewBitmapOriginal;
   case "bandMask":
      return this.previewBitmapBandMask || this.previewBitmapOriginal;
   case "rangeMask":
      return this.previewBitmapRangeMask || this.previewBitmapOriginal;
   case "combinedMask":
      return this.previewBitmapCombinedMask || this.previewBitmapOriginal;
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

AstroColorMixerPOC8Dialog.prototype.createNewPass = function() {
   var pass = acmCreateDefaultPass(this.makeNextPassId(), this.makeNextPassName());
   this.editorState.passes.push(pass);
   this.editorState.activePassId = pass.id;
   this.refreshFromState();
   this.markPreviewStale();
};

AstroColorMixerPOC8Dialog.prototype.duplicateActivePass = function() {
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
   var currentPass = this.getActivePassState();
   var pass = acmCreateDefaultPass(this.makeNextPassId(), this.makeNextPassName() + ": Range Mask");
   pass.rangeMask.enabled = true;
   pass.rangeMask.low = currentPass.rangeMask.low;
   pass.rangeMask.high = currentPass.rangeMask.high;
   pass.rangeMask.feather = currentPass.rangeMask.feather;
   pass.rangeMask.preset = presetName || "Custom";
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
      this.previewOriginalRgb = null;
      this.previewAdjustedRgb = null;
      this.previewBitmapOriginal = null;
      this.previewBitmapAdjusted = null;
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
   this.toolSelectedBandButton.enabled = this.activeToolPanel !== "selectedBand";
   this.toolRangeMaskButton.enabled = this.activeToolPanel !== "rangeMask";
};

AstroColorMixerPOC8Dialog.prototype.setActiveToolPanel = function(panelKey) {
   this.activeToolPanel = panelKey;
   this.selectedBandPanel.visible = panelKey === "selectedBand";
   this.rangeMaskPanel.visible = panelKey === "rangeMask";
   this.diagnosticsPanel.visible = true;
   this.previewOutputPanel.visible = true;
   this.refreshToolTabButtons();
   this.adjustToContents();
};

AstroColorMixerPOC8Dialog.prototype.refreshSelectedBandReadoutAndVisualization = function(updateText) {
   if (updateText == null)
      updateText = !this.deferSelectedBandTextUpdates;
   var selectedBand = this.getSelectedBand();
   var neutralActive = this.activeTab === ACM_TAB_LUM && this.getHighlightedRowId && this.getHighlightedRowId() === "neutral";
   var effectiveRange = acmComputeSelectedBandRange(selectedBand.center, selectedBand.width);
   if (updateText) {
      if (neutralActive) {
         this.selectedBandHelpLabel.text = "Neutral / Low-Saturation is selected by low chroma, not hue angle. Feather softens the transition into more saturated color.";
         if (this.selectedBandReadoutPrimary)
            this.selectedBandReadoutPrimary.text = "<b>Selection:</b> Low-saturation\n<b>Hue Radius:</b> Not used";
         if (this.selectedBandReadoutSecondary)
            this.selectedBandReadoutSecondary.text = "<b>Feather:</b> " + selectedBand.feather.toFixed(2);
      } else {
         var outerWidth = selectedBand.width;
         var innerWidth = selectedBand.feather <= ACM_EPSILON ? outerWidth : outerWidth * (1 - selectedBand.feather);
         innerWidth = acmClamp(innerWidth, 0, outerWidth);
         this.selectedBandHelpLabel.text = "Hue Radius sets the outer limit on each side of the hue center. Feather controls how quickly the selection falls from the strong core to that outer limit.";
         if (this.selectedBandReadoutPrimary)
            this.selectedBandReadoutPrimary.text = "<b>Hue center:</b> " + selectedBand.center + "°\n<b>Hue Radius:</b> ±" + acmFormatAngleDegrees(outerWidth) + "°\n<b>Strong core:</b> ±" + acmFormatAngleDegrees(innerWidth) + "°";
         if (this.selectedBandReadoutSecondary)
            this.selectedBandReadoutSecondary.text = "<b>Falloff:</b> " + acmFormatAngleDegrees(innerWidth) + "°–" + acmFormatAngleDegrees(outerWidth) + "°\n<b>Affected range:</b> " + effectiveRange.low + "°–" + effectiveRange.high + "°\n<b>Feather:</b> " + selectedBand.feather.toFixed(2);
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
   this.widthControl.label.text = neutralActive ? "Hue Radius: Not used" : "Hue Radius:";
   this.widthControl.enabled = !neutralActive;
   if (this.widthControl.slider)
      this.widthControl.slider.enabled = !neutralActive;
   if (this.widthControl.edit)
      this.widthControl.edit.enabled = !neutralActive;
   this.widthControl.setValue(selectedBand.width);
   this.featherControl.setValue(selectedBand.feather);
   this.refreshSelectedBandReadoutAndVisualization();
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
   this.rangeMaskStatusLabel.text = acmSummarizeRangeMaskStatus(rangeMask);
};

AstroColorMixerPOC8Dialog.prototype.refreshPreviewModeButtons = function() {
   var items = [
      { id: "adjusted", label: "Adjusted" },
      { id: "original", label: "Original" },
      { id: "bandMask", label: "Current Band Mask" },
      { id: "combinedMask", label: "Combined Mask" }
   ];
   if (this.getActivePassState().rangeMask.enabled)
      items.splice(3, 0, { id: "rangeMask", label: "Range Mask" });
   if (this.previewMode === "rangeMask" && !this.getActivePassState().rangeMask.enabled)
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
   if (this.previewBitmapLastPass && this.previewLastPassRgb)
      return this.buildDetailCompareReference("lastPass") || {
         mode: "lastPass",
         label: "Last Pass",
         rgb: this.previewLastPassRgb,
         bitmap: this.previewBitmapLastPass
      };
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
         this.applyButton.text = "Create Range Mask";
      else if (this.previewMode === "combinedMask")
         this.applyButton.text = "Create Combined Mask";
      else
         this.applyButton.text = "Create Band Mask";
      if (this.applyToTargetButton)
         this.applyToTargetButton.enabled = false;
   } else {
      this.applyButton.text = "Create New Image";
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
   return this.previewMode === "bandMask" || this.previewMode === "rangeMask" || this.previewMode === "combinedMask";
};

AstroColorMixerPOC8Dialog.prototype.markPreviewStale = function() {
   this.previewIsStale = true;
   this.previewDetailCache = null;
   ++this.previewDetailStamp;
   this.syncPendingChangesIndicator();
   this.refreshPassSummary();
   this.refreshPassViewer();
   this.previewStatusLabel.text = this.previewMode === "original" ? "Preview: Original · Adjusted stale" : "Preview stale — click Update Preview";
   this.refreshDiagnosticsData();
   if (this.autoPreviewCheck.checked)
      this.requestPreviewUpdate();
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
      else
         this.previewStatusLabel.text = this.previewMode === "original" ? "Preview: Original · Detail Crop" : "Preview: Detail Crop";
   } else if (this.previewMode === "original")
      this.previewStatusLabel.text = this.previewIsStale ? "Preview: Original · Adjusted stale" : "Preview: Original · Fast";
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
      if (this.previewMode === "original" && this.previewDetailCache.originalRgb)
         return this.previewDetailCache.originalRgb;
      if (this.previewMode === "bandMask" && this.previewDetailCache.bandMaskRgb)
         return this.previewDetailCache.bandMaskRgb;
      if (this.previewMode === "rangeMask" && this.previewDetailCache.rangeMaskRgb)
         return this.previewDetailCache.rangeMaskRgb;
      if (this.previewMode === "combinedMask" && this.previewDetailCache.combinedMaskRgb)
         return this.previewDetailCache.combinedMaskRgb;
   }
   if (this.previewMode === "adjusted" && this.previewAdjustedRgb)
      return this.previewAdjustedRgb;
   if (this.previewMode === "bandMask" && this.previewBandMaskRgb)
      return this.previewBandMaskRgb;
   if (this.previewMode === "rangeMask" && this.previewRangeMaskRgb)
      return this.previewRangeMaskRgb;
   if (this.previewMode === "combinedMask" && this.previewCombinedMaskRgb)
      return this.previewCombinedMaskRgb;
   return this.previewOriginalRgb;
};

AstroColorMixerPOC8Dialog.prototype.refreshDiagnosticsData = function() {
   var rgb = this.getDiagnosticsRgb();
   var metrics = this.getCurrentPreviewMetrics();
   if (!rgb || !metrics.width || !metrics.height) {
      this.histogramData = null;
      this.polarSamples = [];
      this.probeReadoutLabel.text = "Preview-resolution diagnostics · Probe: none";
      this.histogramControl.update();
      this.polarControl.update();
      if (this.selectedBandViz)
         this.selectedBandViz.update();
      return;
   }

   var rangeMaskState = this.getActivePassState().rangeMask;
   var histogramRangeMaskState = this.previewMode === "rangeMask" ? rangeMaskState : { enabled: false, low: rangeMaskState.low, high: rangeMaskState.high, feather: rangeMaskState.feather };
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
      this.probeReadoutLabel.text = this.probeData.suggestedNeutral
         ? "Preview diagnostics · Px " + Math.round(this.probeData.sourceX) + "," + Math.round(this.probeData.sourceY) + " · L " + this.probeData.y709.toFixed(2) + " · Sat " + this.probeData.s.toFixed(2) + " · Hue unreliable"
         : "Preview diagnostics · Px " + Math.round(this.probeData.sourceX) + "," + Math.round(this.probeData.sourceY) + " · L " + this.probeData.y709.toFixed(2) + " · Hue " + this.probeData.h.toFixed(0) + "° · Sat " + this.probeData.s.toFixed(2);
   } else {
      this.probeReadoutLabel.text = "Preview diagnostics · Probe: none";
   }

   if (this.selectedBandViz)
      this.selectedBandViz.update();
   this.histogramControl.update();
   this.polarControl.update();
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
   var activePass = this.getActivePassState();
   var bandMaskValues = acmComputeSelectedBandMaskData(crop.rgb, crop.width, crop.height, activePass, this.editorState.imageType, "bandMask");
   var rangeMaskValues = acmComputeSelectedBandMaskData(crop.rgb, crop.width, crop.height, activePass, this.editorState.imageType, "rangeMask");
   var combinedMaskValues = acmComputeSelectedBandMaskData(crop.rgb, crop.width, crop.height, activePass, this.editorState.imageType, "combinedMask");
   var bandMaskRgb = new Float32Array(crop.width * crop.height * 3);
   var rangeMaskRgb = new Float32Array(crop.width * crop.height * 3);
   var combinedMaskRgb = new Float32Array(crop.width * crop.height * 3);
   for (var i = 0; i < bandMaskValues.length; ++i) {
      var base = i * 3;
      bandMaskRgb[base] = bandMaskRgb[base + 1] = bandMaskRgb[base + 2] = bandMaskValues[i];
      rangeMaskRgb[base] = rangeMaskRgb[base + 1] = rangeMaskRgb[base + 2] = rangeMaskValues[i];
      combinedMaskRgb[base] = combinedMaskRgb[base + 1] = combinedMaskRgb[base + 2] = combinedMaskValues[i];
   }

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
      bandMaskRgb: bandMaskRgb,
      rangeMaskRgb: rangeMaskRgb,
      combinedMaskRgb: combinedMaskRgb,
      originalBitmap: acmRenderBitmapFromRgb(crop.width, crop.height, crop.rgb),
      adjustedBitmap: acmRenderBitmapFromRgb(crop.width, crop.height, result.rgb),
      bandMaskBitmap: acmRenderGrayBitmapFromMask(crop.width, crop.height, bandMaskValues),
      rangeMaskBitmap: acmRenderGrayBitmapFromMask(crop.width, crop.height, rangeMaskValues),
      combinedMaskBitmap: acmRenderGrayBitmapFromMask(crop.width, crop.height, combinedMaskValues)
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
      var lastPassPreview = this.buildLastPassPreviewReference();
      var activePass = this.getActivePassState();
      var bandMaskValues = acmComputeSelectedBandMaskData(this.previewSource.rgb, this.previewSource.width, this.previewSource.height, activePass, this.editorState.imageType, "bandMask");
      var rangeMaskValues = acmComputeSelectedBandMaskData(this.previewSource.rgb, this.previewSource.width, this.previewSource.height, activePass, this.editorState.imageType, "rangeMask");
      var combinedMaskValues = acmComputeSelectedBandMaskData(this.previewSource.rgb, this.previewSource.width, this.previewSource.height, activePass, this.editorState.imageType, "combinedMask");
      this.previewOriginalRgb = this.previewSource.rgb;
      this.previewAdjustedRgb = result.rgb;
      this.previewBandMaskRgb = new Float32Array(this.previewSource.width * this.previewSource.height * 3);
      this.previewRangeMaskRgb = new Float32Array(this.previewSource.width * this.previewSource.height * 3);
      this.previewCombinedMaskRgb = new Float32Array(this.previewSource.width * this.previewSource.height * 3);
      for (var i = 0; i < bandMaskValues.length; ++i) {
         var base = i * 3;
         var bv = bandMaskValues[i], rv = rangeMaskValues[i], cv = combinedMaskValues[i];
         this.previewBandMaskRgb[base] = this.previewBandMaskRgb[base + 1] = this.previewBandMaskRgb[base + 2] = bv;
         this.previewRangeMaskRgb[base] = this.previewRangeMaskRgb[base + 1] = this.previewRangeMaskRgb[base + 2] = rv;
         this.previewCombinedMaskRgb[base] = this.previewCombinedMaskRgb[base + 1] = this.previewCombinedMaskRgb[base + 2] = cv;
      }
      this.previewBitmapOriginal = this.previewBitmapOriginal || acmRenderBitmapFromRgb(this.previewSource.width, this.previewSource.height, this.previewSource.rgb);
      this.previewBitmapAdjusted = acmRenderBitmapFromRgb(this.previewSource.width, this.previewSource.height, result.rgb);
      this.previewLastPassRgb = lastPassPreview ? lastPassPreview.rgb : null;
      this.previewBitmapLastPass = lastPassPreview ? lastPassPreview.bitmap : null;
      this.previewBitmapBandMask = acmRenderGrayBitmapFromMask(this.previewSource.width, this.previewSource.height, bandMaskValues);
      this.previewBitmapRangeMask = acmRenderGrayBitmapFromMask(this.previewSource.width, this.previewSource.height, rangeMaskValues);
      this.previewBitmapCombinedMask = acmRenderGrayBitmapFromMask(this.previewSource.width, this.previewSource.height, combinedMaskValues);
      this.previewWidth = this.previewSource.width;
      this.previewHeight = this.previewSource.height;
      this.previewDetailCache = null;
      this.previewIsStale = false;
      if (this.shouldUseDetailCropPreview())
         this.renderDetailPreviewForCurrentViewport();
      this.refreshPreviewModeButtons();
      this.refreshPreviewDisplay();
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
   if (!this.currentPreviewModeIsMask()) {
      showMessage("Switch Preview Mode to Current Band Mask, Range Mask, or Combined Mask first.", this.windowTitle, StdIcon_Warning);
      return;
   }
   var rgb = this.getDiagnosticsRgb();
   if (!rgb || !this.previewWidth || !this.previewHeight) {
      showMessage("No preview mask is currently available.", this.windowTitle, StdIcon_Warning);
      return;
   }
   var suffix = this.previewMode === "bandMask" ? "BandMask" : (this.previewMode === "rangeMask" ? "RangeMask" : "CombinedMask");
   writeResultImage(this.previewWidth, this.previewHeight, rgb, "AstroColorMixer_" + suffix);
};

AstroColorMixerPOC8Dialog.prototype.refreshBandControls = function() {
   var tabLabel = acmParameterLabelForTab(this.activeTab);
   var range = acmParameterRangeForTab(this.activeTab, this.editorState.sensitivity);
   this.bandSectionLabel.text = "<b>" + tabLabel + " Controls</b>";
   var activePass = this.getActivePassState();

   this.neutralRowHost.visible = this.activeTab === ACM_TAB_LUM;
   this.colorMixerPanel.scaledMinHeight = this.activeTab === ACM_TAB_LUM ? 308 : 278;
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
      var band = this.getBandById(control.bandId);
      control.numeric.setRange(-range, range);
      control.numeric.setPrecision(this.activeTab === ACM_TAB_SAT ? 0 : 1);
      var bandDef = acmFindBandDefById(band.id);
      control.numeric.setValue(band[this.activeTab]);
      control.numeric.setLabel(bandDef && bandDef.label ? bandDef.label : band.label);
      control.numeric.setSecondaryLabel("Center " + (bandDef && bandDef.center != null ? bandDef.center : 0) + "\u00b0");
      control.rowHost.update();
   }

   this.tabHueButton.enabled = this.activeTab !== ACM_TAB_HUE;
   this.tabSaturationButton.enabled = this.activeTab !== ACM_TAB_SAT;
   this.tabLuminanceButton.enabled = this.activeTab !== ACM_TAB_LUM;
};

AstroColorMixerPOC8Dialog.prototype.refreshFromState = function() {
   this.imageTypeCombo.currentItem = this.editorState.imageType === "starless" ? 1 : 0;
   this.sensitivityCombo.currentItem = this.editorState.sensitivity === "Fine" ? 0 : this.editorState.sensitivity === "Advanced" ? 2 : 1;
   this.editorState.globalStrength = typeof this.editorState.globalStrength === "number" ? this.editorState.globalStrength : 1.0;
   this.refreshPassControls();
   this.refreshSelectedBandControls();
   this.refreshRangeMaskControls();
   this.refreshBandControls();
   this.setActiveToolPanel(this.activeToolPanel || "selectedBand");
   this.refreshPreviewModeButtons();
   this.refreshDiagnosticsData();
   this.syncPendingChangesIndicator();
};

AstroColorMixerPOC8Dialog.prototype.resetEditorStateAfterSuccessfulOutput = function() {
   var imageType = this.editorState.imageType;
   var sensitivity = this.editorState.sensitivity;
   this.editorState = acmCreateBaseEditorState();
   this.editorState.imageType = imageType;
   this.editorState.sensitivity = sensitivity;
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
   this.refreshSelectedBandControls();
   this.refreshBandControls();
   this.markPreviewStale();
   console.noteln("Reset selected band: " + band.label);
};

AstroColorMixerPOC8Dialog.prototype.resetRangeMask = function() {
   var rangeMask = this.getActivePassState().rangeMask;
   rangeMask.enabled = false;
   rangeMask.low = 0.0;
   rangeMask.high = 1.0;
   rangeMask.feather = 0.10;
   rangeMask.preset = "All";
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

AstroColorMixerPOC8Dialog.prototype.setOutputFeedback = function(text) {
   if (this.outputFeedbackLabel)
      this.outputFeedbackLabel.text = text || "";
   if (text)
      console.noteln(text);
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
      this.updateActiveStatus();
      if (!(this.activeStatus && this.activeStatus.ok))
         fail("No target RGB image is available.");
      var active = acmReadRgbImageForViewId(this.targetViewId || (this.activeStatus ? this.activeStatus.viewId : null));
      var recipe = acmBuildRecipeFromEditorState(this.editorState);
      console.writeln("Applying Astro Color Mixer beta recipe to target image...");
      console.writeln("Image type: " + recipe.imageType);
      console.writeln("Sensitivity: " + recipe.sensitivity);
      var normalized = acmNormalizeRecipe(recipe);
      console.writeln("Pass count: " + normalized.passes.length + " total / " + acmCountEnabledPasses({ passes: normalized.passes }) + " enabled");
      for (var i = 0; i < normalized.passes.length; ++i)
         console.writeln(normalized.passes[i].label + " [" + (normalized.passes[i].enabled ? "enabled" : "disabled") + "] · " + acmSummarizePass(normalized.passes[i]) + " · " + acmSummarizeRangeMask(normalized.passes[i].rangeMask));

      var result = applyAstroColorMixerPasses(active.rgb, active.width, active.height, recipe);
      var outputId = "AstroColorMixer_" + sanitizeViewId(active.viewId);
      var outputWindow = writeResultImage(active.width, active.height, result.rgb, outputId);
      console.noteln("Created output image: " + outputWindow.mainView.id);
      this.setOutputFeedback("Created image: " + outputWindow.mainView.id);
      this.resetEditorStateAfterSuccessfulOutput();
      console.noteln("Astro Color Mixer beta apply complete.");
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

      var target = acmReadRgbImageFromView(targetInfo.view);
      var recipe = acmBuildRecipeFromEditorState(this.editorState);
      var result = applyAstroColorMixerPasses(target.rgb, target.width, target.height, recipe);
      var maskInfo = acmReadMaskState(targetInfo.window, target.width, target.height);
      var outputRgb = maskInfo.respected
         ? acmBlendRgbWithMask(target.rgb, result.rgb, maskInfo.values)
         : result.rgb;

      acmWriteRgbToView(targetInfo.view, target.width, target.height, outputRgb);
      this.targetApplyMaskStatus = maskInfo;
      if (this.targetApplyMaskStatusLabel)
         this.targetApplyMaskStatusLabel.text = maskInfo.message;

      if (maskInfo.respected)
         this.setOutputFeedback(maskInfo.inverted
            ? "Applied adjustments to target image using inverted PixInsight mask."
            : "Applied adjustments to target image using active PixInsight mask.");
      else
         this.setOutputFeedback("Applied adjustments to target image.");
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
   dialog.execute();
} catch (error) {
   if (!(error && error.__acmHandled)) {
      var message = "Unexpected dialog failure: " + (error && error.message ? error.message : String(error));
      console.criticalln(message);
      showMessage(message, "Astro Color Mixer v0.9.6-beta", StdIcon_Error);
   }
}
