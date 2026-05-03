// ─── PM (Preventive Maintenance) ──────────────────────────────
let currentPmTab = 'calendar';
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

async function renderPM() {
  const [pmr, tplr, ar] = await Promise.all([
    api('GET', '/api/pm-schedules'),
    api('GET', '/api/checklist-templates'),
    api('GET', '/api/assets')
  ]);

  if (!pmr.ok || !tplr.ok || !ar.ok) {
    document.getElementById('page-body').innerHTML = '<div class="empty-state">Lỗi tải dữ liệu PM</div>';
    return;
  }

  const schedules = pmr.data || [];
  const templates = tplr.data || [];
  const assets = ar.data || [];
  const assetMap = {}; assets.forEach(a => assetMap[a.id] = a.name);
  const tplMap = {}; templates.forEach(t => tplMap[t.id] = t.name);

  // Filter templates and PM schedules
  // In Calendar view, build days.
  let contentHtml = '';

  if (currentPmTab === 'calendar') {
    const today = new Date();
    today.setHours(0,0,0,0);
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (startDate.getDay() === 0 ? 6 : startDate.getDay() - 1)); // start on Monday
    const endDate = new Date(lastDay);
    if (endDate.getDay() !== 0) endDate.setDate(endDate.getDate() + (7 - endDate.getDay()));

    const daysHtml = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const isCurrentMonth = d.getMonth() === currentMonth;
      const isToday = d.getTime() === today.getTime();
      const dateStr = d.toISOString().split('T')[0];
      
      const daySchedules = schedules.filter(s => s.status === 'active' && s.nextDueDate === dateStr);
      const overdueSchedules = schedules.filter(s => s.status === 'active' && s.nextDueDate < dateStr && d.getTime() === today.getTime());

      let badges = '';
      daySchedules.forEach(s => {
        badges += `<div class="pm-badge pm-badge-upcoming" onclick="event.stopPropagation(); viewPMSchedule('${s.id}')" title="${s.name}">${s.name}</div>`;
      });
      overdueSchedules.forEach(s => {
        badges += `<div class="pm-badge pm-badge-overdue" onclick="event.stopPropagation(); viewPMSchedule('${s.id}')" title="Quá hạn: ${s.name}">⚠ ${s.name}</div>`;
      });

      const cellClass = `pm-cal-cell ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${daySchedules.length ? 'has-pm' : ''} ${overdueSchedules.length ? 'has-overdue' : ''}`;
      
      daysHtml.push(`
        <div class="${cellClass}" onclick="showPMForm({startDate: '${dateStr}'})">
          <div class="pm-cal-day">${d.getDate()}</div>
          ${badges}
        </div>
      `);
    }

    const monthNames = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
    contentHtml = `
      <div class="pm-cal-nav">
        <button class="btn btn-ghost btn-sm" onclick="changeMonth(-1)">◀ Trước</button>
        <div class="pm-cal-title">${monthNames[currentMonth]} ${currentYear}</div>
        <button class="btn btn-ghost btn-sm" onclick="changeMonth(1)">Sau ▶</button>
      </div>
      <div class="pm-cal-grid">
        <div class="pm-cal-header">T2</div><div class="pm-cal-header">T3</div><div class="pm-cal-header">T4</div><div class="pm-cal-header">T5</div><div class="pm-cal-header">T6</div><div class="pm-cal-header">T7</div><div class="pm-cal-header">CN</div>
        ${daysHtml.join('')}
      </div>
    `;
  } else if (currentPmTab === 'list') {
    contentHtml = schedules.length ? `
      <div class="table-wrap"><table>
        <thead><tr><th>Tên PM</th><th>Thiết bị</th><th>Tần suất</th><th>Ngày kế tiếp</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>${schedules.map(s => `<tr>
          <td data-label="Tên PM" style="font-weight:600">${s.name}</td>
          <td data-label="Thiết bị">${s.assetId ? assetMap[s.assetId] || s.assetId : '—'}</td>
          <td data-label="Tần suất">${s.frequency}</td>
          <td data-label="Ngày kế tiếp" style="color:${isOverdue(s.nextDueDate,'open')?'var(--red)':'inherit'}">${fmtDateShort(s.nextDueDate)}</td>
          <td data-label="Trạng thái"><span class="badge badge-${s.status === 'active' ? 'active' : 'inactive'}">${s.status}</span></td>
          <td data-label="">
            <button class="btn btn-ghost btn-sm" onclick="showPMForm(${JSON.stringify(s).replace(/"/g,'&quot;')})">Sửa</button>
            <button class="btn btn-primary btn-sm" onclick="generateWO('${s.id}')">Tạo WO ngay</button>
          </td>
        </tr>`).join('')}</tbody>
      </table></div>
    ` : '<div class="empty-state">Chưa có lịch bảo trì</div>';
  } else if (currentPmTab === 'templates') {
    contentHtml = `
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
        <button class="btn btn-primary btn-sm" onclick="showTemplateForm()">+ Mẫu Checklist Mới</button>
      </div>
      <div class="tpl-grid">
        ${templates.map(t => `
          <div class="tpl-card">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <div class="tpl-card-cat">${t.category}</div>
                <div class="tpl-card-name">${t.name}</div>
              </div>
              <button class="btn btn-ghost btn-sm" onclick="showTemplateForm(${JSON.stringify(t).replace(/"/g,'&quot;')})">Sửa</button>
            </div>
            <ul class="tpl-item-list" style="margin-top:12px">
              ${t.items.slice(0, 3).map(it => `<li><span class="tpl-item-type">${it.type}</span> ${it.label} ${it.unit ? `(${it.unit})` : ''}</li>`).join('')}
              ${t.items.length > 3 ? `<li style="justify-content:center;color:var(--blue);font-size:11px">+${t.items.length - 3} mục nữa</li>` : ''}
            </ul>
          </div>
        `).join('')}
      </div>
    `;
  }

  document.getElementById('page-body').innerHTML = `
    <div class="pm-tabs">
      <div class="pm-tab ${currentPmTab === 'calendar' ? 'active' : ''}" onclick="currentPmTab='calendar'; renderPM()">📅 Lịch bảo trì</div>
      <div class="pm-tab ${currentPmTab === 'list' ? 'active' : ''}" onclick="currentPmTab='list'; renderPM()">📋 Danh sách PM</div>
      <div class="pm-tab ${currentPmTab === 'templates' ? 'active' : ''}" onclick="currentPmTab='templates'; renderPM()">📑 Mẫu Checklist (SOP)</div>
    </div>
    <div class="card" style="${currentPmTab === 'list' ? 'padding:0' : ''}">
      ${contentHtml}
    </div>
  `;
}

function changeMonth(delta) {
  currentMonth += delta;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  else if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderPM();
}

async function generateWO(scheduleId) {
  if (!confirm('Tạo Work Order ngay lập tức từ lịch này?')) return;
  const r = await api('POST', \`/api/pm-schedules/\${scheduleId}/generate-wo\`);
  if (!r.ok) return toast(r.error, 'error');
  toast('Đã tạo Work Order', 'success');
  renderPM();
}

async function showPMForm(data = {}) {
  const [ar, tr] = await Promise.all([api('GET', '/api/assets'), api('GET', '/api/checklist-templates')]);
  const assets = ar.data || [];
  const templates = tr.data || [];

  openModal(data.id ? 'Sửa Lịch Bảo Trì' : 'Tạo Lịch Bảo Trì (PM)', `
    <div class="form-row">
      <div class="form-group"><label>Tên kế hoạch *</label><input id="pm-name" value="${data.name || ''}" placeholder="Vd: Bảo dưỡng bơm quý 1"></div>
      <div class="form-group"><label>Tần suất *</label>
        <select id="pm-freq">
          <option value="daily" ${data.frequency==='daily'?'selected':''}>Hàng ngày</option>
          <option value="weekly" ${data.frequency==='weekly'?'selected':''}>Hàng tuần</option>
          <option value="monthly" ${data.frequency==='monthly'?'selected':''}>Hàng tháng</option>
          <option value="quarterly" ${data.frequency==='quarterly'?'selected':''}>Hàng quý</option>
          <option value="yearly" ${data.frequency==='yearly'?'selected':''}>Hàng năm</option>
        </select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Thiết bị áp dụng</label>
        <select id="pm-asset"><option value="">-- Chọn thiết bị --</option>${assets.map(a => `<option value="${a.id}" ${data.assetId===a.id?'selected':''}>${a.name} (${a.code || a.id})</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Mẫu Checklist (SOP)</label>
        <select id="pm-tpl"><option value="">-- Chọn mẫu Checklist --</option>${templates.map(t => `<option value="${t.id}" ${data.templateId===t.id?'selected':''}>${t.name}</option>`).join('')}</select>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Ngày bắt đầu *</label><input type="date" id="pm-start" value="${data.startDate || new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label>Độ ưu tiên</label>
        <select id="pm-priority"><option value="low" ${data.priority==='low'?'selected':''}>Thấp (Low)</option><option value="medium" ${data.priority==='medium'||!data.priority?'selected':''}>Trung bình (Medium)</option><option value="high" ${data.priority==='high'?'selected':''}>Cao (High)</option></select>
      </div>
    </div>
    <div class="form-group"><label>Ghi chú</label><textarea id="pm-notes" placeholder="Hướng dẫn công việc...">${data.notes || ''}</textarea></div>
    ${data.id ? `<div class="form-group"><label>Trạng thái</label><select id="pm-status"><option value="active" ${data.status==='active'?'selected':''}>Hoạt động</option><option value="inactive" ${data.status==='inactive'?'selected':''}>Tạm ngưng</option></select></div>` : ''}
  `, `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
      ${data.id ? `<button class="btn btn-danger" onclick="deletePM('${data.id}')" style="margin-right:auto">Xóa</button>` : ''}
      <button class="btn btn-primary" onclick="savePM('${data.id || ''}')">Lưu Lịch</button>`);
}

async function savePM(id) {
  const body = {
    name: document.getElementById('pm-name').value.trim(),
    frequency: document.getElementById('pm-freq').value,
    assetId: document.getElementById('pm-asset').value,
    templateId: document.getElementById('pm-tpl').value,
    startDate: document.getElementById('pm-start').value,
    priority: document.getElementById('pm-priority').value,
    notes: document.getElementById('pm-notes').value.trim()
  };
  if (id) body.status = document.getElementById('pm-status').value;
  if (!body.name || !body.frequency || !body.startDate) return toast('Vui lòng điền đủ tên, tần suất và ngày', 'error');

  const r = id ? await api('PUT', \`/api/pm-schedules/\${id}\`, body) : await api('POST', '/api/pm-schedules', body);
  if (!r.ok) return toast(r.error, 'error');
  closeModal(); toast(id ? 'Cập nhật thành công' : 'Đã tạo lịch PM', 'success'); renderPM();
}

async function deletePM(id) {
  if (!confirm('Bạn có chắc muốn xóa lịch PM này?')) return;
  const r = await api('DELETE', \`/api/pm-schedules/\${id}\`);
  if (!r.ok) return toast(r.error, 'error');
  closeModal(); toast('Đã xóa lịch PM', 'success'); renderPM();
}

// ─── Templates Form ──────────────────────────────────────────
let currentTplItems = [];
function showTemplateForm(data = {}) {
  currentTplItems = data.items ? JSON.parse(JSON.stringify(data.items)) : [];
  openModal(data.id ? 'Sửa Mẫu Checklist' : 'Tạo Mẫu Checklist', `
    <div class="form-row">
      <div class="form-group"><label>Tên Checklist (SOP) *</label><input id="tpl-name" value="${data.name || ''}" placeholder="VD: Bảo dưỡng ĐHKK"></div>
      <div class="form-group"><label>Danh mục *</label><input id="tpl-cat" value="${data.category || ''}" placeholder="VD: HVAC"></div>
    </div>
    <div class="form-group"><label>Các mục kiểm tra</label>
      <div class="tpl-form-items" id="tpl-items-list"></div>
      <button class="tpl-add-item-btn" onclick="addTplItem()">+ Thêm mục kiểm tra</button>
    </div>
  `, `<button class="btn btn-ghost" onclick="closeModal()">Hủy</button>
      ${data.id ? `<button class="btn btn-danger" onclick="deleteTemplate('${data.id}')" style="margin-right:auto">Xóa</button>` : ''}
      <button class="btn btn-primary" onclick="saveTemplate('${data.id || ''}')">Lưu Mẫu</button>`);
  renderTplItemsList();
}

function renderTplItemsList() {
  document.getElementById('tpl-items-list').innerHTML = currentTplItems.map((it, i) => `
    <div class="tpl-form-item">
      <input type="text" placeholder="Tên mục kiểm tra..." value="${it.label}" onchange="currentTplItems[${i}].label=this.value">
      <select onchange="currentTplItems[${i}].type=this.value; renderTplItemsList()">
        <option value="status" ${it.type==='status'?'selected':''}>Đạt/Không Đạt</option>
        <option value="number" ${it.type==='number'?'selected':''}>Số liệu</option>
        <option value="text" ${it.type==='text'?'selected':''}>Văn bản</option>
      </select>
      ${it.type==='number' ? `<input type="text" placeholder="Đơn vị (VD: bar, °C)" value="${it.unit||''}" style="width:70px" onchange="currentTplItems[${i}].unit=this.value">` : '<div></div>'}
      <button class="btn btn-ghost btn-sm" style="color:var(--red);padding:6px;min-height:unset" onclick="currentTplItems.splice(${i},1); renderTplItemsList()">×</button>
    </div>
  `).join('');
}

function addTplItem() {
  currentTplItems.push({ label: '', type: 'status' });
  renderTplItemsList();
}

async function saveTemplate(id) {
  const name = document.getElementById('tpl-name').value.trim();
  const category = document.getElementById('tpl-cat').value.trim();
  if (!name || !category) return toast('Thiếu tên mẫu hoặc danh mục', 'error');
  const items = currentTplItems.filter(it => it.label.trim() !== '');
  
  const r = id ? await api('PUT', \`/api/checklist-templates/\${id}\`, { name, category, items }) : await api('POST', '/api/checklist-templates', { name, category, items });
  if (!r.ok) return toast(r.error, 'error');
  closeModal(); toast('Lưu thành công', 'success'); renderPM();
}

async function deleteTemplate(id) {
  if (!confirm('Xóa mẫu checklist này?')) return;
  const r = await api('DELETE', \`/api/checklist-templates/\${id}\`);
  if (!r.ok) return toast(r.error, 'error');
  closeModal(); toast('Đã xóa mẫu', 'success'); renderPM();
}
