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
      const mapId = poi['@_MapID'];
      if (!mapData[mapId]) {
        mapData[mapId] = { icons: [], paths: [] };
      }

      const iconFile = getIconFileFromType(xmlData.OverlayData.MarkerCategory, poi['@_type']);

      mapData[mapId].icons!.push({
        position: [Number(poi['@_xpos']), Number(poi['@_ypos']), Number(poi['@_zpos'])],
        texture: iconFile
      });
    }

    const trails = Array.isArray(xmlData.OverlayData.POIs.Trail) 
      ? xmlData.OverlayData.POIs.Trail 
      : [xmlData.OverlayData.POIs.Trail];

    for (const trail of trails) {
      try {
        const trailFilePath = path.join(extractPath, trail['@_trailData']);
        const gwTrail = new GW2Trail();
        await gwTrail.loadTrail(trailFilePath);
        const positions = gwTrail.getPositions();
        const mapId = gwTrail.getMapId().toString() || '0';

        if (!mapData[mapId]) {
          mapData[mapId] = { icons: [], paths: [] };
        }

        mapData[mapId].paths!.push({
          texture: trail['@_texture'],
          points: positions.map(pos => [pos.x, pos.y, pos.z])
        });
      } catch (error) {
        logger.error(`Failed to process trail: ${trail['@_trailData']}`, error);
      }
    }
  }

  return mapData;
}

function getIconFileFromType(markerCategories: any, type: string): string {
  if (!markerCategories || typeof markerCategories !== 'object') {
    return '';
  }

  const categories = type.split('.');
  let iconFile = '';

  function traverseCategories(category: any, depth: number): boolean {
    if (!category || typeof category !== 'object') {
      return false;
    }

    if (depth === categories.length) {
      iconFile = category['@_iconFile'] || '';
      return true;
    }

    if (category.MarkerCategory) {
      const subCategories = Array.isArray(category.MarkerCategory) 
        ? category.MarkerCategory 
        : [category.MarkerCategory];

      for (const subCategory of subCategories) {
        if (subCategory['@_name'] === categories[depth]) {
          if (traverseCategories(subCategory, depth + 1)) {
            return true;
          }
        }
      }
    }

    // If we didn't find a matching subcategory, we'll use the current category's icon (if any)
    if (!iconFile) {
      iconFile = category['@_iconFile'] || '';
    }

    return false;
  }

  traverseCategories(markerCategories, 0);
  return iconFile;
}

/** main functions */
async function downloadFile(url: string, filepath: string): Promise<void> {
  // const response = await fetch(url);
  // if (!response.ok) {
  //   throw new Error(`Failed to download ${url}: ${response.statusText}`);
  // }

  // const arrayBuffer = await response.arrayBuffer();
  // await fs.ensureDir(path.dirname(filepath));
  // await fs.writeFile(filepath, Buffer.from(arrayBuffer));
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
          const jsonOutputPath = path.join(extractPath, `${path.basename(file, '.xml')}_burrito.json`);

          // Check if this specific XML file has already been processed
          if (await fs.pathExists(jsonOutputPath)) {
            logger.info(`XML file ${file} already processed for ${markerPack.name} (${markerPack.id}). Skipping.`);
            continue;
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
  } catch (error) {
    logger.error(`Failed to process marker pack ${markerPack.name} (${markerPack.id}):`, error);
  }
}

async function downloadAndExtractMarkerPacks(): Promise<void> {
  try {
    logger.info(`Fetching marker packs from ${markerPacksUrl}`);
    // const response = await fetch(markerPacksUrl);
    // if (!response.ok) {
    //   throw new Error(`Failed to fetch ${markerPacksUrl}: ${response.statusText}`);
    // }

    // const data: MarkerPacksResponse = await response.json() as MarkerPacksResponse;

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