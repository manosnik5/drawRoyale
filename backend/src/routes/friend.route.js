import { Router } from 'express'
import {
    getFriends,
    searchPlayers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    getPendingRequests,
    removeFriend,
    sendRoomInvite,
} from '../controllers/friend.controller.js'
import { protectRoute } from '../middleware/auth.middleware.js'

const router = Router()

router.get('/search', protectRoute, searchPlayers)           
router.get('/requests/pending', protectRoute, getPendingRequests)
router.get('/', protectRoute, getFriends)
router.post('/request', protectRoute, sendFriendRequest)
router.post('/request/:requestId/accept', protectRoute, acceptFriendRequest)
router.post('/request/:requestId/reject', protectRoute, rejectFriendRequest)
router.post('/invite', protectRoute, sendRoomInvite)
router.delete('/:friendId', protectRoute, removeFriend)

export default router