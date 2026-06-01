const pool = require('../config/db');

// ─── helper: send notification ────────────────────────────────────────────────
async function notify(senderEmpId, receiverEmpId, title, message, type = 'General') {
  await pool.query(
    `INSERT INTO notifications (sender_employee_id, receiver_employee_id, title, message, notification_type)
     VALUES (?, ?, ?, ?, ?)`,
    [senderEmpId, receiverEmpId, title, message, type]
  );
}

// ─── GET /api/admin/approvals/pending ────────────────────────────────────────
async function getPending(req, res) {
  try {
    const { role, employee_id: adminId, department } = req.user;

    let deptFilter = '';
    const params = [];

    if (role === 'HOD') {
      deptFilter = 'AND u.department = ?';
      params.push(department);
    }

    const [leaves] = await pool.query(
      `SELECT l.*, u.full_name, u.department FROM leave_requests l
       JOIN users u ON l.employee_id = u.employee_id
       WHERE l.status = 'Pending' ${deptFilter} ORDER BY l.created_at DESC`,
      params
    );

    const [ods] = await pool.query(
      `SELECT o.*, u.full_name, u.department FROM on_duty_requests o
       JOIN users u ON o.employee_id = u.employee_id
       WHERE o.status = 'Pending' ${deptFilter} ORDER BY o.created_at DESC`,
      params
    );

    const [extras] = await pool.query(
      `SELECT e.*, u.full_name, u.department FROM extra_hours e
       JOIN users u ON e.employee_id = u.employee_id
       WHERE e.status = 'Pending' ${deptFilter} ORDER BY e.created_at DESC`,
      params
    );

    const [changes] = await pool.query(
      `SELECT r.*, u.full_name, u.department FROM request_detail_changes r
       JOIN users u ON r.employee_id = u.employee_id
       WHERE r.status = 'Pending' ${deptFilter} ORDER BY r.created_at DESC`,
      params
    );

    const [diarySubmitted] = await pool.query(
      `SELECT d.*, u.full_name, u.department FROM diary_logs d
       JOIN users u ON d.employee_id = u.employee_id
       WHERE d.status = 'Submitted' ${deptFilter} ORDER BY d.log_date DESC, d.from_time ASC`,
      params
    );

    return res.json({
      success: true,
      data: { leaves, ods, extras, changes, diary: diarySubmitted },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── PUT /api/admin/approvals/leave/:id ──────────────────────────────────────
async function approveLeave(req, res) {
  const { status, remarks } = req.body;
  const { employee_id: adminId } = req.user;

  if (!['Approved','Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'status must be Approved or Rejected.' });
  }

  try {
    const [result] = await pool.query(
      `UPDATE leave_requests SET status=?, approved_by=?, reviewed_at=NOW(), reason=COALESCE(?,reason) WHERE id=?`,
      [status, adminId, remarks||null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Request not found.' });

    const [lr] = await pool.query('SELECT * FROM leave_requests WHERE id = ?', [req.params.id]);
    await notify(adminId, lr[0].employee_id,
      `Leave Request ${status}`,
      `Your leave request for ${lr[0].leave_date} has been ${status.toLowerCase()}.${remarks ? ' Remarks: ' + remarks : ''}`,
      'Leave'
    );

    return res.json({ success: true, message: `Leave request ${status.toLowerCase()}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── PUT /api/admin/approvals/od/:id ─────────────────────────────────────────
async function approveOD(req, res) {
  const { status, remarks } = req.body;
  const { employee_id: adminId } = req.user;

  if (!['Approved','Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'status must be Approved or Rejected.' });
  }

  try {
    const [result] = await pool.query(
      `UPDATE on_duty_requests SET status=?, approved_by=?, reviewed_at=NOW() WHERE id=?`,
      [status, adminId, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Request not found.' });

    const [od] = await pool.query('SELECT * FROM on_duty_requests WHERE id = ?', [req.params.id]);
    await notify(adminId, od[0].employee_id,
      `OD Request ${status}`,
      `Your OD request for ${od[0].od_date} has been ${status.toLowerCase()}.${remarks ? ' Remarks: ' + remarks : ''}`,
      'OD'
    );

    return res.json({ success: true, message: `OD request ${status.toLowerCase()}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── PUT /api/admin/approvals/extra/:id ──────────────────────────────────────
async function approveExtra(req, res) {
  const { status, remarks } = req.body;
  const { employee_id: adminId } = req.user;

  if (!['Approved','Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'status must be Approved or Rejected.' });
  }

  try {
    await pool.query(
      `UPDATE extra_hours SET status=?, approved_by=? WHERE id=?`,
      [status, adminId, req.params.id]
    );

    const [ex] = await pool.query('SELECT * FROM extra_hours WHERE id = ?', [req.params.id]);
    await notify(adminId, ex[0].employee_id,
      `Extra Hours ${status}`,
      `Your extra hours request has been ${status.toLowerCase()}.${remarks ? ' Remarks: ' + remarks : ''}`,
      'Approval'
    );

    return res.json({ success: true, message: `Extra hours ${status.toLowerCase()}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── PUT /api/admin/approvals/change-request/:id ─────────────────────────────
async function approveChangeRequest(req, res) {
  const { status, remarks } = req.body;
  const { employee_id: adminId } = req.user;

  if (!['Approved','Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'status must be Approved or Rejected.' });
  }

  try {
    const editHours = 24;
    let windowSql = '';
    if (status === 'Approved') {
      const [cfg] = await pool.query(
        `SELECT config_value FROM system_configs WHERE config_key = 'past_edit_window_hours'`
      );
      const h = cfg.length ? parseInt(cfg[0].config_value) : 24;
      windowSql = `, edit_window_expires_at = DATE_ADD(NOW(), INTERVAL ${h} HOUR)`;
    }

    await pool.query(
      `UPDATE request_detail_changes SET status=?, reviewed_by=?, reviewed_at=NOW(), remarks=?${windowSql} WHERE id=?`,
      [status, adminId, remarks||null, req.params.id]
    );

    const [cr] = await pool.query('SELECT * FROM request_detail_changes WHERE id = ?', [req.params.id]);
    await notify(adminId, cr[0].employee_id,
      `Edit Request ${status}`,
      `Your diary edit request has been ${status.toLowerCase()}.${remarks ? ' Remarks: ' + remarks : ''}${status === 'Approved' ? ' You now have a limited window to edit.' : ''}`,
      'Approval'
    );

    return res.json({ success: true, message: `Change request ${status.toLowerCase()}.` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ─── PUT /api/admin/approvals/diary/:id ──────────────────────────────────────
async function approveDiary(req, res) {
  const { status, remarks } = req.body;
  const { employee_id: adminId } = req.user;

  if (!['Approved','Rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'status must be Approved or Rejected.' });
  }

  try {
    const [result] = await pool.query(
      `UPDATE diary_logs SET status=?, reviewed_by=?, reviewed_at=NOW(), remarks=? WHERE id=? AND status='Submitted'`,
      [status, adminId, remarks||null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Diary entry not found or not in Submitted status.' });

    const [dl] = await pool.query('SELECT * FROM diary_logs WHERE id = ?', [req.params.id]);
    await notify(adminId, dl[0].employee_id,
      `Diary Entry ${status}`,
      `Your diary entry on ${dl[0].log_date} has been ${status.toLowerCase()}.${remarks ? ' Remarks: ' + remarks : ''}`,
      'Approval'
    );

    return res.json({ success: true, message: `Diary entry ${status.toLowerCase()}.` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { getPending, approveLeave, approveOD, approveExtra, approveChangeRequest, approveDiary };
