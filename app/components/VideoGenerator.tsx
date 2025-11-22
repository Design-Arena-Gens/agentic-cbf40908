import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./VideoGenerator.module.css";

type VideoSettings = {
  title: string;
  subtitle: string;
  duration: number;
  width: number;
  height: number;
  frameRate: number;
  backgroundColor: string;
  accentColor: string;
  titleFont: FontOption;
  subtitleFont: FontOption;
  titleSize: number;
  subtitleSize: number;
  waveIntensity: number;
  showGuides: boolean;
  vignetteStrength: number;
};

type FontOption = {
  id: string;
  label: string;
  css: string;
  weight: number;
};

const fontOptions: FontOption[] = [
  { id: "inter", label: "Inter", css: "Inter, 'Segoe UI', sans-serif", weight: 700 },
  { id: "poppins", label: "Poppins", css: "'Poppins', 'Inter', sans-serif", weight: 700 },
  { id: "plex", label: "IBM Plex Sans", css: "'IBM Plex Sans', 'Inter', sans-serif", weight: 700 },
  { id: "playfair", label: "Playfair Display", css: "'Playfair Display', 'Georgia', serif", weight: 700 },
  { id: "space", label: "Space Grotesk", css: "'Space Grotesk', 'Inter', sans-serif", weight: 700 }
];

const subtitleFonts: FontOption[] = [
  { id: "inter-sub", label: "Inter", css: "Inter, 'Segoe UI', sans-serif", weight: 500 },
  { id: "poppins-sub", label: "Poppins", css: "'Poppins', 'Inter', sans-serif", weight: 500 },
  { id: "plex-sub", label: "IBM Plex Sans", css: "'IBM Plex Sans', 'Inter', sans-serif", weight: 500 },
  { id: "lora-sub", label: "Lora", css: "'Lora', 'Georgia', serif", weight: 500 },
  { id: "roboto-sub", label: "Roboto", css: "'Roboto', 'Segoe UI', sans-serif", weight: 500 }
];

const defaultSettings: VideoSettings = {
  title: "Launch in Seconds",
  subtitle: "Generate polished intro videos with cinematic lighting and custom branding—directly in your browser.",
  duration: 6,
  width: 1280,
  height: 720,
  frameRate: 60,
  backgroundColor: "#070a16",
  accentColor: "#6dc8ff",
  titleFont: fontOptions[0],
  subtitleFont: subtitleFonts[0],
  titleSize: 72,
  subtitleSize: 28,
  waveIntensity: 38,
  showGuides: true,
  vignetteStrength: 0.45
};

const preferredMimeTypes = [
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm"
];

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function sanitizeFilename(input: string) {
  const cleaned = input.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
  return cleaned.length ? cleaned.toLowerCase() : "video";
}

function drawGradientBackground(
  ctx: CanvasRenderingContext2D,
  settings: VideoSettings,
  timestamp: number
) {
  const { width, height, backgroundColor, accentColor, vignetteStrength } = settings;
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  const gradient = ctx.createRadialGradient(
    width * 0.25,
    height * 0.3,
    width * 0.1,
    width * 0.5,
    height * 0.6,
    width * 1.2
  );
  gradient.addColorStop(0, `${accentColor}44`);
  gradient.addColorStop(0.5, `${accentColor}11`);
  gradient.addColorStop(1, `${backgroundColor}`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const waveAmplitude = settings.waveIntensity;
  const waveLength = width * 0.6;
  const waveSpeed = 0.0025;

  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = accentColor;
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let x = 0; x <= width; x += 8) {
    const progress = timestamp * waveSpeed + x / waveLength;
    const y = height * 0.66 + Math.sin(progress * Math.PI * 2) * waveAmplitude;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  if (vignetteStrength > 0) {
    const vignette = ctx.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.2,
      width / 2,
      height / 2,
      Math.max(width, height) * 0.75
    );
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, `rgba(0,0,0,${vignetteStrength})`);
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
  }
}

function drawTypography(
  ctx: CanvasRenderingContext2D,
  settings: VideoSettings,
  progress: number,
  timestamp: number
) {
  const {
    width,
    height,
    title,
    subtitle,
    titleFont,
    subtitleFont,
    titleSize,
    subtitleSize,
    accentColor,
    showGuides
  } = settings;

  const titleProgress = easeInOutCubic(Math.min(1, progress * 1.2));
  const subtitleProgress = easeOutExpo(Math.max(0, Math.min(1, progress - 0.2)));

  const verticalOffset = Math.sin(timestamp * 0.002) * 8 * (1 - progress);

  ctx.save();
  ctx.font = `${titleFont.weight} ${titleSize}px ${titleFont.css}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = `${accentColor}55`;
  ctx.shadowBlur = 24 * titleProgress;
  ctx.globalAlpha = titleProgress;
  ctx.fillStyle = "rgba(244, 247, 255, 0.96)";
  ctx.fillText(title, width / 2, height / 2 - 40 + verticalOffset);
  ctx.restore();

  ctx.save();
  ctx.font = `${subtitleFont.weight} ${subtitleSize}px ${subtitleFont.css}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.globalAlpha = subtitleProgress;
  ctx.fillStyle = "rgba(218, 226, 255, 0.82)";
  const lines = wrapText(ctx, subtitle, width * 0.62);
  const startY = height / 2 + 20 + verticalOffset * 0.4;
  const lineHeight = subtitleSize * 1.4;
  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, startY + lineHeight * index);
  });
  ctx.restore();

  if (showGuides) {
    const markerSize = 18;
    ctx.save();
    ctx.strokeStyle = `${accentColor}33`;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    ctx.moveTo(width / 2 - markerSize, height / 2 - 100);
    ctx.lineTo(width / 2 + markerSize, height / 2 - 100);
    ctx.moveTo(width / 2, height / 2 - 100 - markerSize);
    ctx.lineTo(width / 2, height / 2 - 100 + markerSize);
    ctx.stroke();
    ctx.restore();
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  words.forEach((word) => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export default function VideoGenerator() {
  const [settings, setSettings] = useState<VideoSettings>(defaultSettings);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [estimatedSize, setEstimatedSize] = useState<string>("~3.2 MB");
  const [mimeType, setMimeType] = useState<string>("");
  const previousUrlRef = useRef<string | null>(null);

  useEffect(() => {
    for (const type of preferredMimeTypes) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)) {
        setMimeType(type);
        return;
      }
    }
    setMimeType("video/webm");
  }, []);

  useEffect(() => {
    if (downloadUrl && previousUrlRef.current && previousUrlRef.current !== downloadUrl) {
      URL.revokeObjectURL(previousUrlRef.current);
    }
    if (downloadUrl) {
      previousUrlRef.current = downloadUrl;
    }
    return () => {
      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current);
        previousUrlRef.current = null;
      }
    };
  }, [downloadUrl]);

  const handleSettingChange = useCallback(
    <K extends keyof VideoSettings>(key: K, value: VideoSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const estimatedFrames = useMemo(() => {
    return Math.round(settings.duration * settings.frameRate);
  }, [settings.duration, settings.frameRate]);

  const handleGenerate = useCallback(async () => {
    if (typeof window === "undefined" || isGenerating) {
      return;
    }

    if (!("MediaRecorder" in window)) {
      setStatus("MediaRecorder API is not supported in this browser.");
      return;
    }

    setIsGenerating(true);
    setStatus("Preparing renderer…");
    setDownloadUrl(null);

    const canvas = document.createElement("canvas");
    canvas.width = settings.width;
    canvas.height = settings.height;
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setStatus("Unable to initialize the canvas context.");
      setIsGenerating(false);
      return;
    }

    const stream = canvas.captureStream(settings.frameRate);
    let recorder: MediaRecorder;

    try {
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (error) {
      console.error(error);
      setStatus("Failed to start the video recorder.");
      stream.getTracks().forEach((track) => track.stop());
      setIsGenerating(false);
      return;
    }

    const chunks: BlobPart[] = [];

    const recordingCompleted = new Promise<Blob>((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size) {
          chunks.push(event.data);
        }
      };
      recorder.onstop = () => {
        resolve(new Blob(chunks, { type: mimeType || "video/webm" }));
      };
      recorder.onerror = (event) => {
        const errorEvent = event as Event & { error?: DOMException };
        reject(errorEvent.error ?? new DOMException("Recording failed"));
      };
    });

    setStatus("Rendering frames…");
    recorder.start(200);

    const durationMs = settings.duration * 1000;
    const startTime = performance.now();

    await new Promise<void>((resolve) => {
      const renderFrame = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);

        drawGradientBackground(ctx, settings, elapsed);
        drawTypography(ctx, settings, progress, elapsed);

        if (elapsed < durationMs) {
          requestAnimationFrame(renderFrame);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(renderFrame);
    });

    setStatus("Encoding video…");
    recorder.stop();

    try {
      const blob = await recordingCompleted;
      const url = URL.createObjectURL(blob);
      const sizeInMb = (blob.size / (1024 * 1024)).toFixed(2);
      setEstimatedSize(`${sizeInMb} MB`);
      setDownloadUrl(url);
      setStatus("Video ready ✨");
    } catch (error) {
      console.error(error);
      setStatus("Recording failed—please try again.");
    } finally {
      stream.getTracks().forEach((track) => track.stop());
      setIsGenerating(false);
    }
  }, [isGenerating, mimeType, settings]);

  const fileName = useMemo(() => sanitizeFilename(settings.title), [settings.title]);

  const field = {
    label: styles.label,
    input: styles.input,
    select: styles.select,
    range: styles.range
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span style={{
          padding: "6px 16px",
          borderRadius: "999px",
          background: "rgba(109, 200, 255, 0.12)",
          border: "1px solid rgba(109, 200, 255, 0.28)",
          color: "rgba(189, 215, 255, 0.9)",
          fontSize: "0.85rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase"
        }}>
          Browser Studio
        </span>
        <h1 className={styles.title}>Video Generator</h1>
        <p className={styles.subtitle}>
          Craft cinematic headline videos with gradient lighting, title motion, and download-ready WebM output—no FFmpeg required.
        </p>
      </header>

      <section className={styles.grid}>
        <div className={`${styles.panel} ${styles.preview}`}>
          <h2 className={styles.panelTitle}>Preview</h2>
          <div className={styles.videoWrapper}>
            {downloadUrl ? (
              <video
                key={downloadUrl}
                className={styles.videoPreview}
                src={downloadUrl}
                controls
                playsInline
                loop
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  aspectRatio: "16 / 9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(200, 210, 240, 0.5)",
                  fontSize: "0.95rem"
                }}
              >
                Generate your first video to preview it here.
              </div>
            )}
          </div>
          <div className={styles.controlsFooter}>
            <button
              className={styles.generateButton}
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? "Rendering…" : "Generate Video"}
            </button>
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={`${fileName}.webm`}
                style={{
                  padding: "12px 20px",
                  borderRadius: "12px",
                  border: "1px solid rgba(109, 200, 255, 0.4)",
                  color: "rgba(225, 236, 255, 0.92)",
                  fontSize: "0.95rem"
                }}
              >
                Download WebM
              </a>
            )}
            <span className={styles.status}>{status}</span>
          </div>

          <div className={styles.metrics}>
            <div className={styles.metric}>
              <div className={styles.metricTitle}>Frames</div>
              <div className={styles.metricValue}>{estimatedFrames}</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricTitle}>Resolution</div>
              <div className={styles.metricValue}>
                {settings.width}×{settings.height}
              </div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricTitle}>Frame Rate</div>
              <div className={styles.metricValue}>{settings.frameRate} fps</div>
            </div>
            <div className={styles.metric}>
              <div className={styles.metricTitle}>Approx Size</div>
              <div className={styles.metricValue}>{estimatedSize}</div>
            </div>
          </div>

          <div className={styles.tips}>
            <div>
              <div className={styles.tipTitle}>Pro tip</div>
              Try pairing a darker background color with a bright accent for cinematic contrast.
            </div>
            <div>
              <div className={styles.tipTitle}>Export</div>
              Generated videos download as WebM; convert to MP4 with your preferred encoder if needed.
            </div>
          </div>
        </div>

        <div className={styles.panel}>
          <h2 className={styles.panelTitle}>Creative Controls</h2>
          <form className={styles.form}>
            <label className={field.label}>
              Title
              <input
                className={field.input}
                value={settings.title}
                onChange={(event) => handleSettingChange("title", event.target.value)}
                placeholder="Your headline"
              />
            </label>
            <label className={field.label}>
              Subtitle
              <textarea
                className={field.input}
                value={settings.subtitle}
                onChange={(event) => handleSettingChange("subtitle", event.target.value)}
                placeholder="Add supporting context"
                rows={3}
                style={{ resize: "vertical" }}
              />
            </label>

            <div className={styles.row}>
              <label className={field.label} style={{ flex: 1 }}>
                Duration ({settings.duration.toFixed(1)}s)
                <input
                  className={field.range}
                  type="range"
                  min={3}
                  max={12}
                  step={0.5}
                  value={settings.duration}
                  onChange={(event) => handleSettingChange("duration", Number(event.target.value))}
                />
              </label>
              <label className={field.label} style={{ width: "90px" }}>
                FPS
                <input
                  className={field.input}
                  type="number"
                  min={24}
                  max={60}
                  value={settings.frameRate}
                  onChange={(event) => handleSettingChange("frameRate", Number(event.target.value))}
                />
              </label>
            </div>

            <div className={styles.row}>
              <label className={field.label}>
                Background
                <input
                  className={`${field.input} ${styles.colorInput}`}
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(event) => handleSettingChange("backgroundColor", event.target.value)}
                />
              </label>
              <label className={field.label}>
                Accent
                <input
                  className={`${field.input} ${styles.colorInput}`}
                  type="color"
                  value={settings.accentColor}
                  onChange={(event) => handleSettingChange("accentColor", event.target.value)}
                />
              </label>
            </div>

            <label className={field.label}>
              Title Font
              <select
                className={field.select}
                value={settings.titleFont.id}
                onChange={(event) => {
                  const option = fontOptions.find((item) => item.id === event.target.value);
                  if (option) {
                    handleSettingChange("titleFont", option);
                  }
                }}
              >
                {fontOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={field.label}>
              Subtitle Font
              <select
                className={field.select}
                value={settings.subtitleFont.id}
                onChange={(event) => {
                  const option = subtitleFonts.find((item) => item.id === event.target.value);
                  if (option) {
                    handleSettingChange("subtitleFont", option);
                  }
                }}
              >
                {subtitleFonts.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className={field.label}>
              Title Size ({settings.titleSize}px)
              <input
                className={field.range}
                type="range"
                min={40}
                max={110}
                value={settings.titleSize}
                onChange={(event) => handleSettingChange("titleSize", Number(event.target.value))}
              />
            </label>

            <label className={field.label}>
              Subtitle Size ({settings.subtitleSize}px)
              <input
                className={field.range}
                type="range"
                min={18}
                max={48}
                value={settings.subtitleSize}
                onChange={(event) => handleSettingChange("subtitleSize", Number(event.target.value))}
              />
            </label>

            <label className={field.label}>
              Wave Intensity ({settings.waveIntensity})
              <input
                className={field.range}
                type="range"
                min={12}
                max={80}
                value={settings.waveIntensity}
                onChange={(event) => handleSettingChange("waveIntensity", Number(event.target.value))}
              />
            </label>

            <label className={field.label}>
              Vignette ({settings.vignetteStrength.toFixed(2)})
              <input
                className={field.range}
                type="range"
                min={0}
                max={0.9}
                step={0.05}
                value={settings.vignetteStrength}
                onChange={(event) => handleSettingChange("vignetteStrength", Number(event.target.value))}
              />
            </label>

            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={settings.showGuides}
                onChange={(event) => handleSettingChange("showGuides", event.target.checked)}
              />
              Show grid markers
            </label>
          </form>
        </div>
      </section>
    </div>
  );
}
