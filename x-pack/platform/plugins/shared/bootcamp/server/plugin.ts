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
  BootcampServerPluginStartDeps,
  BootcampServerPluginSetupDeps,
} from './types';
import { registerRoutes } from './routes';
import { dashboardSavedObjectType } from './saved_objects/dashboard_saved_object_type';

export class BootcampPlugin {
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get('bootcamp-plugin');
  }

  public setup(
    core: BootcampPluginCoreSetup,
    plugins: BootcampServerPluginSetupDeps
  ): BootcampServerSetup {
    this.logger.info('bootcamp: Setup');

    // Register the dashboard saved object type
    core.savedObjects.registerType(dashboardSavedObjectType);

    // Register the routes
    const router = core.http.createRouter();
    registerRoutes(router, { logger: this.logger });

    return {
      logSetup: () => {
        this.logger.info('bootcamp: Hello setup');
      },
    };
  }

  public start(core: CoreStart, plugins: BootcampServerPluginStartDeps): BootcampServerStart {
    this.logger.info('bootcamp: Started');

    return {
      logStart: () => {
        this.logger.info('bootcamp: Hello start');
      },
    };
  }
}
