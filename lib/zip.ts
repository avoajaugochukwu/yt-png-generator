import archiver from 'archiver';
import { PassThrough } from 'stream';

export async function createZip(
  files: Array<{ name: string; buffer: Buffer }>
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 5 } });
    const passthrough = new PassThrough();
    const chunks: Buffer[] = [];

    passthrough.on('data', (chunk: Buffer) => chunks.push(chunk));
    passthrough.on('end', () => resolve(Buffer.concat(chunks)));
    passthrough.on('error', reject);
    archive.on('error', reject);

    archive.pipe(passthrough);

    for (const file of files) {
      archive.append(file.buffer, { name: file.name });
    }

    archive.finalize();
  });
}
