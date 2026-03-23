import { Router } from 'express'
import { createRoom, getRoom, getPlayerCount } from '../controllers/room.controller.js'
import { protectRoute } from "../middleware/auth.middleware.js";

const router = Router()

router.post('/',protectRoute, createRoom)
router.get('/:roomCode', getRoom)
router.get('/:roomCode/player-count', getPlayerCount)

export default router
