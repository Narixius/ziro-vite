import { promises as fs } from 'node:fs'

export async function writeFile(fileFullPath: string, content: string): Promise<void> {
  const fullPath = fileFullPath
  await fs.writeFile(fullPath, content, 'utf8')
}
