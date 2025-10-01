/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, IRouter, Logger } from '@kbn/core/server';
import type { FeaturesPluginSetup, FeaturesPluginStart } from '@kbn/features-plugin/server';
import type { BootcampConfig } from './config';

export type BootcampPluginCoreSetup = CoreSetup<BootcampServerPluginStartDeps, BootcampServerStart>;
// export type BootcampPluginCoreServiceAccessor = CoreStart<BootcampPluginStartDeps>;

export interface BootcampServerSetup {
  logSetup: () => void;
}

export interface BootcampServerStart {
  logStart: () => void;
}

export interface BootcampServerPluginSetupDeps {
  // Add dependencies that the plugin setup needs
  features?: FeaturesPluginSetup;
}

export interface BootcampServerPluginStartDeps {
  // Add dependencies that the plugin start needs
  features?: FeaturesPluginStart;
}
export interface BootcampServerLibs {
  logger: Logger;
  router: IRouter;
  config: BootcampConfig;
}
