export const ASSET_CATEGORIES = Object.freeze({
  cardTheme: { folder: 'card-themes', key: /^(?:ng|[a-z0-9-]+)$/ },
  upgradeBadge: { folder: 'upgrade-badges', key: /^(?:[0-9]|1[0-3])$/ },
  upgradeMascot: { folder: 'upgrade-mascots', keys: ['happy', 'sad'] },
  upgradeBase: { folder: 'upgrade-bases', keys: ['default'] },
  upgradeEffect: { folder: 'upgrade-effects', keys: ['shatter'] },
  seasonSprite: { folder: 'season-sprites', keys: ['fifaaddict'] },
  badgeSprite: { folder: 'badge-sprites', keys: ['fc-online'] },
  siteAsset: { folder: 'site-assets', keys: ['icons', 'favicon'] },
  teamColorIcon: { folder: 'team-color-icons', keys: ['club', 'grade', 'relation'] },
  general: { folder: 'general', key: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
});

export function normalizeAssetIdentity(category, key) {
  const normalizedCategory = String(category ?? '').trim();
  const normalizedKey = String(key ?? '').trim().toLowerCase();
  const rule = ASSET_CATEGORIES[normalizedCategory];
  if (!rule || !(rule.keys?.includes(normalizedKey) || rule.key?.test(normalizedKey))) {
    const error = new Error('Invalid asset category or key');
    error.statusCode = 400;
    throw error;
  }
  return { category: normalizedCategory, key: normalizedKey };
}

const ACTIVE_STATUS = 'active';
const ARCHIVED_STATUS = 'archived';
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 100;

function serviceError(message, statusCode, extra = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, extra);
  return error;
}

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

function translateWriteError(error) {
  if (isDuplicateKeyError(error)) {
    throw serviceError('Asset already exists', 409);
  }
  throw error;
}

function toPlain(value) {
  if (!value) {
    return value;
  }
  if (typeof value.toObject === 'function') {
    return value.toObject({ virtuals: false, versionKey: false });
  }
  return value;
}

async function execMaybe(value) {
  if (value && typeof value.exec === 'function') {
    return value.exec();
  }
  return value;
}

function assertRepository(repository) {
  if (!repository) {
    throw new Error('Asset repository dependency is required');
  }
  return repository;
}

function assertUploader(uploader) {
  if (typeof uploader !== 'function') {
    throw new Error('Asset uploader dependency is required');
  }
  return uploader;
}

async function getDefaultRepository() {
  const { default: Asset } = await import('../models/Asset.js');
  return Asset;
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function maxVersion(versions = []) {
  return versions.reduce((max, item) => Math.max(max, Number(item?.version) || 0), 0);
}

function normalizeUploadResult(result) {
  const publicId = result?.publicId ?? result?.cloudinaryPublicId ?? result?.public_id;
  const secureUrl = result?.secureUrl ?? result?.secure_url;
  if (!publicId || !secureUrl) {
    throw new Error('Uploader did not return publicId and secureUrl');
  }

  return {
    cloudinaryPublicId: publicId,
    secureUrl,
    width: Number(result.width ?? 0),
    height: Number(result.height ?? 0),
    format: String(result.format ?? ''),
    bytes: Number(result.bytes ?? 0),
  };
}

function buildVersion(uploadResult, { version, uploadedBy = null, source = 'admin', uploadedAt = new Date() }) {
  return {
    version,
    ...normalizeUploadResult(uploadResult),
    uploadedBy,
    uploadedAt,
    source,
  };
}

function activeVersionFor(asset) {
  return asset.versions?.find((item) => item.version === asset.activeVersion) ?? null;
}

function sanitizeAssetSummary(asset) {
  const plain = toPlain(asset);
  if (!plain) {
    return null;
  }
  const active = activeVersionFor(plain);
  return {
    id: String(plain._id ?? plain.id ?? ''),
    _id: plain._id,
    category: plain.category,
    key: plain.key,
    label: plain.label ?? '',
    sourcePath: plain.sourcePath ?? null,
    status: plain.status,
    activeVersion: plain.activeVersion,
    active: active
      ? {
          secureUrl: active.secureUrl,
          width: active.width,
          height: active.height,
          format: active.format,
          bytes: active.bytes,
          uploadedAt: active.uploadedAt,
          source: active.source,
        }
      : null,
    versionCount: plain.versions?.length ?? 0,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
}

function sanitizeAssetDetail(asset) {
  const plain = toPlain(asset);
  if (!plain) {
    return null;
  }
  return {
    ...sanitizeAssetSummary(plain),
    versions: [...(plain.versions ?? [])]
      .sort((a, b) => Number(a.version) - Number(b.version))
      .map((version) => ({
        version: version.version,
        cloudinaryPublicId: version.cloudinaryPublicId,
        secureUrl: version.secureUrl,
        width: version.width,
        height: version.height,
        format: version.format,
        bytes: version.bytes,
        uploadedBy: version.uploadedBy ?? null,
        uploadedAt: version.uploadedAt,
        source: version.source,
      })),
  };
}

function buildIdentityFilter(input) {
  if (input?.id || input?._id) {
    return { _id: input.id ?? input._id };
  }
  const identity = normalizeAssetIdentity(input?.category, input?.key);
  return { category: identity.category, key: identity.key };
}

async function findOneAsset(repository, filter) {
  return toPlain(await execMaybe(repository.findOne(filter)));
}

async function findByIdAsset(repository, id) {
  if (typeof repository.findById === 'function') {
    return toPlain(await execMaybe(repository.findById(id)));
  }
  return findOneAsset(repository, { _id: id });
}

async function createRepositoryDoc(repository, doc) {
  if (typeof repository.create === 'function') {
    const created = await repository.create(doc);
    return Array.isArray(created) ? created[0] : created;
  }
  const instance = new repository(doc);
  return instance.save();
}

function buildCasFilter(existing) {
  const filter = { _id: existing._id };
  if (existing.updatedAt) {
    filter.updatedAt = existing.updatedAt;
  } else {
    filter.activeVersion = existing.activeVersion;
  }
  return filter;
}

async function updateOne(repository, filter, update, options = {}) {
  return execMaybe(repository.updateOne(filter, update, options));
}

function updateMatched(result) {
  return Number(result?.matchedCount ?? result?.n ?? result?.modifiedCount ?? 0) > 0;
}

async function listRepositoryDocs(repository, criteria, { sort, skip, limit }) {
  if (repository.find.length === 2) {
    return repository.find(criteria, { sort, skip, limit });
  }

  let query = repository.find(criteria);
  if (query && typeof query.sort === 'function') {
    query = query.sort(sort);
  }
  if (query && typeof query.skip === 'function') {
    query = query.skip(skip);
  }
  if (query && typeof query.limit === 'function') {
    query = query.limit(limit);
  }
  if (query && typeof query.lean === 'function') {
    query = query.lean();
  }
  return execMaybe(query);
}

async function countRepositoryDocs(repository, criteria) {
  if (typeof repository.countDocuments !== 'function') {
    const docs = await listRepositoryDocs(repository, criteria, { sort: { updatedAt: -1, _id: 1 }, skip: 0, limit: Number.MAX_SAFE_INTEGER });
    return docs.length;
  }
  return execMaybe(repository.countDocuments(criteria));
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildListCriteria({ category, status, search } = {}) {
  const criteria = {};
  if (category) {
    criteria.category = String(category).trim();
  }
  if (status) {
    criteria.status = String(status).trim();
  }
  if (search) {
    const trimmed = String(search).trim();
    if (trimmed) {
      const pattern = new RegExp(escapeRegex(trimmed), 'i');
      criteria.$or = [
        { key: pattern },
        { label: pattern },
        { sourcePath: pattern },
        { 'versions.cloudinaryPublicId': pattern },
      ];
    }
  }
  return criteria;
}

function normalizePagination({ page = DEFAULT_PAGE, limit = DEFAULT_LIMIT } = {}) {
  const normalizedPage = Math.max(1, Number.parseInt(page, 10) || DEFAULT_PAGE);
  const normalizedLimit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(limit, 10) || DEFAULT_LIMIT));
  return { page: normalizedPage, limit: normalizedLimit, skip: (normalizedPage - 1) * normalizedLimit };
}

export async function createAssetUpload(input, dependencies = {}) {
  const repository = dependencies.repository ?? await getDefaultRepository();
  const uploader = assertUploader(dependencies.uploader);
  assertRepository(repository);

  const identity = normalizeAssetIdentity(input?.category, input?.key);
  const upload = await uploader({ ...input, ...identity, version: 1 });
  const version = buildVersion(upload, {
    version: 1,
    uploadedBy: input?.uploadedBy ?? null,
    source: input?.source ?? 'admin',
    uploadedAt: input?.uploadedAt ?? new Date(),
  });
  const doc = {
    category: identity.category,
    key: identity.key,
    label: input?.label ?? '',
    sourcePath: input?.sourcePath ?? null,
    status: ACTIVE_STATUS,
    activeVersion: 1,
    versions: [version],
  };

  try {
    return sanitizeAssetDetail(await createRepositoryDoc(repository, doc));
  } catch (error) {
    translateWriteError(error);
  }
}

export async function replaceAssetUpload(input, dependencies = {}) {
  const repository = dependencies.repository ?? await getDefaultRepository();
  const uploader = assertUploader(dependencies.uploader);
  assertRepository(repository);

  const existing = await findOneAsset(repository, buildIdentityFilter(input));
  if (!existing) {
    throw serviceError('Asset not found', 404);
  }

  const nextVersion = maxVersion(existing.versions) + 1;
  const upload = await uploader({ ...input, category: existing.category, key: existing.key, version: nextVersion });
  const version = buildVersion(upload, {
    version: nextVersion,
    uploadedBy: input?.uploadedBy ?? null,
    source: input?.source ?? 'admin',
    uploadedAt: input?.uploadedAt ?? new Date(),
  });

  const $set = {
    activeVersion: nextVersion,
    status: ACTIVE_STATUS,
  };
  if (Object.hasOwn(input ?? {}, 'label')) {
    $set.label = input.label ?? '';
  }
  if (Object.hasOwn(input ?? {}, 'sourcePath')) {
    $set.sourcePath = input.sourcePath ?? null;
  }

  try {
    const result = await updateOne(repository, buildCasFilter(existing), { $push: { versions: version }, $set }, { runValidators: true });
    if (!updateMatched(result)) {
      throw serviceError('Asset was modified during replacement', 409, { orphanPublicId: version.cloudinaryPublicId });
    }
    return getAssetDetail({ id: existing._id }, { repository });
  } catch (error) {
    if (error.statusCode === 409) {
      throw error;
    }
    translateWriteError(error);
  }
}

export async function rollbackAssetVersion(input, dependencies = {}) {
  const repository = dependencies.repository ?? await getDefaultRepository();
  assertRepository(repository);

  const existing = await findOneAsset(repository, buildIdentityFilter(input));
  if (!existing) {
    throw serviceError('Asset not found', 404);
  }
  const version = Number(input?.version);
  if (!existing.versions?.some((item) => item.version === version)) {
    throw serviceError('Asset version does not exist', 400);
  }

  await updateOne(repository, { _id: existing._id }, { $set: { activeVersion: version } }, { runValidators: true });
  return getAssetDetail({ id: existing._id }, { repository });
}

export async function archiveAsset(input, dependencies = {}) {
  const repository = dependencies.repository ?? await getDefaultRepository();
  assertRepository(repository);

  const existing = await findOneAsset(repository, buildIdentityFilter(input));
  if (!existing) {
    throw serviceError('Asset not found', 404);
  }
  await updateOne(repository, { _id: existing._id }, { $set: { status: ARCHIVED_STATUS } }, { runValidators: true });
  return getAssetDetail({ id: existing._id }, { repository });
}

export async function listAssets(filters = {}, dependencies = {}) {
  const repository = dependencies.repository ?? await getDefaultRepository();
  assertRepository(repository);

  const pagination = normalizePagination(filters);
  const criteria = buildListCriteria(filters);
  const sort = { updatedAt: -1, _id: 1 };
  const [items, total] = await Promise.all([
    listRepositoryDocs(repository, criteria, { sort, skip: pagination.skip, limit: pagination.limit }),
    countRepositoryDocs(repository, criteria),
  ]);

  return {
    data: items.map(sanitizeAssetSummary),
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit),
    },
  };
}

export async function getAssetDetail(input, dependencies = {}) {
  const repository = dependencies.repository ?? await getDefaultRepository();
  assertRepository(repository);

  const asset = input?.id || input?._id
    ? await findByIdAsset(repository, input.id ?? input._id)
    : await findOneAsset(repository, buildIdentityFilter(input));
  if (!asset) {
    throw serviceError('Asset not found', 404);
  }
  return sanitizeAssetDetail(asset);
}

export async function getPublicAssetMap(filters = {}, dependencies = {}) {
  const repository = dependencies.repository ?? await getDefaultRepository();
  assertRepository(repository);

  const criteria = { ...buildListCriteria(filters), status: ACTIVE_STATUS };
  const docs = await listRepositoryDocs(repository, criteria, { sort: { category: 1, key: 1 }, skip: 0, limit: Number.MAX_SAFE_INTEGER });
  const sorted = docs.map(toPlain).sort((a, b) => `${a.category}/${a.key}`.localeCompare(`${b.category}/${b.key}`));
  const data = {};
  let updatedAt = null;

  for (const asset of sorted) {
    const active = activeVersionFor(asset);
    if (!active?.secureUrl) {
      continue;
    }
    data[asset.category] ??= {};
    data[asset.category][asset.key] = {
      url: active.secureUrl,
      width: active.width,
      height: active.height,
      format: active.format,
      bytes: active.bytes,
      label: asset.label ?? '',
    };

    const assetUpdatedAt = normalizeDate(asset.updatedAt);
    if (assetUpdatedAt && (!updatedAt || assetUpdatedAt > updatedAt)) {
      updatedAt = assetUpdatedAt;
    }
  }

  return { data, updatedAt: updatedAt?.toISOString() ?? null };
}
