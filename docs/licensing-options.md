# Licensing options matrix

Last updated: 2025-11-02
Scope: Frontend (React, MUI, Emotion) + optional backend (Express). Dependencies are permissive (MIT/Apache). Pattern catalog content remains under CC BY-SA 3.0 with attribution.

Assumptions
- Sole human author: you. No external human contributors; AI outputs are usable by you per provider terms.
- No GPL/AGPL third-party code in the repo.
- You may distribute built artifacts (SPA bundle, Docker image) and/or source.

---

## Option A — Keep GPLv3 (status quo)
When to choose
- You want all redistributions (including minified builds) to provide corresponding source under GPLv3.

Pros
- Ensures improvements stay open.
- Familiar to open-source contributors.

Cons
- Incompatible with closed-source distribution of the app bundle.
- Some organizations avoid GPL.

What you must do
- Provide the Corresponding Source when you convey binaries (the built SPA). Practical ways:
  - Link “Source for this build” in-app and README to the exact tag/commit (e.g., `baseline-2`).
  - Or include the source alongside distributions.
- Include the GPLv3 LICENSE in distributions.
- Preserve third-party notices (keep `THIRD_PARTY_NOTICES.md`).

Minimal changes (recommended)
- Add an in-app link (About/Help) labeled “Source for this build” to the repo tag.
- Ensure README has a “License” section referencing GPLv3 and the source link.

Impact
- You can continue publishing source on GitHub and deploy builds; just ensure source availability is clear and accessible.

---

## Option B — MIT (permissive)
When to choose
- Maximize adoption and allow closed-source distribution.

Pros
- Minimal obligations: keep copyright and license notice.
- Extremely widely used.

Cons
- No explicit patent grant (often acceptable; if you prefer an explicit grant, pick Apache-2.0).

What you must do
- Replace LICENSE with MIT text for your code.
- Keep `THIRD_PARTY_NOTICES.md` for clarity.
- Maintain CC BY-SA attribution for pattern content.

Minimal changes
- Update `LICENSE` to MIT.
- Adjust About/Help license text.
- Update README License section.

Impact
- You may distribute minified builds without providing source (still comply with third-party notices).

---

## Option C — Apache-2.0 (permissive with patent grant)
When to choose
- You want a permissive license with explicit patent grant/termination.

Pros
- Patent protection; corporate-friendly.
- Clear NOTICE-handling.

Cons
- Slightly more overhead: preserve NOTICE.

What you must do
- Replace LICENSE with Apache-2.0 text for your code.
- Add/maintain a NOTICE file.
  - You can rename or duplicate `THIRD_PARTY_NOTICES.md` to `NOTICE` and keep Material Icons’ Apache notice.
- Maintain CC BY-SA attribution for pattern content.

Minimal changes
- Update `LICENSE` to Apache-2.0.
- Add `NOTICE` (based on `THIRD_PARTY_NOTICES.md`).
- Adjust About/Help license text; link to NOTICE.
- Update README License section.

Impact
- Binary-only distribution allowed; ensure NOTICE is preserved.

---

## Option D — MPL 2.0 (file-level copyleft)
When to choose
- You want modifications to your files to remain open, but allow combination with proprietary code.

Pros
- Balanced copyleft; easier in JS bundling than LGPL.

Cons
- More complex than permissive licenses.

What you must do
- Replace LICENSE with MPL-2.0.
- Ensure that modified files are available in source form to recipients when you distribute the app.

Minimal changes
- Update `LICENSE` to MPL-2.0.
- Update About/Help and README.

Impact
- Permits mixed distributions; obligations are scoped to modified files.

---

## Option E — Dual-license (e.g., GPLv3 + Commercial or GPLv3 + MIT)
When to choose
- You want community contributions under GPL but offer permissive/commercial terms to specific partners.

Pros
- Flexibility for different audiences.

Cons
- Requires you own all copyrights or have CLAs from contributors.

What you must do
- Publish a clear dual-licensing statement in README.
- Provide the alternative license text (commercial or permissive) and terms.

Minimal changes
- Keep GPLv3 LICENSE.
- Add a `COMMERCIAL-LICENSE` or note that permissive terms are available on request.

Impact
- Community gets GPL; customers can license under alternative terms.

---

## Option F — Proprietary or source-available (e.g., BSL 1.1)
When to choose
- You want to keep code closed while distributing binaries.

Pros
- Maximum control.

Cons
- Not OSI-approved; reduces community adoption.

What you must do
- Replace LICENSE with your EULA or BSL.
- Ensure third-party obligations (Apache NOTICE, CC BY-SA attribution) remain satisfied.

Impact
- Commercial posture; ensure compliance with third-party terms.

---

## Common compliance checklist (any option)
- Keep pattern catalog attribution (CC BY-SA 3.0) in-app and README.
- Preserve Material Icons Apache-2.0 notice (already captured in `THIRD_PARTY_NOTICES.md`).
- Update AboutDialog and HelpDialog license strings accordingly.
- If staying on GPLv3: add “Source for this build” link to the exact tag/commit in About/Help and README.

## Suggested picks
- Prefer adoption and simple compliance: Apache-2.0 (with `NOTICE`) or MIT (keep `THIRD_PARTY_NOTICES.md`).
- Prefer copyleft without being as strong as GPL: MPL 2.0.
- Prefer strong copyleft: keep GPLv3 and add a clear source link.

## Next steps (action templates)
- MIT: Replace `LICENSE`; update README/About/Help.
- Apache-2.0: Replace `LICENSE`; add `NOTICE` from `THIRD_PARTY_NOTICES.md`; update README/About/Help.
- GPLv3: Add in-app/README link to exact source for each build; keep `LICENSE` and notices.
- MPL 2.0: Replace `LICENSE`; update README/About/Help; ensure distribution of modified files’ source.
