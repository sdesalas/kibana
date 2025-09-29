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

    // NOTE: Routes are registered during setup()

    // NOTE: We can also use stuff available from start()
    core.getStartServices().then(([coreStart, pluginsStart, startContract]) => {
      // Automagic, gets executed after start()
      this.logger.info('bootcamp: getStartServices');
      startContract.logStart();
    });

    // NOTE: The `core` object has a lot of goodies available

    // NOTE: This is how we use dependencies
    // plugins.fieldsMetadata.getFields().then((fields) => {
    //   this.logger.info('bootcamp: Fields', fields);
    // });

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
