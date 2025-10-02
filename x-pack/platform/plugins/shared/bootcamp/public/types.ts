/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SharePluginSetup, SharePluginStart } from '@kbn/share-plugin/public';
import type { BootcampDashboardService } from './services/bootcamp_dashboard_service';

// Contract for things we want to expose to other plugins (during setup)
export interface BootcampPublicSetup {
  logSetup: () => void;
}

// Contract for things we want to expose to other plugins (during start)
export interface BootcampPublicStart {
  logStart: () => void;
  dashboardService: BootcampDashboardService;
}

export interface BootcampPublicPluginSetupDeps {
  // Add dependencies that the plugin setup needs
  share: SharePluginSetup;
}

export interface BootcampPublicPluginStartDeps {
  // Add dependencies that the plugin start needs
  share: SharePluginStart;
}
