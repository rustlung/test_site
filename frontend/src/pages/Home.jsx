import React, { useState, useEffect, useCallback, useRef } from 'react';
import '../styles/App.css';

const API_BASE = '/api';
const RETURN_KEY = 'reside_prestige_return_count';
const SESSION_KEY = 'reside_prestige_session_id';

function getOrCreateSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `s${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `s${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

function incrementReturnCount() {
  try {
    const n = parseInt(sessionStorage.getItem(RETURN_KEY) || '0', 10) + 1;
    sessionStorage.setItem(RETURN_KEY, String(n));
    return n;
  } catch {
    return 0;
  }
}

export default function Home() {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    patronymic: '',
    business_info: '',
    business_niche: '',
    company_size: '',
    role: 'employee',
    task_volume: '',
    task_type: '',
    interested_product: '',
    budget: '',
    deadline: '',
    contact_method: '',
    contact_value: '',
    convenient_time: '',
    comment: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const clicksRef = useRef([]);
  const hoversRef = useRef([]);
  const lastHoverTsRef = useRef(0);
  const startTimeRef = useRef(Date.now());
  const sessionIdRef = useRef(getOrCreateSessionId());
  const [timeOnPage, setTimeOnPage] = useState(0);
  const [returnCount] = useState(incrementReturnCount);

  useEffect(() => {
    const t = setInterval(() => {
      setTimeOnPage(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Периодическая отправка поведения на сервер (клики, движения мыши, время) — без привязки к заявке
  useEffect(() => {
    const interval = setInterval(() => {
      const time = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const clicks = clicksRef.current.length ? clicksRef.current : null;
      const hovers = hoversRef.current.length ? hoversRef.current : null;
      fetch(`${API_BASE}/behavior/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          time_on_page: time,
          clicks,
          hovers,
          return_count: returnCount,
        }),
      }).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, [returnCount]);

  useEffect(() => {
    fetch(`${API_BASE}/services/`)
      .then((r) => r.json())
      .then(setServices)
      .catch(() => setServices([]));
  }, []);

  useEffect(() => {
    const service = services.find((s) => s.name === form.interested_product) || services[0];
    setSelectedService(service);
    if (service && !form.budget) {
      setForm((f) => ({ ...f, budget: String(service.budget_min) }));
    }
  }, [form.interested_product, services]);

  const updateForm = useCallback((field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  }, []);

  const formatPhoneMask = (val) => {
    const digits = val.replace(/\D/g, '').replace(/^[78]/, '');
    const d = digits.slice(0, 10);
    if (d.length === 0) return '';
    let s = '+7';
    if (d.length > 0) s += ' (' + d.slice(0, 3);
    if (d.length >= 3) s += ') ' + d.slice(3, 6);
    if (d.length >= 6) s += '-' + d.slice(6, 8);
    if (d.length >= 8) s += '-' + d.slice(8, 10);
    return s;
  };

  const handleContactValueChange = (e) => {
    const v = e.target.value;
    const method = form.contact_method;
    if (method === 'phone' || method === 'whatsapp') {
      updateForm('contact_value', formatPhoneMask(v));
    } else {
      updateForm('contact_value', v);
    }
  };

  const handleContactMethodChange = (e) => {
    const method = e.target.value;
    updateForm('contact_method', method);
    updateForm('contact_value', '');
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.contact_value;
      return next;
    });
  };

  const validateForm = () => {
    const errs = {};
    const required = [
      'first_name', 'last_name', 'patronymic', 'business_niche', 'company_size',
      'task_volume', 'task_type', 'interested_product', 'budget', 'deadline',
      'contact_method', 'convenient_time'
    ];
    required.forEach((f) => {
      const v = form[f];
      if (!v || (typeof v === 'string' && !v.trim())) {
        const labels = { first_name: 'Имя', last_name: 'Фамилия', patronymic: 'Отчество',
          business_niche: 'Ниша бизнеса', company_size: 'Размер компании', task_volume: 'Объём задачи',
          task_type: 'Тип задачи', interested_product: 'Интересующий продукт', budget: 'Бюджет',
          deadline: 'Дедлайн', contact_method: 'Способ связи', convenient_time: 'Удобное время' };
        errs[f] = `Заполните поле «${labels[f] || f}»`;
      }
    });
    if (form.deadline) {
      const today = new Date().toISOString().slice(0, 10);
      if (form.deadline < today) errs.deadline = 'Дата не может быть раньше текущего дня';
    }
    if (form.contact_method === 'email') {
      const v = form.contact_value?.trim();
      if (!v) errs.contact_value = 'Укажите email';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errs.contact_value = 'Неверный формат email';
    } else if (form.contact_method === 'phone' || form.contact_method === 'whatsapp') {
      const digits = (form.contact_value || '').replace(/\D/g, '').replace(/^[78]/, '');
      if (digits.length < 10) errs.contact_value = 'Введите минимум 10 цифр номера телефона';
    } else if (form.contact_method === 'telegram') {
      const v = form.contact_value?.trim();
      if (!v) errs.contact_value = 'Укажите Telegram';
      else if (!v.startsWith('@')) errs.contact_value = 'Начните с @ (например @username)';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const parse422Detail = (detail) => {
    const errs = {};
    const labels = { first_name: 'Имя', last_name: 'Фамилия', patronymic: 'Отчество',
      business_info: 'Описание бизнеса', business_niche: 'Ниша бизнеса', company_size: 'Размер компании',
      task_volume: 'Объём задачи', task_type: 'Тип задачи', interested_product: 'Интересующий продукт',
      budget: 'Бюджет', deadline: 'Дедлайн', contact_method: 'Способ связи', contact_value: 'Контакт',
      convenient_time: 'Удобное время', comment: 'Комментарий' };
    if (Array.isArray(detail)) {
      detail.forEach((e) => {
        const loc = e.loc || [];
        const field = loc[loc.length - 1];
        if (field && typeof field === 'string' && field !== 'body' && field !== 'lead') {
          const label = labels[field] || field;
          let msg = e.msg || 'Неверное значение';
          if (e.type === 'value_error.missing' || msg.includes('field required')) msg = `Заполните поле «${label}»`;
          errs[field] = msg;
        }
      });
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (!validateForm()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/leads/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionIdRef.current,
          lead: {
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            patronymic: form.patronymic.trim(),
            business_info: form.business_info?.trim() || form.business_niche?.trim() || '-',
            business_niche: form.business_niche.trim(),
            company_size: form.company_size,
            task_volume: form.task_volume.trim(),
            role: form.role === 'employee' ? 'Сотрудник' : 'Руководитель',
            budget: form.budget,
            task_type: form.task_type.trim(),
            interested_product: form.interested_product || (services[0]?.name ?? ''),
            deadline: form.deadline,
            contact_method: form.contact_method,
            contact_value: form.contact_value?.trim() || null,
            convenient_time: form.convenient_time.trim(),
            comment: form.comment?.trim() || null,
          },
          behavior: {
            time_on_page: timeOnPage,
            clicks: clicksRef.current.length ? clicksRef.current : null,
            hovers: hoversRef.current.length ? hoversRef.current : null,
            return_count: returnCount,
            raw_data: null,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 422 && data.detail) {
        setFieldErrors(parse422Detail(data.detail));
        setError('Исправьте ошибки в форме');
        return;
      }
      if (res.status >= 500) {
        setError('Произошла ошибка сервера. Попробуйте позже.');
        return;
      }
      if (!res.ok) {
        setError(data.detail || data.message || 'Ошибка отправки');
        return;
      }
      setSubmitted(true);
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError('Нет связи с сервером. Проверьте интернет.');
      } else {
        setError('Произошла ошибка. Попробуйте ещё раз.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClick = (e) => {
    const target = e.target?.tagName || null;
    const x = e.clientX + (window.scrollX || 0);
    const y = e.clientY + (window.scrollY || 0);
    clicksRef.current = [
      ...clicksRef.current,
      { x, y, target },
    ];
  };

  const handleMouseMove = (e) => {
    const now = Date.now();
    if (now - lastHoverTsRef.current < 500) return;
    lastHoverTsRef.current = now;
    const x = e.clientX + (window.scrollX || 0);
    const y = e.clientY + (window.scrollY || 0);
    const next = [...hoversRef.current, { x, y }];
    hoversRef.current = next.length > 200 ? next.slice(-200) : next;
  };

  const inputCls = (field) => (fieldErrors[field] ? 'form-input-invalid' : '');

  if (submitted) {
    return (
      <div className="app" onClick={handleClick} onMouseMove={handleMouseMove}>
        <div className="background-circles" />
        <main className="success-message">
          <h1>Заявка отправлена!</h1>
          <p>Спасибо за обращение. Мы свяжемся с вами в ближайшее время.</p>
          <button
            type="button"
            className="btn-back"
            onClick={() => {
              setSubmitted(false);
              setForm({
                first_name: '', last_name: '', patronymic: '', business_info: '', business_niche: '',
                company_size: '', role: 'employee', task_volume: '', task_type: '', interested_product: '',
                budget: '', deadline: '', contact_method: '', contact_value: '', convenient_time: '', comment: '',
              });
              setError(null);
              setFieldErrors({});
            }}
          >
            Вернуться к форме
          </button>
        </main>
      </div>
    );
  }

  const svc = selectedService || { budget_min: 0, budget_max: 1000000 };

  return (
    <div className="app" onClick={handleClick} onMouseMove={handleMouseMove}>
      <div className="background-circles" />
      <header className="header">
        <h1>Résidé Prestige</h1>
        <p>Элитная недвижимость</p>
      </header>
      <main className="main">
        <form className="form" onSubmit={handleSubmit}>
          <h2>Оставить заявку</h2>

          <div className="form-row">
            <label>
              <span>Имя</span>
              <input
                type="text"
                className={inputCls('first_name')}
                value={form.first_name}
                onChange={(e) => { updateForm('first_name', e.target.value); setFieldErrors((p) => ({ ...p, first_name: '' })); }}
              />
              {fieldErrors.first_name && <span className="field-error">{fieldErrors.first_name}</span>}
            </label>
            <label>
              <span>Отчество</span>
              <input
                type="text"
                className={inputCls('patronymic')}
                value={form.patronymic}
                onChange={(e) => { updateForm('patronymic', e.target.value); setFieldErrors((p) => ({ ...p, patronymic: '' })); }}
              />
              {fieldErrors.patronymic && <span className="field-error">{fieldErrors.patronymic}</span>}
            </label>
            <label>
              <span>Фамилия</span>
              <input
                type="text"
                className={inputCls('last_name')}
                value={form.last_name}
                onChange={(e) => { updateForm('last_name', e.target.value); setFieldErrors((p) => ({ ...p, last_name: '' })); }}
              />
              {fieldErrors.last_name && <span className="field-error">{fieldErrors.last_name}</span>}
            </label>
          </div>

          <div className="form-row">
            <label className="full">
              <span>Описание бизнеса</span>
              <input
                type="text"
                className={inputCls('business_info')}
                value={form.business_info}
                onChange={(e) => { updateForm('business_info', e.target.value); setFieldErrors((p) => ({ ...p, business_info: '' })); }}
                placeholder="Краткое описание вашего бизнеса"
              />
              {fieldErrors.business_info && <span className="field-error">{fieldErrors.business_info}</span>}
            </label>
          </div>

          <div className="form-row">
            <label>
              <span>Ниша бизнеса</span>
              <input
                type="text"
                className={inputCls('business_niche')}
                value={form.business_niche}
                onChange={(e) => { updateForm('business_niche', e.target.value); setFieldErrors((p) => ({ ...p, business_niche: '' })); }}
              />
              {fieldErrors.business_niche && <span className="field-error">{fieldErrors.business_niche}</span>}
            </label>
            <label>
              <span>Размер компании</span>
              <select
                className={inputCls('company_size')}
                value={form.company_size}
                onChange={(e) => { updateForm('company_size', e.target.value); setFieldErrors((p) => ({ ...p, company_size: '' })); }}
              >
                <option value="">Выберите</option>
                <option value="1-10">1–10</option>
                <option value="11-50">11–50</option>
                <option value="51-200">51–200</option>
                <option value="200+">200+</option>
              </select>
              {fieldErrors.company_size && <span className="field-error">{fieldErrors.company_size}</span>}
            </label>
            <label>
              <span>Роль</span>
              <select value={form.role} onChange={(e) => updateForm('role', e.target.value)}>
                <option value="employee">Сотрудник</option>
                <option value="manager">Руководитель</option>
              </select>
            </label>
          </div>

          <div className="form-row">
            <label>
              <span>Объём задачи</span>
              <input
                type="text"
                className={inputCls('task_volume')}
                value={form.task_volume}
                onChange={(e) => { updateForm('task_volume', e.target.value); setFieldErrors((p) => ({ ...p, task_volume: '' })); }}
                placeholder="Напр. крупный проект"
              />
              {fieldErrors.task_volume && <span className="field-error">{fieldErrors.task_volume}</span>}
            </label>
            <label>
              <span>Тип задачи</span>
              <input
                type="text"
                className={inputCls('task_type')}
                value={form.task_type}
                onChange={(e) => { updateForm('task_type', e.target.value); setFieldErrors((p) => ({ ...p, task_type: '' })); }}
                placeholder="Напр. консультация"
              />
              {fieldErrors.task_type && <span className="field-error">{fieldErrors.task_type}</span>}
            </label>
            <label>
              <span>Интересующий продукт</span>
              <select
                className={inputCls('interested_product')}
                value={form.interested_product}
                onChange={(e) => { updateForm('interested_product', e.target.value); setFieldErrors((p) => ({ ...p, interested_product: '' })); }}
              >
                <option value="">Выберите</option>
                {services.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
              {fieldErrors.interested_product && <span className="field-error">{fieldErrors.interested_product}</span>}
            </label>
          </div>

          <div className="form-row">
            <label className="full">
              <span>Бюджет: {form.budget || svc.budget_min} ₽</span>
              <input
                type="range"
                min={svc.budget_min}
                max={svc.budget_max}
                step={Math.max(1000, Math.floor((svc.budget_max - svc.budget_min) / 100))}
                value={form.budget || svc.budget_min}
                onChange={(e) => { updateForm('budget', e.target.value); setFieldErrors((p) => ({ ...p, budget: '' })); }}
              />
              {fieldErrors.budget && <span className="field-error">{fieldErrors.budget}</span>}
            </label>
          </div>

          <div className="form-row">
            <label>
              <span>Дедлайн</span>
              <input
                type="date"
                className={`form-date ${inputCls('deadline')}`}
                value={form.deadline}
                onChange={(e) => { updateForm('deadline', e.target.value); setFieldErrors((p) => ({ ...p, deadline: '' })); }}
              />
              {fieldErrors.deadline && <span className="field-error">{fieldErrors.deadline}</span>}
            </label>
            <label>
              <span>Способ связи</span>
              <select
                className={inputCls('contact_method')}
                value={form.contact_method}
                onChange={handleContactMethodChange}
              >
                <option value="">Выберите</option>
                <option value="phone">Телефон</option>
                <option value="email">Email</option>
                <option value="telegram">Telegram</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
              {fieldErrors.contact_method && <span className="field-error">{fieldErrors.contact_method}</span>}
            </label>
            <label>
              <span>Удобное время</span>
              <input
                type="text"
                className={inputCls('convenient_time')}
                value={form.convenient_time}
                onChange={(e) => { updateForm('convenient_time', e.target.value); setFieldErrors((p) => ({ ...p, convenient_time: '' })); }}
                placeholder="Напр. 10:00–18:00"
              />
              {fieldErrors.convenient_time && <span className="field-error">{fieldErrors.convenient_time}</span>}
            </label>
          </div>

          {form.contact_method && (
            <div className="form-row">
              <label className="full">
                <span>
                  {form.contact_method === 'phone' && 'Телефон'}
                  {form.contact_method === 'email' && 'Email'}
                  {form.contact_method === 'telegram' && 'Telegram'}
                  {form.contact_method === 'whatsapp' && 'WhatsApp'}
                </span>
                {form.contact_method === 'phone' || form.contact_method === 'whatsapp' ? (
                  <input
                    type="tel"
                    className={inputCls('contact_value')}
                    value={form.contact_value}
                    onChange={(e) => { handleContactValueChange(e); setFieldErrors((p) => ({ ...p, contact_value: '' })); }}
                    placeholder="+7 (___) ___-__-__"
                    maxLength={18}
                  />
                ) : form.contact_method === 'email' ? (
                  <input
                    type="email"
                    className={inputCls('contact_value')}
                    value={form.contact_value}
                    onChange={(e) => { updateForm('contact_value', e.target.value); setFieldErrors((p) => ({ ...p, contact_value: '' })); }}
                    placeholder="example@mail.ru"
                  />
                ) : (
                  <input
                    type="text"
                    className={inputCls('contact_value')}
                    value={form.contact_value}
                    onChange={(e) => { updateForm('contact_value', e.target.value); setFieldErrors((p) => ({ ...p, contact_value: '' })); }}
                    placeholder="@username"
                  />
                )}
                {fieldErrors.contact_value && <span className="field-error">{fieldErrors.contact_value}</span>}
              </label>
            </div>
          )}

          <div className="form-row">
            <label className="full">
              <span>Комментарий</span>
              <textarea
                className={inputCls('comment')}
                value={form.comment}
                onChange={(e) => updateForm('comment', e.target.value)}
                rows={3}
              />
              {fieldErrors.comment && <span className="field-error">{fieldErrors.comment}</span>}
            </label>
          </div>

          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Отправка...' : 'Отправить заявку'}
          </button>
        </form>
      </main>
    </div>
  );
}

