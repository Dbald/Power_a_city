# Real reference photos

The neighborhood is a model, so each info card can also show a **real photo** of the thing it describes, which helps learners connect the model to what they see in their own town. A photo appears at the top of the card, labelled **Real photo**, with its credit and licence underneath. It sits inside the card and never covers the scene. A part without a photo simply shows none, so photos can be added one at a time.

No photos are bundled yet. The build environment can't reach photo libraries, so each photo needs to be chosen and its licence checked by a person.

## Do photos need a licence?

Yes. Every photo is someone's copyright unless its owner has released it. Finding a photo online doesn't make it free to reuse. The PRD also requires every shipped asset to have a source and licence record (§14). Photos that are safe to use:

| Source | Licence | What you must do |
|---|---|---|
| **Your own photos** | You own them | Nothing. Credit: "Photo: Devin Baldwin". This is often the best option: real poles, substations and solar farms near you, shot from public places outside the fences. |
| **US federal agency photos** (for example the Department of Energy, Energy Information Administration, Army Corps of Engineers) | Usually public domain | Check the credit on each photo. Photos by contractors or outside photographers on .gov sites can still be copyrighted. National labs such as NREL are run by contractors and have their own image terms, so read them first. |
| **Wikimedia Commons** | Each file states its own: public domain, CC0, CC BY or CC BY-SA are fine | Copy the author's name and the exact licence from the file's page, and link to it. |
| **Unsplash, Pexels** | Their own free licences | Free to use without attribution, but credit the photographer anyway. |

**Avoid:**
- **NC (non-commercial) licences.** Devinci Global LLC is a company, so commercial use is likely.
- **ND (no-derivatives) licences.** Even cropping can count as a change.
- Photos with no stated licence, watermarked stock photos, and images copied from search results.
- **Visible company logos or utility names.** The lesson is a fictional neighborhood and must not suggest any real utility is involved.
- **Identifiable people,** especially children.

This is practical guidance, not legal advice. If a photo's terms are unclear, pick another.

## Photos wanted (7)

| Subject id | What a good photo shows |
|---|---|
| `generation` | A natural-gas power plant with its stacks (no company logos) |
| `transmission` | Tall lattice transmission towers carrying high-voltage lines across open land |
| `substation` | A fenced substation yard with transformers and steel gantries |
| `solar` | Rows of ground-mounted solar panels in sunlight |
| `battery` | A grid battery storage site with container-style battery units |
| `distribution` | Wooden utility poles along a street, ideally with a pole-top transformer |
| `buildings` | A neighborhood street at dusk with house windows and streetlights lit |

## Adding a photo

1. Save it as a JPG about 1200 pixels wide (under about 300 KB) in `public/media/photos/`, for example `substation.jpg`.
2. Add a record to `referencePhotos` in `src/content/photos.ts`:

   ```ts
   {
     subject: 'substation',
     file: 'substation.jpg',
     alt: 'A fenced substation yard with large grey transformers',
     credit: 'Photo: Devin Baldwin',
     license: 'Project-owned',
     sourceUrl: 'https://…the page the photo came from (or your site)…',
   },
   ```

3. Run `npm test`. It fails if the file is missing, the subject is unknown, any field is empty, or the licence is NC or ND.

The photo is added to the asset register (`src/content/assets.ts`) automatically, with its credit and licence.
