import { db } from "../lib/db";
import {
  products,
  media,
  productMedia,
  productAddons,
  productAddonMedia,
  type Product,
} from "../lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { uploadFile, getPublicUrl } from "../lib/storage";
import { productSchema, type ProductInput } from "../lib/validation/product";

export interface ProductWithThumbnail extends Product {
  thumbnailUrl: string | null;
}

export interface PublicProductDetail {
  product: Product;
  thumbnailUrl: string | null;
  galleryItems: Array<{
    caption: string | null;
    url: string | null;
  }>;
  addons: Array<{
    id: string;
    name: string;
    description: string;
    price: string | null;
    isFree: boolean;
    buyUrl: string | null;
    demoUrl: string | null;
    sortOrder: number;
    thumbnailUrl: string | null;
    gallery: Array<{
      caption: string | null;
      url: string | null;
    }>;
    galleryScreenshots: Array<{
      caption: string | null;
      url: string | null;
    }>;
  }>;
}

export interface AdminProductDetail {
  product: Product;
  thumbnailUrl: string | null;
  galleryItems: Array<{
    id: string;
    productMediaId: string;
    caption: string | null;
    objectKey: string | null;
    disk: string | null;
    url: string | null;
  }>;
}

export async function getPublishedProducts(): Promise<ProductWithThumbnail[]> {
  const result = await db
    .select({
      product: products,
      mediaRecord: media,
    })
    .from(products)
    .leftJoin(media, eq(products.thumbnailMediaId, media.id))
    .where(eq(products.status, "published"))
    .orderBy(desc(products.isFeatured), desc(products.sortOrder), desc(products.createdAt));

  return result.map(({ product, mediaRecord }) => ({
    ...product,
    thumbnailUrl: mediaRecord ? getPublicUrl(mediaRecord.objectKey, mediaRecord.disk) : null,
  }));
}

export async function getProductBySlug(
  slug: string,
  options?: { allowDraft?: boolean }
): Promise<PublicProductDetail | null> {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (!product) return null;
  if (product.status !== "published" && !options?.allowDraft) {
    return null;
  }

  // Thumbnail
  let thumbnailUrl: string | null = null;
  if (product.thumbnailMediaId) {
    const [thumb] = await db
      .select()
      .from(media)
      .where(eq(media.id, product.thumbnailMediaId))
      .limit(1);
    if (thumb) {
      thumbnailUrl = getPublicUrl(thumb.objectKey, thumb.disk);
    }
  }

  // Gallery
  const rawGallery = await db
    .select({
      caption: productMedia.caption,
      objectKey: media.objectKey,
      disk: media.disk,
    })
    .from(productMedia)
    .leftJoin(media, eq(productMedia.mediaId, media.id))
    .where(eq(productMedia.productId, product.id))
    .orderBy(productMedia.sortOrder);

  const galleryItems = rawGallery.map((item) => ({
    caption: item.caption,
    url: item.objectKey && item.disk ? getPublicUrl(item.objectKey, item.disk) : null,
  }));

  // Addons
  const rawAddons = await db
    .select({
      addon: productAddons,
      mediaRecord: media,
    })
    .from(productAddons)
    .leftJoin(media, eq(productAddons.thumbnailMediaId, media.id))
    .where(eq(productAddons.productId, product.id))
    .orderBy(desc(productAddons.sortOrder), desc(productAddons.createdAt));

  const addonIds = rawAddons.map((r) => r.addon.id);
  let addonGalleryMap: Record<string, Array<{ caption: string | null; url: string | null }>> = {};

  if (addonIds.length > 0) {
    const addonMediaRows = await db
      .select({
        addonId: productAddonMedia.addonId,
        caption: productAddonMedia.caption,
        objectKey: media.objectKey,
        disk: media.disk,
      })
      .from(productAddonMedia)
      .leftJoin(media, eq(productAddonMedia.mediaId, media.id))
      .where(inArray(productAddonMedia.addonId, addonIds))
      .orderBy(productAddonMedia.sortOrder);

    for (const row of addonMediaRows) {
      if (!addonGalleryMap[row.addonId]) {
        addonGalleryMap[row.addonId] = [];
      }
      addonGalleryMap[row.addonId].push({
        caption: row.caption,
        url: row.objectKey && row.disk ? getPublicUrl(row.objectKey, row.disk) : null,
      });
    }
  }

  const addons = rawAddons.map(({ addon, mediaRecord }) => ({
    id: addon.id,
    name: addon.name,
    description: addon.description,
    price: addon.price,
    isFree: addon.isFree,
    buyUrl: addon.buyUrl,
    demoUrl: addon.demoUrl,
    sortOrder: addon.sortOrder,
    thumbnailUrl: mediaRecord ? getPublicUrl(mediaRecord.objectKey, mediaRecord.disk) : null,
    gallery: addonGalleryMap[addon.id] || [],
    galleryScreenshots: addonGalleryMap[addon.id] || [],
  }));

  return {
    product,
    thumbnailUrl,
    galleryItems,
    addons,
  };
}

export async function getAllAdminProducts(): Promise<ProductWithThumbnail[]> {
  const result = await db
    .select({
      product: products,
      mediaRecord: media,
    })
    .from(products)
    .leftJoin(media, eq(products.thumbnailMediaId, media.id))
    .orderBy(desc(products.sortOrder), desc(products.createdAt));

  return result.map(({ product, mediaRecord }) => ({
    ...product,
    thumbnailUrl: mediaRecord ? getPublicUrl(mediaRecord.objectKey, mediaRecord.disk) : null,
  }));
}

export async function getAdminProductById(id: string): Promise<AdminProductDetail | null> {
  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!product) return null;

  let thumbnailUrl: string | null = null;
  if (product.thumbnailMediaId) {
    const [thumb] = await db
      .select()
      .from(media)
      .where(eq(media.id, product.thumbnailMediaId))
      .limit(1);
    if (thumb) {
      thumbnailUrl = getPublicUrl(thumb.objectKey, thumb.disk);
    }
  }

  const rawGallery = await db
    .select({
      id: productMedia.id,
      caption: productMedia.caption,
      objectKey: media.objectKey,
      disk: media.disk,
    })
    .from(productMedia)
    .leftJoin(media, eq(productMedia.mediaId, media.id))
    .where(eq(productMedia.productId, id))
    .orderBy(productMedia.sortOrder);

  const galleryItems = rawGallery.map((g) => ({
    id: g.id,
    productMediaId: g.id,
    caption: g.caption,
    objectKey: g.objectKey,
    disk: g.disk,
    url: g.objectKey && g.disk ? getPublicUrl(g.objectKey, g.disk) : null,
  }));

  return {
    product,
    thumbnailUrl,
    galleryItems,
  };
}

export async function createProduct(
  input: ProductInput,
  thumbnailFile?: File | null
): Promise<Product> {
  const validationResult = productSchema.safeParse(input);
  if (!validationResult.success) {
    const errorMsg = Object.values(validationResult.error.flatten().fieldErrors)
      .flat()
      .join("; ");
    throw new Error(errorMsg || "Invalid product data.");
  }

  const {
    title,
    slug,
    shortDescription,
    description,
    codecanyonUrl,
    demoUrl,
    documentationUrl,
    version,
    technologies,
    features,
    status,
    isFeatured,
    sortOrder,
    seoTitle,
    seoDescription,
  } = validationResult.data;

  const [existingSlug] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (existingSlug) {
    throw new Error(`The slug "${slug}" is already used by another product.`);
  }

  let thumbnailMediaId: string | null = null;
  if (thumbnailFile && thumbnailFile.size > 0) {
    const uploadRes = await uploadFile(thumbnailFile, thumbnailFile.name, thumbnailFile.type);
    const [newMedia] = await db
      .insert(media)
      .values({
        disk: uploadRes.disk,
        objectKey: uploadRes.objectKey,
        originalName: uploadRes.originalName,
        mimeType: uploadRes.mimeType,
        sizeBytes: uploadRes.sizeBytes,
        altText: title,
      })
      .returning();

    if (newMedia) {
      thumbnailMediaId = newMedia.id;
    }
  }

  const [newProduct] = await db
    .insert(products)
    .values({
      title,
      slug,
      shortDescription,
      description,
      thumbnailMediaId,
      codecanyonUrl: codecanyonUrl || null,
      demoUrl: demoUrl || null,
      documentationUrl: documentationUrl || null,
      version: version || null,
      technologies,
      features,
      status,
      isFeatured,
      sortOrder,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      publishedAt: status === "published" ? new Date() : null,
    })
    .returning();

  return newProduct;
}

export async function updateProduct(
  id: string,
  input: ProductInput,
  thumbnailFile?: File | null,
  screenshotFile?: File | null,
  screenshotCaption?: string | null
): Promise<Product> {
  const [existingProduct] = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);

  if (!existingProduct) {
    throw new Error(`Product with ID "${id}" not found.`);
  }

  const validationResult = productSchema.safeParse(input);
  if (!validationResult.success) {
    const errorMsg = Object.values(validationResult.error.flatten().fieldErrors)
      .flat()
      .join("; ");
    throw new Error(errorMsg || "Invalid product data.");
  }

  const {
    title,
    slug,
    shortDescription,
    description,
    codecanyonUrl,
    demoUrl,
    documentationUrl,
    version,
    technologies,
    features,
    status,
    isFeatured,
    sortOrder,
    seoTitle,
    seoDescription,
  } = validationResult.data;

  const [duplicateSlug] = await db
    .select()
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (duplicateSlug && duplicateSlug.id !== id) {
    throw new Error(`The slug "${slug}" is already used by another product.`);
  }

  let thumbnailMediaId = existingProduct.thumbnailMediaId;
  if (thumbnailFile && thumbnailFile.size > 0) {
    const uploadRes = await uploadFile(thumbnailFile, thumbnailFile.name, thumbnailFile.type);
    const [newMedia] = await db
      .insert(media)
      .values({
        disk: uploadRes.disk,
        objectKey: uploadRes.objectKey,
        originalName: uploadRes.originalName,
        mimeType: uploadRes.mimeType,
        sizeBytes: uploadRes.sizeBytes,
        altText: title,
      })
      .returning();

    if (newMedia) {
      thumbnailMediaId = newMedia.id;
    }
  }

  if (screenshotFile && screenshotFile.size > 0) {
    const uploadRes = await uploadFile(screenshotFile, screenshotFile.name, screenshotFile.type);
    const [galleryMedia] = await db
      .insert(media)
      .values({
        disk: uploadRes.disk,
        objectKey: uploadRes.objectKey,
        originalName: uploadRes.originalName,
        mimeType: uploadRes.mimeType,
        sizeBytes: uploadRes.sizeBytes,
        altText: screenshotCaption || `${title} screenshot`,
      })
      .returning();

    if (galleryMedia) {
      await db.insert(productMedia).values({
        productId: id,
        mediaId: galleryMedia.id,
        caption: screenshotCaption || null,
      });
    }
  }

  const [updated] = await db
    .update(products)
    .set({
      title,
      slug,
      shortDescription,
      description,
      thumbnailMediaId,
      codecanyonUrl: codecanyonUrl || null,
      demoUrl: demoUrl || null,
      documentationUrl: documentationUrl || null,
      version: version || null,
      technologies,
      features,
      status,
      isFeatured,
      sortOrder,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      publishedAt:
        status === "published" && !existingProduct.publishedAt
          ? new Date()
          : existingProduct.publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning();

  return updated;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const deleted = await db.delete(products).where(eq(products.id, id)).returning();
  return deleted.length > 0;
}

export async function deleteProductGalleryImage(productMediaId: string): Promise<boolean> {
  const deleted = await db.delete(productMedia).where(eq(productMedia.id, productMediaId)).returning();
  return deleted.length > 0;
}
