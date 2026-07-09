import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchPublicAssetMap } from './assetApi.js';
import { getAssetUrl as lookupAssetUrl } from './assetMap.js';

const AssetContext = createContext(null);

const EMPTY_MAP = Object.freeze({});

export function AssetProvider({ children, loadAssetMap = fetchPublicAssetMap }) {
  const [state, setState] = useState({
    loading: true,
    error: null,
    map: EMPTY_MAP,
    updatedAt: null,
  });

  useEffect(() => {
    let active = true;

    loadAssetMap()
      .then(({ map = EMPTY_MAP, updatedAt = null } = {}) => {
        if (!active) return;
        setState({ loading: false, error: null, map, updatedAt });
      })
      .catch((error) => {
        if (!active) return;
        setState({ loading: false, error, map: EMPTY_MAP, updatedAt: null });
      });

    return () => {
      active = false;
    };
  }, [loadAssetMap]);

  const getAssetUrl = useCallback((category, key) => lookupAssetUrl(state.map, category, key), [state.map]);

  const value = useMemo(() => ({ ...state, getAssetUrl }), [state, getAssetUrl]);

  return <AssetContext.Provider value={value}>{children}</AssetContext.Provider>;
}

export function useAssets() {
  const value = useContext(AssetContext);
  if (!value) {
    throw new Error('useAssets must be used within AssetProvider');
  }
  return value;
}
