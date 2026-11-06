# Confession audio

Turns confession text files into **female and male MP3s** using [Kokoro](https://github.com/hexgrad/kokoro), a free, open-source voice. Staff then upload the MP3s to each confession in Olive (the admin app).

This tool runs on **a staff computer**, never on the server. The server (a 1 vCPU, 1 GB droplet) can't run Kokoro: in testing it needed about 1.2 GB of memory and took roughly twice as long as the audio it produced. Dove only stores the text and the finished MP3 files. See [docs/dove-confessions.md](../../docs/dove-confessions.md) for how the backend side works.

## What you need

| Need | Notes |
|---|---|
| **Bun** | <https://bun.sh>. Works on Linux, macOS and Windows. |
| **ffmpeg** | Turns the voice into small MP3s. Ubuntu/Debian: `sudo apt install ffmpeg`. macOS: `brew install ffmpeg`. Windows: `winget install ffmpeg`. |
| **About 2 GB of free RAM** | Kokoro peaked at about 1.2 GB in testing. Close heavy apps while it runs. |
| **About 600 MB of disk, one time** | About 500 MB for the packages in `node_modules` and about 90 MB for the voice model, which downloads on the first run. |
| **Internet for setup** | To download the packages and the model. Later runs use the saved copies. |

## One-time setup

```bash
cd tools/confession-audio
bun install
```

That's all. The model downloads by itself the first time you generate something.

## Making audio

### 1. Put each confession in a text file

Create a folder (for example `texts/`) and add **one `.txt` file per confession**.

- **The file name is the confession's slug**, without `.txt`. For the confession "Confession to Start my Day" with the slug `confession-to-start-my-day`, the file is `confession-to-start-my-day.txt`. Slugs use lowercase letters, digits and hyphens only. The slug is shown in Olive's editor.
- **Paste the confession text exactly as it is in Olive.** A blank line starts a new paragraph, and the voice pauses there.
- **Optional title line:** if the first line starts with `# `, it is read aloud first, then a pause, then the confession. The title is *not* part of the confession text. Leave it out if you don't want the title spoken.

```text
# Confession to Start my Day

I declare that this is the best day of my life yet. As soon as my feet hit the floor…

I am on a perpetual cycle of increase every day of my life…
```

A ready-made example is in [samples/sample.txt](samples/sample.txt).

The `texts/`, `out/` and `pronunciations.json` entries are git-ignored, so your working files are never committed.

### 2. Run it

```bash
bun run generate texts/                                    # every .txt file in the folder
bun run generate texts/confession-to-start-my-day.txt      # just one confession
```

You'll see a plan first (which files will be made, which are already up to date), then progress for each file, then a summary.

### 3. Upload in Olive

The MP3s are in `out/`:

```
out/confession-to-start-my-day.female.mp3
out/confession-to-start-my-day.male.mp3
```

In Olive, open the confession and upload each file into the matching **Female** or **Male** slot. Uploading replaces any earlier file for that voice.

## Options

| Option | Default | What it does |
|---|---|---|
| `--speed <number>` | `0.9` | Speaking pace. `1` is Kokoro's normal speed, lower is slower. Allowed range is 0.5 to 1.5. Members can also change playback speed in the app. |
| `--voices <list>` | `female,male` | `female`, `male` or `female,male`. |
| `--female-voice <id>` | `af_heart` | Which Kokoro voice to use for the female version. |
| `--male-voice <id>` | `am_michael` | Which Kokoro voice to use for the male version. |
| `--pause <seconds>` | `0.7` | Silence between paragraphs (and after the title). |
| `--pronunciations <file>` | `./pronunciations.json` if it exists | Word respellings, see below. |
| `--out <dir>` | `./out` | Where the MP3s and `manifest.json` are written. |
| `--dtype <q8\|fp32>` | `q8` | `q8` is the smaller, faster model (about 90 MB). `fp32` is the full-size model (a much larger download), possibly higher quality and slower. Not tested yet. |
| `--force` | off | Remake files even if nothing changed. |
| `--dry-run` | off | Show the plan and stop. Nothing is generated or downloaded. |
| `-h`, `--help` | | Show help. |

Examples:

```bash
bun run generate texts/ --speed 0.85                  # a bit slower than the default
bun run generate texts/ --voices female               # only the female version
bun run generate texts/ --dry-run                     # just see what would happen
bun run generate texts/ --force                       # remake everything
```

### Voices

Kokoro's English voices (American and British). Pick any with `--female-voice` or `--male-voice`.

| | American | British |
|---|---|---|
| **Female** | `af_heart` (default), `af_alloy`, `af_aoede`, `af_bella`, `af_jessica`, `af_kore`, `af_nicole`, `af_nova`, `af_river`, `af_sarah`, `af_sky` | `bf_emma`, `bf_isabella`, `bf_alice`, `bf_lily` |
| **Male** | `am_michael` (default), `am_adam`, `am_echo`, `am_eric`, `am_fenrir`, `am_liam`, `am_onyx`, `am_puck`, `am_santa` | `bm_george`, `bm_lewis`, `bm_daniel`, `bm_fable` |

There are no Nigerian-accent voices. Whatever you choose, use the **same voices for every confession** so the library sounds consistent.

### Fixing a word that is read wrongly

Copy `pronunciations.example.json` to `pronunciations.json` and list the words with a respelling that sounds right when read aloud:

```json
{
  "Elymas": "Ellimas",
  "Shalom": "Shah-lome"
}
```

Matching is whole-word and ignores capital letters. This only changes how the voice reads the text; the confession text itself is never altered. Change the respelling, run again, and the affected confessions are remade automatically.

## Re-running is safe

The tool keeps a record in `out/manifest.json`. On each run it checks every confession and voice, and **skips any whose text and settings haven't changed** and whose MP3 still exists, so you can run the whole folder every time. A confession is remade when:

- its text changed,
- you changed the speed, voice, pause, model or pronunciations, or
- its MP3 is missing (or you used `--force`).

If a run is interrupted (Ctrl+C, power loss), the files already finished are kept and the next run continues with the rest.

### After editing a confession's text

Olive shows an **"audio out of date"** badge when the text no longer matches the audio. To fix it: update the `.txt` file with the new text, run `bun run generate` again, and upload the new MP3s. `manifest.json` stores a `textHash`, a SHA-256 of the normalised text, computed the same way as the one Dove stores, so the two can be compared if you ever need to check.

## How long it takes

Kokoro runs on the computer's processor. In testing it took **about 2.3 seconds of work for every second of audio**. As a guide, a one-minute confession takes about 2 to 3 minutes per voice, and a five-minute one about 12 minutes per voice. Your computer may be faster or slower.

Tips:

- Do a **single short confession first** to check the voice and speed.
- Start long batches before you leave, since the tool can run unattended and skips finished work if you stop it.
- Generating both voices takes twice as long as one. Use `--voices female` to save time while you experiment.

## What comes out

- **MP3, mono, 64 kbps**, evened out for loudness. A one-minute confession is about 0.5 MB. A library of about 45 confessions is roughly 70 MB per voice.
- The title (if you gave one) is saved in the file's tags.
- Dove accepts MP3 files up to 25 MB, far more than a five-minute confession needs.

## Troubleshooting

| Message | What to do |
|---|---|
| `ffmpeg is required but was not found` | Install ffmpeg (see "What you need"), then run again. |
| `the file name must be the confession's slug` | Rename the file to lowercase words joined by hyphens, like `tithers-confession.txt`. |
| `no text to read` | The file is empty or has only a `# Title` line. |
| `Unknown voice "…". Available: …` | Check the spelling against the voices table above. |
| `--speed must be a number between 0.5 and 1.5` | Use a value such as `0.9`. |
| `a very long sentence may be cut off` | Kokoro reads about 400 characters of a single sentence at a time. Add a full stop or split the sentence in the text file (and in the confession itself, so the text stays in sync). |
| Out of memory, or the computer freezes | Close other programs and try again. Run one confession at a time, and use `--voices female` or `--voices male` to do one voice per run. |
| The first run is slow to start | It's downloading the model. Later runs start in a few seconds. |
| A voice sounds wrong on one word | Add that word to `pronunciations.json`. |

## Cleaning up

Everything lives inside this folder, so removing the tool is simple:

- To free the disk space but keep your files, delete `node_modules/`. Run `bun install` again when you next need it. The downloaded model is stored inside `node_modules`.
- Your finished MP3s are in `out/`. Once uploaded to Olive, they are safe to delete, because they can always be made again from the text.

## Development

The text handling (title line, paragraphs, hashing, pronunciations, skip rules) is in `src/lib.ts`, with unit tests in `src/lib.test.ts`. The tests run with the app's tests from the repo root:

```bash
bun run test            # from the repo root, includes this tool's tests
bun run check-types     # from this folder: type-checks the tool
```

The root type-check and lint skip this folder because it has its own dependencies.
