const crypto = require('crypto');
const pool = require('../config/db');

const MESSAGE_AUDIENCES = new Set(['ALL_STAFF', 'HODS_ONLY', 'INDIVIDUAL', 'DEPARTMENT_GROUP']);
const STAFF_ROLES = ['Admin', 'HOD', 'Faculty'];

function normalizeEmployeeIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(id => String(id || '').trim().toUpperCase()).filter(Boolean))];
}

function validDate(value) {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

function validateDateRange(fromDate, toDate) {
  if (!validDate(fromDate) || !validDate(toDate)) return 'Dates must use YYYY-MM-DD format.';
  if (fromDate && toDate && fromDate > toDate) return 'From date cannot be later than to date.';
  return null;
}

function makeHash(conversationId, senderEmployeeId, body, sentAt) {
  return crypto
    .createHash('sha256')
    .update(`${conversationId}|${senderEmployeeId}|${body}|${sentAt.toISOString()}`)
    .digest('hex');
}

function buildConversationSubject(subject, audienceType, department) {
  const cleanSubject = String(subject || '').trim();
  if (audienceType !== 'DEPARTMENT_GROUP' || !department) return cleanSubject.slice(0, 255);
  const prefix = `${String(department).trim()} · `;
  return `${prefix}${cleanSubject}`.slice(0, 255);
}

function decorateConversation(conversation) {
  if (!conversation || conversation.audience_type !== 'DEPARTMENT_GROUP' || !conversation.department) return conversation;
  const prefix = `${String(conversation.department).trim()} · `;
  if (String(conversation.subject || '').startsWith(prefix)) return conversation;
  return { ...conversation, subject: `${prefix}${conversation.subject || ''}`.slice(0, 255) };
}

async function getConversationAccess(conversationId, user) {
  const [rows] = await pool.query(
    `SELECT c.*, creator.full_name AS creator_name, creator.department AS creator_department
     FROM message_conversations c
     JOIN users creator ON creator.employee_id = c.created_by
     WHERE c.id = ?`,
    [conversationId]
  );

  if (rows.length === 0) return { conversation: null, allowed: false };
  const conversation = rows[0];
  if (user.role === 'Admin') return { conversation, allowed: true };

  const [members] = await pool.query(
    `SELECT employee_id FROM message_participants WHERE conversation_id = ? AND employee_id = ?`,
    [conversationId, user.employee_id]
  );
  return { conversation, allowed: members.length > 0 };
}

async function fetchParticipants(conversationIds) {
  if (!conversationIds.length) return [];
  const [rows] = await pool.query(
    `SELECT mp.conversation_id, mp.employee_id, mp.participant_role, mp.is_required,
            u.full_name, u.short_name, u.department, u.role
     FROM message_participants mp
     JOIN users u ON u.employee_id = mp.employee_id
     WHERE mp.conversation_id IN (?)
     ORDER BY u.full_name ASC`,
    [conversationIds]
  );
  return rows;
}

async function notifyRecipients(conn, recipientIds, sender, subject) {
  const uniqueRecipients = normalizeEmployeeIds(recipientIds).filter(id => id !== sender.employee_id);
  if (!uniqueRecipients.length) return;

  const values = uniqueRecipients.map(employeeId => [
    sender.employee_id,
    employeeId,
    `New message: ${subject}`.slice(0, 255),
    `${sender.full_name} sent a message in “${subject}”.`,
    false,
    'General',
  ]);
  await conn.query(
    `INSERT INTO notifications
      (sender_employee_id, receiver_employee_id, title, message, is_read, notification_type)
     VALUES ?`,
    [values]
  );
}

async function insertMessage(conn, conversationId, sender, body) {
  const sentAt = new Date();
  const immutableHash = makeHash(conversationId, sender.employee_id, body, sentAt);
  const [result] = await conn.query(
    `INSERT INTO message_records
      (conversation_id, sender_employee_id, body, sent_at, immutable_hash)
     VALUES (?, ?, ?, ?, ?)`,
    [conversationId, sender.employee_id, body, sentAt, immutableHash]
  );
  return { id: result.insertId, sentAt };
}

// GET /api/messaging/conversations
async function listConversations(req, res) {
  const { role, employee_id } = req.user;
  const {
    q,
    from_date: fromDate,
    to_date: toDate,
    sender_employee_id: senderEmployeeId,
    receiver_employee_id: receiverEmployeeId,
  } = req.query;
  console.log('[messaging-filter-debug]', req.originalUrl, req.query, { senderEmployeeId, receiverEmployeeId });
  const dateError = validateDateRange(fromDate, toDate);
  if (dateError) return res.status(400).json({ success: false, message: dateError });

  try {
    let sql = `
      SELECT c.id, c.subject, c.audience_type, c.department, c.created_by,
             c.created_at, creator.full_name AS creator_name,
             COUNT(DISTINCT mr.id) AS message_count,
             MAX(mr.sent_at) AS last_sent_at
      FROM message_conversations c
      JOIN users creator ON creator.employee_id = c.created_by
      LEFT JOIN message_records mr ON mr.conversation_id = c.id
      WHERE 1=1`;
    const params = [];

    if (role !== 'Admin') {
      sql += ` AND EXISTS (
        SELECT 1 FROM message_participants visible_mp
        WHERE visible_mp.conversation_id = c.id AND visible_mp.employee_id = ?
      )`;
      params.push(employee_id);
    }

    if (q && String(q).trim()) {
      sql += ' AND (c.subject LIKE ? OR c.department LIKE ? OR creator.full_name LIKE ?)';
      const term = `%${String(q).trim()}%`;
      params.push(term, term, term);
    }

    if (senderEmployeeId) {
      sql += ` AND EXISTS (
        SELECT 1 FROM message_records sender_filter_mr
        WHERE sender_filter_mr.conversation_id = c.id AND sender_filter_mr.sender_employee_id = ?
      )`;
      params.push(String(senderEmployeeId).trim().toUpperCase());
    }

    if (receiverEmployeeId) {
      // A conversation can be started by the Admin and later receive a reply
      // from the selected person, or the reverse. Treat every participant as
      // a possible receiver so the same individual thread is found in either
      // direction instead of relying on the original participant role.
      sql += ` AND EXISTS (
        SELECT 1 FROM message_participants receiver_filter_mp
        WHERE receiver_filter_mp.conversation_id = c.id
          AND receiver_filter_mp.employee_id = ?
      )`;
      params.push(String(receiverEmployeeId).trim().toUpperCase());
    }

    if (senderEmployeeId && receiverEmployeeId) {
      // When both people are selected, Admin is asking for an individual
      // report. Do not mix in broadcasts or department groups that happen to
      // contain both users.
      sql += " AND c.audience_type = 'INDIVIDUAL'";
    }

    if (fromDate) {
      sql += ` AND EXISTS (
        SELECT 1 FROM message_records range_from_mr
        WHERE range_from_mr.conversation_id = c.id AND range_from_mr.sent_at >= ?
      )`;
      params.push(`${fromDate} 00:00:00`);
    }
    if (toDate) {
      sql += ` AND EXISTS (
        SELECT 1 FROM message_records range_to_mr
        WHERE range_to_mr.conversation_id = c.id AND range_to_mr.sent_at < DATE_ADD(?, INTERVAL 1 DAY)
      )`;
      params.push(`${toDate} 00:00:00`);
    }

    sql += ` GROUP BY c.id, c.subject, c.audience_type, c.department, c.created_by,
                      c.created_at, creator.full_name
              ORDER BY COALESCE(MAX(mr.sent_at), c.created_at) DESC, c.id DESC`;

    const [rows] = await pool.query(sql, params);
    const participants = await fetchParticipants(rows.map(row => row.id));
    const participantMap = new Map();
    participants.forEach(participant => {
      const existing = participantMap.get(participant.conversation_id) || [];
      existing.push(participant);
      participantMap.set(participant.conversation_id, existing);
    });

    return res.json({
      success: true,
      data: rows.map(row => decorateConversation({ ...row, participants: participantMap.get(row.id) || [] })),
    });
  } catch (err) {
    console.error('List messaging conversations error:', err);
    return res.status(500).json({ success: false, message: 'Server error loading conversations.' });
  }
}

// GET /api/messaging/participants
async function listMessageParticipants(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT employee_id, full_name, short_name, department, designation, role
       FROM users WHERE role IN (?) ORDER BY full_name ASC`,
      [STAFF_ROLES]
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    console.error('List messaging participants error:', err);
    return res.status(500).json({ success: false, message: 'Server error loading staff directory.' });
  }
}

async function resolveRecipients(conn, req, audienceType, requestedIds) {
  const { role, department, employee_id } = req.user;
  let recipients = [];

  if (audienceType === 'ALL_STAFF') {
    if (role !== 'Admin') throw Object.assign(new Error('Only Admin can message all staff.'), { status: 403 });
    const [rows] = await conn.query(
      `SELECT employee_id FROM users WHERE role IN (?) AND employee_id <> ?`,
      [STAFF_ROLES, employee_id]
    );
    recipients = rows.map(row => row.employee_id);
  } else if (audienceType === 'HODS_ONLY') {
    if (role !== 'Admin') throw Object.assign(new Error('Only Admin can message HODs only.'), { status: 403 });
    const [rows] = await conn.query(
      `SELECT employee_id FROM users WHERE role = 'HOD' AND employee_id <> ?`,
      [employee_id]
    );
    recipients = rows.map(row => row.employee_id);
  } else if (audienceType === 'INDIVIDUAL') {
    if (role !== 'Admin') throw Object.assign(new Error('Only Admin can start an individual staff conversation.'), { status: 403 });
    recipients = requestedIds;
  } else if (audienceType === 'DEPARTMENT_GROUP') {
    if (role !== 'HOD') throw Object.assign(new Error('Only a HOD can create a department group.'), { status: 403 });
    const ids = requestedIds.length ? requestedIds : null;
    let groupSql = `SELECT employee_id FROM users WHERE role IN (?) AND employee_id <> ?`;
    const groupParams = [STAFF_ROLES, employee_id];
    if (ids) {
      // A HOD may explicitly add any existing user, including users from
      // another department. With no explicit selection, use the HOD's own
      // department roster as the sensible default group.
      groupSql += ' AND employee_id IN (?)';
      groupParams.push(ids);
    } else {
      groupSql += ' AND department = ?';
      groupParams.push(department);
    }
    const [rows] = await conn.query(groupSql, groupParams);
    recipients = rows.map(row => row.employee_id);
  }

  recipients = normalizeEmployeeIds(recipients).filter(id => id !== employee_id);
  if (!recipients.length) {
    throw Object.assign(new Error('At least one recipient is required.'), { status: 400 });
  }

  const [validUsers] = await conn.query(
    `SELECT employee_id, department, role FROM users WHERE employee_id IN (?)`,
    [recipients]
  );
  if (validUsers.length !== recipients.length) {
    throw Object.assign(new Error('One or more selected recipients could not be found.'), { status: 400 });
  }
  if (audienceType === 'INDIVIDUAL' && requestedIds.length !== 1) {
    throw Object.assign(new Error('Select exactly one staff member for an individual conversation.'), { status: 400 });
  }

  return recipients;
}

// POST /api/messaging/conversations
async function createConversation(req, res) {
  const { role, employee_id, full_name, department } = req.user;
  const { subject, body, audience_type: audienceType, recipient_employee_ids: requested } = req.body;
  const requestedIds = normalizeEmployeeIds(requested);

  if (!subject || !String(subject).trim()) {
    return res.status(400).json({ success: false, message: 'Subject is required.' });
  }
  if (!body || !String(body).trim()) {
    return res.status(400).json({ success: false, message: 'Message body is required.' });
  }
  if (!MESSAGE_AUDIENCES.has(audienceType)) {
    return res.status(400).json({ success: false, message: 'Invalid conversation audience.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const recipients = await resolveRecipients(conn, req, audienceType, requestedIds);
    const conversationDepartment = audienceType === 'DEPARTMENT_GROUP' ? department : null;

    if (audienceType === 'DEPARTMENT_GROUP') {
      const [ownedGroups] = await conn.query(
        `SELECT id FROM message_conversations
         WHERE created_by = ? AND audience_type = 'DEPARTMENT_GROUP'
         LIMIT 1 FOR UPDATE`,
        [employee_id]
      );
      if (ownedGroups.length) {
        throw Object.assign(new Error('You already have a department group. Open that group and append messages instead of creating another one.'), { status: 409 });
      }
    }

    if (audienceType === 'INDIVIDUAL') {
      const [existingThreads] = await conn.query(
        `SELECT c.id
         FROM message_conversations c
         JOIN message_participants recipient_mp
           ON recipient_mp.conversation_id = c.id
          AND recipient_mp.participant_role = 'recipient'
         WHERE c.audience_type = 'INDIVIDUAL'
           AND (
             (c.created_by = ? AND recipient_mp.employee_id = ?)
             OR
             (c.created_by = ? AND recipient_mp.employee_id = ?)
           )
         LIMIT 1 FOR UPDATE`,
        [employee_id, recipients[0], recipients[0], employee_id]
      );
      if (existingThreads.length) {
        throw Object.assign(new Error('An individual chat with this staff member already exists. Open the existing chat and append your message there.'), { status: 409 });
      }
    }

    const storedSubject = buildConversationSubject(subject, audienceType, conversationDepartment);
    const [conversationResult] = await conn.query(
      `INSERT INTO message_conversations (subject, audience_type, department, created_by)
       VALUES (?, ?, ?, ?)`,
      [storedSubject, audienceType, conversationDepartment, employee_id]
    );
    const conversationId = conversationResult.insertId;

    const participants = [
      [conversationId, employee_id, 'sender', true],
      ...recipients.map(id => [conversationId, id, 'recipient', false]),
    ];
    await conn.query(
      `INSERT INTO message_participants
        (conversation_id, employee_id, participant_role, is_required)
       VALUES ?`,
      [participants]
    );

    const cleanBody = String(body).trim();
    await insertMessage(conn, conversationId, { employee_id, full_name }, cleanBody);
    await notifyRecipients(conn, recipients, { employee_id, full_name }, String(subject).trim());
    await conn.commit();

    return res.status(201).json({
      success: true,
      data: { id: conversationId },
      message: 'Conversation created. Sent messages are permanently timestamped and cannot be edited or deleted.',
    });
  } catch (err) {
    await conn.rollback();
    console.error('Create messaging conversation error:', err);
    return res.status(err.status || 500).json({
      success: false,
      message: err.status ? err.message : 'Server error creating conversation.',
    });
  } finally {
    conn.release();
  }
}

// GET /api/messaging/conversations/:id/messages
async function getConversationMessages(req, res) {
  const conversationId = Number(req.params.id);
  const { from_date: fromDate, to_date: toDate } = req.query;
  const dateError = validateDateRange(fromDate, toDate);
  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid conversation id.' });
  }
  if (dateError) return res.status(400).json({ success: false, message: dateError });

  try {
    const access = await getConversationAccess(conversationId, req.user);
    if (!access.conversation) return res.status(404).json({ success: false, message: 'Conversation not found.' });
    if (!access.allowed) return res.status(403).json({ success: false, message: 'You are not a participant in this conversation.' });

    let sql = `
      SELECT mr.id, mr.conversation_id, mr.sender_employee_id, mr.body, mr.sent_at,
             mr.immutable_hash, u.full_name AS sender_name, u.short_name AS sender_short_name,
             u.role AS sender_role, u.department AS sender_department
      FROM message_records mr
      JOIN users u ON u.employee_id = mr.sender_employee_id
      WHERE mr.conversation_id = ?`;
    const params = [conversationId];
    if (fromDate) {
      sql += ' AND mr.sent_at >= ?';
      params.push(`${fromDate} 00:00:00`);
    }
    if (toDate) {
      sql += ' AND mr.sent_at < DATE_ADD(?, INTERVAL 1 DAY)';
      params.push(`${toDate} 00:00:00`);
    }
    sql += ' ORDER BY mr.sent_at ASC, mr.id ASC';

    const [messages] = await pool.query(sql, params);
    const [participants] = await pool.query(
      `SELECT mp.employee_id, mp.participant_role, mp.is_required,
              u.full_name, u.short_name, u.department, u.designation, u.role
       FROM message_participants mp
       JOIN users u ON u.employee_id = mp.employee_id
       WHERE mp.conversation_id = ?
       ORDER BY mp.participant_role DESC, u.full_name ASC`,
      [conversationId]
    );

    return res.json({ success: true, data: { conversation: decorateConversation(access.conversation), participants, messages } });
  } catch (err) {
    console.error('Get messaging conversation error:', err);
    return res.status(500).json({ success: false, message: 'Server error loading conversation history.' });
  }
}

// POST /api/messaging/conversations/:id/messages
async function appendMessage(req, res) {
  const conversationId = Number(req.params.id);
  const cleanBody = String(req.body.body || '').trim();
  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid conversation id.' });
  }
  if (!cleanBody) return res.status(400).json({ success: false, message: 'Message body is required.' });

  const access = await getConversationAccess(conversationId, req.user);
  if (!access.conversation) return res.status(404).json({ success: false, message: 'Conversation not found.' });
  if (!access.allowed) return res.status(403).json({ success: false, message: 'You are not a participant in this conversation.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await insertMessage(conn, conversationId, req.user, cleanBody);
    const [recipients] = await conn.query(
      `SELECT employee_id FROM message_participants
       WHERE conversation_id = ? AND employee_id <> ?`,
      [conversationId, req.user.employee_id]
    );
    await notifyRecipients(conn, recipients.map(row => row.employee_id), req.user, access.conversation.subject);
    await conn.commit();
    return res.status(201).json({
      success: true,
      message: 'Message sent. This timestamped message is permanently recorded and cannot be edited or deleted.',
    });
  } catch (err) {
    await conn.rollback();
    console.error('Append messaging message error:', err);
    return res.status(500).json({ success: false, message: 'Server error sending message.' });
  } finally {
    conn.release();
  }
}

// PUT /api/messaging/conversations/:id/participants
async function updateDepartmentGroupParticipants(req, res) {
  const conversationId = Number(req.params.id);
  const { employee_id: hodId, role, department } = req.user;
  if (role !== 'HOD') return res.status(403).json({ success: false, message: 'Only HODs can manage department group members.' });
  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid conversation id.' });
  }

  const requestedIds = normalizeEmployeeIds(req.body.recipient_employee_ids);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [conversations] = await conn.query(
      `SELECT id FROM message_conversations
       WHERE id = ? AND created_by = ? AND audience_type = 'DEPARTMENT_GROUP' AND department = ?`,
      [conversationId, hodId, department]
    );
    if (!conversations.length) {
      await conn.rollback();
      return res.status(403).json({ success: false, message: 'Only the HOD who created this department group can manage its members.' });
    }

    const [validMembers] = await conn.query(
      `SELECT employee_id FROM users
       WHERE role IN (?) AND employee_id <> ?
         AND employee_id IN (?)`,
      [STAFF_ROLES, hodId, requestedIds.length ? requestedIds : ['__none__']]
    );
    const validIds = validMembers.map(row => row.employee_id);
    await conn.query(
      `DELETE FROM message_participants WHERE conversation_id = ? AND employee_id <> ?`,
      [conversationId, hodId]
    );
    if (validIds.length) {
      await conn.query(
        `INSERT INTO message_participants
          (conversation_id, employee_id, participant_role, is_required)
         VALUES ?`,
        [validIds.map(id => [conversationId, id, 'recipient', false])]
      );
    }
    await conn.commit();
    return res.json({ success: true, message: 'Department group members updated. Existing messages remain unchanged.' });
  } catch (err) {
    await conn.rollback();
    console.error('Update department message group error:', err);
    return res.status(500).json({ success: false, message: 'Server error updating group members.' });
  } finally {
    conn.release();
  }
}

module.exports = {
  listConversations,
  listMessageParticipants,
  createConversation,
  getConversationMessages,
  appendMessage,
  updateDepartmentGroupParticipants,
};
