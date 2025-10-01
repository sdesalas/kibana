/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { BOOTCAMP_DASHBOARD_SAVED_OBJECT_TYPE } from './saved_objects/dashboard_saved_object_type';

export function registerBootcampKibanaFeature(features?: FeaturesPluginSetup) {
  if (features) {
    features.registerKibanaFeature({
      id: 'bootcamp1',
      name: 'Bootcamp',
      description: 'Bootcamp feature description',
      category: DEFAULT_APP_CATEGORIES.management,
      app: ['bootcamp1'],
      privileges: {
        all: {
          app: ['bootcamp1'],
          api: ['create_dashboards', 'read_dashboards'],
          ui: ['create', 'read'],
          savedObject: {
            all: [BOOTCAMP_DASHBOARD_SAVED_OBJECT_TYPE],
            read: [],
          },
        },
        read: {
          app: ['bootcamp1'],
          api: ['read_dashboards'],
          savedObject: {
            all: [],
            read: [BOOTCAMP_DASHBOARD_SAVED_OBJECT_TYPE],
          },
          ui: ['read'],
        },
      },
    });
  }
}
