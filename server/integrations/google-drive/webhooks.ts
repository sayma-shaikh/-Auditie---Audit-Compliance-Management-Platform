import { PrismaClient } from '@prisma/client'
import gdAuth from './auth'

const prisma = new PrismaClient()

async function deleteRepositoryItemRecursive(itemId: string) {
  const children = await prisma.repositoryItem.findMany({
    where: { parentId: itemId },
    select: { id: true },
  })

  for (const child of children) {
    await deleteRepositoryItemRecursive(child.id)
  }

  await prisma.repositoryAudit.deleteMany({ where: { itemId } })
  await prisma.repositoryItem.delete({ where: { id: itemId } })
}

export async function handleDriveWebhook(headers: any, body: any) {
  const channelId = headers['x-goog-channel-id'] || headers['x-goog-channelid'] || headers['x-goog-channelid'.toLowerCase()]
  const resourceId = headers['x-goog-resource-id'] || headers['x-goog-resourceid'] || headers['x-goog-resourceid'.toLowerCase()]

  if (!channelId) {
    throw new Error('Missing channel id header')
  }

  const watch = await prisma.googleDriveWatch.findFirst({ where: { channelId } })
  if (!watch) {
    throw new Error('Watch channel not found')
  }

  // Best-effort: try to fetch the updated file using resourceId as a fileId
  try {
    const { drive } = await gdAuth.getDriveClientForUser(watch.userId)
    let fileMeta: any = null

    if (resourceId) {
      try {
        const resp = await drive.files.get({ fileId: resourceId, fields: 'id,name,mimeType,size,parents,webViewLink,modifiedTime', supportsAllDrives: true })
        fileMeta = resp.data
      } catch (err: any) {
        const notFound = err?.code === 404 || err?.errors?.[0]?.reason === 'notFound';
        if (notFound) {
          const existing = await prisma.repositoryItem.findUnique({ where: { externalId: resourceId } });
          if (existing) {
            await deleteRepositoryItemRecursive(existing.id);
            await prisma.repositoryAudit.create({ data: { itemId: existing.id, userId: watch.userId, action: 'DELETE_ITEM', details: `Deleted stale Drive item ${existing.name} after Drive webhook deletion` } });
            await prisma.auditLog.create({ data: { userId: watch.userId, actionType: 'GOOGLE_DRIVE_CHANGE_SYNCED', repositoryItemId: existing.id, details: `Removed stale item ${existing.name} after Drive deletion` } });
            return { synced: true, itemId: existing.id, deleted: true };
          }
        }
        // Not a fileId or not found with no local record; fall through
        fileMeta = null
      }
    }

    if (!fileMeta && body && body.kind === 'drive#change') {
      // If Google sends a change payload, attempt to inspect body
      fileMeta = body
    }

    if (!fileMeta) {
      // If we can't determine the specific file, record a generic audit and return
      await prisma.auditLog.create({ data: { userId: watch.userId, actionType: 'GOOGLE_DRIVE_CHANGE', details: `Drive change notification for channel ${channelId}` } })
      return { synced: false }
    }

    // Upsert RepositoryItem by externalId
    const existing = await prisma.repositoryItem.findUnique({ where: { externalId: fileMeta.id } })
    if (existing) {
      await prisma.repositoryItem.update({ where: { id: existing.id }, data: { name: fileMeta.name, mimeType: fileMeta.mimeType || existing.mimeType, size: fileMeta.size ? Number(fileMeta.size) : existing.size } })

      await prisma.repositoryAudit.create({ data: { itemId: existing.id, userId: watch.userId, action: 'REVISION_SYNC', details: `Synced changes from Drive for ${fileMeta.name}` } })
      await prisma.auditLog.create({ data: { userId: watch.userId, actionType: 'GOOGLE_DRIVE_CHANGE_SYNCED', repositoryItemId: existing.id, details: `Synced Drive change for ${fileMeta.name}` } })
      return { synced: true, itemId: existing.id }
    }

    // If no existing item, create a lightweight RepositoryItem record
    const created = await prisma.repositoryItem.create({ data: { name: fileMeta.name || 'Unknown', type: 'FILE', source: 'gdrive', externalId: fileMeta.id, path: fileMeta.name || '', mimeType: fileMeta.mimeType || null, size: fileMeta.size ? Number(fileMeta.size) : null, createdById: watch.userId } })

    await prisma.repositoryAudit.create({ data: { itemId: created.id, userId: watch.userId, action: 'REVISION_SYNC', details: `Imported Drive item ${fileMeta.name}` } })
    await prisma.auditLog.create({ data: { userId: watch.userId, actionType: 'GOOGLE_DRIVE_CHANGE_SYNCED', repositoryItemId: created.id, details: `Imported Drive item ${fileMeta.name}` } })

    return { synced: true, itemId: created.id }
  } catch (err) {
    console.error('Error handling Drive webhook:', err)
    throw err
  }
}

export default { handleDriveWebhook }
