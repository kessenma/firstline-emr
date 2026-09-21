// apps/web/app/api/admin/GET/image-storage/list/route.ts
// Paginated listing of media objects for the admin storage browser.
//
// Served from the cached storage index rather than from S3 directly, so sorting
// applies across the whole category instead of just the page in hand. Signed
// URLs are generated only for the page being returned.
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { storageService } from "@/lib/storage";
import { thumbKeyFor, thumbnailSourceKind } from "@/lib/storage/thumbnails";
import {
  getStorageIndex,
  buildStorageStats,
  type IndexedObject,
} from "@/lib/storage/storage-index";
import {
  STORAGE_CATEGORIES,
  type StorageCategoryGroup,
  type StorageCategoryId,
  type StorageImage,
} from "@fajr/shared/admin";

const MAX_LIMIT = 100;
const SIGNED_URL_TTL_SECONDS = 3600;

type SortBy = "uploadedAt" | "fileName" | "fileSize";
type SortOrder = "asc" | "desc";

function compare(a: IndexedObject, b: IndexedObject, sortBy: SortBy): number {
  switch (sortBy) {
    case "fileName":
      return a.fileName.localeCompare(b.fileName);
    case "fileSize":
      return a.size - b.size;
    case "uploadedAt":
    default:
      return (
        (a.lastModified?.getTime() ?? 0) - (b.lastModified?.getTime() ?? 0)
      );
  }
}

export async function GET(request: Request) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session || !session.isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized access" },
        { status: 403 },
      );
    }

    const { searchParams } = new URL(request.url);

    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number(searchParams.get("limit")) || 20),
    );
    const sortBy = (searchParams.get("sortBy") as SortBy) || "uploadedAt";
    const order = (searchParams.get("order") as SortOrder) || "desc";
    const category = searchParams.get("category") as StorageCategoryId | null;
    const group = searchParams.get("group") as StorageCategoryGroup | null;
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const refresh = searchParams.get("refresh") === "true";
    // Thumbnail files are derived artifacts; hidden unless the admin opts in.
    const includeThumbs = searchParams.get("includeThumbs") === "true";

    const index = await getStorageIndex(refresh);

    // Filter: category wins over group, since it is the narrower selection.
    let objects = includeThumbs
      ? index.objects
      : index.objects.filter((o) => !o.isThumb);
    if (category) {
      objects = objects.filter((o) => o.categoryId === category);
    } else if (group) {
      const idsInGroup = new Set(
        STORAGE_CATEGORIES.filter((c) => c.group === group).map((c) => c.id),
      );
      objects = objects.filter((o) => idsInGroup.has(o.categoryId));
    }

    if (search) {
      objects = objects.filter(
        (o) =>
          o.fileName.toLowerCase().includes(search) ||
          (o.scopeId?.toLowerCase().includes(search) ?? false),
      );
    }

    // Sort a copy — the index is shared across requests and must not be mutated.
    const sorted = [...objects].sort((a, b) => {
      const result = compare(a, b, sortBy);
      return order === "asc" ? result : -result;
    });

    const totalCount = sorted.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const pageObjects = sorted.slice((page - 1) * limit, page * limit);

    // Thumbnails that already exist can be signed straight from the index.
    // Ones missing here may still be generated lazily by the client via
    // /api/media/get-signed-url?variant=thumb — the index is up to 5 min
    // stale, so absence is a hint, not a verdict.
    const existingThumbKeys = new Set(
      index.objects.filter((o) => o.isThumb).map((o) => o.key),
    );

    const images: StorageImage[] = await Promise.all(
      pageObjects.map(async (o) => {
        let url: string | undefined;
        try {
          url = await storageService.getSignedUrl(o.key, SIGNED_URL_TTL_SECONDS);
        } catch {
          // A key that cannot be signed still belongs in the listing — the admin
          // needs to see it exists, even if it will not render.
          url = undefined;
        }

        let thumbnail: string | undefined;
        const thumbKey =
          !o.isThumb && thumbnailSourceKind(o.mimeType, o.key)
            ? thumbKeyFor(o.key)
            : null;
        if (thumbKey && existingThumbKeys.has(thumbKey)) {
          try {
            thumbnail = await storageService.getSignedUrl(
              thumbKey,
              SIGNED_URL_TTL_SECONDS,
            );
          } catch {
            thumbnail = undefined;
          }
        }

        return {
          id: o.key,
          key: o.key,
          fileName: o.fileName,
          fileSize: o.size,
          mimeType: o.mimeType,
          uploadedAt: o.lastModified?.toISOString() ?? "",
          url,
          thumbnail,
          isThumb: o.isThumb,
          metadata: {
            categoryId: o.categoryId,
            ...(o.scopeId ? { scopeId: o.scopeId } : {}),
          },
        };
      }),
    );

    return NextResponse.json({
      images,
      totalCount,
      totalPages,
      currentPage: page,
      stats: buildStorageStats(index),
    });
  } catch (error) {
    console.error("List image storage error:", error);
    return NextResponse.json(
      { message: "Failed to list storage objects" },
      { status: 500 },
    );
  }
}
