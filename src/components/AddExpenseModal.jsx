import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import {
  createExpense,
  updateExpense,
  parseExpenseText,
  parseBillText,
} from '../api';

import {
  X,
  Sparkles,
  FileText,
  Loader,
} from 'lucide-react';

import toast from 'react-hot-toast';

const today = () =>
  new Date().toISOString().split('T')[0];



const memberName = (m) =>
  m.display_name ||
  m.user?.name ||
  m.invited_name ||
  m.invited_email ||
  '?';

export default function AddExpenseModal({
  group,
  expense,
  onClose,
  onSaved,
}) {
  const { currentUser } = useContext(AppContext);

  const members = group.members || [];

  const currentMember = members.find(
    (m) => m.user?.id === currentUser?.id
  );

  const isEdit = !!expense;

  const [mode, setMode] = useState('manual');

  const [aiText, setAiText] = useState('');
  const [billText, setBillText] = useState('');

  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    description: expense?.description || '',

    amount: expense
      ? (expense.amount_paise / 100).toString()
      : '',

    paid_by_member_id:
      expense?.paid_by_member_id ||
      currentMember?.id ||
      '',

    split_mode:
      expense?.split_mode || 'equal_all',

    date: expense?.date || today(),

    notes: expense?.notes || '',

    split_members:
      expense?.shares
        ?.map((s) => s.member_id)
        .filter(Boolean) || [],

    custom_amounts: {},

    share_weights: {},
  });

  const updateField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };



  const runAiParse = async () => {
    if (!aiText.trim()) return;

    setAiLoading(true);
    setAiError('');
    setAiResult(null);

    try {
      const res = await parseExpenseText(
        aiText,
        group.id
      );

      if (!res.success) {
        setAiError(
          res.error || 'Could not parse text'
        );
        return;
      }

      setAiResult(res);

      const paidByMember = members.find(
        (m) => m.user?.id === res.paid_by?.id
      );

      setForm((prev) => ({
        ...prev,

        description:
          res.description || '',

        amount:
          res.amount
            ? String(res.amount)
            : '',

        paid_by_member_id:
          paidByMember?.id ||
          prev.paid_by_member_id,

        split_mode:
          res.split_mode || 'equal_all',

        split_members:
          (res.split_members || [])
            .map(
              (sm) =>
                members.find(
                  (m) =>
                    m.user?.id === sm.id
                )?.id
            )
            .filter(Boolean),

        custom_amounts:
          res.custom_amounts || {},
      }));
    } catch (err) {
      setAiError(
        'AI service unavailable'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const runBillParse = async () => {
    if (!billText.trim()) return;

    setAiLoading(true);
    setAiError('');
    setAiResult(null);

    try {
      const res = await parseBillText(
        billText
      );

      if (!res.success) {
        setAiError(
          res.error ||
            'Could not parse bill'
        );
        return;
      }

      setAiResult({
        ...res,
        isBill: true,
      });

      setForm((prev) => ({
        ...prev,

        description:
          res.restaurant_name
            ? `Dinner at ${res.restaurant_name}`
            : 'Restaurant bill',

        amount:
          res.total_amount
            ? String(res.total_amount)
            : '',
      }));
    } catch (err) {
      setAiError(
        'AI service unavailable'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.description.trim()) {
      setError('Description required');
      return;
    }

    if (
      !form.amount ||
      Number(form.amount) <= 0
    ) {
      setError('Valid amount required');
      return;
    }

    if (!form.paid_by_member_id) {
      setError('Select who paid');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        group: group.id,

        description:
          form.description,

        amount:
          Number(form.amount),

        paid_by_member_id:
          Number(form.paid_by_member_id),

        split_mode:
          form.split_mode,

        date: form.date,

        notes: form.notes,

        ai_parsed:
          mode !== 'manual',
      };

      if (
        form.split_mode ===
        'equal_subset'
      ) {
        payload.split_members =
          form.split_members;
      }

      if (
        form.split_mode ===
        'custom'
      ) {
        payload.custom_amounts =
          form.custom_amounts;
      }

      if (
        form.split_mode ===
        'shares'
      ) {
        payload.share_weights =
          form.share_weights;
      }

      if (isEdit) {
        await updateExpense(
          expense.id,
          payload
        );

        toast.success(
          'Expense updated!'
        );
      } else {
        await createExpense(payload);

        toast.success(
          'Expense added!'
        );
      }

      await onSaved();
      onClose();
    } catch (err) {
      const msg =
        err.response?.data?.errors
          ? Object.values(
              err.response.data.errors
            ).flat()[0]
          : 'Failed to save expense';

      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) =>
        e.target === e.currentTarget &&
        onClose()
      }
    >
      <div className="modal">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent:
              'space-between',
            marginBottom: 20,
          }}
        >
          <div
            className="modal-title"
            style={{ margin: 0 }}
          >
            {isEdit
              ? 'Edit Expense'
              : 'Add Expense'}
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {!isEdit && (
          <div
            className="tabs"
            style={{
              marginBottom: 20,
            }}
          >
            <button
              className={`tab ${
                mode === 'manual'
                  ? 'active'
                  : ''
              }`}
              onClick={() => {
                setMode('manual');
                setAiResult(null);
                setAiError('');
              }}
            >
              ✏️ Manual
            </button>

            <button
              className={`tab ${
                mode === 'ai'
                  ? 'active'
                  : ''
              }`}
              onClick={() => {
                setMode('ai');
                setAiResult(null);
                setAiError('');
              }}
            >
              ✨ AI Parse
            </button>

            <button
              className={`tab ${
                mode === 'bill'
                  ? 'active'
                  : ''
              }`}
              onClick={() => {
                setMode('bill');
                setAiResult(null);
                setAiError('');
              }}
            >
              🧾 Bill Text
            </button>
          </div>
        )}

        {mode === 'ai' && (
          <div className="ai-panel">
            <div className="ai-panel-title">
              <Sparkles size={14} />
              Natural Language
            </div>

            <textarea
              className="form-textarea"
              rows={3}
              placeholder='Example: "I paid 2000 and Diksha paid 400 for dinner"'
              value={aiText}
              onChange={(e) =>
                setAiText(
                  e.target.value
                )
              }
            />

            <button
              className="btn btn-primary btn-sm"
              style={{
                marginTop: 10,
              }}
              onClick={runAiParse}
              disabled={
                aiLoading ||
                !aiText.trim()
              }
            >
              {aiLoading ? (
                <>
                  <Loader size={14} />
                  Parsing...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Parse
                </>
              )}
            </button>

            {aiError && (
              <div
                className="error-box"
                style={{
                  marginTop: 10,
                }}
              >
                {aiError}
              </div>
            )}

            {aiResult &&
              !aiResult.isBill && (
                <div className="ai-result">
                  <div className="ai-result-row">
                    <span className="ai-result-label">
                      Confidence
                    </span>

                    <span
                      className={`ai-result-value confidence-${aiResult.confidence}`}
                    >
                      {
                        aiResult.confidence
                      }
                    </span>
                  </div>

                  <div className="ai-result-row">
                    <span className="ai-result-label">
                      Description
                    </span>

                    <span className="ai-result-value">
                      {
                        aiResult.description
                      }
                    </span>
                  </div>

                  <div className="ai-result-row">
                    <span className="ai-result-label">
                      Total
                    </span>

                    <span className="ai-result-value">
                      ₹
                      {
                        aiResult.amount
                      }
                    </span>
                  </div>

                  {aiResult.payers
                    ?.length > 1 ? (
                    <div
                      className="ai-result-row"
                      style={{
                        flexDirection:
                          'column',
                        alignItems:
                          'flex-start',
                        gap: 4,
                      }}
                    >
                      <span className="ai-result-label">
                        Payers
                      </span>

                      {aiResult.payers.map(
                        (p, i) => (
                          <div
                            key={i}
                            style={{
                              display:
                                'flex',
                              justifyContent:
                                'space-between',
                              width:
                                '100%',
                              fontSize: 12,
                            }}
                          >
                            <span>
                              {p.member
                                ?.name ||
                                p.name}
                            </span>

                            <span
                              style={{
                                fontWeight: 600,
                              }}
                            >
                              ₹
                              {
                                p.amount
                              }
                            </span>
                          </div>
                        )
                      )}

                      <div
                        style={{
                          fontSize: 11,
                          marginTop: 4,
                          color:
                            'orange',
                        }}
                      >
                        ⚠️ Multiple
                        payers
                        detected —
                        create
                        separate
                        expenses for
                        accurate
                        tracking.
                      </div>
                    </div>
                  ) : (
                    <div className="ai-result-row">
                      <span className="ai-result-label">
                        Paid by
                      </span>

                      <span className="ai-result-value">
                        {aiResult
                          .paid_by
                          ?.name ||
                          '?'}
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color:
                        'var(--text2)',
                    }}
                  >
                    ✅ Form
                    pre-filled —
                    review and
                    confirm.
                  </div>
                </div>
              )}
          </div>
        )}

        {mode === 'bill' && (
          <div className="ai-panel">
            <div className="ai-panel-title">
              <FileText size={14} />
              Paste Bill Text
            </div>

            <textarea
              className="form-textarea"
              rows={5}
              placeholder="Paste raw bill text..."
              value={billText}
              onChange={(e) =>
                setBillText(
                  e.target.value
                )
              }
            />

            <button
              className="btn btn-primary btn-sm"
              style={{
                marginTop: 10,
              }}
              onClick={runBillParse}
              disabled={
                aiLoading ||
                !billText.trim()
              }
            >
              {aiLoading ? (
                <>
                  <Loader size={14} />
                  Parsing...
                </>
              ) : (
                <>
                  🧾 Parse Bill
                </>
              )}
            </button>

            {aiError && (
              <div
                className="error-box"
                style={{
                  marginTop: 10,
                }}
              >
                {aiError}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              '1fr 1fr',
            gap: 16,
          }}
        >
          <div className="form-group">
            <label className="form-label">
              Description *
            </label>

            <input
              className="form-input"
              placeholder="What was this for?"
              value={
                form.description
              }
              onChange={(e) =>
                updateField(
                  'description',
                  e.target.value
                )
              }
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Amount (₹) *
            </label>

            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) =>
                updateField(
                  'amount',
                  e.target.value
                )
              }
            />
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              '1fr 1fr',
            gap: 16,
            marginTop: 16,
          }}
        >
          <div className="form-group">
            <label className="form-label">
              Paid by *
            </label>

            <select
              className="form-select"
              value={
                form.paid_by_member_id
              }
              onChange={(e) =>
                updateField(
                  'paid_by_member_id',
                  Number(
                    e.target.value
                  )
                )
              }
            >
              <option value="">
                Select...
              </option>

              {members.map((m) => (
                <option
                  key={m.id}
                  value={m.id}
                >
                  {memberName(m)}
                  {m.is_pending
                    ? ' ⏳'
                    : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Date
            </label>

            <input
              className="form-input"
              type="date"
              value={form.date}
              onChange={(e) =>
                updateField(
                  'date',
                  e.target.value
                )
              }
            />
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: 24,
          }}
        >
          <button
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="btn btn-primary"
            style={{ flex: 2 }}
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving
              ? 'Saving...'
              : isEdit
              ? '✓ Update Expense'
              : '✓ Save Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}