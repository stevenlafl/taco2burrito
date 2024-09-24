import fetch from 'node-fetch';
import * as fs from 'fs-extra';
import * as path from 'path';
import AdmZip from 'adm-zip';
import dotenv from 'dotenv';
import logger from './logger';
import { GW2Trail } from '../src/trails';

import { XMLParser } from 'fast-xml-parser';

/** setup */
dotenv.config();

const markerPacksUrl = process.env.MARKER_PACKS_URL || 'https://raw.githubusercontent.com/BoyC/GW2TacO/main/MarkerPacks.json';
const packagesDir = path.join(__dirname, '..', process.env.PACKAGES_DIR || 'packages');

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseAttributeValue: true,
});

/** XML parse functions */

async function parseXmlFiles(directory: string): Promise<XMLSchema[]> {
  const xmlFiles = await fs.readdir(directory);
  const parsedFiles: XMLSchema[] = [];

  for (const file of xmlFiles) {
    if (path.extname(file).toLowerCase() === '.xml') {
      const filePath = path.join(directory, file);
      const xmlContent = await fs.readFile(filePath, 'utf-8');
      const parsedXml = xmlParser.parse(xmlContent) as XMLSchema;
      parsedFiles.push(parsedXml);
    }
  }

  return parsedFiles;
}

async function convertXmlToBurrito(xmlData: XMLSchema, extractPath: string): Promise<MapData> {
  const mapData: MapData = {};

  if (xmlData.OverlayData && xmlData.OverlayData.POIs) {
    const pois = Array.isArray(xmlData.OverlayData.POIs.POI) 
      ? xmlData.OverlayData.POIs.POI 
      : [xmlData.OverlayData.POIs.POI];

    for (const poi of pois) {
      // possibly a parse error
      if (poi === undefined) {
        continue;
      }

      const mapId = poi['@_MapID'];
      if (!mapData[mapId]) {
        mapData[mapId] = { icons: [], paths: [] };
      }

      if (poi['@_iconFile']) {
        const iconFile = poi['@_iconFile'];
        mapData[mapId].icons!.push({
          position: [Number(poi['@_xpos']), Number(poi['@_ypos']), Number(poi['@_zpos'])],
          texture: iconFile
        });
      }
      else if (xmlData.OverlayData.MarkerCategory) {
        let iconFile = getIconFileFromType(xmlData.OverlayData.MarkerCategory, poi['@_type']);
        
        if (!iconFile) {
          // Copy assets/unknown-poi-resize.png to Burrito/unknown-poi-resize.png
          iconFile = path.join('burrito','unknown-poi-resize.png');
          logger.warn(`Unknown POI texture for POI: ${poi['@_type']}`);
          const unknownPoiPath = path.join(__dirname, '..', 'assets', 'unknown-poi-resize.png');
          const burritoPath = path.join(extractPath, 'burrito', 'unknown-poi-resize.png');
          await fs.ensureDir(path.dirname(burritoPath));
          // copy if not exist
          if (!await fs.pathExists(burritoPath)) {
            await fs.copyFile(unknownPoiPath, burritoPath);
          }
        }

        mapData[mapId].icons!.push({
          position: [Number(poi['@_xpos']), Number(poi['@_ypos']), Number(poi['@_zpos'])],
          texture: iconFile
        });
      }
    }

    const trails = Array.isArray(xmlData.OverlayData.POIs.Trail) 
      ? xmlData.OverlayData.POIs.Trail 
      : [xmlData.OverlayData.POIs.Trail];

    for (const trail of trails) {
      // probably a parsing error
      if (trail === undefined) {
        continue;
      }

      try {
        const trailFilePath = path.join(extractPath, trail['@_trailData']);
        const gwTrail = new GW2Trail();
        await gwTrail.loadTrail(trailFilePath);
        const positions = gwTrail.getPositions();
        const mapId = gwTrail.getMapId().toString() || '0';

        if (!mapData[mapId]) {
          mapData[mapId] = { icons: [], paths: [] };
        }

        let texture = trail['@_texture'];

        if (!texture) {
          texture = 'burrito/unknown-trail-resize.png';
          logger.warn(`Unknown trail texture for trail: ${trail['@_trailData']}`);
          const unknownTrailPath = path.join(__dirname, '..', 'assets', 'unknown-trail-resize.png');
          const burritoPath = path.join(extractPath, 'burrito', 'unknown-trail-resize.png');
          await fs.ensureDir(path.dirname(burritoPath));
          // copy if not exist
          if (!await fs.pathExists(burritoPath)) {
            await fs.copyFile(unknownTrailPath, burritoPath);
          }
        }

        mapData[mapId].paths!.push({
          texture: texture,
          points: positions.map(pos => [pos.x, pos.y, pos.z])
        });
      } catch (error) {
        logger.error(`Failed to process trail: ${trail['@_trailData']}`, error);
      }
    }
  }

  return mapData;
}

function getIconFileFromType(markerCategories: MarkerCategoryType, type: string): string {
  let Node = findMarkerCategoryByType(markerCategories, type);
  let iconFile: string = Node ? (Node['@_iconFile'] ?? '') : '';

  if (iconFile === '') {
    logger.info(type + ' - Current Category: ' + JSON.stringify(Node, null, 2) + ' - ' + iconFile);
  }
  return iconFile;
}

/**
 * Recursively enumerates all nodes and adds them to the map with the calculated hierarchical path as key.
 * 
 * @param markerCategories - A `MarkerCategoryType` or array of `MarkerCategoryType` to enumerate.
 * @param parentPath - The current path we're at (used for recursion).
 * @param map - The Map to store paths with corresponding marker categories.
 * @returns The Map containing all calculated paths and their corresponding MarkerCategory.
 */
/**
 * Given a root `MarkerCategoryType` object, this function recursively enumerates all nodes
 * and adds them to a Map where the key is the calculated hierarchical path (e.g., 'zippy.portals.map_ports').
 *
 * @param markerCategories - The root `MarkerCategoryType` or array of `MarkerCategoryType` to traverse.
 * @param parentPath - The current hierarchical path (used in recursion).
 * @param map - The Map object to store the calculated path as key and the node as value.
 */
function enumerateMarkerCategories(
  markerCategories: MarkerCategoryType | MarkerCategoryType[],
  parentPath: string = '',
  map: Map<string, MarkerCategoryType> = new Map()
): Map<string, MarkerCategoryType> {

  // If the current node is an array, handle each item in the array.
  if (Array.isArray(markerCategories)) {
    markerCategories.forEach((category) => enumerateMarkerCategories(category, parentPath, map));
    return map;
  }

  // Calculate the current node's full path based on the parent path and its own `@_name`
  const currentPath = parentPath ? `${parentPath}.${markerCategories['@_name']}` : markerCategories['@_name'];

  // Add the current `MarkerCategoryType` to the map using the calculated `currentPath`
  map.set(currentPath, markerCategories);

  // Recursively process any nested MarkerCategory
  if (markerCategories.MarkerCategory) {
    enumerateMarkerCategories(
      markerCategories.MarkerCategory,  // Could be an object or array
      currentPath,
      map
    );
  }

  return map;
}

/**
 * Finds a MarkerCategoryType by its dot-separated path using the precomputed Map.
 *
 * @param markerCategories - The root MarkerCategory object.
 * @param path - The dot-separated path to look for (e.g., 'zippy.portals.map_ports').
 * @returns The corresponding MarkerCategoryType if found, else `null`.
 */
function findMarkerCategoryByType(
  markerCategories: MarkerCategoryType | MarkerCategoryType[], 
  path: string
): MarkerCategoryType | null {

  // First, enumerate all marker categories into a Map
  const markerMap = enumerateMarkerCategories(markerCategories);

  // Start with the full path and progressively remove segments from the back
  let currentPath = path;

  while (currentPath) {
    // Try to find the current path in the map
    const category = markerMap.get(currentPath);

    // If a category exists and has an `iconFile`, return it
    if (category && category['@_iconFile']) {
      return category;
    }

    // No iconFile found, so remove the last segment of the path and continue upwards
    const pathSegments = currentPath.split('.');
    pathSegments.pop(); // Remove the last segment
    currentPath = pathSegments.join('.');
  }

  // Return an empty string if no iconFile was found in any part of the hierarchy
  return null;
}

/** main functions */
async function downloadFile(url: string, filepath: string): Promise<void> {
  if (process.env.DEBUG !== '1') {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ${url}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    await fs.ensureDir(path.dirname(filepath));
    await fs.writeFile(filepath, Buffer.from(arrayBuffer));
  }
}

async function extractZip(zipFilePath: string, extractToDir: string): Promise<void> {
  const zip = new AdmZip(zipFilePath);
  zip.extractAllTo(extractToDir, true);
}

async function processMarkerPack(markerPack: MarkerPack): Promise<void> {
  try {
    logger.info(`Processing marker pack: ${markerPack.name}`);

    const extractPath = path.join(packagesDir, markerPack.id);
    const tacoFilePath = path.join(packagesDir, markerPack.filename);

    if (!await fs.pathExists(extractPath)) {
      logger.info(`Downloading .taco file from ${markerPack.downloadurl}`);
      await downloadFile(markerPack.downloadurl, tacoFilePath);

      logger.info(`Extracting ${markerPack.filename} to ${extractPath}`);
      await extractZip(tacoFilePath, extractPath);
    }

    logger.info(`Processing XML files for ${markerPack.name}`);
    const xmlFiles = await fs.readdir(extractPath);

    for (const file of xmlFiles) {
      try {
        if (path.extname(file).toLowerCase() === '.xml') {
          const filePath = path.join(extractPath, file);
          const jsonOutputPath = path.join(extractPath, `${path.basename(file, '.xml')}.json`);

          if (process.env.DEBUG !== '1') {
            // Check if this specific XML file has already been processed
            if (await fs.pathExists(jsonOutputPath)) {
              logger.info(`XML file ${file} already processed for ${markerPack.name} (${markerPack.id}). Skipping.`);
              continue;
            }
          }

          const xmlContent = await fs.readFile(filePath, 'utf-8');
          const parsedXml = xmlParser.parse(xmlContent) as XMLSchema;
          const burritoData = await convertXmlToBurrito(parsedXml, extractPath);

          logger.info(`Saving converted data to JSON for ${file} in ${markerPack.name} (${markerPack.id})`);
          await fs.writeJson(jsonOutputPath, burritoData, { spaces: 2 });

          logger.info(`Successfully processed XML file: ${file} for ${markerPack.name} (${markerPack.id})`);
        }
      } catch (error) {
        logger.error(`Failed to process ${markerPack.id} XML file: ${file}`, error);
      }
    }

    logger.info(`Successfully processed all XML files for marker pack: ${markerPack.name} (${markerPack.id})`);

    // Zip JSON files into a single zip file recursively, preserving the directory structure
    // If there are folders, zip everything inside the folders except for .trl files.
    // Ignore folders that only contain .trl files.
    
    if (process.env.DEBUG !== '1') {
      if (fs.existsSync(path.join(packagesDir, `${path.basename(markerPack.filename, '.taco')}.zip`))) {
        logger.info(`Zip file for ${markerPack.name} (${markerPack.id}) already exists. Skipping.`);
        return;
      }
    }

    const zip = new AdmZip();

    await processDirectory(extractPath, extractPath, zip);

    const zipOutputPath = path.join(packagesDir, `${path.basename(markerPack.filename, '.taco')}.zip`);
    zip.writeZip(zipOutputPath);    

    logger.info(`Successfully zipped all files for marker pack: ${markerPack.name} (${markerPack.id}) into ${zipOutputPath}`);

  } catch (error) {
    logger.error(`Failed to process marker pack ${markerPack.name} (${markerPack.id}):`, error);
  }
}

async function processDirectory(directoryPath: string, rootPath: string, zip: AdmZip): Promise<void> {
    // Reading the contents of the directory
    const contents = await fs.readdir(directoryPath, { withFileTypes: true });

    // Filter out undesired files and directories
    const nonTrlFiles = contents.filter((entry) => entry.isDirectory() || (!entry.name.endsWith('.trl') && !entry.name.endsWith('.xml')));

    // Check if directory contains only undesired files (ignore it if true)
    const containsOnlyTrlFiles = nonTrlFiles.length === 0;
    if (containsOnlyTrlFiles) return;

    // Iterate over filtered directory contents
    for (const entry of nonTrlFiles) {
        const entryPath = path.join(directoryPath, entry.name);

        if (entry.isDirectory()) {
            // Recursively process sub-directories
            await processDirectory(entryPath, rootPath, zip);
        } else {
            // Calculate the relative path from `rootPath`, not `directoryPath`
            const relativePath = path.relative(rootPath, entryPath);

            // Add the JSON file to the zip, preserving directory structure
            zip.addLocalFile(entryPath, path.dirname(relativePath));
        }
    }
}

async function downloadAndExtractMarkerPacks(): Promise<void> {
  try {
    logger.info(`Fetching marker packs from ${markerPacksUrl}`);

    if (process.env.DEBUG !== '1') {
      const response = await fetch(markerPacksUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${markerPacksUrl}: ${response.statusText}`);
      }

      const data: MarkerPacksResponse = await response.json() as MarkerPacksResponse;
    }
    const data = JSON.parse(fs.readFileSync('MarkerPacks.json', 'utf-8')) as MarkerPacksResponse;

    await fs.ensureDir(packagesDir);

    for (const markerPack of data.markerpacks) {
      await processMarkerPack(markerPack);
    }

    logger.info('All marker packs have been processed!');
  } catch (error) {
    logger.error('An error occurred while downloading marker packs:', error);
  }
}

// Start the downloading and extraction process
downloadAndExtractMarkerPacks();