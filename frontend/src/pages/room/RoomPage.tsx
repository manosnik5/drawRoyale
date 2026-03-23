import { useParams, useNavigate } from 'react-router-dom'
import { useGetRoom } from '../../hooks/useRoom'
import { useSocketContext } from '../../contexts/SocketContext'
import { useAuth } from '@clerk/clerk-react'
import { useEffect, useState } from 'react'
import LobbyPhase from './components/LobbyPhase'
import ThemeVotePhase from './components/ThemeVotePhase'
import DrawingPhase from './components/DrawingPhase'
import Navbar from '../home/components/Navbar'
import { Loader } from 'lucide-react'
import VotingPhase from './components/VotingPhase'
import ResultsPhase from './components/ResultsPhase'
import FriendsSection from '../home/components/FriendsSection'

export type Phase = 'lobby' | 'theme_vote' | 'drawing' | 'voting' | 'results'

export interface ConnectedPlayer {
    userId: string
    playerName: string
    avatarColor: string
    imageUrl?: string
}

const AVATAR_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899',
    '#10b981', '#f59e0b', '#06b6d4',
]

const RoomPage = () => {
    const { roomCode } = useParams<{ roomCode: string }>()
    const navigate = useNavigate()
    const { userId } = useAuth()
    const { isConnected, roomState, joinRoom, leaveRoom } = useSocketContext()
    const { data: room, isLoading, isError } = useGetRoom(roomCode!)
    const [sidebarOpen, setSidebarOpen] = useState(false)

    useEffect(() => {
        if (!isConnected || !roomCode || !room || !userId) return

        const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]
        joinRoom(roomCode, 'Player', avatarColor)

        return () => { leaveRoom(roomCode) }
    }, [isConnected, roomCode, room, userId])

    if (isLoading || !isConnected) return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <Loader className="w-6 h-6 text-indigo-400 animate-spin" />
                <p className="text-slate-400 text-sm">Connecting to room...</p>
            </div>
        </div>
    )

    if (isError || !room) return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 flex items-center justify-center">
            <div className="text-center">
                <p className="text-red-400 text-sm mb-3">Room not found</p>
                <button onClick={() => navigate('/')} className="text-xs text-indigo-400 hover:text-indigo-300">
                    ← Back to home
                </button>
            </div>
        </div>
    )

    const isHost = room.hostId === userId
    const { phase, connectedPlayers, selectedTheme, timeLeft, themeOptions, themeVotes } = roomState

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 text-slate-100">
            <div className="flex h-screen">

                {/* Main */}
                <div className="flex-1 flex flex-col min-w-0">
                    <Navbar onToggleOpenSidebar={() => setSidebarOpen(prev => !prev)} />

                    <main className="flex-1 overflow-y-auto">
                        <div className={`mx-auto px-4 py-10 ${
                            phase === 'drawing' || phase === 'voting'
                                ? 'max-w-4xl'
                                : 'max-w-3xl'
                        }`}>
                            {phase === 'lobby' && (
                                <LobbyPhase
                                    roomCode={roomCode!}
                                    room={room}
                                    connectedPlayers={connectedPlayers}
                                    isHost={isHost}
                                />
                            )}
                            {phase === 'theme_vote' && (
                                <ThemeVotePhase
                                    roomCode={roomCode!}
                                    isHost={isHost}
                                    connectedPlayers={connectedPlayers}
                                    themeOptions={themeOptions}
                                    themeVotes={themeVotes}
                                />
                            )}
                            {phase === 'drawing' && (
                                <DrawingPhase
                                    roomCode={roomCode!}
                                    theme={selectedTheme}
                                    userId={userId!}
                                    timeLeft={timeLeft}
                                    connectedPlayers={connectedPlayers}
                                />
                            )}
                            {phase === 'voting' && (
                                <VotingPhase
                                    roomCode={roomCode!}
                                    connectedPlayers={connectedPlayers}
                                    userId={userId!}
                                />
                            )}
                            {phase === 'results' && (
                                <ResultsPhase
                                    connectedPlayers={connectedPlayers}
                                />
                            )}
                        </div>
                    </main>
                </div>

               {phase === 'lobby' && (
                <>
                    <aside className={`
                        fixed inset-y-0 right-0 z-40 w-72 border-l border-white/10 bg-slate-900/95 backdrop-blur
                        transform transition-transform duration-300 ease-in-out
                        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
                        md:relative md:translate-x-0 md:flex md:flex-col
                    `}>
                        <FriendsSection />
                    </aside>

                    {sidebarOpen && (
                        <div
                            className="fixed inset-0 z-30 bg-black/50 md:hidden"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}
                </>
            )}
            </div>
        </div>
    )
}

export default RoomPage