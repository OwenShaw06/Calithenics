# Low Orbit

A workout tracker for the iPhone Home Screen. Plain HTML, CSS and vanilla JS. No build step, no npm, no CDN. Works fully offline once it has loaded one time.

- Double progression with progression lines (push-up → deficit → archer → one-arm, pull-up → weighted, and more)
- Burn logging with reps, added weight, per-set notes, rest timer, mid-workout add/swap/remove
- Charts drawn by hand in SVG, personal records, body weight trend, weekly summary
- Cardio log, 13-minute mobility routine with timer, skill hold tracker with stopwatch
- Calendar history with editing of any past entry, fully editable weekly schedule and workouts
- All data stays on your phone (localStorage). Export and import from Systems.

## Deploy on GitHub Pages

1. Create a new repository on GitHub, for example `low-orbit` (public, or private if your plan allows Pages on private repos).
2. Unzip `low-orbit.zip`. Open the folder and upload **everything inside it** (not the folder itself) to the repo root, so `index.html` sits at the top level next to `sw.js`, `manifest.json`, `css/`, `js/` and `icons/`.
   - On github.com: **Add file → Upload files**, drag all the files and folders in, then **Commit changes**.
   - Or with git:
     ```bash
     cd low-orbit
     git init && git add . && git commit -m "Low Orbit"
     git branch -M main
     git remote add origin https://github.com/YOUR-USERNAME/low-orbit.git
     git push -u origin main
     ```
3. In the repo go to **Settings → Pages**. Under **Build and deployment** set **Source: Deploy from a branch**, branch **main**, folder **/ (root)**, then **Save**.
4. Wait a minute or two. Your app will be at `https://YOUR-USERNAME.github.io/low-orbit/`.

Everything uses relative paths, so the subpath works without any edits.

## Add to the iPhone Home Screen

1. Open the Pages URL in **Safari** (it must be Safari for this to work).
2. Tap the **Share** button.
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. Launch it from the Home Screen icon. It opens full screen like a native app.
5. Open it once with a connection so it can cache itself. After that it works in airplane mode.

## Updating the app later

If you change any file, open `sw.js` and bump `VERSION` (for example `lo-v1.0.1`) so phones pick up the new files. Your data is not touched by updates. If an old version seems stuck, close the app from the app switcher and open it again.

## Backups

Systems → **Export backup** saves a JSON file (it opens the iOS share sheet, so you can save to Files or AirDrop it). **Import backup** restores one. iOS can clear website data for apps you have not opened for a long time, so export now and then.

## Things worth knowing

- **Alerts:** the rest timer uses sound plus an on-screen flash.
- **Sound** needs one tap in the app first (iOS rule). Logging a set counts.
- **The screen stays awake** during a burn and during the mobility routine (when iOS allows it).
- **Volume** is an estimate: reps × (added weight + a bodyweight share per exercise). Log your body weight so bodyweight moves count. Edit the share in an exercise's settings.
- Test it locally with any static server, for example `python3 -m http.server` in this folder, then open `http://localhost:8000/`.

## Files

```
index.html  manifest.json  sw.js
css/style.css
js/core.js      data, defaults, storage
js/engine.js    plan resolution, stats, double progression
js/charts.js    SVG charts
js/fx.js        starfield, launch sequence, audio
js/ui.js        sheets, rest timer, forms
js/v-*.js       screens
js/app.js       router and transitions
icons/          Home Screen and PWA icons (PNG)
```
