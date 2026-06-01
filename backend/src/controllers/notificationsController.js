const pool = require('../config/db');

// GET /api/notifications
async function getNotifications(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT n.*, u.full_name AS sender_name FROM notifications n
       LEFT JOIN users u ON n.sender_employee_id = u.employee_id
       WHERE n.receiver_employee_id = ?
       ORDER BY n.created_at DESC LIMIT 100`,
      [req.user.employee_id]
    );
    const unread = rows.filter(r => !r.is_read).length;
    return res.json({ success: true, data: { notifications: rows, unread_count: unread } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// PUT /api/notifications/:id/read
async function markRead(req, res) {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = ? AND receiver_employee_id = ?',
      [req.params.id, req.user.employee_id]
    );
    return res.json({ success: true, message: 'Marked as read.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// PUT /api/notifications/read-all
async function markAllRead(req, res) {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE receiver_employee_id = ?',
      [req.user.employee_id]
    );
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { getNotifications, markRead, markAllRead };
