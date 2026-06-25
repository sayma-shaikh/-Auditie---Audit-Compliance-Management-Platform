import auth from './auth'
import type { Readable } from 'stream'

export async function getFileMetadata(userId: string, fileId: string) {
  const { drive } = await auth.getDriveClientForUser(userId)
  const res = await drive.files.get({
    fileId,
    fields: 'id,name,mimeType,size,createdTime,modifiedTime,owners,lastModifyingUser,shared,webViewLink,webContentLink,parents',
    supportsAllDrives: true,
  })
  return res.data
}

export async function getDocument(userId: string, documentId: string) {
  const docs = await auth.getDocsClientForUser(userId)
  const res = await docs.documents.get({ documentId })
  return res.data
}

export async function createDocument(userId: string, name: string, parentId?: string) {
  const drive = (await auth.getDriveClientForUser(userId)).drive
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.document',
      parents: parentId ? [parentId] : ['root'],
    },
    fields: 'id,name,mimeType,parents,webViewLink',
  })
  return res.data
}

export async function getSpreadsheet(userId: string, spreadsheetId: string) {
  const sheets = await auth.getSheetsClientForUser(userId)
  const res = await sheets.spreadsheets.get({ spreadsheetId, includeGridData: false })
  return res.data
}

export async function createSpreadsheet(userId: string, name: string, parentId?: string) {
  const drive = (await auth.getDriveClientForUser(userId)).drive
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: parentId ? [parentId] : ['root'],
    },
    fields: 'id,name,mimeType,parents,webViewLink',
  })
  return res.data
}

export async function downloadFileStream(userId: string, fileId: string): Promise<Readable> {
  const { drive } = await auth.getDriveClientForUser(userId)
  const res = await drive.files.get({
    fileId,
    alt: 'media'
  }, { responseType: 'stream' as any })
  return res.data as Readable
}

export async function updateFileContent(userId: string, fileId: string, stream: NodeJS.ReadableStream, mimeType?: string) {
  const { drive } = await auth.getDriveClientForUser(userId)
  const res = await drive.files.update({
    fileId,
    media: {
      mimeType: mimeType || undefined,
      body: stream,
    },
    fields: 'id,name,mimeType,modifiedTime,webViewLink'
  })
  return res.data
}

export async function listRevisions(userId: string, fileId: string) {
  const { drive } = await auth.getDriveClientForUser(userId)
  const res = await drive.revisions.list({ fileId })
  return res.data.revisions || []
}

export async function createPermission(userId: string, fileId: string, permission: any) {
  const { drive } = await auth.getDriveClientForUser(userId)
  const res = await drive.permissions.create({ fileId, requestBody: permission, fields: '*' })
  return res.data
}

export default {
  getFileMetadata,
  downloadFileStream,
  updateFileContent,
  listRevisions,
  createPermission,
  getDocument,
  createDocument,
  getSpreadsheet,
  createSpreadsheet,
}
