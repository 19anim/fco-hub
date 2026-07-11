import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Images, RefreshCw } from 'lucide-react';
import { adminAssetsService } from '../../services/adminAssets';
import AssetDetailPanel from '../../components/admin/assets/AssetDetailPanel.jsx';
import AssetFilters from '../../components/admin/assets/AssetFilters.jsx';
import AssetLibrary from '../../components/admin/assets/AssetLibrary.jsx';
import AssetUploadPanel from '../../components/admin/assets/AssetUploadPanel.jsx';
import {
  useAdminAssetDetailQuery,
  useAdminAssetIdentityQuery,
  useAdminAssetsListQuery,
} from '../../fco/queries.js';
import { adminAssetsKey } from '../../fco/queryKeys.js';
import { assetsFiltersInitialState, useAssetsViewStore } from '../../stores/assetsViewStore.js';

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
  const queryClient = useQueryClient();
  const filters = useAssetsViewStore((state) => state.filters);
  const selectedAssetId = useAssetsViewStore((state) => state.selectedAssetId);
  const identity = useAssetsViewStore((state) => state.identity);
  const uploadMode = useAssetsViewStore((state) => state.uploadMode);
  const setFilters = useAssetsViewStore((state) => state.setFilters);
  const patchFilters = useAssetsViewStore((state) => state.patchFilters);
  const setSelectedAssetId = useAssetsViewStore((state) => state.setSelectedAssetId);
  const setIdentity = useAssetsViewStore((state) => state.setIdentity);
  const setUploadMode = useAssetsViewStore((state) => state.setUploadMode);
  const [uploading, setUploading] = useState(false);
  const [mutation, setMutation] = useState('');
  const [notice, setNotice] = useState('');
  const uploadPanelRef = useRef(null);

  const listQuery = useAdminAssetsListQuery(paramsFromFilters(filters), service);
  const items = useMemo(() => listQuery.data?.data?.data || [], [listQuery.data]);
  const pagination = listQuery.data?.data?.pagination || null;
  const selectedSummary = useMemo(
    () => items.find((item) => assetId(item) === selectedAssetId) || null,
    [items, selectedAssetId],
  );
  const selectedId = selectedAssetId || assetId(selectedSummary);
  const detailQuery = useAdminAssetDetailQuery(selectedId, service);
  const detail = detailQuery.data?.data || null;
  const identityQuery = useAdminAssetIdentityQuery(identity, service);
  const identityAsset = identityQuery.data || null;

  const uploadTarget = useMemo(() => {
    if (uploadMode === 'create') return null;
    return sameIdentity(detail, identity) ? detail : identityAsset;
  }, [detail, identity, identityAsset, uploadMode]);

  useEffect(() => {
    if (listQuery.isLoading) return;
    if (selectedAssetId && items.some((item) => assetId(item) === selectedAssetId)) return;
    const nextId = assetId(items[0]);
    if (nextId || selectedAssetId) setSelectedAssetId(nextId);
  }, [items, listQuery.isLoading, selectedAssetId, setSelectedAssetId]);

  useEffect(() => {
    if (!listQuery.isLoading && !items.length && filters.page > 1) {
      patchFilters({ page: Math.max(1, filters.page - 1) });
    }
  }, [filters.page, items.length, listQuery.isLoading, patchFilters]);

  const refreshAssets = async () => {
    await queryClient.invalidateQueries({ queryKey: adminAssetsKey() });
  };

  const changeUploadMode = (nextMode) => {
    setUploadMode(nextMode);
    setNotice('');
    if (nextMode === 'create') {
      setIdentity({ category: 'general', key: '' });
      requestAnimationFrame(() => {
        uploadPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        uploadPanelRef.current?.querySelector('input[placeholder="Human-readable label"]')?.focus();
      });
    }
  };

  const handleSelectAsset = (asset) => {
    setUploadMode('replace');
    setSelectedAssetId(assetId(asset));
  };

  const handleUpload = async ({ formData, asset, resetFile }) => {
    setUploading(true);
    setNotice('');
    try {
      const result = asset ? await service.replace(assetId(asset), formData) : await service.upload(formData);
      const nextId = assetId(result.data);
      setNotice(asset ? 'Asset version replaced successfully.' : 'Asset created successfully.');
      resetFile();
      setSelectedAssetId(nextId);
      await refreshAssets();
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
      await service.setActiveVersion(assetId(asset), version);
      setNotice(`Rolled back to version ${version}. Later versions remain in history.`);
      setSelectedAssetId(assetId(asset));
      await refreshAssets();
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
      setSelectedAssetId('');
      await refreshAssets();
    } catch (error) {
      setNotice(apiMessage(error));
    } finally {
      setMutation('');
    }
  };

  const handleDelete = async (asset) => {
    setMutation('delete');
    setNotice('');
    try {
      await service.deleteAsset(assetId(asset));
      setNotice('Asset deleted permanently.');
      setSelectedAssetId('');
      await refreshAssets();
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
        <button type="button" onClick={refreshAssets} className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-3 py-1.5 text-sm text-ink-muted hover:bg-surface-3 hover:text-ink">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <AssetFilters filters={filters} onChange={setFilters} onReset={() => setFilters({ ...assetsFiltersInitialState })} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <div ref={uploadPanelRef}>
            <AssetUploadPanel
              key={uploadMode === 'create' ? 'create-asset' : assetId(detail) || 'new-asset'}
              selectedAsset={uploadMode === 'create' ? null : detail}
              existingAsset={uploadTarget}
              mode={uploadMode}
              onModeChange={changeUploadMode}
              onIdentityChange={(nextIdentity) => {
                if (identity.category !== nextIdentity.category || identity.key !== nextIdentity.key) setIdentity(nextIdentity);
              }}
              onSubmit={handleUpload}
              submitting={uploading}
              message={notice}
            />
          </div>
          <AssetLibrary
            items={items}
            loading={listQuery.isLoading}
            error={listQuery.error ? apiMessage(listQuery.error) : ''}
            selectedId={selectedId}
            pagination={pagination}
            onSelect={handleSelectAsset}
            onPageChange={(page) => patchFilters({ page })}
            onRetry={refreshAssets}
          />
        </div>
        <AssetDetailPanel
          asset={detail}
          loading={detailQuery.isLoading || (Boolean(selectedId) && listQuery.isLoading)}
          error={detailQuery.error ? apiMessage(detailQuery.error) : ''}
          mutation={mutation}
          onRollback={handleRollback}
          onArchive={handleArchive}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
