import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { adminMonetizationService } from '../../services/adminMonetization';
import ItemForm from '../../components/admin/monetization/ItemForm';
import ItemPreview from '../../components/admin/monetization/ItemPreview';

const EMPTY = {
  type: '',
  title: '',
  description: '',
  status: 'draft',
  platform: '',
  placementIds: [],
  linkedEntities: [],
  priority: 0,
  isFeatured: false,
  displayStrategy: 'priority',
  content: {},
  affiliateLinks: [],
};

function clientValidate(data) {
  const errors = [];
  if (!data.type) errors.push('Type is required');
  if (!data.title) errors.push('Title is required');
  if (!data.placementIds || data.placementIds.length === 0) errors.push('At least one placement is required');
  return errors;
}

export default function MonetizationEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === 'new';

  const [data, setData] = useState(EMPTY);
  const [tab, setTab] = useState('form');
  const [jsonText, setJsonText] = useState(JSON.stringify(EMPTY, null, 2));
  const [jsonError, setJsonError] = useState('');
  const [validationErrors, setValidationErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (!isNew) {
      adminMonetizationService.getById(id)
        .then((r) => {
          if (r.success) {
            setData(r.data.item);
            setJsonText(JSON.stringify(r.data.item, null, 2));
          }
        })
        .catch(() => navigate('/admin/monetization'))
        .finally(() => setLoading(false));
    }
  }, [id, isNew, navigate]);

  const handleSave = async () => {
    const errors = clientValidate(data);
    setValidationErrors(errors);
    if (errors.length > 0) return;

    setSaving(true);
    try {
      const result = isNew
        ? await adminMonetizationService.create(data)
        : await adminMonetizationService.update(id, data);
      if (result.success) navigate('/admin/monetization');
    } catch (err) {
      setValidationErrors([err.response?.data?.message || 'Save failed']);
    } finally {
      setSaving(false);
    }
  };

  const handleJsonApply = () => {
    try {
      const parsed = JSON.parse(jsonText);
      setData(parsed);
      setJsonError('');
    } catch (e) {
      setJsonError('Invalid JSON: ' + e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/monetization')}
          className="rounded-lg p-2 text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-ink">
            {isNew ? 'New Monetization Item' : `Edit: ${data.title}`}
          </h1>
          <p className="text-sm text-ink-muted">{isNew ? 'Create a new item' : `Status: ${data.status}`}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex gap-1 border-b border-hairline">
            {['form', 'json'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  if (t === 'json') setJsonText(JSON.stringify(data, null, 2));
                  setTab(t);
                }}
                className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  tab === t ? 'border-brand-blue text-brand-blue' : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {t === 'form' ? 'Form' : 'JSON / Import'}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-hairline bg-surface-1 p-5">
            {tab === 'form' ? (
              <ItemForm data={data} onChange={setData} errors={validationErrors} />
            ) : (
              <div className="space-y-3">
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  rows={20}
                  className="w-full rounded-lg border border-hairline bg-canvas-dark px-3 py-2 text-xs font-mono text-ink outline-none focus:border-brand-blue"
                />
                {jsonError && <p className="text-sm text-red-400">{jsonError}</p>}
                <button
                  onClick={handleJsonApply}
                  className="rounded-lg border border-hairline bg-surface-2 px-4 py-2 text-sm text-ink hover:bg-surface-3 transition-colors"
                >
                  Apply JSON
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-hairline bg-surface-1 p-5 h-fit">
          <ItemPreview data={data} />
        </div>
      </div>
    </div>
  );
}
