import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Images, RefreshCw } from 'lucide-react';
import { adminAssetsService } from '../../services/adminAssets';
import AssetDetailPanel from '../../components/admin/assets/AssetDetailPanel.jsx';
import AssetFilters from '../../components/admin/assets/AssetFilters.jsx';
import AssetLibrary from '../../components/admin/assets/AssetLibrary.jsx';
import AssetUploadPanel from '../../components/admin/assets/AssetUploadPanel.jsx';

const DEFAULT_FILTERS = Object.freeze({ search: '', category: 'all', status: 'active', page: 1, limit: 24 });
const ERROR_HELP = Object.freeze({
  401: 'Sign in again to manage assets.',
  403: 'Your admin account is missing the required asset permission.',
  404: 'This asset no longer exists. Refresh the library.',
  409: 'This asset changed during upload. Refresh and retry so no version history is overwritten.',
  413: 'The image is larger than the upload limit. Choose a smaller file.',
});

function apiMessage(error) {
  const status = error?.response?.status;
  const message = error?.response?.data?.message || error?.message || 'Asset request failed';
  return status && ERROR_HELP[status] ? `${message} ${ERROR_HELP[status]}` : message;
}

function paramsFromFilters(filters) {
  return {
    page: filters.page,
    limit: filters.limit,
    ...(filters.category !== 'all' ? { category: filters.category } : {}),
    ...(filters.status !== 'all' ? { status: filters.status } : {}),
    ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
  };
}

function assetId(asset) {
  return asset?.id || asset?._id || '';
}

function sameIdentity(asset, identity) {
  return asset?.category === identity.category && asset?.key === identity.key;
}

export default function AssetsPage({ service = adminAssetsService }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [selectedSummary, setSelectedSummary] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [identity, setIdentity] = useState({ category: 'cardTheme', key: 'ng' });
  const [identityAsset, setIdentityAsset] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [mutation, setMutation] = useState('');
  const [notice, setNotice] = useState('');
  const detailRequestRef = useRef(0);
  const identityRequestRef = useRef(0);

  const selectedId = assetId(selectedSummary || detail);
  const uploadTarget = useMemo(() => (sameIdentity(detail, identity) ? detail : identityAsset), [detail, identity, identityAsset]);

  const loadList = useCallback(async (nextFilters, preferredId = '') => {
    try {
      const result = await service.list(paramsFromFilters(nextFilters));
      const nextItems = result.data?.data || [];
      const nextPagination = result.data?.pagination || null;
      setItems(nextItems);
      setPagination(nextPagination);
      if (preferredId) {
        const nextSelected = nextItems.find((item) => assetId(item) === preferredId);
        if (nextSelected) setSelectedSummary(nextSelected);
        else if (nextFilters.page > 1 && !nextItems.length) setFilters((current) => ({ ...current, page: Math.max(1, current.page - 1) }));
        else setSelectedSummary(nextItems[0] || null);
      } else {
        setSelectedSummary(nextItems[0] || null);
      }
    } catch (error) {
      setListError(apiMessage(error));
    } finally {
      setListLoading(false);
    }
  }, [service]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setListLoading(true);
      setListError('');
      loadList(filters);
    });
  }, [filters, loadList]);

  useEffect(() => {
    const id = selectedId;
    if (!id) return undefined;
    const requestId = detailRequestRef.current + 1;
    detailRequestRef.current = requestId;
    Promise.resolve().then(() => {
      if (detailRequestRef.current !== requestId) return;
      setDetail(null);
      setDetailError('');
      setDetailLoading(true);
    });
    service.getById(id)
      .then((result) => {
        if (detailRequestRef.current === requestId) setDetail(result.data);
      })
      .catch((error) => {
        if (detailRequestRef.current === requestId) setDetailError(apiMessage(error));
      })
      .finally(() => {
        if (detailRequestRef.current === requestId) setDetailLoading(false);
      });
    return () => {
      if (detailRequestRef.current === requestId) detailRequestRef.current += 1;
    };
  }, [selectedId, service]);

  useEffect(() => {
    if (!identity.category || !identity.key) return undefined;
    const requestId = identityRequestRef.current + 1;
    identityRequestRef.current = requestId;
    Promise.resolve().then(() => {
      if (identityRequestRef.current === requestId) setIdentityAsset(null);
    });
    service.list({ category: identity.category, search: identity.key, status: 'all', limit: 10 })
      .then((result) => {
        if (identityRequestRef.current !== requestId) return;
        const match = (result.data?.data || []).find((item) => sameIdentity(item, identity));
        setIdentityAsset(match || null);
      })
      .catch(() => {
        if (identityRequestRef.current === requestId) setIdentityAsset(null);
      });
    return () => {
      if (identityRequestRef.current === requestId) identityRequestRef.current += 1;
    };
  }, [identity, service]);

  const refreshAfterMutation = async (id = selectedId) => {
    await loadList(filters, id);
    if (id) {
      const result = await service.getById(id);
      setDetail(result.data);
    }
  };

  const handleUpload = async ({ formData, asset, resetFile }) => {
    setUploading(true);
    setNotice('');
    try {
      const result = asset ? await service.replace(assetId(asset), formData) : await service.upload(formData);
      const nextId = assetId(result.data);
      setNotice(asset ? 'Asset version replaced successfully.' : 'Asset created successfully.');
      resetFile();
      await refreshAfterMutation(nextId);
      setSelectedSummary(result.data);
    } catch (error) {
      setNotice(apiMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const handleRollback = async (asset, version) => {
    if (!window.confirm(`Rollback ${asset.category}/${asset.key} to version ${version}?`)) return;
    setMutation(`rollback-${version}`);
    setNotice('');
    try {
      const result = await service.setActiveVersion(assetId(asset), version);
      setNotice(`Rolled back to version ${version}. Later versions remain in history.`);
      setDetail(result.data);
      await loadList(filters, assetId(asset));
    } catch (error) {
      setNotice(apiMessage(error));
    } finally {
      setMutation('');
    }
  };

  const handleArchive = async (asset) => {
    if (!window.confirm(`Archive ${asset.category}/${asset.key}? It will disappear from the default active public map.`)) return;
    setMutation('archive');
    setNotice('');
    try {
      await service.archive(assetId(asset));
      setNotice('Asset archived. It is removed from the active library and public map.');
      await loadList(filters, '');
      setDetail(null);
    } catch (error) {
      setNotice(apiMessage(error));
    } finally {
      setMutation('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/15">
            <Images className="h-5 w-5 text-brand-blue" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">Asset Library</h1>
            <p className="text-sm text-ink-muted">Manage Cloudinary-backed FCO runtime assets and version history.</p>
          </div>
        </div>
        <button type="button" onClick={() => loadList(filters, selectedId)} className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-3 hover:text-ink">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <AssetFilters filters={filters} onChange={setFilters} onReset={() => setFilters(DEFAULT_FILTERS)} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <AssetLibrary
            items={items}
            loading={listLoading}
            error={listError}
            selectedId={selectedId}
            pagination={pagination}
            onSelect={setSelectedSummary}
            onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
            onRetry={() => loadList(filters, selectedId)}
          />
          <AssetUploadPanel
            key={assetId(detail) || 'new-asset'}
            selectedAsset={detail}
            existingAsset={uploadTarget}
            onIdentityChange={(nextIdentity) => setIdentity((current) => (
              current.category === nextIdentity.category && current.key === nextIdentity.key ? current : nextIdentity
            ))}
            onSubmit={handleUpload}
            submitting={uploading}
            message={notice}
          />
        </div>
        <AssetDetailPanel
          asset={detail}
          loading={detailLoading}
          error={detailError}
          mutation={mutation}
          onRollback={handleRollback}
          onArchive={handleArchive}
        />
      </div>
    </div>
  );
}
