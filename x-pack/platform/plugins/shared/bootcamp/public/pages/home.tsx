/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiCallOut,
  EuiLink,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { BootcampDashboardItem } from '@kbn/bootcamp-plugin/common/types';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useDashboards } from '../hooks/use_dashboards';
import { useKibana } from '../hooks/use_kibana';
import type { BootcampLocatorParams } from '../../common/locator';
import { BOOTCAMP_LOCATOR } from '../../common/locator';

export function HomePage() {
  const { plugins } = useKibana();
  const { dashboards, loading, error } = useDashboards();

  // eslint-disable-next-line no-console
  console.log('HomePage() ->', { plugins, dashboards, loading, error });

  const dashboardLocator = plugins.share.url.locators.get<BootcampLocatorParams>(BOOTCAMP_LOCATOR);
  const navigateToDashboard = (dashboardId: string) => dashboardLocator?.navigate({ dashboardId });

  const columns: EuiBasicTableColumn<BootcampDashboardItem>[] = [
    {
      field: 'title',
      name: i18n.translate('xpack.bootcamp.homepage.title', { defaultMessage: 'Title' }),
      render: (_, dashboard) => (
        <EuiLink onClick={() => navigateToDashboard(dashboard.title)}>{dashboard.title}</EuiLink>
      ),
    },
    {
      field: 'description',
      name: i18n.translate('xpack.bootcamp.homepage.description', {
        defaultMessage: 'Description',
      }),
    },
  ];

  // const items: BootcampDashboardItem[] = [
  //   {
  //     title: 'Dashboard 1',
  //     description: 'Description 1',
  //   },
  //   {
  //     title: 'Dashboard 2',
  //     description: 'Description 2',
  //   },
  // ];

  return (
    <EuiPageTemplate.Section>
      <EuiText>Welcome to the Bootcamp Dashboards list.</EuiText>
      <EuiSpacer />
      {(error && (
        <EuiCallOut announceOnMount title="Oops, an error." color="danger" iconType="error">
          <p>{error?.message}</p>
        </EuiCallOut>
      )) ||
        (loading || !dashboards ? (
          <EuiLoadingSpinner />
        ) : (
          <EuiBasicTable columns={columns} items={dashboards ?? []} responsiveBreakpoint={false} />
        ))}
    </EuiPageTemplate.Section>
  );
}

// eslint-disable-next-line import/no-default-export
export default HomePage;
