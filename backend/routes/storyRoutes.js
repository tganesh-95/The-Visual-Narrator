const express = require('express');
const router = express.Router();
const { generateStory, getMyStories, getStoryById, deleteStory } = require('../controllers/storyController');
const { protect } = require('../middleware/authMiddleware');

router.post('/generate', protect, generateStory);
router.get('/my-stories', protect, getMyStories);
router.get('/:id', protect, getStoryById);
router.delete('/:id', protect, deleteStory);

module.exports = router;
