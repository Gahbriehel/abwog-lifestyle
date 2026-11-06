// Turns confession text files into male and female MP3s with Kokoro.
// Runs on a staff computer, never on the server. See README.md for the full guide.

import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import {
  applyPronunciations,
  findLongSentences,
  formatBytes,
  formatDuration,
  isValidSlug,
  parseDocument,
  parseVoices,
  SAMPLE_RATE,
  settingsHash,
  sha256,
  slugFromPath,
  speakable,
  type Document,
  type Gender,
  type Manifest,
  type Settings,
} from "./src/lib";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const DEFAULT_VOICES: Record<Gender, string> = { female: "af_heart", male: "am_michael" };

const HELP = `Usage: bun run generate <file.txt | folder> [more paths...] [options]

Makes <slug>.female.mp3 and <slug>.male.mp3 for each confession text file.
The slug is the file name without ".txt" (it must match the confession's slug in Olive).

Options:
  --out <dir>             Where to write MP3s and manifest.json        (default: ./out)
  --speed <number>        Speaking speed, 1 is Kokoro's normal pace    (default: 0.9)
  --voices <list>         female, male, or female,male                 (default: female,male)
  --female-voice <id>     Kokoro voice for the female version          (default: ${DEFAULT_VOICES.female})
  --male-voice <id>       Kokoro voice for the male version            (default: ${DEFAULT_VOICES.male})
  --pause <seconds>       Silence between paragraphs                   (default: 0.7)
  --pronunciations <file> JSON of { "word": "respelling" }             (default: ./pronunciations.json if present)
  --dtype <q8|fp32>       q8 is smaller and faster; fp32 is the full model (default: q8)
  --force                 Regenerate even if the text and settings are unchanged
  --dry-run               Show what would be generated, then stop
  -h, --help              Show this help
`;

class UserError extends Error {}

function parseCli() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      out: { type: "string", default: "./out" },
      speed: { type: "string", default: "0.9" },
      voices: { type: "string", default: "female,male" },
      "female-voice": { type: "string", default: DEFAULT_VOICES.female },
      "male-voice": { type: "string", default: DEFAULT_VOICES.male },
      pause: { type: "string", default: "0.7" },
      pronunciations: { type: "string" },
      dtype: { type: "string", default: "q8" },
      force: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    console.log(HELP);
    process.exit(0);
  }
  if (positionals.length === 0) throw new UserError(`Tell me which text file or folder to read.\n\n${HELP}`);

  const speed = Number(values.speed);
  if (!Number.isFinite(speed) || speed < 0.5 || speed > 1.5) throw new UserError("--speed must be a number between 0.5 and 1.5.");
  const pauseSec = Number(values.pause);
  if (!Number.isFinite(pauseSec) || pauseSec < 0 || pauseSec > 5) throw new UserError("--pause must be between 0 and 5 seconds.");
  if (values.dtype !== "q8" && values.dtype !== "fp32") throw new UserError('--dtype must be "q8" or "fp32".');

  return {
    inputs: positionals,
    out: resolve(values.out),
    speed,
    pauseSec,
    voices: parseVoices(values.voices),
    voiceIds: { female: values["female-voice"], male: values["male-voice"] } as Record<Gender, string>,
    pronunciationsPath: values.pronunciations,
    dtype: values.dtype as "q8" | "fp32",
    force: values.force,
    dryRun: values["dry-run"],
  };
}

function collectFiles(inputs: string[]): string[] {
  const files: string[] = [];
  for (const input of inputs) {
    if (!existsSync(input)) throw new UserError(`Not found: ${input}`);
    if (statSync(input).isDirectory()) {
      const inDir = readdirSync(input)
        .filter((f) => f.toLowerCase().endsWith(".txt"))
        .sort()
        .map((f) => join(input, f));
      if (inDir.length === 0) throw new UserError(`No .txt files in ${input}`);
      files.push(...inDir);
    } else {
      files.push(input);
    }
  }
  return [...new Set(files.map((f) => resolve(f)))];
}

function loadPronunciations(explicitPath: string | undefined): Record<string, string> {
  const path = explicitPath ?? (existsSync("pronunciations.json") ? "pronunciations.json" : null);
  if (!path) return {};
  if (!existsSync(path)) throw new UserError(`Pronunciations file not found: ${path}`);
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new UserError(`${path} is not valid JSON. It should look like { "Elymas": "Ellimas" }.`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || Object.values(parsed).some((v) => typeof v !== "string")) {
    throw new UserError(`${path} must be an object of words to respellings, like { "Elymas": "Ellimas" }.`);
  }
  return parsed as Record<string, string>;
}

async function ensureFfmpeg(): Promise<void> {
  try {
    const proc = Bun.spawn(["ffmpeg", "-version"], { stdout: "ignore", stderr: "ignore" });
    if ((await proc.exited) === 0) return;
  } catch {
    // fall through to the message below
  }
  throw new UserError(
    "ffmpeg is required but was not found. Install it first:\n" +
      "  Ubuntu/Debian: sudo apt install ffmpeg\n  macOS: brew install ffmpeg\n  Windows: winget install ffmpeg",
  );
}

interface Job {
  slug: string;
  file: string;
  doc: Document;
  textHash: string;
  gender: Gender;
  voiceId: string;
  settings: Settings;
  hash: string;
  outFile: string;
  status: "generate" | "skip";
  reason: string;
}

async function main() {
  const cli = parseCli();
  const files = collectFiles(cli.inputs);
  const pronunciations = loadPronunciations(cli.pronunciationsPath);

  mkdirSync(cli.out, { recursive: true });
  const manifestPath = join(cli.out, "manifest.json");
  const manifest: Manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};

  // Plan: read every file, decide what to generate and what is already up to date.
  const jobs: Job[] = [];
  const problems: string[] = [];
  for (const file of files) {
    const slug = slugFromPath(file);
    if (!isValidSlug(slug)) {
      problems.push(`${file}: the file name must be the confession's slug, e.g. "confession-to-start-my-day.txt" (lowercase letters, digits and hyphens).`);
      continue;
    }
    const doc = parseDocument(readFileSync(file, "utf8"));
    if (doc.paragraphs.length === 0) {
      problems.push(`${file}: no text to read.`);
      continue;
    }
    for (const long of findLongSentences(doc.paragraphs)) {
      console.warn(`⚠  ${slug}: a very long sentence may be cut off. Consider splitting it: "${long.slice(0, 70)}…"`);
    }
    const textHash = sha256(doc.body);
    for (const gender of cli.voices) {
      const voiceId = cli.voiceIds[gender];
      const settings: Settings = { textHash, title: doc.title, voiceId, speed: cli.speed, pauseSec: cli.pauseSec, dtype: cli.dtype, pronunciations };
      const hash = settingsHash(settings);
      const outFile = join(cli.out, `${slug}.${gender}.mp3`);
      const previous = manifest[slug]?.voices[gender];
      const upToDate = !cli.force && previous?.settingsHash === hash && existsSync(outFile);
      jobs.push({
        slug,
        file,
        doc,
        textHash,
        gender,
        voiceId,
        settings,
        hash,
        outFile,
        status: upToDate ? "skip" : "generate",
        reason: upToDate ? "up to date" : cli.force ? "forced" : previous ? (existsSync(outFile) ? "text or settings changed" : "file missing") : "new",
      });
    }
  }
  if (problems.length > 0) throw new UserError(problems.join("\n"));

  const todo = jobs.filter((j) => j.status === "generate");
  console.log(`\n${files.length} confession(s), ${jobs.length} audio file(s): ${todo.length} to make, ${jobs.length - todo.length} already up to date.\n`);
  for (const job of jobs) {
    console.log(`  ${job.status === "generate" ? "make" : "skip"}  ${job.slug}.${job.gender}.mp3  (${job.reason})`);
  }
  if (cli.dryRun || todo.length === 0) {
    if (cli.dryRun) console.log("\nDry run: nothing was generated.");
    return;
  }

  await ensureFfmpeg();

  console.log("\nLoading Kokoro (the first run downloads the model, about 90 MB)…");
  const { KokoroTTS } = await import("kokoro-js");
  const tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype: cli.dtype, device: "cpu" });
  const available = Object.keys(tts.voices);
  for (const gender of cli.voices) {
    if (!available.includes(cli.voiceIds[gender])) {
      throw new UserError(`Unknown voice "${cli.voiceIds[gender]}". Available: ${available.join(", ")}`);
    }
  }

  async function speak(text: string, voiceId: string): Promise<Float32Array> {
    const audio = await tts.generate(text, { voice: voiceId as never, speed: cli.speed });
    if (audio.sampling_rate !== SAMPLE_RATE) throw new Error(`Unexpected sample rate ${audio.sampling_rate}`);
    return audio.audio;
  }

  const silence = (seconds: number) => new Float32Array(Math.round(seconds * SAMPLE_RATE));
  const failures: string[] = [];
  const made: Array<{ name: string; durationSec: number; sizeBytes: number; tookSec: number }> = [];

  for (const [index, job] of todo.entries()) {
    const label = `[${index + 1}/${todo.length}] ${job.slug}.${job.gender}.mp3`;
    const started = performance.now();
    const partial = `${job.outFile}.partial`;
    const pieces = [
      ...(job.doc.title ? [job.doc.title] : []),
      ...job.doc.paragraphs,
    ].map((text) => speakable(applyPronunciations(text, pronunciations)));

    const ffmpeg = Bun.spawn(
      [
        "ffmpeg", "-y", "-loglevel", "error",
        "-f", "f32le", "-ar", String(SAMPLE_RATE), "-ac", "1", "-i", "pipe:0",
        "-af", "loudnorm=I=-18:TP=-1.5:LRA=11",
        "-ac", "1", "-b:a", "64k",
        ...(job.doc.title ? ["-metadata", `title=${job.doc.title}`] : []),
        "-f", "mp3", partial,
      ],
      { stdin: "pipe", stdout: "ignore", stderr: "pipe" },
    );
    const write = (samples: Float32Array) => ffmpeg.stdin.write(new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength));

    try {
      let totalSamples = 0;
      for (const [i, piece] of pieces.entries()) {
        process.stdout.write(`\r${label}  ${i + 1}/${pieces.length} paragraphs…   `);
        const samples = await speak(piece, job.voiceId);
        write(samples);
        totalSamples += samples.length;
        if (i < pieces.length - 1) {
          const gap = silence(cli.pauseSec);
          write(gap);
          totalSamples += gap.length;
        }
      }
      await ffmpeg.stdin.end();
      const code = await ffmpeg.exited;
      if (code !== 0) throw new Error(`ffmpeg failed: ${(await new Response(ffmpeg.stderr).text()).trim()}`);

      renameSync(partial, job.outFile);
      const sizeBytes = statSync(job.outFile).size;
      const durationSec = totalSamples / SAMPLE_RATE;
      const tookSec = (performance.now() - started) / 1000;

      manifest[job.slug] = {
        textHash: job.textHash,
        voices: {
          ...manifest[job.slug]?.voices,
          [job.gender]: { voiceId: job.voiceId, file: `${job.slug}.${job.gender}.mp3`, settingsHash: job.hash, durationSec: Math.round(durationSec), sizeBytes, generatedAt: new Date().toISOString() },
        },
      };
      // Saved after every file, so an interrupted run keeps what it finished.
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

      made.push({ name: `${job.slug}.${job.gender}.mp3`, durationSec, sizeBytes, tookSec });
      process.stdout.write(`\r${label}  ${formatDuration(durationSec)} · ${formatBytes(sizeBytes)} · took ${formatDuration(tookSec)}          \n`);
    } catch (error) {
      ffmpeg.kill();
      rmSync(partial, { force: true });
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${job.slug}.${job.gender}.mp3: ${message}`);
      process.stdout.write(`\r${label}  FAILED: ${message}\n`);
    }
  }

  console.log(`\nDone: ${made.length} made, ${failures.length} failed.`);
  if (made.length > 0) {
    const totalBytes = made.reduce((n, m) => n + m.sizeBytes, 0);
    console.log(`Files are in ${cli.out} (${formatBytes(totalBytes)} new). Upload each one in Olive, in the matching Female or Male slot.`);
  }
  if (failures.length > 0) {
    console.error(`\nFailed:\n  ${failures.join("\n  ")}`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  if (error instanceof UserError) {
    console.error(error.message);
  } else {
    console.error(error);
  }
  process.exit(1);
});
