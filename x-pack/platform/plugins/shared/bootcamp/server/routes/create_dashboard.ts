/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { BootcampDashboardSavedObjectAttributes } from '../saved_objects/dashboard_saved_object_type';
import { BOOTCAMP_DASHBOARD_SAVED_OBJECT_TYPE } from '../saved_objects/dashboard_saved_object_type';
import type { BootcampServerLibs } from '../types';

export const registerCreateDashboardRoute = (libs: BootcampServerLibs) => {
  libs.router.post(
    {
      path: '/internal/bootcamp/dashboards',
      validate: {
        body: schema.object({
          title: schema.string({ maxLength: 50 }),
          description: schema.string({ maxLength: 1000 }),
        }),
      },
      security: {
        authz: {
          requiredPrivileges: ['create_dashboards'],
        },
      },
    },
    async (context, request, response) => {
      const { title, description } = request.body;

      let dashboard;
      try {
        const { savedObjects } = await context.core;

        dashboard = await savedObjects.client.create(BOOTCAMP_DASHBOARD_SAVED_OBJECT_TYPE, {
          title,
          description,
        });
      } catch (error) {
        libs.logger.error(`Error creating dashboard: ${error}`);
        if (error instanceof Error && error.name === 'MissingPrivilegesError') {
          return response.customError({
            body: 'Missing privileges',
            statusCode: 500,
          });
        }
        return response.customError({
          body: error,
          statusCode: 500,
        });
      }
      const parsedDashboard = parseDashboard(dashboard.attributes);
      return response.created({
        body: { dashboard, parsedDashboard },
      });
    }
  );
};

const parseDashboard = (dashboard: BootcampDashboardSavedObjectAttributes) => {
  return {
    title: dashboard.title,
    description: dashboard.description,
  };
};
