/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger } from '@kbn/core/server';

export type BootcampPluginCoreSetup = CoreSetup<BootcampServerPluginStartDeps, BootcampServerStart>;
// export type BootcampPluginCoreServiceAccessor = CoreStart<BootcampPluginStartDeps>;

export interface BootcampServerSetup {
  logSetup: () => void;
}

export interface BootcampServerStart {
  logStart: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BootcampServerPluginSetupDeps {
  // Add dependencies that the plugin setup needs
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface BootcampServerPluginStartDeps {
  // Add dependencies that the plugin start needs
}
export interface BootcampServerLibs {
  logger: Logger;
}
