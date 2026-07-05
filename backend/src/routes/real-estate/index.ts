import express from 'express';
import agentApplicationsRoutes from './agent-applications';
import agentsRoutes from './agents';
import listingsRoutes from './listings';
import bookingsRoutes from './bookings';

const router = express.Router();

router.use('/agent-applications', agentApplicationsRoutes);
router.use('/agents', agentsRoutes);
router.use('/listings', listingsRoutes);
router.use('/bookings', bookingsRoutes);

export default router;
