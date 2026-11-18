# Leaf & Letter

Responsive read-only catalogue for the 1,000 records stored by the Books Pipeline.

## Features

- live Supabase connection status and collection metrics;
- title, category, minimum-rating, and maximum-price filters;
- server-side sorting and pagination;
- shareable filter URLs;
- saved books stored locally in the browser;
- random book discovery and detailed product dialogs;
- automatic local fallback containing all 1,000 books;
- responsive, keyboard-friendly interface.

## Connect Supabase safely

1. Run `frontend_access.sql` in the Supabase SQL Editor.
2. Copy the Project URL and **publishable** key from Supabase.
3. Add both to `config.js`.
4. Never place a secret/service-role key in this folder.

The publishable key is intentionally visible in browser code. The read-only RLS policy is what prevents unauthorized changes.

## Preview

From the project root:

```powershell
py -m http.server 5500 --directory web
```

Open [http://localhost:5500](http://localhost:5500).

