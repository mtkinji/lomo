# Learning release

Build a standard drawer with recent Place, completed Goal, and cooked Meal choices, alongside optional writing/photos. Local native build first; no deployment or schema change required. All displayed suggestions must use real authorized records, never fixtures in production. Empty/offline sources keep writing available; failed remote source offers retry. Keep account-switch cancellation and household-device isolation. Meal sharing includes title only, never private notes or recipe contents.

Acceptance: draft restoration and retry preserved; choices appear without focusing input; picking a moment does not publish; Post remains reachable with keyboard; drag/close retains draft; source failures do not hide local choices.
