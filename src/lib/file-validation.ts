import { FILE_LIMITS } from './limits';
export type AllowedKind = 'image' | 'pdf';
export function validateFiles(files: File[], kind: AllowedKind, existingCount = 0): string[] {
  const errors: string[] = [];
  if (existingCount + files.length > FILE_LIMITS.count) errors.push(`You can add up to ${FILE_LIMITS.count} files at a time.`);
  for (const file of files) {
    if (file.size > FILE_LIMITS.bytesPerFile) { errors.push(`${file.name} is larger than the 50 MB limit.`); continue; }
    const ext = file.name.split('.').pop()?.toLowerCase();
    const imageType: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    const valid = kind === 'pdf' ? ext === 'pdf' && (file.type === 'application/pdf' || file.type === '') : Boolean(imageType[ext ?? '']) && (!file.type || file.type === imageType[ext ?? '']);
    if (!valid) errors.push(`${file.name} is not a supported ${kind === 'pdf' ? 'PDF' : 'image'} file.`);
  }
  return errors;
}
