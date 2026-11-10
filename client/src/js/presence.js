// Pure helpers for the "Team Activity" table (no DOM, easy to test).

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function lastSeenText(u) {
  if (u.online) return 'Active now';
  if (u.seconds_ago == null) return 'Never logged in';
  const s = u.seconds_ago;
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function onlineSummary(users) {
  const online = users.filter((u) => u.online).length;
  return `${online} online · ${users.length} total`;
}

export function presenceRows(users) {
  return users.map((u) => `
    <tr class="border-t">
      <td class="p-3 font-medium">${esc(u.username)}</td>
      <td class="p-3 capitalize">${esc(u.role)}</td>
      <td class="p-3">
        <span class="inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-bold uppercase ${
          u.online ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}">
          <span class="w-2 h-2 rounded-full ${u.online ? 'bg-green-500' : 'bg-slate-400'}"></span>
          ${u.online ? 'Online' : 'Offline'}
        </span>
      </td>
      <td class="p-3 text-slate-600">${esc(lastSeenText(u))}</td>
    </tr>`).join('');
}
