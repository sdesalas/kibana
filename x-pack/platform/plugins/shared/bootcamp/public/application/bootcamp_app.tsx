/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLoadingSpinner, EuiPageTemplate } from '@elastic/eui';
import { Route, Routes } from '@kbn/shared-ux-router';
import { dynamic } from '@kbn/shared-ux-utility';
import { useKibana } from '../hooks/use_kibana';

const HomePage = dynamic(() => import('../pages/home'), { fallback: <EuiLoadingSpinner /> });
const DashboardPage = dynamic(() => import('../pages/dashboard'), {
  fallback: <EuiLoadingSpinner />,
});

export const BootcampApp = () => {
  const { core, plugins, params } = useKibana();
  // eslint-disable-next-line no-console
  console.log('BootcampApp()', { core, plugins, params });

  // if (plugins.share) {
  //   plugins.share.url.locators.get('BOOTCAMP_APP_LOCATOR');
  // }

  return (
    <EuiPageTemplate bottomBorder={true}>
      <EuiPageTemplate.Header pageTitle="Bootcamp App" description="This is the Bootcamp App." />
      <Routes>
        <Route path="/" exact component={HomePage} />
        <Route path="/dashboard/:dashboardId" component={DashboardPage} />
      </Routes>
    </EuiPageTemplate>
  );
};
