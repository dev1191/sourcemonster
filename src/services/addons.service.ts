import { db } from "../lib/db";
import {
  products,
  productAddons,
  media,
  productAddonMedia,
  productAddonChangeLog,
  type ProductAddon,
  type ProductAddonChangeLog,
} from "../lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { uploadFile, getPublicUrl } from "../lib/storage";

export interface AddonItem {
  id: string;
  projectId: string;
  productId: string;
  title: string;
  name: string;
  description: string;
  price: string | null;
  isFree: boolean;
  buyUrl: string | null;
  demoUrl: string | null;
  sortOrder: number;
  thumbnailMediaId: string | null;
  thumbnailUrl: string | null;
  projectTitle: string | null;
  projectSlug: string | null;
  productTitle: string | null;
  productSlug: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddonDetail extends AddonItem {
  galleryScreenshots: Array<{
    id: string;
    caption: string | null;
    url: string | null;
  }>;
  changelogs: ProductAddonChangeLog[];
}

export interface CreateAddonInput {
  projectId?: string;
  productId?: string;
  title: string;
  description?: string | null;
  price?: string | null;
  isFree?: boolean;
  buyUrl?: string | null;
  demoUrl?: string | null;
  sortOrder?: number;
}

export interface UpdateAddonInput extends Partial<CreateAddonInput> {}

export async function getAllAdminAddons(selectedProductId?: string): Promise<AddonItem[]> {
  const result = await db
    .select({
      addon: productAddons,
      product: {
        id: products.id,
        title: products.title,
        slug: products.slug,
      },
      mediaRecord: media,
    })
    .from(productAddons)
    .leftJoin(products, eq(productAddons.productId, products.id))
    .leftJoin(media, eq(productAddons.thumbnailMediaId, media.id))
    .orderBy(desc(productAddons.sortOrder), desc(productAddons.createdAt));

  return result
    .filter((r) => (!selectedProductId ? true : r.addon.productId === selectedProductId))
    .map(({ addon, product, mediaRecord }) => ({
      id: addon.id,
      projectId: addon.projectId,
      productId: addon.projectId,
      title: addon.name,
      name: addon.name,
      description: addon.description,
      price: addon.price,
      isFree: addon.isFree,
      buyUrl: addon.buyUrl,
      demoUrl: addon.demoUrl,
      sortOrder: addon.sortOrder,
      thumbnailMediaId: addon.thumbnailMediaId,
      thumbnailUrl: mediaRecord ? getPublicUrl(mediaRecord.objectKey, mediaRecord.disk) : null,
      projectTitle: product?.title || null,
      projectSlug: product?.slug || null,
      productTitle: product?.title || null,
      productSlug: product?.slug || null,
      createdAt: addon.createdAt,
      updatedAt: addon.updatedAt,
    }));
}

export async function getAddonById(id: string): Promise<AddonDetail | null> {
  const [record] = await db
    .select({
      addon: productAddons,
      product: {
        id: products.id,
        title: products.title,
        slug: products.slug,
      },
      mediaRecord: media,
    })
    .from(productAddons)
    .leftJoin(products, eq(productAddons.productId, products.id))
    .leftJoin(media, eq(productAddons.thumbnailMediaId, media.id))
    .where(eq(productAddons.id, id))
    .limit(1);

  if (!record) return null;

  const gallery = await db
    .select({
      id: productAddonMedia.id,
      caption: productAddonMedia.caption,
      objectKey: media.objectKey,
      disk: media.disk,
    })
    .from(productAddonMedia)
    .leftJoin(media, eq(productAddonMedia.mediaId, media.id))
    .where(eq(productAddonMedia.addonId, id))
    .orderBy(productAddonMedia.sortOrder);

  const galleryScreenshots = gallery.map((g) => ({
    id: g.id,
    caption: g.caption,
    url: g.objectKey && g.disk ? getPublicUrl(g.objectKey, g.disk) : null,
  }));

  return {
    id: record.addon.id,
    productId: record.addon.productId,
    title: record.addon.name,
    name: record.addon.name,
    description: record.addon.description,
    price: record.addon.price,
    isFree: record.addon.isFree,
    buyUrl: record.addon.buyUrl,
    demoUrl: record.addon.demoUrl,
    sortOrder: record.addon.sortOrder,
    thumbnailMediaId: record.addon.thumbnailMediaId,
    thumbnailUrl: record.mediaRecord
      ? getPublicUrl(record.mediaRecord.objectKey, record.mediaRecord.disk)
      : null,
    productTitle: record.product?.title || null,
    productSlug: record.product?.slug || null,
    createdAt: record.addon.createdAt,
    updatedAt: record.addon.updatedAt,
    galleryScreenshots,
    changelogs: await getAddonChangeLogs(id),
  };
}

export async function createAddon(
  input: CreateAddonInput,
  thumbnailFile?: File | null,
  galleryFiles?: File[]
): Promise<ProductAddon> {
  const parentId = input.projectId || input.productId;
  if (!parentId) {
    throw new Error("Please select a parent project.");
  }
  if (!input.title || input.title.trim() === "") {
    throw new Error("Add-on title is required.");
  }

  let thumbnailMediaId: string | null = null;
  if (thumbnailFile && thumbnailFile.size > 0) {
    const uploadRes = await uploadFile(thumbnailFile, thumbnailFile.name, thumbnailFile.type);
    const [mediaRecord] = await db
      .insert(media)
      .values({
        disk: uploadRes.disk,
        objectKey: uploadRes.objectKey,
        originalName: uploadRes.originalName,
        mimeType: uploadRes.mimeType,
        sizeBytes: uploadRes.sizeBytes,
      })
      .returning();
    if (mediaRecord) {
      thumbnailMediaId = mediaRecord.id;
    }
  }

  const [createdAddon] = await db
    .insert(productAddons)
    .values({
      projectId: parentId,
      name: input.title.trim(),
      description: input.description?.trim() || "",
      price: input.isFree ? "0.00" : input.price?.trim() || null,
      isFree: input.isFree ?? false,
      buyUrl: input.buyUrl?.trim() || null,
      demoUrl: input.demoUrl?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      thumbnailMediaId,
    })
    .returning();

  if (createdAddon && galleryFiles && galleryFiles.length > 0) {
    for (let i = 0; i < galleryFiles.length; i++) {
      const file = galleryFiles[i];
      if (file && file.size > 0) {
        const uploadRes = await uploadFile(file, file.name, file.type);
        const [galleryMedia] = await db
          .insert(media)
          .values({
            disk: uploadRes.disk,
            objectKey: uploadRes.objectKey,
            originalName: uploadRes.originalName,
            mimeType: uploadRes.mimeType,
            sizeBytes: uploadRes.sizeBytes,
          })
          .returning();

        if (galleryMedia) {
          await db.insert(productAddonMedia).values({
            addonId: createdAddon.id,
            mediaId: galleryMedia.id,
            sortOrder: i,
          });
        }
      }
    }
  }

  return createdAddon;
}

export async function updateAddon(
  id: string,
  input: UpdateAddonInput,
  thumbnailFile?: File | null,
  newGalleryFiles?: File[]
): Promise<ProductAddon> {
  const [existing] = await db
    .select()
    .from(productAddons)
    .where(eq(productAddons.id, id))
    .limit(1);

  if (!existing) {
    throw new Error(`Addon with ID "${id}" not found.`);
  }

  let updatedThumbnailId = existing.thumbnailMediaId;
  if (thumbnailFile && thumbnailFile.size > 0) {
    const uploadRes = await uploadFile(thumbnailFile, thumbnailFile.name, thumbnailFile.type);
    const [mediaRecord] = await db
      .insert(media)
      .values({
        disk: uploadRes.disk,
        objectKey: uploadRes.objectKey,
        originalName: uploadRes.originalName,
        mimeType: uploadRes.mimeType,
        sizeBytes: uploadRes.sizeBytes,
      })
      .returning();
    if (mediaRecord) {
      updatedThumbnailId = mediaRecord.id;
    }
  }

    const newParentId = input.projectId !== undefined ? input.projectId : input.productId;
    const [updated] = await db
    .update(productAddons)
    .set({
      projectId: newParentId !== undefined ? newParentId : existing.projectId,
      name: input.title !== undefined ? input.title.trim() : existing.name,
      description: input.description !== undefined ? (input.description?.trim() || "") : existing.description,
      price: input.isFree ? "0.00" : input.price !== undefined ? (input.price?.trim() || null) : existing.price,
      isFree: input.isFree !== undefined ? input.isFree : existing.isFree,
      buyUrl: input.buyUrl !== undefined ? (input.buyUrl?.trim() || null) : existing.buyUrl,
      demoUrl: input.demoUrl !== undefined ? (input.demoUrl?.trim() || null) : existing.demoUrl,
      sortOrder: input.sortOrder !== undefined ? input.sortOrder : existing.sortOrder,
      thumbnailMediaId: updatedThumbnailId,
      updatedAt: new Date(),
    })
    .where(eq(productAddons.id, id))
    .returning();

  if (newGalleryFiles && newGalleryFiles.length > 0) {
    for (let i = 0; i < newGalleryFiles.length; i++) {
      const file = newGalleryFiles[i];
      if (file && file.size > 0) {
        const uploadRes = await uploadFile(file, file.name, file.type);
        const [galleryMedia] = await db
          .insert(media)
          .values({
            disk: uploadRes.disk,
            objectKey: uploadRes.objectKey,
            originalName: uploadRes.originalName,
            mimeType: uploadRes.mimeType,
            sizeBytes: uploadRes.sizeBytes,
          })
          .returning();

        if (galleryMedia) {
          await db.insert(productAddonMedia).values({
            addonId: id,
            mediaId: galleryMedia.id,
            sortOrder: i + 10,
          });
        }
      }
    }
  }

  return updated;
}

export async function deleteAddon(id: string): Promise<boolean> {
  const deleted = await db.delete(productAddons).where(eq(productAddons.id, id)).returning();
  return deleted.length > 0;
}

export async function removeAddonThumbnail(id: string): Promise<boolean> {
  const updated = await db
    .update(productAddons)
    .set({ thumbnailMediaId: null, updatedAt: new Date() })
    .where(eq(productAddons.id, id))
    .returning();
  return updated.length > 0;
}

export async function deleteAddonGalleryImage(addonMediaId: string): Promise<boolean> {
  const deleted = await db.delete(productAddonMedia).where(eq(productAddonMedia.id, addonMediaId)).returning();
  return deleted.length > 0;
}

export async function getAddonChangeLogs(addonId: string): Promise<ProductAddonChangeLog[]> {
  return db
    .select()
    .from(productAddonChangeLog)
    .where(eq(productAddonChangeLog.addonId, addonId))
    .orderBy(desc(productAddonChangeLog.createdAt));
}

export async function createAddonChangeLog(input: {
  addonId: string;
  version?: string | null;
  content: string;
  createdAt?: Date | null;
}): Promise<ProductAddonChangeLog> {
  const [created] = await db
    .insert(productAddonChangeLog)
    .values({
      addonId: input.addonId,
      version: input.version?.trim() || null,
      content: input.content.trim(),
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    })
    .returning();
  return created;
}

export async function updateAddonChangeLog(
  id: string,
  input: {
    version?: string | null;
    content: string;
    createdAt?: Date | null;
  }
): Promise<ProductAddonChangeLog | null> {
  const [updated] = await db
    .update(productAddonChangeLog)
    .set({
      version: input.version?.trim() || null,
      content: input.content.trim(),
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    })
    .where(eq(productAddonChangeLog.id, id))
    .returning();
  return updated || null;
}

export async function deleteAddonChangeLog(id: string): Promise<boolean> {
  const deleted = await db.delete(productAddonChangeLog).where(eq(productAddonChangeLog.id, id)).returning();
  return deleted.length > 0;
}
