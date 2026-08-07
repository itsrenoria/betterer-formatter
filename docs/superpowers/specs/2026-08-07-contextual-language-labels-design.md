# Contextual Language Labels

## Goal

Remove ambiguity from the language carrier shown in Detection without changing formatter, Worker, URL, or Fusion behavior.

## UI Copy

- Rename the Languages Display choices from **Preferred Only**, **All Detected**, and **Hide** to **Preferred**, **Detected**, and **Hide**.
- Display the language carrier as **Languages (Preferred)** when `uLanguages` is selected.
- Display the language carrier as **Languages (Detected)** when `languages` is selected.
- Omit the language carrier when languages are hidden, as today.
- Use the same contextual wording in the detection map, marker-only reasons, and Custom carrier modal.

## Compatibility

Keep the internal values `uLanguages`, `languages`, and `off` unchanged. Existing service URLs and generated JSON therefore remain compatible.

## Verification

Unit-test both contextual labels and the renamed controls. Manually verify Preferred under Markers and Detected under Filename on the published configurator.
