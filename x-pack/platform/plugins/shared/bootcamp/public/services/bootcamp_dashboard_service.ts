/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core/public';
import type { BootcampDashboardItem } from '../../common/types';

export interface GetDashboardsResponse {
  dashboards: BootcampDashboardItem[];
}

export class BootcampDashboardService {
  constructor(private readonly http: HttpSetup) {}

  async getDashboards(): Promise<BootcampDashboardItem[]> {
    // eslint-disable-next-line no-console
    console.log('BootcampDashboardService.getDashboards()');
    const response = await this.http.get<GetDashboardsResponse>('/internal/bootcamp/dashboards');
    // eslint-disable-next-line no-console
    console.log('BootcampDashboardService.getDashboards() -> response', response);
    return response.dashboards;
  }
}
