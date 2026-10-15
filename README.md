# Privacy Prism — Synthetic Data Quality Lab

A free-first, browser-only workbench for comparing an original CSV with a synthetic CSV across statistical utility, record similarity, and subgroup representation. The selected visual direction is **Privacy Prism**: a restrained graphite interface with an interactive WebGL crystal with flowing data ribbons, custom lighting, and analysis-reactive color. It uses native WebGL shaders and needs no 3D library or build step.

## Run locally

Open `index.html` in a modern browser, or serve the folder:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Google Fonts are optional; the page falls back to system fonts. No API key, backend, account, package install, or paid service is required.

## Deploy on Vercel

1. Put the contents of this folder at the root of a GitHub repository.
2. Import the repository in Vercel.
3. Choose **Other** as the framework preset.
4. Leave the build command blank and use `.` as the output directory.
5. Deploy.

## What works

- Upload a source CSV and a synthetic CSV from the Datasets view. Files are parsed and analyzed in the browser tab; raw rows are not uploaded or stored in local storage.
- Load the included sample pair to explore the app immediately.
- Compare numeric features using mean and standard-deviation drift; compare categorical features using total variation distance.
- Screen up to 300 sampled rows in each file for exact overlap and nearest-neighbor similarity.
- Select a categorical feature to compare subgroup proportions and identify categories absent from the synthetic dataset.
- Switch between Overview, Utility, Privacy Risk, Subgroup Coverage, Datasets, and Method & Limits. Export an analysis summary as JSON or CSV.
- Change between dark and light themes. The preference is saved locally; uploaded dataset rows are not.

## Scope and limitations

These are exploratory screening metrics, not a certification. The privacy screen is not differential privacy, a membership-inference attack, re-identification proof, or legal compliance review. It compares at most 300 deterministically sampled rows per file, which can miss rare cases. Numeric utility uses simple moment comparisons and does not capture every distributional or relational property. Coverage only evaluates one selected categorical field at a time and does not establish fairness. Review the method page before using the results; sensitive data requires a formal privacy review.

The initial version uses deterministic statistics rather than an LLM or a trained model. This keeps the complete analysis local and free, and makes the calculations inspectable. Any future AI explanation layer should be optional and should never receive raw uploaded data by default.
