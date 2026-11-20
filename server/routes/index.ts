import { Router } from 'express';
import { authRoutes } from './authRoutes.ts';
import { hqRoutes } from './hqRoutes.ts';
import { hrRoutes } from './hrRoutes.ts';
import { inventoryRoutes } from './inventoryRoutes.ts';
import { menuRoutes } from './menuRoutes.ts';
import { posRoutes } from './posRoutes.ts';
import { providerRoutes } from './providerRoutes.ts';
import { systemRoutes } from './systemRoutes.ts';

export const apiV1Router = Router();

apiV1Router.use(systemRoutes);
apiV1Router.use(authRoutes);
apiV1Router.use(providerRoutes);
apiV1Router.use(hqRoutes);
apiV1Router.use(posRoutes);
apiV1Router.use(menuRoutes);
apiV1Router.use(inventoryRoutes);
apiV1Router.use(hrRoutes);
