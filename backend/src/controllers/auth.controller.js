import { prisma } from '../lib/prisma.js'

export const authCallback = async (req, res, next) => {
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

        return res.status(200).json({ player })
    } catch (error) {
        console.error('Error in authCallback:', error.message)
        next(error)
    }
}