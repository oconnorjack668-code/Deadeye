# Funnel data

The founder adds one file a week. Agents cannot read the live database, so
this folder is all the data they get.

- `YYYY-MM-DD-funnel.md`: the output of `docs/funnel-counts.sql` (Supabase
  SQL editor) or the `/admin/funnel` page, with owner and test accounts
  subtracted. Counts only.
- `YYYY-MM-DD-notes.md` (optional): what players said, paraphrased, with no
  names, ages or contact details.

Commit and push the file before running `/agent-os` in a cloud session.
