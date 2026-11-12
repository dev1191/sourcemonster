import { db } from "../lib/db";
import {
  projects,
  media,
  projectMedia,
  projectAddons,
  projectAddonMedia,
  projectChangeLog,
  type Project,
  type ProjectChangeLog,
} from "../lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { uploadFile, getPublicUrl } from "../lib/storage";
import { projectSchema, type ProjectInput } from "../lib/validation/project";

export interface ProjectWithThumbnail extends Project {
  thumbnailUrl: string | null;
}

export interface PublicProjectDetail {
  project: Project;
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
  changelogs: ProjectChangeLog[];
}

export interface AdminProjectDetail {
  project: Project;
  thumbnailUrl: string | null;
  galleryItems: Array<{
    id: string;
    projectMediaId: string;
    caption: string | null;
    objectKey: string | null;
    disk: string | null;
    url: string | null;
  }>;
  changelogs: ProjectChangeLog[];
}

export async function getPublishedProjects(): Promise<ProjectWithThumbnail[]> {
  const result = await db
    .select({
      project: projects,
      mediaRecord: media,
    })
    .from(projects)
    .leftJoin(media, eq(projects.thumbnailMediaId, media.id))
    .where(eq(projects.status, "published"))
    .orderBy(desc(projects.isFeatured), desc(projects.sortOrder), desc(projects.createdAt));

  return result.map(({ project, mediaRecord }) => ({
    ...project,
    thumbnailUrl: mediaRecord ? getPublicUrl(mediaRecord.objectKey, mediaRecord.disk) : null,
  }));
}

export async function getProjectBySlug(
  slug: string,
  options?: { allowDraft?: boolean }
): Promise<PublicProjectDetail | null> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);

  if (!project) return null;
  if (project.status !== "published" && !options?.allowDraft) {
    return null;
  }

  // Thumbnail
  let thumbnailUrl: string | null = null;
  if (project.thumbnailMediaId) {
    const [thumb] = await db
      .select()
      .from(media)
      .where(eq(media.id, project.thumbnailMediaId))
      .limit(1);
    if (thumb) {
      thumbnailUrl = getPublicUrl(thumb.objectKey, thumb.disk);
    }
  }

  // Gallery
  const rawGallery = await db
    .select({
      caption: projectMedia.caption,
      objectKey: media.objectKey,
      disk: media.disk,
    })
    .from(projectMedia)
    .leftJoin(media, eq(projectMedia.mediaId, media.id))
    .where(eq(projectMedia.projectId, project.id))
    .orderBy(projectMedia.sortOrder);

  const galleryItems = rawGallery.map((item) => ({
    caption: item.caption,
    url: item.objectKey && item.disk ? getPublicUrl(item.objectKey, item.disk) : null,
  }));

  // Addons
  const rawAddons = await db
    .select({
      addon: projectAddons,
      mediaRecord: media,
    })
    .from(projectAddons)
    .leftJoin(media, eq(projectAddons.thumbnailMediaId, media.id))
    .where(eq(projectAddons.projectId, project.id))
    .orderBy(desc(projectAddons.sortOrder), desc(projectAddons.createdAt));

  const addonIds = rawAddons.map((r) => r.addon.id);
  let addonGalleryMap: Record<string, Array<{ caption: string | null; url: string | null }>> = {};

  if (addonIds.length > 0) {
    const addonMediaRows = await db
      .select({
        addonId: projectAddonMedia.addonId,
        caption: projectAddonMedia.caption,
        objectKey: media.objectKey,
        disk: media.disk,
      })
      .from(projectAddonMedia)
      .leftJoin(media, eq(projectAddonMedia.mediaId, media.id))
      .where(inArray(projectAddonMedia.addonId, addonIds))
      .orderBy(projectAddonMedia.sortOrder);

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

  const changelogs = await db
    .select()
    .from(projectChangeLog)
    .where(eq(projectChangeLog.projectId, project.id))
    .orderBy(desc(projectChangeLog.createdAt));

  return {
    project,
    thumbnailUrl,
    galleryItems,
    addons,
    changelogs,
  };
}

export async function getAllAdminProjects(): Promise<ProjectWithThumbnail[]> {
  const result = await db
    .select({
      project: projects,
      mediaRecord: media,
    })
    .from(projects)
    .leftJoin(media, eq(projects.thumbnailMediaId, media.id))
    .orderBy(desc(projects.sortOrder), desc(projects.createdAt));

  return result.map(({ project, mediaRecord }) => ({
    ...project,
    thumbnailUrl: mediaRecord ? getPublicUrl(mediaRecord.objectKey, mediaRecord.disk) : null,
  }));
}

export async function getAdminProjectById(id: string): Promise<AdminProjectDetail | null> {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (!project) return null;

  let thumbnailUrl: string | null = null;
  if (project.thumbnailMediaId) {
    const [thumb] = await db
      .select()
      .from(media)
      .where(eq(media.id, project.thumbnailMediaId))
      .limit(1);
    if (thumb) {
      thumbnailUrl = getPublicUrl(thumb.objectKey, thumb.disk);
    }
  }

  const rawGallery = await db
    .select({
      id: projectMedia.id,
      caption: projectMedia.caption,
      objectKey: media.objectKey,
      disk: media.disk,
    })
    .from(projectMedia)
    .leftJoin(media, eq(projectMedia.mediaId, media.id))
    .where(eq(projectMedia.projectId, id))
    .orderBy(projectMedia.sortOrder);

  const galleryItems = rawGallery.map((g) => ({
    id: g.id,
    projectMediaId: g.id,
    caption: g.caption,
    objectKey: g.objectKey,
    disk: g.disk,
    url: g.objectKey && g.disk ? getPublicUrl(g.objectKey, g.disk) : null,
  }));

  const changelogs = await db
    .select()
    .from(projectChangeLog)
    .where(eq(projectChangeLog.projectId, id))
    .orderBy(desc(projectChangeLog.createdAt));

  return {
    project,
    thumbnailUrl,
    galleryItems,
    changelogs,
  };
}

export async function createProject(
  input: ProjectInput,
  thumbnailFile?: File | null
): Promise<Project> {
  const validationResult = projectSchema.safeParse(input);
  if (!validationResult.success) {
    const errorMsg = Object.values(validationResult.error.flatten().fieldErrors)
      .flat()
      .join("; ");
    throw new Error(errorMsg || "Invalid project data.");
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
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);

  if (existingSlug) {
    throw new Error(`The slug "${slug}" is already used by another project.`);
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

  const [newProject] = await db
    .insert(projects)
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

  return newProject;
}

export async function updateProject(
  id: string,
  input: ProjectInput,
  thumbnailFile?: File | null,
  screenshotFile?: File | File[] | null,
  screenshotCaption?: string | null
): Promise<Project> {
  const [existingProject] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);

  if (!existingProject) {
    throw new Error(`Project with ID "${id}" not found.`);
  }

  const validationResult = projectSchema.safeParse(input);
  if (!validationResult.success) {
    const errorMsg = Object.values(validationResult.error.flatten().fieldErrors)
      .flat()
      .join("; ");
    throw new Error(errorMsg || "Invalid project data.");
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
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);

  if (duplicateSlug && duplicateSlug.id !== id) {
    throw new Error(`The slug "${slug}" is already used by another project.`);
  }

  let thumbnailMediaId = existingProject.thumbnailMediaId;
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

  const screenshotFiles: File[] = Array.isArray(screenshotFile)
    ? screenshotFile
    : screenshotFile
    ? [screenshotFile]
    : [];

  for (const file of screenshotFiles) {
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
          altText: screenshotCaption || `${title} screenshot`,
        })
        .returning();

      if (galleryMedia) {
        await db.insert(projectMedia).values({
          projectId: id,
          mediaId: galleryMedia.id,
          caption: screenshotCaption || null,
        });
      }
    }
  }

  const [updated] = await db
    .update(projects)
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
        status === "published" && !existingProject.publishedAt
          ? new Date()
          : existingProject.publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, id))
    .returning();

  return updated;
}

export async function deleteProject(id: string): Promise<boolean> {
  const deleted = await db.delete(projects).where(eq(projects.id, id)).returning();
  return deleted.length > 0;
}

export async function deleteProjectGalleryImage(projectMediaId: string): Promise<boolean> {
  const deleted = await db.delete(projectMedia).where(eq(projectMedia.id, projectMediaId)).returning();
  return deleted.length > 0;
}

export async function getProjectChangeLogs(projectId: string): Promise<ProjectChangeLog[]> {
  return db
    .select()
    .from(projectChangeLog)
    .where(eq(projectChangeLog.projectId, projectId))
    .orderBy(desc(projectChangeLog.createdAt));
}

export async function createProjectChangeLog(input: {
  projectId: string;
  version?: string | null;
  content: string;
  createdAt?: Date | null;
}): Promise<ProjectChangeLog> {
  const [created] = await db
    .insert(projectChangeLog)
    .values({
      projectId: input.projectId,
      version: input.version?.trim() || null,
      content: input.content.trim(),
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    })
    .returning();
  return created;
}

export async function updateProjectChangeLog(
  id: string,
  input: {
    version?: string | null;
    content: string;
    createdAt?: Date | null;
  }
): Promise<ProjectChangeLog | null> {
  const [updated] = await db
    .update(projectChangeLog)
    .set({
      version: input.version?.trim() || null,
      content: input.content.trim(),
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    })
    .where(eq(projectChangeLog.id, id))
    .returning();
  return updated || null;
}

export async function deleteProjectChangeLog(id: string): Promise<boolean> {
  const deleted = await db.delete(projectChangeLog).where(eq(projectChangeLog.id, id)).returning();
  return deleted.length > 0;
}

// Seamless backward-compatibility aliases
export const getPublishedProducts = getPublishedProjects;
export const getProductBySlug = getProjectBySlug;
export const getAllAdminProducts = getAllAdminProjects;
export const getAdminProductById = getAdminProjectById;
export const createProduct = createProject;
export const updateProduct = updateProject;
export const deleteProduct = deleteProject;
export const deleteProductGalleryImage = deleteProjectGalleryImage;
export const getProductChangeLogs = getProjectChangeLogs;
export const createProductChangeLog = createProjectChangeLog;
export const updateProductChangeLog = updateProjectChangeLog;
export const deleteProductChangeLog = deleteProjectChangeLog;

export type ProductWithThumbnail = ProjectWithThumbnail;
export type PublicProductDetail = PublicProjectDetail;
export type AdminProductDetail = AdminProjectDetail;

