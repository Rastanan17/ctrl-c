import {cp, copyFile, mkdir, rm} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, '..');
const outputDirectory = join(projectDirectory, 'www');
const directoriesToCopy = ['css', 'images', 'js'];
const filesToCopy = ['index.html', 'manifest.webmanifest', 'sw.js'];
await rm(outputDirectory, {recursive: true, force: true});
await mkdir(outputDirectory, {recursive: true});
for (
    const directoryName of directoriesToCopy) {
        await cp(
            join(projectDirectory, directoryName),
            join(outputDirectory, directoryName), {
                recursive: true
            }
        );
    }
for (const fileName of filesToCopy) {
    await copyFile(
        join(projectDirectory, fileName),
        join(outputDirectory, fileName)
    );
}
console.log('Aplicación web copiada correctamente en www/');