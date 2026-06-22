import { useState, useEffect } from 'react';
import { adminPlacementsService } from '../../../services/adminPlacements';

const TYPES = ['youtube_video', 'affiliate_link', 'sponsor_banner', 'ad_slot', 'custom_cta'];
const PLATFORMS = ['youtube', 'shopee', 'tiktok_shop', 'google_ads', 'custom'];
const STATUSES = ['draft', 'scheduled', 'disabled'];

function Field({ label, children, note }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-ink mb-1.5">{label}</label>
      {children}
      {note && <p className="mt-1 text-xs text-ink-subtle">{note}</p>}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder, ...rest }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-sm text-ink outline-none transition focus:border-brand-blue"
      {...rest}
    />
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-sm text-ink outline-none transition focus:border-brand-blue"
    >
      <option value="">— select —</option>
      {options.map((o) => (
        <option key={typeof o === 'string' ? o : o.value} value={typeof o === 'string' ? o : o.value}>
          {typeof o === 'string' ? o.replace(/_/g, ' ') : o.label}
        </option>
      ))}
    </select>
  );
}

export default function ItemForm({ data, onChange, errors = [] }) {
  const [placements, setPlacements] = useState([]);

  useEffect(() => {
    adminPlacementsService.list()
      .then((r) => { if (r.success) setPlacements(r.data.placements); })
      .catch(() => {});
  }, []);

  const set = (key) => (val) => onChange({ ...data, [key]: val });
  const setContent = (key) => (val) => onChange({ ...data, content: { ...data.content, [key]: val } });

  const togglePlacement = (id) => {
    const ids = data.placementIds ?? [];
    onChange({ ...data, placementIds: ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id] });
  };

  const filteredPlacements = placements.filter((p) => !data.type || p.supportedTypes?.includes(data.type));

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300 space-y-1">
          {errors.map((e, i) => <p key={i}>• {e}</p>)}
        </div>
      )}

      <Field label="Type">
        <Select value={data.type} onChange={set('type')} options={TYPES.map((t) => ({ value: t, label: t.replace(/_/g, ' ') }))} />
      </Field>

      <Field label="Status">
        <Select value={data.status} onChange={set('status')} options={STATUSES} />
      </Field>

      <Field label="Title">
        <Input value={data.title} onChange={set('title')} placeholder="Item title" />
      </Field>

      <Field label="Description">
        <textarea
          value={data.description ?? ''}
          onChange={(e) => set('description')(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-hairline bg-canvas-dark px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-blue"
        />
      </Field>

      <Field label="Platform">
        <Select value={data.platform} onChange={set('platform')} options={PLATFORMS} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Priority">
          <Input type="number" value={data.priority ?? 0} onChange={(v) => set('priority')(Number(v))} />
        </Field>
        <Field label="Featured">
          <div className="flex h-10 items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={data.isFeatured ?? false}
                onChange={(e) => set('isFeatured')(e.target.checked)}
                className="accent-brand-blue h-4 w-4"
              />
              <span className="text-sm text-ink-muted">Mark as featured</span>
            </label>
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start At">
          <Input
            type="datetime-local"
            value={data.startAt ? new Date(data.startAt).toISOString().slice(0, 16) : ''}
            onChange={(v) => set('startAt')(v || undefined)}
          />
        </Field>
        <Field label="End At">
          <Input
            type="datetime-local"
            value={data.endAt ? new Date(data.endAt).toISOString().slice(0, 16) : ''}
            onChange={(v) => set('endAt')(v || undefined)}
          />
        </Field>
      </div>

      {data.type === 'youtube_video' && (
        <>
          <Field label="YouTube URL" note="Video ID will be parsed automatically">
            <Input value={data.content?.youtubeUrl} onChange={setContent('youtubeUrl')} placeholder="https://www.youtube.com/watch?v=..." />
          </Field>
          <Field label="Channel Name">
            <Input value={data.content?.channelName} onChange={setContent('channelName')} placeholder="Channel name" />
          </Field>
          <Field label="Thumbnail URL" note="Leave blank to use YouTube default thumbnail">
            <Input value={data.content?.thumbnailUrl} onChange={setContent('thumbnailUrl')} placeholder="https://..." />
          </Field>
        </>
      )}

      {(data.type === 'affiliate_link' || data.type === 'custom_cta') && (
        <>
          <Field label="Target URL">
            <Input value={data.content?.targetUrl} onChange={setContent('targetUrl')} placeholder="https://..." />
          </Field>
          <Field label="CTA Label">
            <Input value={data.content?.ctaLabel} onChange={setContent('ctaLabel')} placeholder="Mua ngay, Xem thêm..." />
          </Field>
          <Field label="Image URL">
            <Input value={data.content?.imageUrl} onChange={setContent('imageUrl')} placeholder="https://..." />
          </Field>
        </>
      )}

      {data.type === 'sponsor_banner' && (
        <>
          <Field label="Image URL">
            <Input value={data.content?.imageUrl} onChange={setContent('imageUrl')} placeholder="https://..." />
          </Field>
          <Field label="Target URL">
            <Input value={data.content?.targetUrl} onChange={setContent('targetUrl')} placeholder="https://..." />
          </Field>
          <Field label="CTA Label">
            <Input value={data.content?.ctaLabel} onChange={setContent('ctaLabel')} placeholder="Optional button text" />
          </Field>
        </>
      )}

      {data.type === 'ad_slot' && (
        <div className="rounded-lg border border-dashed border-hairline p-4">
          <p className="text-sm text-ink-muted mb-3">Ad Provider Config</p>
          <div className="space-y-3">
            <Field label="Provider">
              <Input
                value={data.content?.providerConfig?.provider}
                onChange={(v) => onChange({ ...data, content: { ...data.content, providerConfig: { ...data.content?.providerConfig, provider: v } } })}
                placeholder="google_adsense, etc."
              />
            </Field>
            <Field label="Slot ID">
              <Input
                value={data.content?.providerConfig?.slotId}
                onChange={(v) => onChange({ ...data, content: { ...data.content, providerConfig: { ...data.content?.providerConfig, slotId: v } } })}
                placeholder="Ad slot ID"
              />
            </Field>
          </div>
        </div>
      )}

      <Field label="Placements">
        <div className="rounded-lg border border-hairline bg-canvas-dark p-3 space-y-1.5 max-h-40 overflow-y-auto">
          {filteredPlacements.length === 0 ? (
            <p className="text-xs text-ink-subtle">No placements match this type.</p>
          ) : filteredPlacements.map((p) => (
            <label key={p._id} className="flex items-center gap-2 text-xs text-ink-muted hover:text-ink cursor-pointer">
              <input
                type="checkbox"
                checked={(data.placementIds ?? []).includes(p._id)}
                onChange={() => togglePlacement(p._id)}
                className="accent-brand-blue h-3.5 w-3.5"
              />
              <span className="font-medium">{p.label}</span>
              <span className="text-ink-subtle">({p.key})</span>
            </label>
          ))}
        </div>
      </Field>
    </div>
  );
}
