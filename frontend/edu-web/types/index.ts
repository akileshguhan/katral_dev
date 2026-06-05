export interface User {
  id: string
  email: string
  name: string
  role: 'teacher' | 'student'
}

export interface Classroom {
  id: string
  name: string
  joinCode: string
  teacherId: string
  createdAt: string
  channels?: Channel[]
}

export interface Channel {
  id: string
  name: string
  type: 'general' | 'announcement' | 'resource'
  createdAt: string
}

export interface Message {
  id: string
  content: string
  createdAt: string
  sender: { senderId: string; senderName: string }
}

export interface Session {
  id: string
  title: string
  status: 'waiting' | 'live' | 'ended'
  roomId: string | null
  scheduledAt: string | null
  durationMinutes: number | null
  createdAt: string
}

export interface Notification {
  id: string
  title: string
  body: string
  sessionId: string | null
  classroomId: string | null
  createdAt: string
}

export interface AttendeeInfo {
  userId: string
  name: string
}

export interface AttendanceRecord {
  id: string
  sessionId: string
  sessionTitle: string
  classroomId?: string
  takenAt: string
  presentCount: number
  presentStudents: AttendeeInfo[]
}

export interface SessionResponse {
  engine: string
  token: string
  url: string
}
