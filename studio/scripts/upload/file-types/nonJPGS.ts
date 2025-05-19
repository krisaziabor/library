import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

/**
 * Handles non-JPG files: AVIF, HEIC, PNG, WEBP. Copies the main file, converts the copy to JPG, and uploads to Sanity.
 * @param eagleId The Eagle ID of the element
 * @param sanity The Sanity client
 * @returns The patched document, or null if upload failed
 */
export async function handleNonJPGSFileType(eagleId: string, sanity: any) {
  if (!eagleId) {
    console.warn('No eagleId provided to handleNonJPGSFileType.');
    return null;
  }
  const folderPath = `/Users/krisaziabor/Desktop/Visual Archive.library/images/${eagleId}.info`;
  let files;
  try {
    files = await fs.readdir(folderPath);
  } catch (err) {
    console.error(`Could not read directory: ${folderPath}`, err);
    return null;
  }
  // Filter out metadata.json and *thumbnail.png
  const mainFiles = files.filter(f => f !== 'metadata.json' && !f.endsWith('thumbnail.png'));
  if (mainFiles.length !== 1) {
    console.error(`Expected exactly one main content file in ${folderPath}, found:`, mainFiles);
    return null;
  }
  const mainFileName = mainFiles[0];
  const mainFilePath = path.join(folderPath, mainFileName);
  const ext = path.extname(mainFileName).slice(1).toLowerCase();
  const supportedTypes = ['avif', 'heic', 'png', 'webp'];
  if (!supportedTypes.includes(ext)) {
    console.error(`Unfamiliar file extension: '${ext}'. Stopping script.`);
    return null;
  }
  // Copy the main file
  const copyFilePath = path.join(folderPath, `copy_${mainFileName}`);
  try {
    await fs.copyFile(mainFilePath, copyFilePath);
    console.log(`Copied main file to ${copyFilePath}`);
  } catch (err) {
    console.error(`Failed to copy file: ${mainFilePath} to ${copyFilePath}`, err);
    return null;
  }
  // Convert the copy to JPG
  const jpgFilePath = path.join(folderPath, `${path.parse(mainFileName).name}.jpg`);
  try {
    await sharp(copyFilePath).jpeg().toFile(jpgFilePath);
    console.log(`Converted file to JPG: ${jpgFilePath}`);
  } catch (err) {
    console.error(`Failed to convert file to JPG: ${copyFilePath}`, err);
    return null;
  }
  // Fetch the element's _id by eagleId
  const result = await sanity.fetch(
    '*[_type == "elements" && eagleId == $eagleId][0]{_id}',
    { eagleId }
  );
  if (!result || !result._id) {
    console.warn(`No element found in Sanity with eagleId ${eagleId}`);
    return null;
  }
  // Read the JPG file as a buffer
  let fileBuffer;
  try {
    fileBuffer = await fs.readFile(jpgFilePath);
  } catch (err) {
    console.error(`Could not read file: ${jpgFilePath}`, err);
    return null;
  }
  // Upload the JPG file to Sanity and patch the element's file property
  let uploadedAsset;
  try {
    uploadedAsset = await sanity.assets.upload('file', fileBuffer, { filename: path.basename(jpgFilePath) });
  } catch (err) {
    console.error('Failed to upload JPG file to Sanity:', err);
    return null;
  }
  const patched = await sanity.patch(result._id).set({ file: { _type: 'file', asset: { _type: 'reference', _ref: uploadedAsset._id } } }).commit();
  console.log(`Uploaded JPG file for eagleId ${eagleId} to Sanity.`);
  // Delete the JPG file after successful upload
  try {
    await fs.unlink(jpgFilePath);
    console.log(`Deleted temporary JPG file: ${jpgFilePath}`);
  } catch (err) {
    console.error(`Failed to delete temporary JPG file: ${jpgFilePath}`, err);
  }
  return patched;
} 