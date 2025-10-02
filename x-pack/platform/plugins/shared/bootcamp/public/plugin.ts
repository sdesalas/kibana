/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin } from '@kbn/core/public';
import type { AppMountParameters } from '@kbn/core/public';
import { DEFAULT_APP_CATEGORIES, type CoreSetup, type CoreStart } from '@kbn/core/public';
import type {
  BootcampPublicSetup,
  BootcampPublicStart,
  BootcampPublicPluginSetupDeps,
  BootcampPublicPluginStartDeps,
} from './types';
import { BootcampDashboardService } from './services/bootcamp_dashboard_service';
import { BootcampLocator } from '../common/locator';

export class BootcampPlugin
  implements
    Plugin<
      BootcampPublicSetup,
      BootcampPublicStart,
      BootcampPublicPluginSetupDeps,
      BootcampPublicPluginStartDeps
    >
{
  public setup(
    coreSetup: CoreSetup<BootcampPublicPluginStartDeps, BootcampPublicStart>,
    plugins: BootcampPublicPluginSetupDeps
  ): BootcampPublicSetup {
    // eslint-disable-next-line no-console
    console.log('BootcampPlugin.setup()');

    plugins.share.url.locators.create(new BootcampLocator());

    coreSetup.application.register({
      id: 'bootcamp',
      title: 'Bootcamp',
      category: DEFAULT_APP_CATEGORIES.security,
      appRoute: '/app/bootcamp',
      visibleIn: ['sideNav', 'globalSearch', 'home'],
      euiIconType: 'devToolsApp', // @see https://eui.elastic.co/docs/components/display/icons/#elastic-logos
      async mount(params: AppMountParameters) {
        // eslint-disable-next-line no-console
        console.log('BootcampPlugin.mount()');

        const { renderApp } = await import('./application');
        const [coreStart, pluginsStart, myServices] = await coreSetup.getStartServices();

        // eslint-disable-next-line no-console
        console.log('BootcampPlugin.mount() -> ready', { coreStart, pluginsStart, myServices });

        // Return cleanup function
        // (what happens when the app is unmounted)
        // renderApp() returns it so we just pass it through
        return renderApp(coreStart, pluginsStart, myServices, params);
      },
    });

    return {
      // eslint-disable-next-line no-console
      logSetup: () => console.log('BootcampPlugin.logSetup()'),
    };
  }

  public start(coreStart: CoreStart, plugins: BootcampPublicPluginStartDeps): BootcampPublicStart {
    // eslint-disable-next-line no-console
    console.log('BootcampPlugin.start()');

    const dashboardService = new BootcampDashboardService(coreStart.http);

    return {
      // eslint-disable-next-line no-console
      logStart: () => console.log('BootcampPlugin.logStart()'),
      dashboardService,
    };
  }
}
