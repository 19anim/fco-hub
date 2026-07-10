import { createContext, useCallback, useContext, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPublicAssetMap } from './assetApi.js';
import { getAssetUrl as lookupAssetUrl } from './assetMap.js';
import { assetMapKey } from '../queryKeys.js';

const AssetContext = createContext(null);

const EMPTY_MAP = Object.freeze({});

export function AssetProvider({ children, loadAssetMap = fetchPublicAssetMap }) {
  const { data, isLoading, error } = useQuery({
    queryKey: assetMapKey(),
    queryFn: loadAssetMap,
    staleTime: 5 * 60 * 1000,
  });

  const map = data?.map ?? EMPTY_MAP;
  const updatedAt = data?.updatedAt ?? null;

  const getAssetUrl = useCallback((category, key) => lookupAssetUrl(map, category, key), [map]);

  const value = useMemo(
    () => ({ loading: isLoading, error: error ?? null, map, updatedAt, getAssetUrl }),
    [isLoading, error, map, updatedAt, getAssetUrl]
  );

  return <AssetContext.Provider value={value}>{children}</AssetContext.Provider>;
}

export function useAssets() {
  const value = useContext(AssetContext);
  if (!value) {
    throw new Error('useAssets must be used within AssetProvider');
  }
  return value;
}
