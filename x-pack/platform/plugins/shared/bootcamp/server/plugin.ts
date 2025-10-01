/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, CoreStart, Logger } from '@kbn/core/server';
import type {
  BootcampPluginCoreSetup,
  BootcampServerSetup,
  BootcampServerStart,
  BootcampServerLibs,
  BootcampServerPluginStartDeps,
  BootcampServerPluginSetupDeps,
} from './types';
import { registerRoutes } from './routes';
import { dashboardSavedObjectType } from './saved_objects/dashboard_saved_object_type';
import type { BootcampConfig } from './config';
import { UI_SETTINGS } from '../common/ui_settings';
import { registerBootcampKibanaFeature } from './features';

export class BootcampPlugin {
  private readonly logger: Logger;
  private readonly config: BootcampConfig;

  constructor(initializerContext: PluginInitializerContext<BootcampConfig>) {
    this.logger = initializerContext.logger.get();
    this.config = initializerContext.config.get();
  }

  public setup(
    core: BootcampPluginCoreSetup,
    plugins: BootcampServerPluginSetupDeps
  ): BootcampServerSetup {
    this.logger.info('bootcamp: Setup');

    // Register the ui settings
    core.uiSettings.register(UI_SETTINGS);

    // Register the dashboard saved object type
    core.savedObjects.registerType(dashboardSavedObjectType);

    // Create the router
    const router = core.http.createRouter();

    // Package up the libs
    const libs: BootcampServerLibs = {
      logger: this.logger,
      config: this.config,
      router,
    };

    // Register the routes
    registerRoutes(libs);

    // Register the features
    registerBootcampKibanaFeature(plugins.features);

    return {
      logSetup: () => this.logger.info('bootcamp: Hello setup'),
    };
  }

  public start(core: CoreStart, plugins: BootcampServerPluginStartDeps): BootcampServerStart {
    this.logger.info('bootcamp: Started');

    return {
      logStart: () => this.logger.info('bootcamp: Hello start'),
    };
  }
}
