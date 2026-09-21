'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  ExternalLink,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  FileText,
  Music,
  Video,
  File as FileIcon,
  Download,
  AlertTriangle,
  Image as ImageIcon,
  Loader2,
  User,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  STORAGE_CATEGORIES,
  STORAGE_GROUP_LABELS,
  STORAGE_GROUP_ORDER,
  type StorageCategory,
  type StorageImage,
  type StorageOwnerDetails,
  type StorageOwnerKind,
} from '@fajr/shared/admin';
import { MediaViewer } from '@/components/ui/MediaViewer';
import {
  useImageStorageViewModel,
  formatBytes,
  type SortBy,
} from './useImageStorageViewModel';

type Props = {
  isDialog?: boolean;
};

const SORT_LABELS: Record<SortBy, string> = {
  uploadedAt: 'Date',
  fileName: 'Name',
  fileSize: 'Size',
};

function iconForMimeType(mimeType: string) {
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType === 'application/pdf' || mimeType.startsWith('text/'))
    return FileText;
  return FileIcon;
}

const ImageStorageView: React.FC<Props> = () => {
  const {
    images,
    stats,
    totalCount,
    totalPages,
    page,
    isLoading,
    isRefreshing,
    error,
    group,
    category,
    search,
    sortBy,
    sortOrder,
    preview,
    categoryStats,
    groupedCategories,
    usagePercentage,
    showThumbFiles,
    setShowThumbFiles,
    getThumbUrl,
    getOwnerDetails,
    setSearch,
    setSortBy,
    toggleSortOrder,
    setPreview,
    selectCategory,
    selectGroup,
    goToPage,
    refresh,
    openConsole,
  } = useImageStorageViewModel();

  // Where the previewed file sits in the current page, so the viewer's arrows
  // can walk it. -1 once a filter change has swapped the page out from under
  // an open preview, in which case stepping just restarts from the top.
  const previewIndex = preview
    ? images.findIndex((i) => i.key === preview.key)
    : -1;

  const stepPreview = (delta: number) => {
    if (images.length === 0) return;
    const from = previewIndex >= 0 ? previewIndex : 0;
    const next = (from + delta + images.length) % images.length;
    setPreview(images[next]);
  };

  const renderCategoryButton = (c: StorageCategory) => {
    const s = categoryStats.get(c.id);
    const isActive = category === c.id;
    return (
      <button
        key={c.id}
        onClick={() => selectCategory(isActive ? null : c.id)}
        title={c.description}
        className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${
          isActive
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-card hover:bg-accent border-border'
        }`}
      >
        <div className="text-sm font-medium">{c.label}</div>
        <div
          className={`text-xs ${
            isActive ? 'opacity-80' : 'text-muted-foreground'
          }`}
        >
          {s ? `${s.fileCount} files · ${formatBytes(s.totalBytes)}` : '—'}
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header: usage summary + actions */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">
            Browse media stored in object storage across clinical and
            operational areas.
          </div>
          {stats && (
            <div className="text-sm">
              <span className="font-medium">
                {formatBytes(stats.usedSpace)}
              </span>{' '}
              across{' '}
              <span className="font-medium">
                {stats.totalFiles.toLocaleString()}
              </span>{' '}
              files
              {usagePercentage !== null && (
                <span className="text-muted-foreground">
                  {' '}
                  · {usagePercentage}% of {formatBytes(stats.totalSize)} budget
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={refresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button variant="secondary" onClick={openConsole} className="gap-2">
            <ExternalLink className="w-4 h-4" />
            RustFS Console
          </Button>
        </div>
      </div>

      {/* Usage bar — only when a quota is configured, since S3 cannot report
          real disk capacity and a percentage of nothing is meaningless. */}
      {usagePercentage !== null && (
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              usagePercentage > 90
                ? 'bg-destructive'
                : usagePercentage > 70
                  ? 'bg-yellow-500'
                  : 'bg-primary'
            }`}
            style={{ width: `${usagePercentage}%` }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
        {/* Category nav */}
        <div className="space-y-4">
          <button
            onClick={() => selectCategory(null)}
            className={`w-full text-left px-3 py-2 rounded-md border transition-colors ${
              !category && !group
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card hover:bg-accent border-border'
            }`}
          >
            <div className="text-sm font-medium">All Media</div>
            <div
              className={`text-xs ${
                !category && !group ? 'opacity-80' : 'text-muted-foreground'
              }`}
            >
              {totalCount.toLocaleString()} files
            </div>
          </button>

          {STORAGE_GROUP_ORDER.map((g) => (
            <div key={g} className="space-y-2">
              <button
                onClick={() => selectGroup(group === g ? null : g)}
                className={`w-full text-left text-xs font-semibold uppercase tracking-wide px-1 ${
                  group === g ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {STORAGE_GROUP_LABELS[g]}
              </button>
              <div className="space-y-1">
                {groupedCategories[g].map(renderCategoryButton)}
              </div>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search file name or owner id…"
                className="pl-8"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="h-9 rounded-md border border-border bg-card px-2 text-sm"
              aria-label="Sort by"
            >
              {Object.entries(SORT_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  Sort: {label}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSortOrder}
              aria-label="Toggle sort order"
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              <ArrowUpDown className="w-4 h-4" />
            </Button>
            <label
              className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none"
              title="Include generated thumbnail files (stored under thumbs/) in the listing"
            >
              <Switch
                checked={showThumbFiles}
                onCheckedChange={setShowThumbFiles}
              />
              Thumbnail files
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-md bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : images.length === 0 ? (
            <div className="rounded-md border border-border p-10 text-center text-sm text-muted-foreground">
              {search
                ? 'No files match that search.'
                : 'No files in this category yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {images.map((img) => (
                <StorageTile
                  key={img.id}
                  image={img}
                  onClick={() => setPreview(img)}
                  getThumbUrl={getThumbUrl}
                  getOwnerDetails={getOwnerDetails}
                />
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <div className="text-xs text-muted-foreground">
                Page {page} of {totalPages} · {totalCount.toLocaleString()}{' '}
                files
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview — the shared viewer, so an unviewable file (HEIC, TIFF, an
          arbitrary document) explains itself and offers a download rather than
          rendering a broken image. Arrow keys walk the current page. */}
      <MediaViewer
        media={
          preview
            ? {
                url: preview.url ?? '',
                fileName: preview.fileName,
                mimeType: preview.mimeType,
                fileSize: preview.fileSize,
              }
            : null
        }
        onClose={() => setPreview(null)}
        onPrev={() => stepPreview(-1)}
        onNext={() => stepPreview(1)}
        hasMultiple={images.length > 1}
        currentIndex={previewIndex >= 0 ? previewIndex + 1 : undefined}
        totalItems={images.length}
        footer={
          preview && (
            <PreviewDetails
              key={preview.key}
              image={preview}
              getOwnerDetails={getOwnerDetails}
            />
          )
        }
      />
    </div>
  );
};

// Thumb URLs resolved this session, so pagination back and forth does not
// refetch. `null` records "unavailable" and stops retries; entries are dropped
// when their signed URL later fails to load (expired), forcing one refetch.
const thumbUrlCache = new Map<string, string | null>();

const OWNER_AVATAR_STYLES: Record<StorageOwnerKind | 'unknown', string> = {
  patient: 'bg-primary/15 text-primary',
  staff: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  system: 'bg-muted text-muted-foreground',
  unknown: 'bg-muted text-muted-foreground',
};

/**
 * Small owner badge: colored circle keyed off the category's owner kind
 * (known at render time, no fetch), with full details resolved lazily the
 * first time it is hovered or clicked. Hover peeks, click pins.
 */
function OwnerAvatar({
  categoryId,
  scopeId,
  objectKey,
  getOwnerDetails,
}: {
  categoryId?: string;
  scopeId?: string;
  objectKey?: string;
  getOwnerDetails: (
    categoryId: string,
    scopeId?: string,
    objectKey?: string,
  ) => Promise<StorageOwnerDetails | null>;
}) {
  const kind: StorageOwnerKind =
    STORAGE_CATEGORIES.find((c) => c.id === categoryId)?.ownerKind ?? 'system';
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  // undefined = not fetched yet; null = fetch failed
  const [details, setDetails] = useState<StorageOwnerDetails | null | undefined>(
    undefined,
  );

  const open = hovered || pinned;

  // Only license lookups need the full key (legacy keys resolve per file via
  // reverse lookup); other categories cache per owner, so hovering many files
  // from one patient stays a single request.
  const keyForLookup =
    categoryId === 'medical-licenses' ? objectKey : undefined;

  useEffect(() => {
    if (!open || details !== undefined || !categoryId) return;
    let cancelled = false;
    getOwnerDetails(categoryId, scopeId, keyForLookup).then((d) => {
      if (!cancelled) setDetails(d);
    });
    return () => {
      cancelled = true;
    };
  }, [open, details, categoryId, scopeId, keyForLookup, getOwnerDetails]);

  if (!categoryId) return null;

  const resolvedKind = details?.kind ?? kind;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setPinned(next);
        if (!next) setHovered(false);
      }}
    >
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label="Media owner"
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full cursor-pointer ring-1 ring-border ${OWNER_AVATAR_STYLES[kind]}`}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={(e) => {
            // The avatar sits inside the tile button — do not open the preview.
            e.stopPropagation();
            setPinned((p) => !p);
          }}
        >
          {kind === 'system' ? (
            <span className="text-[8px] font-semibold tracking-wide">SYS</span>
          ) : (
            <User className="h-3.5 w-3.5" />
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-64 text-sm"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={(e) => e.stopPropagation()}
      >
        {details === undefined ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading owner…
          </div>
        ) : details === null ? (
          <div className="text-muted-foreground">
            Couldn&apos;t load owner details.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${OWNER_AVATAR_STYLES[resolvedKind]}`}
              >
                {resolvedKind === 'system' ? (
                  <span className="text-[8px] font-semibold">SYS</span>
                ) : (
                  <User className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0">
                <div className="font-medium truncate">{details.title}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {resolvedKind === 'unknown' ? 'unresolved' : resolvedKind}
                </div>
              </div>
            </div>
            <dl className="space-y-1">
              {details.lines.map((line) => (
                <div key={line.label} className="flex gap-2 text-xs">
                  <dt className="text-muted-foreground shrink-0 w-16">
                    {line.label}
                  </dt>
                  <dd className="truncate font-mono">{line.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function StorageTile({
  image,
  onClick,
  getThumbUrl,
  getOwnerDetails,
}: {
  image: StorageImage;
  onClick: () => void;
  getThumbUrl: (key: string) => Promise<string | null>;
  getOwnerDetails: (
    categoryId: string,
    scopeId?: string,
    objectKey?: string,
  ) => Promise<StorageOwnerDetails | null>;
}) {
  const isImage = image.mimeType.startsWith('image/');
  // PDFs get a thumbnail too — the server rasterizes page one.
  const isPdf = image.mimeType === 'application/pdf';
  const canThumbnail = isImage || isPdf;
  const Icon = iconForMimeType(image.mimeType);

  // Tiles render the derived thumbnail, never the original — a page of
  // originals is tens of MB. If no thumbnail came with the listing, ask the
  // server to generate one lazily; failure shows the "no preview" state.
  const needsLazyThumb = canThumbnail && !image.isThumb && !image.thumbnail;
  const [lazyThumb, setLazyThumb] = useState<string | null | undefined>(() =>
    needsLazyThumb && thumbUrlCache.has(image.key)
      ? thumbUrlCache.get(image.key)!
      : undefined,
  );
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    if (!needsLazyThumb || thumbUrlCache.has(image.key)) return;
    let cancelled = false;
    getThumbUrl(image.key).then((url) => {
      thumbUrlCache.set(image.key, url);
      if (!cancelled) setLazyThumb(url);
    });
    return () => {
      cancelled = true;
    };
  }, [needsLazyThumb, image.key, getThumbUrl]);

  // What to show in the square: a thumb file shows itself; an original shows
  // its thumbnail (from the listing, or lazily resolved).
  const src = image.isThumb
    ? (image.url ?? null)
    : (image.thumbnail ?? lazyThumb);
  const isResolving = canThumbnail && src === undefined;
  const showImg = canThumbnail && typeof src === 'string' && !imgFailed;
  const noPreview = canThumbnail && !isResolving && !showImg;

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-md border border-border overflow-hidden bg-card hover:border-primary transition-colors"
    >
      <div className="relative aspect-square bg-muted flex items-center justify-center">
        {!canThumbnail ? (
          <Icon className="w-8 h-8 text-muted-foreground" />
        ) : isResolving ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : noPreview ? (
          isImage ? (
            // The image exists in storage — we just could not make a preview
            // for it (HEIC, oversized, corrupt). Distinct from a broken file.
            <div className="flex flex-col items-center justify-center gap-1 px-2 text-center">
              <ImageIcon className="w-6 h-6 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground leading-tight">
                No preview
                <br />
                image saved — click to view
              </span>
            </div>
          ) : (
            // A PDF whose page one could not be rendered still reads fine as a
            // document icon; no need for the wordier image copy.
            <Icon className="w-8 h-8 text-muted-foreground" />
          )
        ) : (
          <>
            {!imgLoaded && (
              <Loader2 className="absolute w-5 h-5 animate-spin text-muted-foreground" />
            )}
            {/* Signed URLs are short-lived and host-varying, so Next's optimizer
                is bypassed here — it would cache a URL that expires in an hour. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src as string}
              alt={image.fileName}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => {
                thumbUrlCache.delete(image.key);
                setImgFailed(true);
              }}
              className={`w-full h-full object-cover transition-opacity ${
                imgLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
            {/* A rendered page one looks like any other image — mark it. */}
            {isPdf && imgLoaded && (
              <span className="absolute bottom-1 right-1 rounded bg-background/80 px-1 py-0.5 text-[9px] font-medium text-muted-foreground">
                PDF
              </span>
            )}
          </>
        )}
      </div>
      <div className="p-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs font-medium truncate">{image.fileName}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {formatBytes(image.fileSize)}
            {image.isThumb && (
              <span className="rounded bg-muted px-1 text-[9px] uppercase tracking-wide">
                thumb
              </span>
            )}
          </div>
        </div>
        <OwnerAvatar
          categoryId={image.metadata?.categoryId}
          scopeId={image.metadata?.scopeId}
          objectKey={image.key}
          getOwnerDetails={getOwnerDetails}
        />
      </div>
    </button>
  );
}

// Metadata panel shown beneath the media in the viewer. Rendering the file
// itself is MediaViewer's job — this only answers "what am I looking at and
// whose is it".
function PreviewDetails({
  image,
  getOwnerDetails,
}: {
  image: StorageImage;
  getOwnerDetails: (
    categoryId: string,
    scopeId?: string,
    objectKey?: string,
  ) => Promise<StorageOwnerDetails | null>;
}) {
  const scopeId = image.metadata?.scopeId;

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Size</dt>
        <dd>{formatBytes(image.fileSize)}</dd>
        <dt className="text-muted-foreground">Type</dt>
        <dd className="truncate">{image.mimeType}</dd>
        <dt className="text-muted-foreground">Uploaded</dt>
        <dd>
          {image.uploadedAt
            ? new Date(image.uploadedAt).toLocaleString()
            : 'Unknown'}
        </dd>
        {scopeId && (
          <>
            <dt className="text-muted-foreground">Owner</dt>
            <dd className="flex items-center gap-2 min-w-0">
              <OwnerAvatar
                categoryId={image.metadata?.categoryId}
                scopeId={scopeId}
                objectKey={image.key}
                getOwnerDetails={getOwnerDetails}
              />
              <span className="truncate font-mono text-xs">{scopeId}</span>
            </dd>
          </>
        )}
        <dt className="text-muted-foreground">Key</dt>
        <dd className="truncate font-mono text-xs col-span-1">{image.key}</dd>
      </dl>
    </div>
  );
  // Download lives in the viewer's header, so it is not repeated here.
}

export default ImageStorageView;
