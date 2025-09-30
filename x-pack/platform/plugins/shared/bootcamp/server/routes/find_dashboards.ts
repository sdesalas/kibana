/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, SavedObjectsFindResponse } from '@kbn/core/server';
import type { BootcampDashboardSavedObjectAttributes } from '../saved_objects/dashboard_saved_object_type';
import { BOOTCAMP_DASHBOARD_SAVED_OBJECT_TYPE } from '../saved_objects/dashboard_saved_object_type';
import type { BootcampServerLibs } from '../types';

export const registerFindDashboardRoute = (router: IRouter, libs: BootcampServerLibs) => {
  router.get(
    {
      path: '/internal/bootcamp/dashboards',
      validate: {
        query: schema.object({
          search: schema.maybe(schema.string({ maxLength: 100 })),
        }),
      },
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
    },
    async (context, request, response) => {
      const { search } = request.query;

      let savedObjectsResponse;

      try {
        const { savedObjects } = await context.core;

        savedObjectsResponse =
          await savedObjects.client.find<BootcampDashboardSavedObjectAttributes>({
            type: BOOTCAMP_DASHBOARD_SAVED_OBJECT_TYPE,
            search: search ? `*${search}*` : undefined,
            searchFields: ['description'],
          });

        // dashboards = dashboards.saved_objects.find((dashboard) => {
        //   return dashboard.attributes.title.includes(search);
        // });
      } catch (error) {
        libs.logger.error(`Error finding dashboards: ${error}`);
        return response.customError({
          body: error,
          statusCode: 500,
        });
      }

      const dashboards = parseDashboardList(savedObjectsResponse);
      return response.ok({
        body: {
          search,
          dashboards,
          savedObjectsResponse,
        },
      });
    }
  );
};

const parseDashboardList = (
  savedObjectsResponse: SavedObjectsFindResponse<BootcampDashboardSavedObjectAttributes>
) => {
  return savedObjectsResponse.saved_objects.map((dashboard) => ({
    title: dashboard.attributes.title,
    description: dashboard.attributes.description,
  }));
};
