import { Notification } from '../models/Notification.js'

export async function notify(userId, { type, title, message, metadata = {} }) {
  if (!userId) return null
  return Notification.create({ userId, type, title, message, metadata, isRead: false })
}

export async function listNotifications(userId) {
  return Notification.find({ userId }).sort({ createdAt: -1 }).lean()
}

export async function markRead(userId, id) {
  return Notification.findOneAndUpdate({ _id: id, userId }, { isRead: true }, { new: true })
}

export async function markAllRead(userId) {
  await Notification.updateMany({ userId, isRead: false }, { isRead: true })
  return listNotifications(userId)
}
