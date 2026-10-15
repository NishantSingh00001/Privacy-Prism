# Privacy Prism

Privacy Prism is a free, browser-only synthetic-data release-readiness lab. It compares an original/reference CSV with a synthetic CSV and turns the results into readable evidence for a human review. The selected visual direction is the dark **Privacy Prism** concept: graphite panels, large readable typography, a sharply faceted vector crystal, animated light dispersion, and pointer-responsive tilt.

## Start

Open `index.html` directly, or serve this folder locally:

```sh
python3 -m http.server 8000
```

Visit `http://localhost:8000`. No build step, package installation, account, API key, or paid service is required. Google Fonts improve the visual match; the design falls back to system fonts if they are unavailable.

## Deploy on Vercel

1. Upload the contents of this folder to the root of a GitHub repository.
2. Import the repository in Vercel.
3. Choose **Other** as the framework preset, leave the build command empty, and set the output directory to `.`.
4. Deploy.

## Preserved core features

- **Utility and fidelity:** compare numeric distributions with a two-sample empirical CDF distance plus standardized mean movement; compare categories with total variation distance.
- **Nearest-row similarity screen:** compare up to 250 synthetic rows against up to 250 source rows using normalized, shared non-identifier fields; report exact overlaps and mean nearest-row similarity.
- **Group coverage:** compare proportions for one selected categorical field and inspect missing categories.

## Ten added checks and workflows

1. **Schema alignment:** find source-only and synthetic-only columns.
2. **Missingness fidelity:** compare per-field null rates.
3. **Distribution-shape screen:** report KS distance for numeric fields and total variation distance for categories.
4. **Relationship drift:** compare pairwise Pearson correlations for numeric feature pairs.
5. **Range and category validity:** identify numeric values outside the source range and categories not observed in the source.
6. **Record integrity:** count duplicate rows in both datasets.
7. **Attribute-inference scenario:** choose known fields and a sensitive field to see whether synthetic groups can help predict source values, with a majority baseline.
8. **Intersectional coverage:** compare two-field combinations to find source combinations absent from synthetic data.
9. **Downstream model utility proxy:** compare a simple 1-nearest-neighbor classifier trained on source versus synthetic rows, evaluated on held-out source rows.
10. **User-defined release gate and evidence pack:** set thresholds, see PASS / REVIEW / HOLD flags, and download aggregate JSON evidence.

Every analysis control is functional in the browser. The included customer-style demo data is fabricated for interface exploration and contains no real people.

## Privacy and interpretation

CSV files are parsed in browser memory. The app does not send rows to a server or include rows in the JSON evidence export. It does not save uploaded data in local storage; closing the tab clears it. The optional theme preference is stored locally.

These are exploratory screens, not a certification, legal assessment, differential-privacy guarantee, or proof against re-identification. Nearest-neighbor similarity is not a probability of disclosure. The inference and model checks are deliberately simple and can be unstable on small data. Range validity can flag legitimate generated tail values. A passing user-defined gate is not evidence that data is safe to publish. Review the in-app **Method & limitations** page and get an appropriate privacy/security review before releasing sensitive data.

## Product position

The problem is real and active: teams need an understandable release review that examines utility, similarity risk signals, missingness, relationships, and subgroup blind spots together. This project should be presented as a distinctive local-first workflow and visual product experience—not as a claim that synthetic-data evaluation is a wholly untouched research area.
