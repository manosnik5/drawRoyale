export type Phase = 'lobby' | 'drawing' | 'gallery' | 'ranking' | 'results'

export interface Room {
  id: string
  code: string
  hostId: string
  phase: Phase
  theme: string
  drawTimeSeconds: number
  createdAt: string
}

export interface Player {
  id: string
  roomId: string
  fullName: string
  imageUrl: string
  clerkId: string
  friends: string[]
  isHost: boolean
  joinedAt: string
}

export interface Drawing {
  id: string
  roomId: string
  playerId: string
  playerName: string
  strokes: unknown
  submittedAt: string
}

export interface Ranking {
  id: string
  roomId: string
  voterId: string
  drawingId: string
  rank: number
}

export interface CreateRoomDto {
  code: string
  hostId: string
  theme: string
}

export interface CreateRoomResponse {
  room: Room
}

export interface GetRoomResponse {
  room: Room
}

export interface GetPlayerCountResponse {
  roomId: string
  totalPlayers: number
}

export interface FriendRequest {
    id: string
    senderId: string
    receiverId: string
    status: 'pending' | 'accepted' | 'rejected'
    createdAt: string
    sender: Pick<Player, 'id' | 'fullName' | 'imageUrl'>
}

