export {}

declare global {
  type MarkerPack = {
    name: string;
    id: string;
    filename: string;
    versionurl?: string;
    versionsearchstring?: string;
    versionterminator?: string;
    downloadurl: string;
    backupurl?: string;
    backupversion?: string;
    enabledbydefault: boolean;
    forcedversion?: string;
  }

  type MarkerPacksResponse = {
    markerpacks: MarkerPack[];
  }

  // Burrito types
  type MapData = {
    [mapId: string]: {
      icons?: Array<{
        position?: Array<number>,
        texture?: string
      }>,
      paths?: Array<{
        texture?: string,
        points?: Array<Array<number>>
      }>
    }
  }

  // TacO types
  type XMLSchema = {
    OverlayData: {
      '@_xmlns:xsi': string;
      '@_xsi:schemaLocation': string;
      '@_xmlns': string;
      MarkerCategory: MarkerCategoryType;
      POIs: {
        POI: POIType | POIType[];
        Trail: TrailType | TrailType[];
        Route: RouteType | RouteType[];
      };
      POI: POIType | POIType[];
    };
  };

  type MarkerCategoryType = {
    '@_name': string;
    '@_DisplayName': string;
    '@_fadeFar'?: string;
    '@_fadeNear'?: string;
    '@_mapVisibility'?: string;
    '@_minimapVisibility'?: string;
    '@_inGameVisibility'?: string;
    '@_texture'?: string;
    '@_animSpeed'?: string;
    '@_alpha'?: string;
    '@_mapDisplaySize'?: string;
    '@_iconFile'?: string;
    '@_minSize'?: string;
    '@_maxSize'?: string;
    '@_Name'?: string;
    '@_isseparator'?: string;
    '@_cull'?: string;
    '@_iconSize'?: string;
    '@_rotate'?: string;
    '@_tip-description'?: string;
    '@_rotate-x'?: string;
    '@_color'?: string;
    '@_behavior'?: string;
    '@_triggerRange'?: string;
    '@_heightOffset'?: string;
    '@_tip-name'?: string;
    '@_trailScale'?: string;
    '@_script-filter'?: string;
    '@_defaultToggle'?: string;
    '@_MapID'?: string;
    '@_IsHidden'?: string;
    '@_IsSeparator'?: string;
    '@_bounce'?: string;
    '@_bounce-height'?: string;
    '@_autoTrigger'?: string;
    '@_bh-color'?: string;
    '@_FadeNear'?: string;
    '@_FadeFar'?: string;
    '@_bh-FadeNear'?: string;
    '@_bh-FadeFar'?: string;
    '@_infoRange'?: string;
    '@_hide'?: string;
    '@_mapID'?: string;
    '@_scaleOnMapWithZoom'?: string;
    '@_ingamevisibility'?: string;
    '@_rotate-y'?: string;
    '@_rotate-z'?: string;
    '@_isWall'?: string;
    '@_occlude'?: string;
    '@_achievementId'?: string;
    '@_festival'?: string;
    '@_schedule-duration'?: string;
    '@_bh-maxSize'?: string;
    '@_bh-minSize'?: string;
    '@_bh-texture'?: string;
    '@_canfade'?: string;
    '@_bh-heightOffset'?: string;
    '@_bh-iconSize'?: string;
    '@_profession'?: string;
    MarkerCategory?: MarkerCategoryType | MarkerCategoryType[];
  };

  type POIType = {
    '@_MapID': string;
    '@_xpos': string;
    '@_ypos': string;
    '@_zpos': string;
    '@_type': string;
    '@_GUID': string;
    '@_iconFile'?: string;
    '@_profession'?: string;
    '@_rotate'?: string;
    '@_infoRange'?: string;
    '@_info'?: string;
    '@_heightOffset'?: string;
    '@_fadeFar'?: string;
    '@_fadeNear'?: string;
    '@_iconSize'?: string;
    '@_cull'?: string;
    '@_rotate-z'?: string;
    '@_tip-name'?: string;
    '@_specialization'?: string;
    '@_rotate-y'?: string;
    '@_alpha'?: string;
    '@_script-trigger'?: string;
    '@_minimapVisibility'?: string;
    '@_mapVisibility'?: string;
    '@_inGameVisibility'?: string;
    '@_ResetLength'?: string;
    '@_InGameVisibility'?: string;
    '@_script-filter'?: string;
    '@_triggerRange'?: string;
    '@_hide'?: string;
    '@_color'?: string;
    '@_rotate-x'?: string;
    '@_schedule'?: string;
    '@_schedule-duration'?: string;
    '@_tip-description'?: string;
    '@_MapDisplaySize'?: string;
    '@_autoTrigger'?: string;
    '@_show'?: string;
    '@_script-once'?: string;
    '@_behavior'?: string;
    '@_script-focus'?: string;
    '@_raid'?: string;
    '@_invertbehavior'?: string;
    '@_mapDisplaySize'?: string;
    '@_triggerrange'?: string;
    '@_autotrigger'?: string;
    '@_copy'?: string;
    '@_copy-message'?: string;
    '@_miniMapVisibility'?: string;
    '@_iconfile'?: string;
    '@_minSize'?: string;
    '@_maxSize'?: string;
    '@_ingameVisibility'?: string;
    '@_MaxSize'?: string;
    '@_fadenear'?: string;
    '@_fadefar'?: string;
    '@_achievementBit'?: string;
    '@_bh-info'?: string;
    '@_bh-fadeNear'?: string;
    '@_bh-fadeFar'?: string;
    '@_bh-FadeNear'?: string;
    '@_bh-FadeFar'?: string;
    '@_FadeNear'?: string;
    '@_FadeFar'?: string;
    '@_hasCountdown'?: string;
    '@_resetLength'?: string;
    '@_resetOffset'?: string;
    '@_achievementId'?: string;
    '@_nimSize'?: string;
    '@_resetLenght'?: string;
    '@_script-tick'?: string;
    '@_mount'?: string;
    '@_minimapvisibility'?: string;
  };

  type TrailType = {
    '@_type': string;
    '@_GUID': string;
    '@_fadeNear': string;
    '@_fadeFar': string;
    '@_trailData': string;
    '@_animSpeed': string;
    '@_texture': string;
    '@_alpha'?: string;
    '@_miniMapVisibility'?: string;
    '@_color'?: string;
    '@_mapDisplaySize'?: string;
    '@_inGameVisibility'?: string;
    '@_fadenear'?: string;
    '@_achievementBit'?: string;
    '@_schedule'?: string;
    '@_trailScale'?: string;
    '@_mapVisibility'?: string;
    '@_ingameVisibility'?: string;
    '@_bh-color'?: string;
    '@_ingamevisibility'?: string;
  };

  type RouteType = {
    '@_MapID': string;
    '@_Name': string;
    '@_resetposx': string;
    '@_resetposy': string;
    '@_resetposz': string;
    '@_resetrange': string;
    POI: POIType | POIType[];
  };

  interface Position {
    x: number;
    y: number;
    z: number;
  }
}