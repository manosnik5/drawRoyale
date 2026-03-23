import { prisma } from '../lib/prisma.js'

export const authCallback = async (req, res, next) => {
    console.log('=== authCallback hit ===')
    console.log('body:', req.body)
    try {
        const { id, firstName, lastName, imageUrl } = req.body

        if (!id) {
            return res.status(400).json({ error: 'id is required' })
        }

        const fullName = `${firstName || ''} ${lastName || ''}`.trim() || 'Anonymous'

        const player = await prisma.player.upsert({
            where: { id },
            update: {
                fullName,
                imageUrl: imageUrl || '',
            },
            create: {
                id,
                fullName,
                imageUrl: imageUrl || '',
                clerkId: id,
            },
        })

        console.log('player upserted:', player)
        return res.status(200).json({ player })
    } catch (error) {
        console.error('Error in authCallback:', error.message)
        next(error)
    }
}