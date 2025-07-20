import express from 'express';

const router = express.Router();

// @route   GET /api/dashboard
// @desc    Get dashboard statistics
// @access  Private
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Dashboard route - coming soon',
  });
});

export default router; 