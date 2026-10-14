# Narration in your own voice

Power a City has 14 narration lines, about 4 minutes in total. That's the PRD's nine slots (PAC-01 to PAC-09) plus five additions: PAC-10 for the Connect step, PAC-11 and PAC-12 for the Solar panels and Battery cards, and PAC-13 and PAC-14 to guide each half of the experiment. None are recorded yet. Until a line is recorded, the browser's built-in voice reads it, and the captions show the same words either way. You can record a few lines at a time.

## Recording

The easiest way is the recording page. Open the lesson's link with `#record` on the end (for example `https://your-site.netlify.app/#record`), or open **Settings → Record narration**. The page lists every line in the order a class hears it, with **Record**, **Play** and **Save file** buttons, and it names each file for you. It's the same recorder as Ocean Explorer's. Nothing is uploaded: files save to your computer.

Phone voice memos work too. Name each file after its line, as in the table below.

Tips:

- Use a quiet room with soft furnishings. Hold the microphone about a hand's width from your mouth.
- Pause for a beat before and after each line.
- Read at classroom pace, a little slower than normal conversation.
- **Read the words exactly as written.** The captions show this text while your voice plays. If you'd rather say something differently, note your wording and the transcript will be updated to match.
- The recording page needs the secure (https) link, and the browser will ask for microphone access the first time.

## The script

### Lesson steps

| Line | File | When it plays | Words to read |
|---|---|---|---|
| PAC-01 Welcome | `PAC-01.mp3` | when the lesson starts | Flip a switch and the light comes on. But where does that electricity come from, and how does it reach your home? Let’s follow the route. Select each part of the neighborhood to find out what it does. |
| PAC-10 Connect | `PAC-10.mp3` | on the Connect step | Electricity travels along a route. Drag each card into its step, from the source all the way to the buildings. Then press Check route. |
| PAC-07 Two kinds of numbers | `PAC-07.mp3` | when the experiment opens | Two kinds of numbers. Power units tell how much electricity is flowing right now, like water from a tap. Energy units tell how much is saved in the battery, like water in a bucket. A battery does not make electricity — it saves energy when there is extra and gives it back later, until it runs out. |
| PAC-08 The challenge | `PAC-08.mp3` | after “Got it” | Here is your challenge. In the daytime, the solar panels and the power plant make more electricity than the neighborhood needs. In the evening, the sun sets, so the solar panels stop. People come home, so the neighborhood needs more. The power plant alone can’t keep up. Your job: save extra energy in the battery during the day, then use it in the evening to keep every light on. |
| PAC-14 Daytime directions | `PAC-14.mp3` | when the controls appear | It’s daytime and the sun is shining, so there is extra power. Set the battery to Charge to save it. Check the preview, then press Run one interval. |
| PAC-13 Evening directions | `PAC-13.mp3` | once the battery is charged | Your battery is charged. Now switch to evening. The sun has set, the solar panels make nothing, and the neighborhood needs more power. How can the battery and the power plant keep every light on? |
| PAC-09 Reflection | `PAC-09.mp3` | when the explanation box appears | What did you change to keep the lights on, and what did you see that shows it worked? |

### Info cards (heard when a part of the neighborhood is selected)

| Line | File | When it plays | Words to read |
|---|---|---|---|
| PAC-02 Generation card | `PAC-02.mp3` | when the card opens | Every route starts at a source. Here, a power plant makes electricity, and its output can be turned up or down. |
| PAC-03 Transmission card | `PAC-03.mp3` | when the card opens | Tall towers carry high-voltage lines over long distances, from the plant toward town. |
| PAC-04 Substation card | `PAC-04.mp3` | when the card opens | At the substation, transformers lower the voltage so electricity can move onto local lines. |
| PAC-05 Distribution and Buildings cards | `PAC-05.mp3` | when the card opens | Local lines run along the street to homes, the school, shops and streetlights. |
| PAC-11 Solar panels card | `PAC-11.mp3` | when the card opens | Solar panels turn sunlight into electricity. They only work while the sun is up. In the evening, they make nothing at all. |
| PAC-12 Battery card | `PAC-12.mp3` | when the card opens | A battery stores energy to use later. It has to be charged first. Once it is empty, it can’t help until it is charged again. |

### For the full lesson (prediction step, coming next)

| Line | File | When it plays | Words to read |
|---|---|---|---|
| PAC-06 Prediction | `PAC-06.mp3` | before evening is revealed | The sun is setting. What do you think will change in the neighborhood? |


PAC-06 is ready to record now, but nothing plays it until the prediction step is built (milestone 4).

## Adding recordings to the lesson

1. Convert each file to MP3 (mono, normalized loudness):

   ```bash
   ffmpeg -i PAC-01.webm -af "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse,loudnorm=I=-16:TP=-1.5" -ac 1 -b:a 96k public/media/narration/PAC-01.mp3
   ```

   This trims silence at both ends and evens out the volume between lines.
2. Add the line's id (the file name without `.mp3`) to `recordedNarration` in `src/content/recordings.ts`.
3. Run `npm test`. It fails if a listed id has no file, or if a file's name doesn't match a real line.
4. If you changed any wording while recording, update the matching `transcript` in `src/content/lesson.ts` so the captions match your voice.

## How playback works

- Narration only starts after a click (Start lesson, opening a card, or **Listen**), never on page load.
- Each step and each info card has its own line. Moving to another step or card stops the current line, so two voices never overlap. Closing a card stops its line without replaying the step's line.
- The caption bar at the bottom of the scene has Listen/Pause, Replay, Stop and Mute. Captions advance sentence by sentence, timed to your recording.
- **Settings → Narration** turns captions on or off, and switches between auto-play and playing only when **Listen** is pressed.
- If a recording can't load, that line falls back to the browser voice. If no voice is available at all, captions still advance at reading pace, so the lesson never stalls.
