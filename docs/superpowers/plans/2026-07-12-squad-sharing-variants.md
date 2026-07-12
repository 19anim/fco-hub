# Squad Sharing Variants Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update squad sharing so each share can include up to three squads: required “Mặc định - Hòa”, optional “Đang dẫn”, and optional “Đang thua”.

**Architecture:** Keep the existing `variants` API/model shape and change only the create/view UI semantics. The create page will maintain a required drawing/default variant plus checkbox-like optional variant toggles, while the viewer will keep tab-style switching across saved variants.

**Tech Stack:** React 19, Vite, existing CSS in `client/src/fco/styles/squad.css`, existing Express/Mongoose squad-share API.

## Global Constraints

- Do not add database cleanup code; old squad-sharing records were manually deleted by the user.
- Save only selected variants in the existing `variants` array.
- “Mặc định - Hòa” is always selected, cannot be removed, and is required to create the share.
- Optional variants are exactly “Đang dẫn” with a goal threshold and “Đang thua” with a goal threshold.
- Viewer users can switch between saved variants.
- Keep changes focused; do not redesign the squad editor or API.
- Use `rtk` prefix for shell commands.

---

### Task 1: Update create-page variant model and interactions

**Files:**
- Modify: `client/src/fco/views/SquadSharingCreateView.jsx:10-253`

**Interfaces:**
- Consumes: existing `SquadPitchEditor`, `DEFAULT_FORMATION_ID`, `loadSquad()`, `createSquadShare(payload)`.
- Produces: `variants` payload entries with `{ key, conditionType, conditionLabel, conditionThreshold, formationId, bySlotId, customSlots }` where `conditionType` is `drawing`, `leading`, or `losing`.

- [ ] **Step 1: Update condition constants and initial state**

Replace the current `CONDITION_TYPES` and variant setup with deterministic condition metadata:

```jsx
const CONDITION_TYPES = [
  { type: 'drawing', label: 'Mặc định - Hòa', needsThreshold: false, required: true },
  { type: 'leading', label: 'Đang dẫn', needsThreshold: true, required: false },
  { type: 'losing', label: 'Đang thua', needsThreshold: true, required: false },
];

const REQUIRED_CONDITION_TYPE = 'drawing';

function emptySquad() {
  return { formationId: DEFAULT_FORMATION_ID, bySlotId: {}, customSlots: null };
}

function makeVariant(conditionType, seedSquad) {
  const meta = CONDITION_TYPES.find((c) => c.type === conditionType) || CONDITION_TYPES[0];
  return {
    key: conditionType,
    conditionType,
    conditionLabel: meta.label,
    conditionThreshold: meta.needsThreshold ? 1 : null,
    formationId: seedSquad.formationId,
    bySlotId: seedSquad.bySlotId,
    customSlots: seedSquad.customSlots,
  };
}
```

Then initialize state with the required variant:

```jsx
const [variants, setVariants] = useState(() => [makeVariant(REQUIRED_CONDITION_TYPE, loadSquad())]);
const [activeVariantKey, setActiveVariantKey] = useState(REQUIRED_CONDITION_TYPE);
```

- [ ] **Step 2: Replace add/remove with checkbox-like toggle behavior**

Replace `addVariant` and `removeVariant` with this function:

```jsx
function toggleVariant(conditionType) {
  const meta = CONDITION_TYPES.find((c) => c.type === conditionType);
  if (!meta || meta.required) {
    setActiveVariantKey(REQUIRED_CONDITION_TYPE);
    return;
  }

  const existing = variants.find((v) => v.conditionType === conditionType);
  if (existing) {
    setVariants((prev) => prev.filter((v) => v.conditionType !== conditionType));
    if (activeVariantKey === existing.key) setActiveVariantKey(REQUIRED_CONDITION_TYPE);
    return;
  }

  const seed = activeVariant
    ? { formationId: activeVariant.formationId, bySlotId: activeVariant.bySlotId, customSlots: activeVariant.customSlots }
    : emptySquad();
  const next = makeVariant(conditionType, seed);
  setVariants((prev) => [...prev, next]);
  setActiveVariantKey(next.key);
}
```

- [ ] **Step 3: Render all three options in fixed order**

Replace the current `<div className="fco-squad-share-variants-bar">...</div>` with:

```jsx
<div className="fco-squad-share-variants-bar" role="group" aria-label="Tuỳ chọn đội hình theo tỷ số">
  {CONDITION_TYPES.map((condition) => {
    const variant = variants.find((v) => v.conditionType === condition.type);
    const selected = Boolean(variant);
    const active = activeVariantKey === (variant?.key || condition.type);
    return (
      <button
        key={condition.type}
        type="button"
        className={`fco-squad-share-variant-tab${active ? ' active' : ''}${selected ? ' selected' : ''}`}
        onClick={() => {
          if (selected) setActiveVariantKey(variant.key);
          else toggleVariant(condition.type);
        }}
        aria-pressed={selected}
      >
        <span className="fco-squad-share-variant-check">{selected ? '✓' : ''}</span>
        {condition.label}
        {!condition.required && selected && (
          <span
            role="button"
            tabIndex={0}
            className="fco-squad-share-variant-remove"
            onClick={(e) => { e.stopPropagation(); toggleVariant(condition.type); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                toggleVariant(condition.type);
              }
            }}
            aria-label={`Bỏ chọn ${condition.label}`}
          >
            <I.X size={12} />
          </span>
        )}
      </button>
    );
  })}
</div>
```

- [ ] **Step 4: Ensure share payload saves selected variants in display order**

Replace the `variants:` payload mapping with ordered selected variants:

```jsx
variants: CONDITION_TYPES
  .map((condition) => variants.find((v) => v.conditionType === condition.type))
  .filter(Boolean)
  .map(({ key, conditionType, conditionLabel, conditionThreshold, formationId, bySlotId, customSlots }) => ({
    key, conditionType, conditionLabel, conditionThreshold, formationId, bySlotId, customSlots,
  })),
```

- [ ] **Step 5: Run lint/build for the client**

Run:

```bash
rtk npm --prefix client run build
```

Expected: build completes without React or syntax errors.

---

### Task 2: Update viewer labels for saved variants

**Files:**
- Modify: `client/src/fco/views/SquadSharingView.jsx:9-14`

**Interfaces:**
- Consumes: saved `variant.conditionType`, `variant.conditionLabel`, `variant.conditionThreshold`.
- Produces: viewer labels “Mặc định - Hòa”, “Đang dẫn X bàn”, and “Đang thua X bàn”.

- [ ] **Step 1: Replace condition display labels**

Replace `conditionDisplayLabel` with:

```jsx
function conditionDisplayLabel(variant) {
  if (variant.conditionType === 'leading') return `Đang dẫn ${variant.conditionThreshold ?? 1} bàn`;
  if (variant.conditionType === 'losing') return `Đang thua ${variant.conditionThreshold ?? 1} bàn`;
  if (variant.conditionType === 'drawing') return 'Mặc định - Hòa';
  return variant.conditionLabel || 'Mặc định - Hòa';
}
```

- [ ] **Step 2: Run build again**

Run:

```bash
rtk npm --prefix client run build
```

Expected: build completes without errors.

---

### Task 3: Adjust checkbox-like variant styling

**Files:**
- Modify: `client/src/fco/styles/squad.css:1438-1459`

**Interfaces:**
- Consumes: existing classes `fco-squad-share-variants-bar`, `fco-squad-share-variant-tab`, `active`, `selected`, `fco-squad-share-variant-remove`.
- Produces: visible checkbox-like affordance without changing layout structure.

- [ ] **Step 1: Add styling for selected state and check mark**

Update the variant styles to include the check marker:

```css
.fco-squad-share-variants-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 14px; }
.fco-squad-share-variant-tab {
  display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--border); border-radius: 999px;
  background: color-mix(in srgb, var(--surface) 88%, transparent); color: var(--muted); padding: 8px 12px; font-weight: 800; cursor: pointer;
}
.fco-squad-share-variant-tab:hover { border-color: color-mix(in srgb, var(--accent) 40%, var(--border)); color: var(--text); }
.fco-squad-share-variant-tab.selected { color: var(--text); border-color: color-mix(in srgb, var(--accent) 45%, var(--border)); }
.fco-squad-share-variant-tab.active {
  border-color: var(--accent); background: color-mix(in srgb, var(--accent) 14%, var(--surface)); color: var(--text);
}
.fco-squad-share-variant-check {
  display: inline-grid; place-items: center; width: 16px; height: 16px; border-radius: 5px;
  border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--border)); color: var(--accent); font-size: 12px; line-height: 1;
}
.fco-squad-share-variant-remove {
  display: inline-flex; align-items: center; justify-content: center; opacity: .7; color: inherit;
}
.fco-squad-share-variant-remove:hover { opacity: 1; }
.fco-squad-share-variant-add {
  border: 1px dashed color-mix(in srgb, var(--accent) 45%, var(--border)); background: transparent; color: var(--muted);
  border-radius: 999px; padding: 8px 12px; cursor: pointer; font-weight: 800;
}
.fco-squad-share-variant-add:hover { border-color: var(--accent); color: var(--accent); }
```

- [ ] **Step 2: Run build once more**

Run:

```bash
rtk npm --prefix client run build
```

Expected: build completes without errors.

---

### Task 4: Verify the UI flow in the browser

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: Vite dev server at `http://localhost:5173`.
- Produces: observed confirmation that the create and viewer flows work.

- [ ] **Step 1: Start the app if it is not already running**

Run:

```bash
rtk npm --prefix client run dev
```

Expected: Vite serves the app on `http://localhost:5173`.

- [ ] **Step 2: Drive the create page**

Open `http://localhost:5173/squad-sharing/new` and verify:

```text
- “Mặc định - Hòa” is selected on load.
- “Mặc định - Hòa” cannot be removed.
- “Đang dẫn” can be selected and shows the leading threshold input.
- “Đang thua” can be selected and shows the losing threshold input.
- Switching selected options changes the active pitch editor.
- Unselecting an optional option removes it and returns to “Mặc định - Hòa” if it was active.
```

- [ ] **Step 3: Create and view a share**

Create a share with all three variants selected. Open the generated share URL and verify:

```text
- Viewer shows switch buttons for all saved variants.
- Labels read “Mặc định - Hòa”, “Đang dẫn X bàn”, and “Đang thua X bàn”.
- Clicking each button switches the displayed squad.
```

- [ ] **Step 4: Create a minimum share**

Create a share with only “Mặc định - Hòa” selected. Open the generated share URL and verify:

```text
- Viewer shows only “Mặc định - Hòa”.
- The squad renders successfully.
```

---

## Self-Review

- Spec coverage: required base variant, optional leading/losing variants, selected-only save behavior, viewer switching, and no database cleanup are all covered.
- Placeholder scan: no TBD/TODO/fill-later placeholders remain.
- Type consistency: all tasks use the existing `variants` payload fields and existing `conditionType` strings supported by the server model.
