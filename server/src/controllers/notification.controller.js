import { listMyNotifications, markNotificationRead } from '../services/notification.service.js';

export async function getMyNotifications(req, res) {
  try {
    const rows = await listMyNotifications(req.user.id, req.query.limit);
    res.json(rows);
  } catch (error) {
    console.error('getMyNotifications:', error.message);
    res.status(500).json({ error: 'Could not load notifications' });
  }
}

export async function readMyNotification(req, res) {
  try {
    const updated = await markNotificationRead(req.user.id, Number(req.params.id));
    if (!updated) return res.status(404).json({ error: 'Notification not found' });
    res.json({ ok: true });
  } catch (error) {
    console.error('readMyNotification:', error.message);
    res.status(500).json({ error: 'Could not update notification' });
  }
}
