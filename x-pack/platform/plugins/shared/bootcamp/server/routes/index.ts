/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter } from '@kbn/core/server';
import { registerFindDashboardRoute } from './find_dashboards';
import { registerCreateDashboardRoute } from './create_dashboard';
import type { BootcampServerLibs } from '../types';

export const registerRoutes = (router: IRouter, libs: BootcampServerLibs) => {
  registerFindDashboardRoute(router, libs);
  registerCreateDashboardRoute(router, libs);
};
