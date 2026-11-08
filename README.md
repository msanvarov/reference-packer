# Reference Packer

**One subject, one sheet.** A small, free tool for getting more consistent video out of ByteDance's Seedance models on [Higgsfield](https://higgsfield.ai). It packs several reference images (front, three-quarter, profile, back, close-ups) into a single clean reference sheet, checks the sheet against the rules that keep characters and products stable, and writes the prompt that tells Seedance what the sheet is.

It's the working example for the guide **[Pack Your References: Getting Higher-Quality Seedance Videos on Higgsfield](https://www.sal-anvarov.com/blog/seedance-reference-sheets-higgsfield)**.

**Live:** https://reference-packer.netlify.app

![A sample reference sheet: six views of one illustrated character on a light grey background](docs/sample-sheet.png)

## Why a sheet?

Seedance takes a limited number of references per generation (on Higgsfield, Seedance 2.0 lists up to 9 images, 3 videos and 3 audio files), and a first-frame image can't be combined with reference images in the same run. Uploading five angles as five files spends five slots on one subject, and each photo brings its own lighting and crop. One sheet per subject:

- costs **one** `@character` / `@product` slot, leaving room for style, motion and audio references;
- shows the subject under **one** lighting setup, at **one** scale, so the only thing that varies between panels is the angle;
- keeps relationships (a product in a hand, a logo on a jacket) intact.

## What the app does

1. **Panels.** Drop photos (or try the sample panels), then reorder or remove them. Everything runs in your browser; nothing is uploaded.
2. **Layout.** Auto or fixed columns, panel size, gutter and a neutral background. Each image is fitted inside an equal cell and never upscaled.
3. **Sheet.** A live preview with a PNG download, plus a linter:
   - 2–9 panels per sheet;
   - at least 2048 px on the long edge;
   - no inputs under 512 px on the short side;
   - similar overall brightness across panels (mismatched light is the fastest route to a face that changes between cuts).
4. **Prompt.** Builds a Seedance prompt in the guide's structure: map the tag, state that the sheet shows **one** subject, restate the identity anchors, then one action, camera and light.

## CLI

The same layout as a Python script, for batch work:

```bash
pip install -r cli/requirements.txt
python cli/make_sheet.py sheet.png front.jpg three_quarter.jpg profile.jpg back.jpg face.jpg detail.jpg
python cli/make_sheet.py sheet.png *.jpg --cols 3 --cell 1024 --gap 48 --bg "#ececee"
```

## Develop

No build step: it's plain HTML, CSS and ES modules.

```bash
python3 -m http.server 8080   # then open http://localhost:8080
npm test                      # layout, linter and prompt tests (node --test)
```

Deployed on Netlify from the repo root (`netlify.toml`), with a strict Content-Security-Policy.

## Author

Built by [Sal Anvarov](https://www.sal-anvarov.com/), a full stack developer in Toronto and founder of the software studio [DEV BY SAL](https://by-sal.dev). Sal presents at a Toronto Meetup on AI topics — how to use different AI techniques to build AI-native software.

Not affiliated with ByteDance or Higgsfield. Reference limits change; check the current caps in the Higgsfield app.

## License

MIT
