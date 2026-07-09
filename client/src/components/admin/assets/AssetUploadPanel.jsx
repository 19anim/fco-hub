import { useEffect, useMemo, useState } from 'react';
import { Upload } from 'lucide-react';
import AssetPreview from './AssetPreview.jsx';
import { CATEGORY_LABELS, FIXED_KEYS, slugify } from './assetUtils.js';

function keyOptions(category) {
  if (category === 'upgradeBadge') return Array.from({ length: 14 }, (_, level) => String(level));
  return FIXED_KEYS[category] || [];
}

export default function AssetUploadPanel({ selectedAsset, existingAsset, mode, onModeChange, onIdentityChange, onSubmit, submitting, message }) {
  const isCreateMode = mode === 'create';
  const [category, setCategory] = useState(selectedAsset?.category || 'general');
  const [key, setKey] = useState(selectedAsset?.key || '');
  const [label, setLabel] = useState(selectedAsset?.label || '');
  const [keyEdited, setKeyEdited] = useState(Boolean(selectedAsset));
  const [file, setFile] = useState(null);

  const replacementAsset = isCreateMode ? existingAsset : selectedAsset || existingAsset;
  const isReplacing = Boolean(replacementAsset?.id || replacementAsset?._id);
  const options = useMemo(() => keyOptions(category), [category]);
  const keyListId = `asset-key-options-${category}`;

  useEffect(() => {
    onIdentityChange?.({ category, key });
  }, [category, key, onIdentityChange]);

  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const changeCategory = (nextCategory) => {
    setCategory(nextCategory);
    if (isCreateMode) {
      setKey(nextCategory === 'general' ? slugify(label) : '');
      setKeyEdited(nextCategory !== 'general');
      return;
    }
    if (nextCategory === 'cardTheme') setKey('ng');
    if (nextCategory === 'general') setKey(slugify(label));
    const nextOptions = keyOptions(nextCategory);
    if (nextOptions.length) setKey(nextOptions[0]);
    setKeyEdited(nextCategory !== 'general');
  };

  const changeLabel = (nextLabel) => {
    setLabel(nextLabel);
    if (category === 'general' && !keyEdited) {
      setKey(slugify(nextLabel));
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!file || submitting) return;
    const formData = new FormData();
    formData.append('category', category);
    formData.append('key', key);
    formData.append('label', label);
    formData.append('file', file);
    onSubmit({ formData, asset: replacementAsset, identity: { category, key }, resetFile: () => setFile(null) });
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-hairline bg-surface-1 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blue/15">
            <Upload className="h-4 w-4 text-brand-blue" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">Asset upload</h2>
            <p className="text-xs text-ink-muted">Create a new logical asset or replace the selected asset version.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 rounded-lg border border-hairline bg-canvas-dark p-1 text-xs font-semibold">
          <button type="button" onClick={() => onModeChange?.('replace')} className={`rounded-md px-3 py-1.5 ${isCreateMode ? 'text-ink-muted hover:text-ink' : 'bg-surface-2 text-ink shadow-sm'}`}>
            Replace existing
          </button>
          <button type="button" onClick={() => onModeChange?.('create')} className={`rounded-md px-3 py-1.5 ${isCreateMode ? 'bg-brand-blue/15 text-brand-blue shadow-sm' : 'text-ink-muted hover:text-ink'}`}>
            Add new
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Category</span>
          <select value={category} onChange={(event) => changeCategory(event.target.value)} className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-sm text-ink outline-none focus:border-brand-blue">
            {Object.entries(CATEGORY_LABELS).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Key</span>
          {options.length && !isCreateMode ? (
            <select value={key} onChange={(event) => { setKey(event.target.value); setKeyEdited(true); }} className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-sm text-ink outline-none focus:border-brand-blue">
              {options.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          ) : (
            <>
              <input value={key} list={options.length ? keyListId : undefined} onChange={(event) => { setKey(event.target.value); setKeyEdited(true); }} placeholder={category === 'cardTheme' ? 'ng or numeric theme ID' : 'asset-slug'} className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-sm text-ink outline-none focus:border-brand-blue" />
              {options.length ? (
                <datalist id={keyListId}>
                  {options.map((option) => <option key={option} value={option} />)}
                </datalist>
              ) : null}
            </>
          )}
        </label>
      </div>

      <label className="space-y-1.5 block">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Label</span>
        <input value={label} onChange={(event) => changeLabel(event.target.value)} placeholder="Human-readable label" className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-sm text-ink outline-none focus:border-brand-blue" />
      </label>

      <label className="block rounded-xl border border-dashed border-hairline bg-canvas-dark p-4 text-sm text-ink-muted hover:border-brand-blue/60">
        <span className="font-medium text-ink">Choose image file</span>
        <span className="mt-1 block text-xs">PNG, JPEG, WebP, GIF, SVG, or AVIF. Multipart boundary is handled by the browser.</span>
        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-3 block w-full text-xs text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink" />
      </label>

      {isReplacing && previewUrl ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <AssetPreview title="Current active" asset={replacementAsset} />
          <AssetPreview title="New local preview" url={previewUrl} fileName={file?.name} />
        </div>
      ) : previewUrl ? (
        <AssetPreview title="New local preview" url={previewUrl} fileName={file?.name} />
      ) : null}

      {replacementAsset && (
        <p className="rounded-lg border border-brand-blue/20 bg-brand-blue/10 px-3 py-2 text-xs text-brand-blue">
          Existing asset found: {replacementAsset.category}/{replacementAsset.key}. Submitting will replace it with a new version.
        </p>
      )}
      {message && <p className="rounded-lg border border-hairline bg-surface-2 px-3 py-2 text-xs text-ink-muted">{message}</p>}

      <button type="submit" disabled={!file || submitting} className="btn-primary w-full py-2 text-sm font-semibold disabled:cursor-wait disabled:opacity-50">
        {submitting ? 'Uploading...' : isReplacing ? 'Replace with new version' : 'Create asset'}
      </button>
    </form>
  );
}
