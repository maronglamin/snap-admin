import express from 'express';
import providerApplicationsRoutes from './provider-applications';
import providersRoutes from './providers';
import bookingsRoutes from './bookings';
import categoriesRoutes from './categories';

const router = express.Router();

router.use('/provider-applications', providerApplicationsRoutes);
router.use('/providers', providersRoutes);
router.use('/bookings', bookingsRoutes);
router.use('/categories', categoriesRoutes);

export default router;
